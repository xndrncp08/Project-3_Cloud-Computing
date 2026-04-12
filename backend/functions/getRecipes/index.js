// functions/getRecipes/index.js
// Supports: keyword search, diet type filter, pagination
// Query params: keyword, dietType, page (1-based), pageSize (default 10)
// Auth required.
const { getRedisClient, KEYS } = require("../../shared/redisClient");
const { withCors, requireAuth, jsonResponse } = require("../../shared/auth");

module.exports = withCors(async function (context, req) {
  const user = requireAuth(context, req);
  if (!user) return;

  const redis = getRedisClient();
  const raw = await redis.get(KEYS.RECIPES_ALL);

  if (!raw) {
    return jsonResponse(context, req, 503, {
      error: "Recipe data not ready. Upload All_Diets.csv to blob storage.",
    });
  }

  let recipes = JSON.parse(raw);

  // ── Query params ───────────────────────────────────────────────────────────
  const keyword = (req.query.keyword || "").toLowerCase().trim();
  const dietType = (req.query.dietType || "").trim();
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize || "10", 10)));

  // ── Filter by diet type ────────────────────────────────────────────────────
  if (dietType && dietType !== "All") {
    recipes = recipes.filter(
      (r) => r.dietType.toLowerCase() === dietType.toLowerCase()
    );
  }

  // ── Keyword search across name, cuisine, dietType ─────────────────────────
  if (keyword) {
    recipes = recipes.filter((r) => r.searchText.includes(keyword));
  }

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalCount = recipes.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const start = (page - 1) * pageSize;
  const pageData = recipes.slice(start, start + pageSize);

  return jsonResponse(context, req, 200, {
    recipes: pageData,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
});
