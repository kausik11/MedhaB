const express = require("express");
const {
  getAllCarts,
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require("../controllers/cartController");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

const router = express.Router();

router.get("/all", adminMiddleware, getAllCarts);

router.use(authMiddleware);

router.get("/", getCart);
router.post("/items", addCartItem);
router.put("/items/:productId", updateCartItem);
router.delete("/items/:productId", removeCartItem);
router.delete("/", clearCart);

module.exports = router;
