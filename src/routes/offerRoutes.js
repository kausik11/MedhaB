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
const adminMiddleware = require("../middlewares/adminMiddleware");

const router = express.Router();

router.get("/", adminMiddleware, getOffers);
router.get("/promocode/:promoCode", getOfferByPromoCode);
router.get("/:id", adminMiddleware, getOfferById);
router.post("/", adminMiddleware, createOffer);
router.post("/apply", applyOfferByPromoCode);
router.put("/:id", adminMiddleware, updateOffer);
router.delete("/:id", adminMiddleware, deleteOffer);

module.exports = router;
