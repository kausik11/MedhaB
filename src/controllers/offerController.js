const mongoose = require("mongoose");
const Offer = require("../models/Offer");
const { normalizePromoCode } = require("../models/Offer");

const roundAmount = (value) => Number((value || 0).toFixed(2));

const parseNumber = (value) => {
  if (value == null || value === "") return undefined;
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : NaN;
};

const getOffers = async (_req, res) => {
  try {
    const offers = await Offer.find().sort({ createdAt: -1 });
    return res.status(200).json(offers);
  } catch (error) {
    console.error("Failed to fetch offers:", error);
    return res.status(500).json({ message: "Failed to fetch offers" });
  }
};

const getOfferById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid offer id" });
    }

    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    return res.status(200).json(offer);
  } catch (error) {
    console.error("Failed to fetch offer:", error);
    return res.status(500).json({ message: "Failed to fetch offer" });
  }
};

const getOfferByPromoCode = async (req, res) => {
  try {
    const promoCode = normalizePromoCode(req.params.promoCode);
    if (!promoCode) {
      return res.status(400).json({ message: "promoCode is required" });
    }

    const offer = await Offer.findOne({ promoCode });
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    return res.status(200).json(offer);
  } catch (error) {
    console.error("Failed to fetch offer by promoCode:", error);
    return res.status(500).json({ message: "Failed to fetch offer" });
  }
};

const createOffer = async (req, res) => {
  try {
    const promoCode = normalizePromoCode(req.body.promoCode);
    const discountPercentage = parseNumber(req.body.discountPercentage);

    if (!promoCode) {
      return res.status(400).json({ message: "promoCode is required" });
    }

    if (discountPercentage === undefined || Number.isNaN(discountPercentage)) {
      return res.status(400).json({ message: "discountPercentage must be a valid number" });
    }

    if (discountPercentage < 0 || discountPercentage > 100) {
      return res
        .status(400)
        .json({ message: "discountPercentage must be between 0 and 100" });
    }

    const existingOffer = await Offer.findOne({ promoCode });
    if (existingOffer) {
      return res.status(409).json({ message: "promoCode already exists" });
    }

    const offer = await Offer.create({
      promoCode,
      discountPercentage,
    });

    return res.status(201).json(offer);
  } catch (error) {
    console.error("Failed to create offer:", error);
    return res.status(500).json({ message: "Failed to create offer" });
  }
};

const updateOffer = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid offer id" });
    }

    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    if (req.body.promoCode !== undefined) {
      const promoCode = normalizePromoCode(req.body.promoCode);
      if (!promoCode) {
        return res.status(400).json({ message: "promoCode cannot be empty" });
      }

      if (promoCode !== offer.promoCode) {
        const existingOffer = await Offer.findOne({ promoCode });
        if (existingOffer) {
          return res.status(409).json({ message: "promoCode already exists" });
        }
      }

      offer.promoCode = promoCode;
    }

    if (req.body.discountPercentage !== undefined) {
      const discountPercentage = parseNumber(req.body.discountPercentage);
      if (Number.isNaN(discountPercentage)) {
        return res
          .status(400)
          .json({ message: "discountPercentage must be a valid number" });
      }

      if (discountPercentage < 0 || discountPercentage > 100) {
        return res
          .status(400)
          .json({ message: "discountPercentage must be between 0 and 100" });
      }

      offer.discountPercentage = discountPercentage;
    }

    await offer.save();
    return res.status(200).json(offer);
  } catch (error) {
    console.error("Failed to update offer:", error);
    return res.status(500).json({ message: "Failed to update offer" });
  }
};

const deleteOffer = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid offer id" });
    }

    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    await offer.deleteOne();
    return res.status(200).json({ message: "Offer deleted" });
  } catch (error) {
    console.error("Failed to delete offer:", error);
    return res.status(500).json({ message: "Failed to delete offer" });
  }
};

const applyOfferByPromoCode = async (req, res) => {
  try {
    const promoCode = normalizePromoCode(req.body.promoCode);
    const subtotal = parseNumber(req.body.subtotal);

    if (!promoCode) {
      return res.status(400).json({ message: "promoCode is required" });
    }

    if (subtotal !== undefined && Number.isNaN(subtotal)) {
      return res.status(400).json({ message: "subtotal must be a valid number" });
    }

    if (typeof subtotal === "number" && subtotal < 0) {
      return res.status(400).json({ message: "subtotal cannot be negative" });
    }

    const offer = await Offer.findOne({ promoCode });
    if (!offer) {
      return res.status(404).json({ message: "Invalid promoCode" });
    }

    const response = {
      promoCode: offer.promoCode,
      discountPercentage: offer.discountPercentage,
      valid: true,
    };

    if (typeof subtotal === "number") {
      const discountAmount = roundAmount((subtotal * offer.discountPercentage) / 100);
      response.subtotal = roundAmount(subtotal);
      response.discountAmount = discountAmount;
      response.finalSubtotal = roundAmount(subtotal - discountAmount);
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error("Failed to apply offer:", error);
    return res.status(500).json({ message: "Failed to apply offer" });
  }
};

module.exports = {
  getOffers,
  getOfferById,
  getOfferByPromoCode,
  createOffer,
  updateOffer,
  deleteOffer,
  applyOfferByPromoCode,
};
