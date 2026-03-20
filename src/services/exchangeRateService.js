const {
  BASE_CURRENCY,
  EXCHANGE_RATE_CACHE_TTL_MS,
  SUPPORTED_CURRENCIES,
} = require("../constants/pricing");

const EXCHANGE_RATE_TIMEOUT_MS = Number(process.env.EXCHANGE_RATE_TIMEOUT_MS) || 5000;

let exchangeRateCache = {
  expiresAt: 0,
  rates: null,
};

const buildRatesPayload = (rates = {}) => {
  const normalizedRates = {
    [BASE_CURRENCY]: 1,
  };

  for (const currency of SUPPORTED_CURRENCIES) {
    if (currency === BASE_CURRENCY) {
      continue;
    }

    const rate = Number(rates[currency]);
    if (Number.isFinite(rate) && rate > 0) {
      normalizedRates[currency] = rate;
    }
  }

  return normalizedRates;
};

const fetchJson = async (url) => {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), EXCHANGE_RATE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Exchange rate request failed with status ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeoutHandle);
  }
};

const rateProviders = [
  async () => {
    const payload = await fetchJson(
      `https://open.er-api.com/v6/latest/${encodeURIComponent(BASE_CURRENCY)}`
    );

    if (payload?.result !== "success" || !payload?.rates) {
      throw new Error("open.er-api returned an invalid exchange-rate payload");
    }

    return buildRatesPayload(payload.rates);
  },
  async () => {
    const currencies = SUPPORTED_CURRENCIES.filter(
      (currency) => currency !== BASE_CURRENCY
    ).join(",");

    const payload = await fetchJson(
      `https://api.frankfurter.app/latest?from=${encodeURIComponent(
        BASE_CURRENCY
      )}&to=${encodeURIComponent(currencies)}`
    );

    if (!payload?.rates) {
      throw new Error("Frankfurter returned an invalid exchange-rate payload");
    }

    return buildRatesPayload(payload.rates);
  },
];

const fetchExchangeRates = async () => {
  for (const provider of rateProviders) {
    try {
      const rates = await provider();
      if (Object.keys(rates).length > 0) {
        return rates;
      }
    } catch (error) {
      console.error("Exchange rate provider failed:", error.message);
    }
  }

  throw new Error("Unable to fetch exchange rates");
};

const getExchangeRates = async () => {
  if (exchangeRateCache.rates && exchangeRateCache.expiresAt > Date.now()) {
    return exchangeRateCache.rates;
  }

  const freshRates = await fetchExchangeRates();

  exchangeRateCache = {
    rates: freshRates,
    expiresAt: Date.now() + EXCHANGE_RATE_CACHE_TTL_MS,
  };

  return freshRates;
};

const convertFromInr = async (inrPrice, currency) => {
  if (currency === BASE_CURRENCY) {
    return inrPrice;
  }

  const rates = await getExchangeRates();
  const exchangeRate = rates[currency];

  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    throw new Error(`Missing exchange rate for ${currency}`);
  }

  return inrPrice * exchangeRate;
};

module.exports = {
  convertFromInr,
  getExchangeRates,
};
