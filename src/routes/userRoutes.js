const express = require("express");
const multer = require("multer");
const {
  registerUser,
  loginUser,
  getUsers,
  getUserById,
  updateUser,
} = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/register", upload.single("userImage"), registerUser);
router.post("/login", loginUser);
router.get("/", authMiddleware, getUsers);
router.get("/:id", authMiddleware, getUserById);
router.put("/:id", authMiddleware, upload.single("userImage"), updateUser);

module.exports = router;
