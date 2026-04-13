// functions/authGoogle/index.js
const { app } = require("@azure/functions");
const { getCorsHeaders } = require("../../shared/auth");

app.http("authGoogle", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "auth/google",
  handler: async (req, context) => {
    const corsHeaders = getCorsHeaders(req);
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders, body: "" };

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (!clientId || !redirectUri) return { status: 500, body: "Google OAuth not configured" };

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "select_account",
    });

    return {
      status: 302,
      headers: { ...corsHeaders, Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}` },
      body: "",
    };
  },
});
