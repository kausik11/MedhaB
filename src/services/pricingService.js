const {
  BASE_CURRENCY,
  DEFAULT_COUNTRY,
  VPN_DEFAULT_CURRENCY,
  getCurrencyForCountry,
} = require("../constants/pricing");
const { resolveRequestCountry } = require("./countryResolutionService");
const { convertFromInr } = require("./exchangeRateService");
const { formatCurrency, roundPrice } = require("../utils/pricing");

const buildPricingResponse = ({ price, currency, country, vpnDetected }) => ({
  price: roundPrice(price),
  currency,
  formattedPrice: formatCurrency(roundPrice(price), currency),
  country: country || DEFAULT_COUNTRY,
  vpnDetected,
});

const getPriceQuote = async ({ req, inrPrice, isVPN = false }) => {
  const country = await resolveRequestCountry(req);
  const targetCurrency = isVPN ? VPN_DEFAULT_CURRENCY : getCurrencyForCountry(country);

  try {
    const convertedPrice = await convertFromInr(inrPrice, targetCurrency);

    return buildPricingResponse({
      price: convertedPrice,
      currency: targetCurrency,
      country,
      vpnDetected: isVPN,
    });
  } catch (error) {
    console.error("Price conversion failed, falling back to INR:", error.message);

    return buildPricingResponse({
      price: inrPrice,
      currency: BASE_CURRENCY,
      country,
      vpnDetected: isVPN,
    });
  }
};

module.exports = {
  getPriceQuote,
};
