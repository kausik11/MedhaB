const authMiddleware = require("./authMiddleware");
const { ADMIN_PANEL_ROLES } = require("../constants/userRoles");

const adminMiddleware = (req, res, next) =>
  authMiddleware(req, res, () => {
    if (!ADMIN_PANEL_ROLES.includes(req.userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    return next();
  });

module.exports = adminMiddleware;
