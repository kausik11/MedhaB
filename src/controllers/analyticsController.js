const crypto = require("crypto");
const DailyVisitStat = require("../models/DailyVisitStat");

const analyticsSalt = process.env.ANALYTICS_SALT || process.env.JWT_SECRET;
if (!analyticsSalt) {
  throw new Error("ANALYTICS_SALT or JWT_SECRET must be set to hash visitor identifiers");
}

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0];
  }
  return req.ip || req.connection?.remoteAddress || "unknown";
};

const hashVisitor = (req) => {
  const ip = getClientIp(req);
  const userAgent = req.headers["user-agent"] || "unknown";
  const acceptLanguage = req.headers["accept-language"] || "unknown";
  const rawId = `${ip}|${userAgent}|${acceptLanguage}`;

  return crypto.createHmac("sha256", analyticsSalt).update(rawId).digest("hex");
};

const dateKey = (date = new Date()) => date.toISOString().slice(0, 10);

const trackVisit = async (req, res, next) => {
  try {
    const visitorId = hashVisitor(req);
    const now = new Date();
    const today = dateKey(now);

    const updated = await DailyVisitStat.findOneAndUpdate(
      { date: today },
      [
        {
          $set: {
            date: today,
            pageViews: { $add: [{ $ifNull: ["$pageViews", 0] }, 1] },
            lastSeenAt: now,
            isNewVisitor: {
              $not: { $in: [visitorId, { $ifNull: ["$visitorHashes", []] }] },
            },
            visitorHashes: {
              $let: {
                vars: { existing: { $ifNull: ["$visitorHashes", []] } },
                in: {
                  $cond: [
                    { $in: [visitorId, "$$existing"] },
                    "$$existing",
                    { $concatArrays: ["$$existing", [visitorId]] },
                  ],
                },
              },
            },
          },
        },
        {
          $set: {
            uniqueVisitors: {
              $add: [
                { $ifNull: ["$uniqueVisitors", 0] },
                { $cond: ["$isNewVisitor", 1, 0] },
              ],
            },
          },
        },
        { $unset: "isNewVisitor" },
      ],
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
        updatePipeline: true,
      }
    ).select({ visitorHashes: 0 });

    return res.status(200).json({
      date: updated.date,
      pageViews: updated.pageViews,
      uniqueVisitors: updated.uniqueVisitors,
      lastSeenAt: updated.lastSeenAt,
    });
  } catch (error) {
    return next(error);
  }
};

const getDailyStats = async (req, res, next) => {
  try {
    const today = dateKey();
    const defaultStart = dateKey(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));

    const start = req.query.start || defaultStart;
    const end = req.query.end || today;

    const stats = await DailyVisitStat.find({
      date: { $gte: start, $lte: end },
    })
      .sort({ date: 1 })
      .select({ visitorHashes: 0 })
      .lean();

    const totals = stats.reduce(
      (acc, stat) => {
        acc.pageViews += stat.pageViews;
        acc.uniqueVisitors += stat.uniqueVisitors;
        return acc;
      },
      { pageViews: 0, uniqueVisitors: 0 }
    );

    return res.status(200).json({
      range: { start, end },
      totals,
      days: stats,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  trackVisit,
  getDailyStats,
};
