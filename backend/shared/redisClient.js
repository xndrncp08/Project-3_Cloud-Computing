// shared/redisClient.js
// Single Redis connection reused across all function invocations (warm starts)
const Redis = require("ioredis");

let client = null;

function getRedisClient() {
  if (client && client.status === "ready") return client;

  client = new Redis({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || "6380"),
    password: process.env.REDIS_PASSWORD,
    tls: { servername: process.env.REDIS_HOST }, // Required for Azure Cache for Redis
    retryStrategy: (times) => Math.min(times * 100, 3000),
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
  });

  client.on("error", (err) => console.error("[Redis] Error:", err.message));
  client.on("connect", () => console.log("[Redis] Connected"));

  return client;
}

// Redis key constants — centralised so nothing is hardcoded in multiple places
const KEYS = {
  CHART_DATA: "chart:data",           // Pre-computed chart results
  RECIPES_ALL: "recipes:all",         // Full cleaned recipe list
  LAST_UPDATED: "meta:lastUpdated",   // ISO timestamp of last blob trigger run
};

// TTL values (seconds) — set high since data only changes when the CSV changes
const TTL = {
  CHART_DATA: 60 * 60 * 24 * 7,  // 7 days
  RECIPES: 60 * 60 * 24 * 7,     // 7 days
};

module.exports = { getRedisClient, KEYS, TTL };
