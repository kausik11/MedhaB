const express = require("express");
const {
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
} = require("../controllers/contactUsController");
const adminMiddleware = require("../middlewares/adminMiddleware");
const verifyRecaptcha = require("../middlewares/recaptchaMiddleware");

const router = express.Router();

// Public
router.get("/", getContacts);
router.get("/:id", getContactById);
router.post("/", verifyRecaptcha, createContact);

// Protected
router.put("/:id", adminMiddleware, updateContact);
router.delete("/:id", adminMiddleware, deleteContact);

module.exports = router;
