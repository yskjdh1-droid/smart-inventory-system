const mongoose = require("mongoose");
const env = require("./env");

async function connectMongo() {
  if (!env.mongoUri) {
    throw new Error("MONGODB_URI is required");
  }
  await mongoose.connect(env.mongoUri);
}

module.exports = { connectMongo };
