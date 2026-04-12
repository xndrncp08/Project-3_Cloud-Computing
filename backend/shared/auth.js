// shared/auth.js
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// CORS headers applied to every response
function getCorsHeaders(req) {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").map((o) => o.trim());
  const origin = req.headers["origin"] || "";
  const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Wrap every function handler with CORS + OPTIONS preflight support
function withCors(handler) {
  return async (context, req) => {
    const corsHeaders = getCorsHeaders(req);

    // Handle preflight
    if (req.method === "OPTIONS") {
      context.res = { status: 204, headers: corsHeaders, body: "" };
      return;
    }

    // Run the real handler, inject cors helper
    req._corsHeaders = corsHeaders;
    return handler(context, req);
  };
}

// Sign a JWT for a user
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT from Authorization header. Returns decoded payload or null.
function verifyToken(req) {
  try {
    const authHeader = req.headers["authorization"] || "";
    if (!authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7);
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Middleware: require valid JWT. Call at top of protected handlers.
function requireAuth(context, req) {
  const user = verifyToken(req);
  if (!user) {
    context.res = {
      status: 401,
      headers: { ...req._corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Unauthorized" }),
    };
    return null;
  }
  return user;
}

function jsonResponse(context, req, status, body) {
  context.res = {
    status,
    headers: { ...req._corsHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

module.exports = { withCors, signToken, verifyToken, requireAuth, jsonResponse };
