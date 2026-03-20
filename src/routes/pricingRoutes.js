const express = require("express");
const { getPrice } = require("../controllers/pricingController");

const router = express.Router();

router.get("/get-price", getPrice);

module.exports = router;
