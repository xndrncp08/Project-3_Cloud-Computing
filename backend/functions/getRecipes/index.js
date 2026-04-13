// functions/getRecipes/index.js
const { app } = require("@azure/functions");
const { getRedisClient, KEYS } = require("../../shared/redisClient");
const { verifyToken, getCorsHeaders } = require("../../shared/auth");

app.http("getRecipes", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "recipes",
  handler: async (req, context) => {
    const corsHeaders = getCorsHeaders(req);
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders };

    const json = (status, body) => ({ status, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify(body) });

    const user = verifyToken(req);
    if (!user) return json(401, { error: "Unauthorized" });

    const redis = getRedisClient();
    const raw = await redis.get(KEYS.RECIPES_ALL);
    if (!raw) return json(503, { error: "Recipe data not ready. Upload All_Diets.csv to blob storage." });

    let recipes = JSON.parse(raw);

    const keyword  = (req.query.get("keyword")  || "").toLowerCase().trim();
    const dietType = (req.query.get("dietType")  || "").trim();
    const page     = Math.max(1, parseInt(req.query.get("page")     || "1",  10));
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.get("pageSize") || "10", 10)));

    if (dietType && dietType !== "All") recipes = recipes.filter(r => r.dietType.toLowerCase() === dietType.toLowerCase());
    if (keyword) recipes = recipes.filter(r => r.searchText.includes(keyword));

    const totalCount  = recipes.length;
    const totalPages  = Math.ceil(totalCount / pageSize);
    const start       = (page - 1) * pageSize;
    const pageData    = recipes.slice(start, start + pageSize);

    return json(200, { recipes: pageData, pagination: { page, pageSize, totalCount, totalPages, hasNext: page < totalPages, hasPrev: page > 1 } });
  },
});
