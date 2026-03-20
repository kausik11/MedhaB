const BASE_CURRENCY = "INR";
const DEFAULT_COUNTRY = "IN";
const DEFAULT_CURRENCY = "INR";
const VPN_DEFAULT_CURRENCY = "USD";
const EXCHANGE_RATE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const COUNTRY_TO_CURRENCY = Object.freeze({
  IN: "INR",
  US: "USD",
  DE: "EUR",
  AE: "AED",
  GB: "GBP",
});

const SUPPORTED_CURRENCIES = Object.freeze(
  [...new Set([BASE_CURRENCY, ...Object.values(COUNTRY_TO_CURRENCY)])]
);

const getCurrencyForCountry = (countryCode) =>
  COUNTRY_TO_CURRENCY[countryCode] || DEFAULT_CURRENCY;

module.exports = {
  BASE_CURRENCY,
  DEFAULT_COUNTRY,
  DEFAULT_CURRENCY,
  VPN_DEFAULT_CURRENCY,
  EXCHANGE_RATE_CACHE_TTL_MS,
  COUNTRY_TO_CURRENCY,
  SUPPORTED_CURRENCIES,
  getCurrencyForCountry,
};
