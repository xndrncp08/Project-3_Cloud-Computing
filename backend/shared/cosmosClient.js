// shared/cosmosClient.js
// Cosmos DB is used ONLY for user profiles (auth). Chart/recipe data goes to Redis.
const { CosmosClient } = require("@azure/cosmos");

let client = null;
let usersContainer = null;

async function getUsersContainer() {
  if (usersContainer) return usersContainer;

  if (!client) {
    client = new CosmosClient({
      endpoint: process.env.COSMOS_ENDPOINT,
      key: process.env.COSMOS_KEY,
    });
  }

  const dbName = process.env.COSMOS_DB_NAME || "dietdashboard";
  const containerName = process.env.COSMOS_USERS_CONTAINER || "users";

  // createIfNotExists is safe to call repeatedly — no-ops if already exists
  const { database } = await client.databases.createIfNotExists({ id: dbName });
  const { container } = await database.containers.createIfNotExists({
    id: containerName,
    partitionKey: { paths: ["/email"] },
    // Encryption at rest is enabled by default in Cosmos DB — no extra config needed
  });

  usersContainer = container;
  return container;
}

module.exports = { getUsersContainer };
