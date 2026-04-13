// functions/getChartData/index.js
const { app } = require("@azure/functions");
const { getRedisClient, KEYS } = require("../../shared/redisClient");
const { verifyToken, getCorsHeaders } = require("../../shared/auth");

app.http("getChartData", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "chartData",
  handler: async (req, context) => {
    const corsHeaders = getCorsHeaders(req);
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders };

    const json = (status, body) => ({ status, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify(body) });

    const user = verifyToken(req);
    if (!user) return json(401, { error: "Unauthorized" });

    const redis = getRedisClient();
    const raw = await redis.get(KEYS.CHART_DATA);
    if (!raw) return json(503, { error: "Chart data not ready. Upload All_Diets.csv to blob storage to trigger processing." });

    return json(200, JSON.parse(raw));
  },
});
