const express = require("express");
const { getApplications, getApplicationById } = require("../controllers/jobApplicationController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", authMiddleware, getApplications);
router.get("/:id", authMiddleware, getApplicationById);

module.exports = router;
