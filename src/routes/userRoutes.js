const express = require("express");
const multer = require("multer");
const {
  sendRegistrationEmailOtp,
  verifyRegistrationEmailOtp,
  sendEmailVerificationOtp,
  verifyEmailOtp,
  registerUser,
  loginUser,
  loginAdminUser,
  loginWithOtp,
  registerWithOtp,
  getUsers,
  getUserById,
  updateUser,
} = require("../controllers/userController");
const adminMiddleware = require("../middlewares/adminMiddleware");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/send-registration-email-otp", sendRegistrationEmailOtp);
router.post("/verify-registration-email-otp", verifyRegistrationEmailOtp);
router.post("/send-email-verification-otp", authMiddleware, sendEmailVerificationOtp);
router.post("/verify-email-otp", authMiddleware, verifyEmailOtp);
router.post("/register", upload.single("userImage"), registerUser);
router.post("/login", loginUser);
router.post("/admin-login", loginAdminUser);
router.post("/otp-login", loginWithOtp);
router.post("/otp-register", registerWithOtp);
router.get("/", adminMiddleware, getUsers);
router.get("/:id", adminMiddleware, getUserById);
router.put("/:id", adminMiddleware, upload.single("userImage"), updateUser);

module.exports = router;
