const express = require("express");
const {
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
} = require("../controllers/contactUsController");
const adminMiddleware = require("../middlewares/adminMiddleware");

const router = express.Router();

// Public
router.get("/", getContacts);
router.get("/:id", getContactById);
router.post("/", createContact);

// Protected
router.put("/:id", adminMiddleware, updateContact);
router.delete("/:id", adminMiddleware, deleteContact);

module.exports = router;
