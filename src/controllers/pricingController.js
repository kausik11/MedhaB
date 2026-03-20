const { getPriceQuote } = require("../services/pricingService");
const { parseBoolean } = require("../utils/pricing");

const getPrice = async (req, res, next) => {
  try {
    const rawInrPrice = req.query.inrPrice;

    if (rawInrPrice === undefined) {
      return res.status(400).json({
        success: false,
        message: "inrPrice query parameter is required.",
      });
    }

    const inrPrice = Number(rawInrPrice);

    if (!Number.isFinite(inrPrice) || inrPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "inrPrice must be a valid non-negative number.",
      });
    }

    const parsedVpnFlag = parseBoolean(req.query.isVPN);

    if (req.query.isVPN !== undefined && parsedVpnFlag === null) {
      return res.status(400).json({
        success: false,
        message: "isVPN must be a boolean value.",
      });
    }

    const quote = await getPriceQuote({
      req,
      inrPrice,
      isVPN: parsedVpnFlag === true,
    });

    return res.status(200).json(quote);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getPrice,
};
