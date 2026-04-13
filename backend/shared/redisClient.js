// shared/redisClient.js
// Uses real Redis when REDIS_HOST is reachable, falls back to in-memory for local dev.

const KEYS = {
  CHART_DATA:   "chart:data",
  RECIPES_ALL:  "recipes:all",
  LAST_UPDATED: "meta:lastUpdated",
};
const TTL = {
  CHART_DATA: 60 * 60 * 24 * 7,
  RECIPES:    60 * 60 * 24 * 7,
};

// ── In-memory fallback ────────────────────────────────────────────────────────
const store = {};
const memoryClient = {
  status: "ready",
  async get(key) { return store[key] ?? null; },
  async set(key, value) { store[key] = value; return "OK"; },
  async keys(pattern) { return Object.keys(store); },
  on() {},
};

// ── Real Redis (only if host is configured and reachable) ─────────────────────
let client = null;
let usingMemory = false;

function getRedisClient() {
  if (client) return client;

  const host = process.env.REDIS_HOST;
  if (!host) {
    console.log("[Redis] No REDIS_HOST set — using in-memory store");
    client = memoryClient;
    usingMemory = true;
    return client;
  }

  try {
    const Redis = require("ioredis");
    const redisClient = new Redis({
      host,
      port: parseInt(process.env.REDIS_PORT || "6380"),
      password: process.env.REDIS_PASSWORD,
      tls: { servername: host },
      retryStrategy: (times) => {
        if (times > 3) {
          console.log("[Redis] Can't connect after 3 tries — switching to in-memory store");
          client = memoryClient;
          usingMemory = true;
          return null; // stop retrying
        }
        return Math.min(times * 500, 2000);
      },
      enableReadyCheck: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
    });

    redisClient.on("error", (err) => {
      if (!usingMemory) console.error("[Redis] Error:", err.message);
    });
    redisClient.on("connect", () => console.log("[Redis] Connected to Azure Cache for Redis"));

    client = redisClient;
  } catch (err) {
    console.log("[Redis] ioredis load failed — using in-memory store:", err.message);
    client = memoryClient;
    usingMemory = true;
  }

  return client;
}

module.exports = { getRedisClient, KEYS, TTL };