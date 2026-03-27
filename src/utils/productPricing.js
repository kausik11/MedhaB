const PRODUCT_QUANTITY_OPTIONS = [60, 90, 120];

const roundAmount = (value) => Number((value || 0).toFixed(2));

const parseProductQuantity = (value) => {
  if (value == null || value === "") {
    return undefined;
  }

  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue)) {
    return NaN;
  }

  return parsedValue;
};

const isSupportedProductQuantity = (value) => PRODUCT_QUANTITY_OPTIONS.includes(value);

const getBaseQuantity = (product) => {
  const quantity = parseProductQuantity(product?.quantity);
  return isSupportedProductQuantity(quantity) ? quantity : PRODUCT_QUANTITY_OPTIONS[0];
};

const getBaseActualPrice = (product) => {
  const actualPrice = Number(product?.actualPrice);
  return Number.isFinite(actualPrice) ? actualPrice : 0;
};

const getBaseCurrentPrice = (product) => {
  const discountPrice = Number(product?.discountPrice);
  if (Number.isFinite(discountPrice)) {
    return discountPrice;
  }

  return getBaseActualPrice(product);
};

const getPricePerCapsule = (price, quantity) => {
  if (!Number.isFinite(price) || !Number.isFinite(quantity) || quantity <= 0) {
    return 0;
  }

  return roundAmount(price / quantity);
};

const calculateVariantPricing = (product, requestedQuantity) => {
  const baseQuantity = getBaseQuantity(product);
  const selectedQuantity = isSupportedProductQuantity(requestedQuantity)
    ? requestedQuantity
    : baseQuantity;
  const baseActualPrice = getBaseActualPrice(product);
  const baseCurrentPrice = getBaseCurrentPrice(product);
  const actualPricePerCapsule = getPricePerCapsule(baseActualPrice, baseQuantity);
  const currentPricePerCapsule = getPricePerCapsule(baseCurrentPrice, baseQuantity);
  const actualPrice = roundAmount(actualPricePerCapsule * selectedQuantity);
  const currentPrice = roundAmount(currentPricePerCapsule * selectedQuantity);
  const discountAmount = roundAmount(Math.max(actualPrice - currentPrice, 0));
  const discountPercentage =
    actualPrice > 0 ? roundAmount((discountAmount / actualPrice) * 100) : 0;

  return {
    baseQuantity,
    selectedQuantity,
    actualPrice,
    currentPrice,
    discountPrice: currentPrice,
    pricePerCapsule: currentPricePerCapsule,
    actualPricePerCapsule,
    discountAmount,
    discountPercentage,
  };
};

const buildPricingByQuantity = (product) =>
  PRODUCT_QUANTITY_OPTIONS.map((quantity) => calculateVariantPricing(product, quantity));

const withVariantPricing = (product, requestedQuantity) => {
  const productObject =
    typeof product?.toObject === "function" ? product.toObject() : { ...product };
  const selectedPricing = calculateVariantPricing(productObject, requestedQuantity);

  return {
    ...productObject,
    availableQuantities: PRODUCT_QUANTITY_OPTIONS,
    selectedQuantity: selectedPricing.selectedQuantity,
    selectedPricing,
    pricingByQuantity: buildPricingByQuantity(productObject),
  };
};

module.exports = {
  PRODUCT_QUANTITY_OPTIONS,
  calculateVariantPricing,
  getBaseQuantity,
  getPricePerCapsule,
  isSupportedProductQuantity,
  parseProductQuantity,
  roundAmount,
  withVariantPricing,
};
