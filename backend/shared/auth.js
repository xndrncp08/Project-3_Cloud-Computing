// shared/auth.js — v4 compatible
const jwt = require("jsonwebtoken");

const JWT_SECRET    = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// v4 Request object uses req.headers.get() not req.headers["x"]
function getCorsHeaders(req) {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").map(o => o.trim());
  const origin = req.headers?.get ? req.headers.get("origin") : (req.headers?.["origin"] || "");
  const allowOrigin = allowedOrigins.includes(origin) ? origin : (allowedOrigins[0] || "*");
  return {
    "Access-Control-Allow-Origin":      allowOrigin,
    "Access-Control-Allow-Methods":     "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":     "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Works with both v4 Request (headers.get) and old req (headers["x"])
function verifyToken(req) {
  try {
    const authHeader = req.headers?.get
      ? req.headers.get("authorization")
      : req.headers?.["authorization"];
    if (!authHeader?.startsWith("Bearer ")) return null;
    return jwt.verify(authHeader.slice(7), JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = { getCorsHeaders, signToken, verifyToken };
