const mongoose = require("mongoose");
const Favorite = require("../models/Favorite");
const Product = require("../models/Product");

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const populateFavoriteQuery = (query) =>
  query
    .populate("user", "firstName lastName email phoneNumber role")
    .populate({
      path: "products",
      populate: {
        path: "category",
        select: "name normalizedName",
      },
    });

const populateFavoriteDocument = (favorite) =>
  favorite.populate([
    { path: "user", select: "firstName lastName email phoneNumber role" },
    {
      path: "products",
      populate: {
        path: "category",
        select: "name normalizedName",
      },
    },
  ]);

const buildEmptyFavoriteResponse = (userId) => ({
  user: userId,
  products: [],
  itemCount: 0,
});

const serializeFavorite = (favorite, userId) => {
  if (!favorite) {
    return buildEmptyFavoriteResponse(userId);
  }

  const products = Array.isArray(favorite.products)
    ? favorite.products.filter(Boolean)
    : [];

  return {
    _id: favorite._id,
    user: favorite.user,
    products,
    itemCount: products.length,
    createdAt: favorite.createdAt,
    updatedAt: favorite.updatedAt,
  };
};

const ensureProductExists = async (productId) => {
  if (!isValidObjectId(productId)) {
    return { error: "Invalid product id", statusCode: 400 };
  }

  const product = await Product.findById(productId);
  if (!product) {
    return { error: "Product not found", statusCode: 404 };
  }

  return { product };
};

const getFavorites = async (req, res) => {
  try {
    const favorite = await populateFavoriteQuery(
      Favorite.findOne({ user: req.userId })
    );
    return res.status(200).json(serializeFavorite(favorite, req.userId));
  } catch (error) {
    console.error("Failed to fetch favourites:", error);
    return res.status(500).json({ message: "Failed to fetch favourites" });
  }
};

const getAllFavorites = async (_req, res) => {
  try {
    const favorites = await populateFavoriteQuery(
      Favorite.find().sort({ updatedAt: -1 })
    );
    return res
      .status(200)
      .json(favorites.map((favorite) => serializeFavorite(favorite, favorite.user?._id || favorite.user)));
  } catch (error) {
    console.error("Failed to fetch all favourites:", error);
    return res.status(500).json({ message: "Failed to fetch all favourites" });
  }
};

const addFavoriteItem = async (req, res) => {
  try {
    const { productId } = req.body || {};
    const { error, product, statusCode = 404 } = await ensureProductExists(productId);

    if (error) {
      return res.status(statusCode).json({ message: error });
    }

    const favorite = await Favorite.findOneAndUpdate(
      { user: req.userId },
      { $addToSet: { products: product._id } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await populateFavoriteDocument(favorite);
    return res.status(200).json(serializeFavorite(favorite, req.userId));
  } catch (error) {
    console.error("Failed to add favourite:", error);
    return res.status(500).json({ message: "Failed to add favourite" });
  }
};

const removeFavoriteItem = async (req, res) => {
  try {
    const productId = `${req.params.productId || ""}`.trim();

    if (!productId || !isValidObjectId(productId)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const favorite = await Favorite.findOne({ user: req.userId });

    if (!favorite) {
      return res.status(404).json({ message: "Favourites not found" });
    }

    const initialLength = favorite.products.length;
    favorite.products = favorite.products.filter(
      (item) => `${item}` !== productId
    );

    if (favorite.products.length === initialLength) {
      return res.status(404).json({ message: "Product not found in favourites" });
    }

    if (favorite.products.length === 0) {
      await favorite.deleteOne();
      return res.status(200).json(buildEmptyFavoriteResponse(req.userId));
    }

    await favorite.save();
    await populateFavoriteDocument(favorite);
    return res.status(200).json(serializeFavorite(favorite, req.userId));
  } catch (error) {
    console.error("Failed to remove favourite:", error);
    return res.status(500).json({ message: "Failed to remove favourite" });
  }
};

const clearFavorites = async (req, res) => {
  try {
    await Favorite.findOneAndDelete({ user: req.userId });
    return res.status(200).json(buildEmptyFavoriteResponse(req.userId));
  } catch (error) {
    console.error("Failed to clear favourites:", error);
    return res.status(500).json({ message: "Failed to clear favourites" });
  }
};

module.exports = {
  getAllFavorites,
  getFavorites,
  addFavoriteItem,
  removeFavoriteItem,
  clearFavorites,
};
