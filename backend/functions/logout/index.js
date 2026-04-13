// functions/logout/index.js
const { app } = require("@azure/functions");
const { getCorsHeaders } = require("../../shared/auth");

app.http("logout", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "auth/logout",
  handler: async (req, context) => {
    const corsHeaders = getCorsHeaders(req);
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders };
    return { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ message: "Logged out successfully" }) };
  },
});
