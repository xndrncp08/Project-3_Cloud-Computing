// functions/blobTrigger/index.js
// Fires ONCE when All_Diets.csv is uploaded or changed in blob storage.
// Steps:
//   1. Parse raw CSV
//   2. Clean data (dedupe, normalise, drop bad rows)
//   3. Pre-compute all chart aggregations
//   4. Store clean recipes + chart results in Redis
//   5. Save clean CSV back to blob for auditing

const { parse } = require("csv-parse/sync");
const { BlobServiceClient } = require("@azure/storage-blob");
const { getRedisClient, KEYS, TTL } = require("../../shared/redisClient");

module.exports = async function (context, myBlob) {
  context.log("[BlobTrigger] All_Diets.csv changed — starting pipeline");

  // ── 1. Parse raw CSV ──────────────────────────────────────────────────────
  const rawText = myBlob.toString("utf-8");
  let rawRows;
  try {
    rawRows = parse(rawText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch (err) {
    context.log.error("[BlobTrigger] CSV parse failed:", err.message);
    throw err;
  }
  context.log(`[BlobTrigger] Parsed ${rawRows.length} raw rows`);

  // ── 2. Clean data ─────────────────────────────────────────────────────────
  // Expected CSV columns (case-insensitive): Diet_type, Recipe_name, Cuisine_type,
  //   Protein(g), Carbs(g), Fat(g), Calories, image_url (optional)
  const seen = new Set();
  const recipes = [];

  for (const row of rawRows) {
    // Normalise column names: lowercase, strip spaces
    const r = {};
    for (const [k, v] of Object.entries(row)) {
      r[k.toLowerCase().replace(/\s+/g, "_").replace(/[()]/g, "")] = v;
    }

    const name = (r["recipe_name"] || r["name"] || "").trim();
    const dietType = (r["diet_type"] || r["diet"] || "").trim();
    const cuisine = (r["cuisine_type"] || r["cuisine"] || "Unknown").trim();
    const calories = parseFloat(r["calories"] || r["caloric_value"] || 0);
    const protein = parseFloat(r["proteing"] || r["protein_g"] || r["protein"] || 0);
    const carbs = parseFloat(r["carbsg"] || r["carbs_g"] || r["carbs"] || 0);
    const fat = parseFloat(r["fatg"] || r["fat_g"] || r["fat"] || 0);

    // Drop rows missing essential fields
    if (!name || !dietType) continue;
    // Drop rows with clearly invalid nutrition data
    if (calories < 0 || protein < 0 || carbs < 0 || fat < 0) continue;
    // Deduplicate by recipe name + diet type
    const key = `${name.toLowerCase()}|${dietType.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    recipes.push({
      id: recipes.length + 1,
      name,
      dietType: normaliseDietType(dietType),
      cuisine,
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      // Build a searchable text field for keyword search
      searchText: `${name} ${cuisine} ${dietType}`.toLowerCase(),
    });
  }
  context.log(`[BlobTrigger] ${recipes.length} clean recipes after deduplication`);

  // ── 3. Pre-compute chart data ──────────────────────────────────────────────
  const chartData = computeChartData(recipes);
  context.log("[BlobTrigger] Chart data computed");

  // ── 4. Write to Redis ──────────────────────────────────────────────────────
  const redis = getRedisClient();
  await redis.set(KEYS.RECIPES_ALL, JSON.stringify(recipes), "EX", TTL.RECIPES);
  await redis.set(KEYS.CHART_DATA, JSON.stringify(chartData), "EX", TTL.CHART_DATA);
  await redis.set(KEYS.LAST_UPDATED, new Date().toISOString());
  context.log("[BlobTrigger] Data written to Redis");

  // ── 5. Save clean CSV back to blob ────────────────────────────────────────
  try {
    const blobClient = BlobServiceClient.fromConnectionString(
      process.env.BLOB_CONNECTION_STRING
    );
    const containerClient = blobClient.getContainerClient(
      process.env.BLOB_CONTAINER_NAME || "dietdata"
    );
    const cleanCsv = recipesToCsv(recipes);
    const blockBlob = containerClient.getBlockBlobClient("All_Diets_clean.csv");
    await blockBlob.upload(cleanCsv, Buffer.byteLength(cleanCsv), {
      blobHTTPHeaders: { blobContentType: "text/csv" },
    });
    context.log("[BlobTrigger] Clean CSV saved to blob");
  } catch (err) {
    // Non-fatal — Redis already has the data
    context.log.warn("[BlobTrigger] Could not save clean CSV:", err.message);
  }

  context.log("[BlobTrigger] Pipeline complete");
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function normaliseDietType(raw) {
  const lower = raw.toLowerCase().trim();
  const map = {
    vegan: "Vegan",
    vegetarian: "Vegetarian",
    keto: "Keto",
    "ketogenic": "Keto",
    paleo: "Paleo",
    mediterranean: "Mediterranean",
    "gluten-free": "Gluten-Free",
    "gluten free": "Gluten-Free",
    dairy_free: "Dairy-Free",
    "dairy free": "Dairy-Free",
    omnivore: "Omnivore",
  };
  return map[lower] || raw.trim();
}

function computeChartData(recipes) {
  // Chart 1: Count by diet type
  const dietCounts = {};
  for (const r of recipes) {
    dietCounts[r.dietType] = (dietCounts[r.dietType] || 0) + 1;
  }
  const dietDistribution = Object.entries(dietCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Chart 2: Average calories per diet type
  const calSums = {};
  const calCounts = {};
  for (const r of recipes) {
    calSums[r.dietType] = (calSums[r.dietType] || 0) + r.calories;
    calCounts[r.dietType] = (calCounts[r.dietType] || 0) + 1;
  }
  const avgCaloriesByDiet = Object.keys(calSums)
    .map((diet) => ({
      name: diet,
      avgCalories: Math.round(calSums[diet] / calCounts[diet]),
    }))
    .sort((a, b) => b.avgCalories - a.avgCalories);

  // Chart 3: Average macros across all recipes
  const totals = recipes.reduce(
    (acc, r) => ({
      protein: acc.protein + r.protein,
      carbs: acc.carbs + r.carbs,
      fat: acc.fat + r.fat,
    }),
    { protein: 0, carbs: 0, fat: 0 }
  );
  const n = recipes.length || 1;
  const avgMacros = {
    protein: Math.round((totals.protein / n) * 10) / 10,
    carbs: Math.round((totals.carbs / n) * 10) / 10,
    fat: Math.round((totals.fat / n) * 10) / 10,
  };

  // Chart 4: Top 10 cuisines
  const cuisineCounts = {};
  for (const r of recipes) {
    cuisineCounts[r.cuisine] = (cuisineCounts[r.cuisine] || 0) + 1;
  }
  const topCuisines = Object.entries(cuisineCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Unique diet types list (for frontend filter dropdown)
  const dietTypes = [...new Set(recipes.map((r) => r.dietType))].sort();

  return {
    dietDistribution,
    avgCaloriesByDiet,
    avgMacros,
    topCuisines,
    dietTypes,
    totalRecipes: recipes.length,
    lastUpdated: new Date().toISOString(),
  };
}

function recipesToCsv(recipes) {
  const header = "id,name,dietType,cuisine,calories,protein,carbs,fat\n";
  const rows = recipes
    .map(
      (r) =>
        `${r.id},"${r.name}","${r.dietType}","${r.cuisine}",${r.calories},${r.protein},${r.carbs},${r.fat}`
    )
    .join("\n");
  return header + rows;
}
