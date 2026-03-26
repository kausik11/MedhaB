const jwt = require("jsonwebtoken");
const User = require("../models/User");

const optionalAuthMiddleware = async (req, _res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token || !process.env.JWT_SECRET) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return next();
    }

    req.userId = decoded.userId;
    req.userRole = user.role;
    req.user = user;
  } catch (_error) {
    // Ignore invalid optional auth and continue as a public request.
  }

  return next();
};

module.exports = optionalAuthMiddleware;
