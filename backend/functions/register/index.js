// functions/register/index.js
const { app } = require("@azure/functions");
const bcrypt = require("bcryptjs");
const { getUsersContainer } = require("../../shared/cosmosClient");
const { signToken, getCorsHeaders } = require("../../shared/auth");

app.http("register", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "auth/register",
  handler: async (req, context) => {
    const corsHeaders = getCorsHeaders(req);
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders };

    const json = (status, body) => ({ status, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const { name, email, password } = await req.json();

    if (!name?.trim()) return json(400, { error: "Name is required" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: "Valid email is required" });
    if (!password || password.length < 8) return json(400, { error: "Password must be at least 8 characters" });

    const normalizedEmail = email.toLowerCase().trim();
    try {
      const container = await getUsersContainer();
      const { resources: existing } = await container.items
        .query({ query: "SELECT * FROM c WHERE c.email = @email", parameters: [{ name: "@email", value: normalizedEmail }] })
        .fetchAll();
      if (existing.length > 0) return json(409, { error: "An account with this email already exists" });

      const passwordHash = await bcrypt.hash(password, 12);
      const user = { id: Date.now().toString(36) + Math.random().toString(36).slice(2), name: name.trim(), email: normalizedEmail, passwordHash, provider: "local", createdAt: new Date().toISOString() };
      await container.items.create(user);

      const token = signToken({ userId: user.id, name: user.name, email: user.email });
      return json(201, { token, user: { name: user.name, email: user.email } });
    } catch (err) {
      context.log.error("[register]", err.message);
      return json(500, { error: "Registration failed. Please try again." });
    }
  },
});
