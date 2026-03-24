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

router.get("/", getOrders);
router.get("/order-id/:orderId", getOrderByOrderId);
router.get("/order-id/:orderId/status", getOrderStatusByOrderId);
router.get("/:id", getOrderById);

// router.post("/", authMiddleware, createOrder);
// router.put("/:id", authMiddleware, updateOrder);
// router.patch("/:id/status", authMiddleware, updateOrderStatus);
// router.delete("/:id", authMiddleware, deleteOrder);

// as of now we are removing the auth middleware
router.post("/", createOrder);
router.put("/:id", updateOrder);
router.patch("/:id/status", updateOrderStatus);
router.delete("/:id", deleteOrder);

module.exports = router;
