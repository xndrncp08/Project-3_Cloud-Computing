// functions/authCallback/index.js
// GET /api/auth/callback/google?code=...
// 1. Exchange authorization code for Google access token
// 2. Fetch user profile from Google
// 3. Upsert user in Cosmos DB
// 4. Issue our own JWT
// 5. Redirect frontend to /auth/callback with token in query param
const fetch = require("node-fetch");
const { getUsersContainer } = require("../../shared/cosmosClient");
const { withCors, signToken } = require("../../shared/auth");

module.exports = withCors(async function (context, req) {
  const code = req.query.code;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  if (!code) {
    context.res = {
      status: 302,
      headers: { Location: `${frontendUrl}/login?error=oauth_no_code` },
      body: "",
    };
    return;
  }

  try {
    // ── Step 1: Exchange code for tokens ─────────────────────────────────────
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

    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${tokenRes.status}`);
    }

    const { access_token } = await tokenRes.json();

    // ── Step 2: Fetch Google user profile ─────────────────────────────────────
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!profileRes.ok) {
      throw new Error(`Profile fetch failed: ${profileRes.status}`);
    }

    const profile = await profileRes.json();
    const email = profile.email.toLowerCase();
    const name = profile.name || profile.email.split("@")[0];

    // ── Step 3: Upsert user in Cosmos ─────────────────────────────────────────
    const container = await getUsersContainer();

    const { resources: existing } = await container.items
      .query({
        query: "SELECT * FROM c WHERE c.email = @email",
        parameters: [{ name: "@email", value: email }],
      })
      .fetchAll();

    let user;
    if (existing.length > 0) {
      user = existing[0];
    } else {
      user = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        name,
        email,
        passwordHash: null, // OAuth user — no password
        provider: "google",
        googleId: profile.id,
        createdAt: new Date().toISOString(),
      };
      await container.items.create(user);
    }

    // ── Step 4: Issue JWT ──────────────────────────────────────────────────────
    const token = signToken({ userId: user.id, name: user.name, email: user.email });

    // ── Step 5: Redirect to frontend with token ────────────────────────────────
    // Frontend reads the token from the URL, stores in localStorage, then redirects to /
    context.res = {
      status: 302,
      headers: { Location: `${frontendUrl}/auth/callback?token=${encodeURIComponent(token)}` },
      body: "",
    };
  } catch (err) {
    context.log.error("[authCallback] Error:", err.message);
    context.res = {
      status: 302,
      headers: { Location: `${frontendUrl}/login?error=oauth_failed` },
      body: "",
    };
  }
});
