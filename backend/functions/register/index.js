// functions/register/index.js
// POST /api/auth/register
// Body: { name, email, password }
// - Validates input
// - Checks for duplicate email
// - Hashes password with bcrypt (never stores plaintext)
// - Creates user in Cosmos DB (encrypted at rest by default)
// - Returns JWT
const bcrypt = require("bcryptjs");
const { getUsersContainer } = require("../../shared/cosmosClient");
const { withCors, signToken, jsonResponse } = require("../../shared/auth");

const SALT_ROUNDS = 12; // High enough to be secure, low enough to not time out in AZ Functions

module.exports = withCors(async function (context, req) {
  const { name, email, password } = req.body || {};

  // ── Input validation ───────────────────────────────────────────────────────
  if (!name || typeof name !== "string" || name.trim().length < 1) {
    return jsonResponse(context, req, 400, { error: "Name is required" });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse(context, req, 400, { error: "Valid email is required" });
  }
  if (!password || password.length < 8) {
    return jsonResponse(context, req, 400, { error: "Password must be at least 8 characters" });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const container = await getUsersContainer();

    // ── Check for existing user ────────────────────────────────────────────
    const { resources: existing } = await container.items
      .query({
        query: "SELECT * FROM c WHERE c.email = @email",
        parameters: [{ name: "@email", value: normalizedEmail }],
      })
      .fetchAll();

    if (existing.length > 0) {
      return jsonResponse(context, req, 409, { error: "An account with this email already exists" });
    }

    // ── Hash password ──────────────────────────────────────────────────────
    // bcrypt.hash produces a salted hash — NEVER store raw password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // ── Create user document ───────────────────────────────────────────────
    const user = {
      id: generateId(),
      name: name.trim(),
      email: normalizedEmail,
      passwordHash, // Hashed. plaintext never stored.
      provider: "local",
      createdAt: new Date().toISOString(),
    };

    await container.items.create(user);

    // ── Issue JWT ──────────────────────────────────────────────────────────
    const token = signToken({
      userId: user.id,
      name: user.name,
      email: user.email,
    });

    return jsonResponse(context, req, 201, {
      token,
      user: { name: user.name, email: user.email },
    });
  } catch (err) {
    context.log.error("[register] Error:", err.message);
    return jsonResponse(context, req, 500, { error: "Registration failed. Please try again." });
  }
});

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
