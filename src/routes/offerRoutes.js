const express = require("express");
const {
  getOffers,
  getOfferById,
  getOfferByPromoCode,
  createOffer,
  updateOffer,
  deleteOffer,
  applyOfferByPromoCode,
} = require("../controllers/offerController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", authMiddleware, getOffers);
router.get("/promocode/:promoCode", getOfferByPromoCode);
router.get("/:id", authMiddleware, getOfferById);
router.post("/", authMiddleware, createOffer);
router.post("/apply", applyOfferByPromoCode);
router.put("/:id", authMiddleware, updateOffer);
router.delete("/:id", authMiddleware, deleteOffer);

module.exports = router;
