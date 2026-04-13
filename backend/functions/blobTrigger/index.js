// functions/blobTrigger/index.js
const { app } = require("@azure/functions");
const { parse } = require("csv-parse/sync");
const { BlobServiceClient } = require("@azure/storage-blob");
const { getRedisClient, KEYS, TTL } = require("../../shared/redisClient");

app.storageBlob("blobTrigger", {
  path: "dietdata/All_Diets.csv",
  connection: "BLOB_CONNECTION_STRING",
  handler: async (blob, context) => {
    context.log("[BlobTrigger] All_Diets.csv changed — starting pipeline");

    const rawText = Buffer.isBuffer(blob) ? blob.toString("utf-8") : blob;
    let rawRows;
    try {
      rawRows = parse(rawText, { columns: true, skip_empty_lines: true, trim: true });
    } catch (err) {
      context.log.error("[BlobTrigger] CSV parse failed:", err.message);
      throw err;
    }
    context.log(`[BlobTrigger] Parsed ${rawRows.length} raw rows`);

    const seen = new Set();
    const recipes = [];

    for (const row of rawRows) {
      const dietType = (row["Diet_type"]    || "").trim();
      const name     = (row["Recipe_name"]  || "").trim();
      const cuisine  = (row["Cuisine_type"] || "Unknown").trim();
      const protein  = parseFloat(row["Protein(g)"] || 0);
      const carbs    = parseFloat(row["Carbs(g)"]   || 0);
      const fat      = parseFloat(row["Fat(g)"]     || 0);

      if (!name || !dietType) continue;
      if (protein < 0 || carbs < 0 || fat < 0) continue;

      const key = `${name.toLowerCase()}|${dietType.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const calories = Math.round(protein * 4 + carbs * 4 + fat * 9);
      recipes.push({
        id: recipes.length + 1,
        name,
        dietType: normaliseDietType(dietType),
        cuisine:  normaliseCuisine(cuisine),
        calories,
        protein: Math.round(protein * 10) / 10,
        carbs:   Math.round(carbs   * 10) / 10,
        fat:     Math.round(fat     * 10) / 10,
        searchText: `${name} ${cuisine} ${dietType}`.toLowerCase(),
      });
    }
    context.log(`[BlobTrigger] ${recipes.length} clean recipes`);

    const chartData = computeChartData(recipes);
    const redis = getRedisClient();
    await redis.set(KEYS.RECIPES_ALL,  JSON.stringify(recipes),   "EX", TTL.RECIPES);
    await redis.set(KEYS.CHART_DATA,   JSON.stringify(chartData), "EX", TTL.CHART_DATA);
    await redis.set(KEYS.LAST_UPDATED, new Date().toISOString());
    context.log("[BlobTrigger] Written to Redis");

    try {
      const blobClient = BlobServiceClient.fromConnectionString(process.env.BLOB_CONNECTION_STRING);
      const container = blobClient.getContainerClient(process.env.BLOB_CONTAINER_NAME || "dietdata");
      const cleanCsv = recipesToCsv(recipes);
      await container.getBlockBlobClient("All_Diets_clean.csv")
        .upload(cleanCsv, Buffer.byteLength(cleanCsv), { blobHTTPHeaders: { blobContentType: "text/csv" } });
      context.log("[BlobTrigger] Clean CSV saved");
    } catch (err) {
      context.log.warn("[BlobTrigger] Could not save clean CSV:", err.message);
    }

    context.log("[BlobTrigger] Pipeline complete");
  },
});

function normaliseDietType(raw) {
  const map = { vegan: "Vegan", vegetarian: "Vegetarian", keto: "Keto", ketogenic: "Keto", paleo: "Paleo", mediterranean: "Mediterranean", dash: "DASH" };
  return map[raw.toLowerCase()] || raw.trim();
}
function normaliseCuisine(raw) {
  return raw.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}
function computeChartData(recipes) {
  const dietCounts = {}, calSums = {}, calCounts = {}, cuisineCounts = {};
  let totals = { protein: 0, carbs: 0, fat: 0 };
  for (const r of recipes) {
    dietCounts[r.dietType]   = (dietCounts[r.dietType]   || 0) + 1;
    calSums[r.dietType]      = (calSums[r.dietType]      || 0) + r.calories;
    calCounts[r.dietType]    = (calCounts[r.dietType]    || 0) + 1;
    cuisineCounts[r.cuisine] = (cuisineCounts[r.cuisine] || 0) + 1;
    totals.protein += r.protein; totals.carbs += r.carbs; totals.fat += r.fat;
  }
  const n = recipes.length || 1;
  return {
    dietDistribution:  Object.entries(dietCounts).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count),
    avgCaloriesByDiet: Object.keys(calSums).map(d => ({ name: d, avgCalories: Math.round(calSums[d] / calCounts[d]) })).sort((a,b) => b.avgCalories - a.avgCalories),
    avgMacros: { protein: Math.round(totals.protein/n*10)/10, carbs: Math.round(totals.carbs/n*10)/10, fat: Math.round(totals.fat/n*10)/10 },
    topCuisines: Object.entries(cuisineCounts).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0, 10),
    dietTypes: [...new Set(recipes.map(r => r.dietType))].sort(),
    totalRecipes: recipes.length,
    lastUpdated: new Date().toISOString(),
  };
}
function recipesToCsv(recipes) {
  return "id,name,dietType,cuisine,calories,protein,carbs,fat\n" +
    recipes.map(r => `${r.id},"${r.name.replace(/"/g,'""')}","${r.dietType}","${r.cuisine}",${r.calories},${r.protein},${r.carbs},${r.fat}`).join("\n");
}
