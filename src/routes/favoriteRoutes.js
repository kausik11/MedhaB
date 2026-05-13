const express = require("express");
const {
  getAllFavorites,
  getFavorites,
  addFavoriteItem,
  removeFavoriteItem,
  clearFavorites,
} = require("../controllers/favoriteController");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

const router = express.Router();

router.get("/all", adminMiddleware, getAllFavorites);

router.use(authMiddleware);

router.get("/", getFavorites);
router.post("/items", addFavoriteItem);
router.delete("/items/:productId", removeFavoriteItem);
router.delete("/", clearFavorites);

module.exports = router;
