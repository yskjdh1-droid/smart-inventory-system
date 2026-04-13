const app = require("./app");
const env = require("./config/env");
const { connectMongo } = require("./config/db");
const { redis } = require("./config/redis");

async function start() {
  try {
    await connectMongo();
    await redis.ping();

    app.listen(env.port, () => {
      console.log(`Server running on port ${env.port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
}

start();
