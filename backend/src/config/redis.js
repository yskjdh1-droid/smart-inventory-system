const Redis = require("ioredis");
const env = require("./env");

const redis = new Redis(env.redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 2,
  enableReadyCheck: true
});

redis.on("error", (err) => {
  if (env.nodeEnv !== "test") {
    console.warn("Redis connection error:", err.message);
  }
});

module.exports = { redis };
