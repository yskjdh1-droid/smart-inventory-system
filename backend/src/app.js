const express = require("express");
const cors = require("cors");
const path = require("path");
const authRoutes = require("./routes/auth.routes");
const equipmentRoutes = require("./routes/equipment.routes");
const categoriesRoutes = require("./routes/categories.routes");
const loansRoutes = require("./routes/loans.routes");
const rentalRequestsRoutes = require("./routes/rentalRequests.routes");
const repairsRoutes = require("./routes/repairs.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const usersRoutes = require("./routes/users.routes");
const adminRoutes = require("./routes/admin.routes");
const filesRoutes = require("./routes/files.routes");
const env = require("./config/env");
const { errorHandler } = require("./middlewares/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.resolve(process.cwd(), env.uploadDir)));

app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, message: "OK" });
});

app.use("/api/auth", authRoutes);
app.use("/api/equipment", equipmentRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/loans", loansRoutes);
app.use("/api/rental-requests", rentalRequestsRoutes);
app.use("/api/repairs", repairsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/files", filesRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, error: "NOT_FOUND", message: "Route not found" });
});

app.use(errorHandler);

module.exports = app;
