const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { ADMIN_PANEL_ROLES } = require("../constants/userRoles");

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return res.status(401).json({ message: "Authorization token missing" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ message: "Invalid token user" });

    if (user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ message: "Token expired due to new login" });
    }

    if (!ADMIN_PANEL_ROLES.includes(user.role)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    req.userId = decoded.userId;
    req.userRole = user.role;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;
