const app = require("../app");
const connectDB = require("../src/config/db");

const allowedOrigins = [
   "https://medha-a.vercel.app"
];

const applyCorsHeaders = (req, res) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,PATCH,OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    req.headers["access-control-request-headers"] || "Content-Type, Authorization"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");
};

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
