const express = require("express");
const {
  createCallback,
  updateCallback,
  listCallbacks,
  getCallback,
} = require("../controllers/callbackController");

const router = express.Router();

router.post("/", createCallback);
router.put("/:id", updateCallback);
router.get("/", listCallbacks);
router.get("/:id", getCallback);

module.exports = router;
