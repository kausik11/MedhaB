const express = require("express");
const {
  getAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
} = require("../controllers/addressController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

// Public
router.get("/", getAddresses);
router.get("/:id", getAddressById);

// Protected
router.post("/", authMiddleware, createAddress);
router.put("/:id", authMiddleware, updateAddress);
router.delete("/:id", authMiddleware, deleteAddress);

module.exports = router;
