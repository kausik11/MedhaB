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

router.use(authMiddleware);

router.get("/", getAddresses);
router.get("/:id", getAddressById);
router.post("/", createAddress);
router.put("/:id", updateAddress);
router.delete("/:id", deleteAddress);

module.exports = router;
