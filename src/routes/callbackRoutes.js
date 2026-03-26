const express = require("express");
const {
  createCallback,
  updateCallback,
  listCallbacks,
  getCallback,
} = require("../controllers/callbackController");

const verifyRecaptcha = require("../middlewares/recaptchaMiddleware");

const router = express.Router();

router.post("/", verifyRecaptcha, createCallback);
router.put("/:id", updateCallback);
router.get("/", listCallbacks);
router.get("/:id", getCallback);

module.exports = router;
