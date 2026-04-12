// functions/getChartData/index.js
// Returns pre-computed chart data from Redis.
// NEVER reads the CSV — all work was done by blobTrigger.
const { getRedisClient, KEYS } = require("../../shared/redisClient");
const { withCors, requireAuth, jsonResponse } = require("../../shared/auth");

module.exports = withCors(async function (context, req) {
  // Require login to view dashboard data
  const user = requireAuth(context, req);
  if (!user) return;

  const redis = getRedisClient();
  const raw = await redis.get(KEYS.CHART_DATA);

  if (!raw) {
    return jsonResponse(context, req, 503, {
      error: "Chart data not ready. Upload All_Diets.csv to blob storage to trigger processing.",
    });
  }

  return jsonResponse(context, req, 200, JSON.parse(raw));
});
