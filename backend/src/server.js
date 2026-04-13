const app = require("./app");
const env = require("./config/env");
const { connectMongo } = require("./config/db");
const { redis } = require("./config/redis");
const { startLoanReminderScheduler } = require("./services/loan-reminder.service");

async function start() {
  try {
    await connectMongo();
    await redis.ping();
    startLoanReminderScheduler();

    app.listen(env.port, () => {
      console.log(`Server running on port ${env.port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
}

start();
