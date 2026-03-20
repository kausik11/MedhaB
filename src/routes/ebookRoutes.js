const express = require("express");
const multer = require("multer");
const authMiddleware = require("../middlewares/authMiddleware");
const {
  getEbooks,
  getEbookById,
  createEbook,
  updateEbook,
  deleteEbook,
  searchEbooks,
  downloadEbook,
} = require("../controllers/ebookController");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB combined safety limit
  // fileFilter: (_req, file, cb) => {
  //   const isPdfField = file.fieldname === "pdf" || file.fieldname === "file";
  //   const isImageField = file.fieldname === "image" || file.fieldname === "banner";

  //   if (isPdfField && file.mimetype === "application/pdf") {
  //     return cb(null, true);
  //   }

  //   if (isImageField && file.mimetype.startsWith("image/")) {
  //     return cb(null, true);
  //   }

  //   return cb(new Error("Invalid file type"));
  // },
});

router.get("/", getEbooks);
router.get("/search", searchEbooks);
router.get("/:id/download", downloadEbook);
router.get("/:id", getEbookById);

router.post(
  "/",
  authMiddleware,
  upload.fields([
    { name: "pdf", maxCount: 1 },
    { name: "file", maxCount: 1 },
    { name: "image", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  createEbook
);
router.put(
  "/:id",
  authMiddleware,
  upload.fields([
    { name: "pdf", maxCount: 1 },
    { name: "file", maxCount: 1 },
    { name: "image", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  updateEbook
);
router.delete("/:id", authMiddleware, deleteEbook);

module.exports = router;
