// functions/authCallback/index.js
const { app } = require("@azure/functions");
const fetch = require("node-fetch");
const { getUsersContainer } = require("../../shared/cosmosClient");
const { signToken, getCorsHeaders } = require("../../shared/auth");

app.http("authCallback", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "auth/callback/google",
  handler: async (req, context) => {
    const corsHeaders = getCorsHeaders(req);
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders, body: "" };

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const code = req.query.get("code");

    if (!code) return { status: 302, headers: { Location: `${frontendUrl}/login?error=oauth_no_code` }, body: "" };

    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: process.env.GOOGLE_REDIRECT_URI,
          grant_type: "authorization_code",
        }),
      });
      if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status}`);
      const { access_token } = await tokenRes.json();

      const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!profileRes.ok) throw new Error(`Profile fetch failed: ${profileRes.status}`);
      const profile = await profileRes.json();

      const email = profile.email.toLowerCase();
      const name = profile.name || email.split("@")[0];
      const container = await getUsersContainer();

      const { resources: existing } = await container.items
        .query({ query: "SELECT * FROM c WHERE c.email = @email", parameters: [{ name: "@email", value: email }] })
        .fetchAll();

      let user = existing[0];
      if (!user) {
        user = { id: Date.now().toString(36) + Math.random().toString(36).slice(2), name, email, passwordHash: null, provider: "google", googleId: profile.id, createdAt: new Date().toISOString() };
        await container.items.create(user);
      }

      const token = signToken({ userId: user.id, name: user.name, email: user.email });
      return { status: 302, headers: { Location: `${frontendUrl}/auth/callback?token=${encodeURIComponent(token)}` }, body: "" };
    } catch (err) {
      context.log.error("[authCallback]", err.message);
      return { status: 302, headers: { Location: `${frontendUrl}/login?error=oauth_failed` }, body: "" };
    }
  },
});
