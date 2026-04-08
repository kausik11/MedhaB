const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  "https://medha-a.vercel.app",
  "https://www.medha.care",
  "https://medha.care",
];

const allowedOriginsFromEnv = `${process.env.CORS_ALLOWED_ORIGINS || ""}`
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  ...DEFAULT_ALLOWED_ORIGINS,
  ...allowedOriginsFromEnv,
]);

const allowedOriginPatterns = [
  /^https:\/\/medha-a(?:-[a-z0-9-]+)?\.vercel\.app$/i,
  /^https:\/\/(?:www\.)?medha\.care$/i,
];

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.has(origin)) {
    return true;
  }

  return allowedOriginPatterns.some((pattern) => pattern.test(origin));
};

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    const error = new Error(`Not allowed by CORS: ${origin}`);
    error.statusCode = 403;
    return callback(error);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true,
};

const applyCorsHeaders = (req, res) => {
  const origin = req.headers.origin;

  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,PATCH,OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    req.headers["access-control-request-headers"] ||
      "Content-Type, Authorization"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");
};

module.exports = {
  allowedOrigins: [...allowedOrigins],
  applyCorsHeaders,
  corsOptions,
  isAllowedOrigin,
};
