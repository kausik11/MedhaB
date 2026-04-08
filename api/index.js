const app = require("../app");
const connectDB = require("../src/config/db");
const { applyCorsHeaders } = require("../src/config/cors");

module.exports = async (req, res) => {
  try {
    applyCorsHeaders(req, res);

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      return res.end();
    }

    await connectDB();
    return app(req, res);
  } catch (err) {
    console.error("Request failed before handler:", err);
    res.statusCode = err.statusCode || 503;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ message: err.message || "Database unavailable" }));
  }
};
