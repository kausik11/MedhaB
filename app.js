const express = require("express");
const path = require("path");
const app = express();
const morgan = require("morgan");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const testimonialRoutes = require("./src/routes/testimonialRoutes");
const blogRoutes = require("./src/routes/blogRoutes");
const blogCategoryRoutes = require("./src/routes/blogCategoryRoutes");
const blogSubCategoryRoutes = require("./src/routes/blogSubCategoryRoutes");
const callbackRoutes = require("./src/routes/callbackRoutes");
const newsletterRoutes = require("./src/routes/newsletterRoutes");
const addressRoutes = require("./src/routes/addressRoutes");
const contactUsRoutes = require("./src/routes/contactUsRoutes");
const jobRoutes = require("./src/routes/jobRoutes");
const applicationRoutes = require("./src/routes/applicationRoutes");
const userRoutes = require("./src/routes/userRoutes");
const countRoutes = require("./src/routes/countRoutes");
const analyticsRoutes = require("./src/routes/analyticsRoutes");
const patientSuccessRoutes = require("./src/routes/patientSuccessRoutes");
const productRoutes = require("./src/routes/productRoutes");
const productCategoryRoutes = require("./src/routes/productCategoryRoutes");
const pricingRoutes = require("./src/routes/pricingRoutes");
const authMiddleware = require("./src/middlewares/authMiddleware");
const globalErrorHandler = require("./src/middlewares/globalErrorHandler");
const PreferenceEvent = require("./src/models/PreferenceEvent");

// Honor reverse proxies (e.g. Vercel) so req.ip contains the real client IP
app.set("trust proxy", true);

const allowedOrigins = [
  "http://localhost:5173"
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const preferenceDefaults = {
  country: "IN",
  region: "WB",
  timezone: "Asia/Kolkata",
  currency: "INR",
};

const getCookieOptions = () => ({
  maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
   path: "/",
});

// Read preference cookies and expose defaults if missing
// app.use((req, res, next) => {
//   const fromCookies = req.cookies || {};
//   const preferences = {
//     country: fromCookies.country || preferenceDefaults.country,
//     region: fromCookies.region || preferenceDefaults.region,
//     timezone: fromCookies.timezone || preferenceDefaults.timezone,
//     language: fromCookies.language || preferenceDefaults.language,
//     currency: fromCookies.currency || preferenceDefaults.currency,
//   };

//   req.preferences = preferences;
//   res.locals.preferences = preferences;
//   next();
// });

// Set preference cookies (explicit POST)
app.post("/set-preferences", async (req, res, next) => {
  const options = getCookieOptions();
  const incoming = req.body || {};
  const preferences = {
    country: incoming.location.country_name || preferenceDefaults.country,
    region: incoming.location.state_code || preferenceDefaults.region,
    timezone: incoming.location.city  || preferenceDefaults.timezone,
    currency: incoming.currency.code || preferenceDefaults.currency,
  };

  Object.entries(preferences).forEach(([key, value]) => {
    res.cookie(key, value, options);
  });

  try {
    const { ip, location, country_metadata, currency, city,country_name, zipcode,district } = req.body || {};

    if (!ip || !location || !country_metadata || !currency) {
      return res.status(400).json({
        ok: false,
        message:
          "Missing required fields: ip, location, country_metadata, currency",
      });
    }

    await PreferenceEvent.create({
      ip,
      location,
      country_metadata,
      currency,
    });

    return res.json({ ok: true, preferences });
  } catch (err) {
    return next(err);
  }
});

const sendPreferenceEvents = async (_req, res, next) => {
  try {
    const events = await PreferenceEvent.find().sort({ createdAt: -1 });
    return res.json({ ok: true, count: events.length, events });
  } catch (err) {
    return next(err);
  }
};

// Fetch all stored preference events (admin/debug use)
app.get("/preference-events", sendPreferenceEvents);
// Admin app calls /api via axios baseURL
app.get("/api/preference-events", sendPreferenceEvents);

// Quick responses to keep serverless invocations short
app.get("/", (_req, res) => res.json({ ok: true, message: "API is running" }));
app.get("/favicon.ico", (_req, res) => res.status(204).end());

// Lightweight health check (no DB call)
app.get("/api/health", (_req, res) =>
  res.json({ ok: true, uptime: process.uptime(), ts: Date.now() })
);

// app.use(pricingRoutes);
// app.use("/api", pricingRoutes);

// Auth routes (login/register) remain public
app.use("/api/users", userRoutes);

// Protected admin resources
app.use("/api/testimonials", testimonialRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/blog-categories", blogCategoryRoutes);
app.use("/api/blog-subcategories", blogSubCategoryRoutes);

// ****************************************************************** //



// Addresses: router handles auth for writes; reads remain public
app.use("/api/addresses", addressRoutes);
// Contact submissions: router handles auth for writes; reads remain public
app.use("/api/contact-us", contactUsRoutes);
// Careers and applications
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);

// Public endpoints
app.use("/api/callbacks", callbackRoutes);
app.use("/api/newsletter", newsletterRoutes);

// count for cities and Members
app.use("/api/cities", countRoutes);
// Visitor analytics
app.use("/api/analytics", analyticsRoutes);
// Patient success stories: public read, protected write
app.use("/api/patient-success-stories", patientSuccessRoutes);
// Product categories
app.use("/api/product-categories", productCategoryRoutes);
// Products: public read, protected write
app.use("/api/products", productRoutes);
// 404 handler for any unmatched routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Not found" });
});

// Global error handler must be last
app.use(globalErrorHandler);


module.exports = app;
