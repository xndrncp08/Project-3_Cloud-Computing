// functions/login/index.js
const { app } = require("@azure/functions");
const bcrypt = require("bcryptjs");
const { getUsersContainer } = require("../../shared/cosmosClient");
const { signToken, getCorsHeaders } = require("../../shared/auth");

app.http("login", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "auth/login",
  handler: async (req, context) => {
    const corsHeaders = getCorsHeaders(req);
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders };

    const json = (status, body) => ({ status, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const { email, password } = await req.json();

    if (!email || !password) return json(400, { error: "Email and password are required" });
    const normalizedEmail = email.toLowerCase().trim();

    try {
      const container = await getUsersContainer();
      const { resources: users } = await container.items
        .query({ query: "SELECT * FROM c WHERE c.email = @email", parameters: [{ name: "@email", value: normalizedEmail }] })
        .fetchAll();

      const GENERIC = { error: "Invalid email or password" };
      if (users.length === 0) {
        await bcrypt.compare(password, "$2b$12$invalidhashtopreventtimingattack");
        return json(401, GENERIC);
      }

      const user = users[0];
      if (user.provider !== "local" || !user.passwordHash) return json(401, { error: `This account uses ${user.provider} sign-in.` });

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return json(401, GENERIC);

      const token = signToken({ userId: user.id, name: user.name, email: user.email });
      return json(200, { token, user: { name: user.name, email: user.email } });
    } catch (err) {
      context.log.error("[login]", err.message);
      return json(500, { error: "Login failed. Please try again." });
    }
  },
});
