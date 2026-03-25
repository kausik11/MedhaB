const express = require("express");
const multer = require("multer");
const {
  registerUser,
  loginUser,
  loginAdminUser,
  getUsers,
  getUserById,
  updateUser,
} = require("../controllers/userController");
const adminMiddleware = require("../middlewares/adminMiddleware");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/register", upload.single("userImage"), registerUser);
router.post("/login", loginUser);
router.post("/admin-login", loginAdminUser);
router.get("/", adminMiddleware, getUsers);
router.get("/:id", adminMiddleware, getUserById);
router.put("/:id", adminMiddleware, upload.single("userImage"), updateUser);

module.exports = router;
