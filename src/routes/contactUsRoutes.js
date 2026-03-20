const express = require("express");
const {
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
} = require("../controllers/contactUsController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

// Public
router.get("/", getContacts);
router.get("/:id", getContactById);
router.post("/", createContact);

// Protected
router.put("/:id", authMiddleware, updateContact);
router.delete("/:id", authMiddleware, deleteContact);

module.exports = router;
