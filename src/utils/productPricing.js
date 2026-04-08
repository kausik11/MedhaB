const PRODUCT_QUANTITY_OPTIONS = [60, 90, 120];

const roundAmount = (value) => Number((value || 0).toFixed(2));

const toQuantityKey = (value) => {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) ? `${parsedValue}` : "";
};

const normalizeImageList = (images) =>
  Array.isArray(images)
    ? images.filter((image) => image && typeof image.imageUrl === "string" && image.imageUrl.trim())
    : [];

const getRawQuantityImages = (product) =>
  product && typeof product === "object" && product.quantityImages && typeof product.quantityImages === "object"
    ? product.quantityImages
    : {};

const getFirstAvailableImages = (quantityImages) => {
  for (const quantity of PRODUCT_QUANTITY_OPTIONS) {
    const images = normalizeImageList(quantityImages?.[toQuantityKey(quantity)]);
    if (images.length) {
      return images;
    }
  }

  return [];
};

const normalizeQuantityImages = (product) => {
  const quantityImages = getRawQuantityImages(product);
  const normalizedImages = PRODUCT_QUANTITY_OPTIONS.reduce((result, quantity) => {
    result[toQuantityKey(quantity)] = normalizeImageList(
      quantityImages?.[toQuantityKey(quantity)]
    );
    return result;
  }, {});

  const baseQuantityKey = toQuantityKey(getBaseQuantity(product));
  const legacyImages = normalizeImageList(product?.images);

  if (!normalizedImages[baseQuantityKey].length && legacyImages.length) {
    normalizedImages[baseQuantityKey] = legacyImages;
  }

  return normalizedImages;
};

const getProductImagesForQuantity = (product, requestedQuantity) => {
  const normalizedImages = normalizeQuantityImages(product);
  const requestedQuantityKey = toQuantityKey(requestedQuantity);

  if (requestedQuantityKey && normalizedImages[requestedQuantityKey]?.length) {
    return normalizedImages[requestedQuantityKey];
  }

  const baseQuantityKey = toQuantityKey(getBaseQuantity(product));
  if (normalizedImages[baseQuantityKey]?.length) {
    return normalizedImages[baseQuantityKey];
  }

  return getFirstAvailableImages(normalizedImages);
};

const syncLegacyImagesField = (product) => {
  if (!product || typeof product !== "object") {
    return [];
  }

  const normalizedImages = normalizeQuantityImages(product);
  const baseQuantityKey = toQuantityKey(getBaseQuantity(product));
  const nextImages =
    normalizedImages[baseQuantityKey]?.length
      ? normalizedImages[baseQuantityKey]
      : getFirstAvailableImages(normalizedImages);

  product.images = nextImages;
  return nextImages;
};

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
  const quantityImages = normalizeQuantityImages(productObject);
  const selectedImages = getProductImagesForQuantity(
    productObject,
    selectedPricing.selectedQuantity
  );

  return {
    ...productObject,
    quantityImages,
    images: selectedImages,
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
  getProductImagesForQuantity,
  getPricePerCapsule,
  isSupportedProductQuantity,
  normalizeQuantityImages,
  parseProductQuantity,
  roundAmount,
  syncLegacyImagesField,
  toQuantityKey,
  withVariantPricing,
};
