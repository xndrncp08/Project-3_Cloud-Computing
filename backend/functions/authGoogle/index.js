// functions/authGoogle/index.js
// GET /api/auth/google
// Redirects the browser to Google's OAuth consent screen.
const { withCors } = require("../../shared/auth");

module.exports = withCors(async function (context, req) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    context.res = { status: 500, body: "Google OAuth not configured" };
    return;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });

  context.res = {
    status: 302,
    headers: { Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}` },
    body: "",
  };
});
