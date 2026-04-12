// functions/login/index.js
// POST /api/auth/login
// Body: { email, password }
const bcrypt = require("bcryptjs");
const { getUsersContainer } = require("../../shared/cosmosClient");
const { withCors, signToken, jsonResponse } = require("../../shared/auth");

module.exports = withCors(async function (context, req) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return jsonResponse(context, req, 400, { error: "Email and password are required" });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const container = await getUsersContainer();

    const { resources: users } = await container.items
      .query({
        query: "SELECT * FROM c WHERE c.email = @email",
        parameters: [{ name: "@email", value: normalizedEmail }],
      })
      .fetchAll();

    // Generic error — do not reveal whether email or password was wrong
    const GENERIC_ERROR = { error: "Invalid email or password" };

    if (users.length === 0) {
      // Still run bcrypt to prevent timing attacks
      await bcrypt.compare(password, "$2b$12$invalidhashtopreventtimingattack");
      return jsonResponse(context, req, 401, GENERIC_ERROR);
    }

    const user = users[0];

    // OAuth users don't have a password hash
    if (user.provider !== "local" || !user.passwordHash) {
      return jsonResponse(context, req, 401, {
        error: `This account uses ${user.provider} sign-in. Please use that method.`,
      });
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return jsonResponse(context, req, 401, GENERIC_ERROR);
    }

    const token = signToken({
      userId: user.id,
      name: user.name,
      email: user.email,
    });

    return jsonResponse(context, req, 200, {
      token,
      user: { name: user.name, email: user.email },
    });
  } catch (err) {
    context.log.error("[login] Error:", err.message);
    return jsonResponse(context, req, 500, { error: "Login failed. Please try again." });
  }
});
