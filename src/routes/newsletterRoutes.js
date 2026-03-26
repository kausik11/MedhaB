const express = require("express");
const {
  createSubscription,
  listSubscriptions,
  getSubscription,
  updateSubscription,
  deleteSubscription,
} = require("../controllers/newsletterController");

const verifyRecaptcha = require("../middlewares/recaptchaMiddleware");

const router = express.Router();

router.post("/", verifyRecaptcha, createSubscription);
router.get("/", listSubscriptions);
router.get("/:id", getSubscription);
router.put("/:id", updateSubscription);
router.delete("/:id", deleteSubscription);

module.exports = router;
