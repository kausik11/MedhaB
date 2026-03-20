const { BASE_CURRENCY } = require("../constants/pricing");

const parseBoolean = (value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalizedValue = `${value}`.trim().toLowerCase();

  if (["true", "1", "yes"].includes(normalizedValue)) {
    return true;
  }

  if (["false", "0", "no"].includes(normalizedValue)) {
    return false;
  }

  return null;
};

const roundPrice = (value) => Number(Number(value).toFixed(2));

const formatCurrency = (amount, currency = BASE_CURRENCY) =>
  new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);

module.exports = {
  parseBoolean,
  roundPrice,
  formatCurrency,
};
