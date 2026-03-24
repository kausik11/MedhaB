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

const router = express.Router();

router.get("/", getOffers);
router.get("/promocode/:promoCode", getOfferByPromoCode);
router.get("/:id", getOfferById);
router.post("/", createOffer);
router.post("/apply", applyOfferByPromoCode);
router.put("/:id", updateOffer);
router.delete("/:id", deleteOffer);

module.exports = router;
