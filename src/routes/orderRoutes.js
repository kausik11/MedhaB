const express = require("express");
const {
  getOrders,
  getOrderById,
  getOrderByOrderId,
  getOrderStatusByOrderId,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
} = require("../controllers/orderController");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

const router = express.Router();

router.get("/", authMiddleware, getOrders);
router.get("/order-id/:orderId", authMiddleware, getOrderByOrderId);
router.get("/order-id/:orderId/status", authMiddleware, getOrderStatusByOrderId);
router.get("/:id", authMiddleware, getOrderById);
router.post("/", authMiddleware, createOrder);
router.put("/:id", adminMiddleware, updateOrder);
router.patch("/:id/status", adminMiddleware, updateOrderStatus);
router.delete("/:id", adminMiddleware, deleteOrder);

module.exports = router;
