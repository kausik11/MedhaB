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

const router = express.Router();

router.get("/", authMiddleware, getOrders);
router.get("/order-id/:orderId", getOrderByOrderId);
router.get("/order-id/:orderId/status", getOrderStatusByOrderId);
router.get("/:id", authMiddleware, getOrderById);
router.post("/", authMiddleware, createOrder);
router.put("/:id", authMiddleware, updateOrder);
router.patch("/:id/status", authMiddleware, updateOrderStatus);
router.delete("/:id", authMiddleware, deleteOrder);

module.exports = router;
