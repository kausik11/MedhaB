const TreatmentFaq = require("../models/TreatmentFaqs");
const Treatment = require("../models/Treatment");

const ensureTreatmentTitleExists = async (title) => {
  if (!title) return false;
  const match = await Treatment.findOne({ title: title.trim() }).select({ _id: 1 });
  return Boolean(match);
};

// GET /api/treatment-faqs
// Supports ?title=<treatment title> and ?q=<search term>
const getTreatmentFaqs = async (req, res) => {
  try {
    const { title, q } = req.query;
    const filters = {};

    if (title) {
      filters.title = title.trim();
    }

    if (q) {
      const regex = new RegExp(q, "i");
      filters.$or = [{ question: regex }, { answer: regex }, { nitprospective: regex }];
    }

    const faqs = await TreatmentFaq.find(filters).sort({ createdAt: -1 });
    return res.status(200).json(faqs);
  } catch (error) {
    console.error("Failed to fetch treatment FAQs:", error);
    return res.status(500).json({ message: "Failed to fetch treatment FAQs" });
  }
};

// GET /api/treatment-faqs/:id
const getTreatmentFaqById = async (req, res) => {
  try {
    const faq = await TreatmentFaq.findById(req.params.id);
    if (!faq) return res.status(404).json({ message: "FAQ not found" });
    return res.status(200).json(faq);
  } catch (error) {
    console.error("Failed to fetch treatment FAQ:", error);
    return res.status(500).json({ message: "Failed to fetch treatment FAQ" });
  }
};

// POST /api/treatment-faqs
const createTreatmentFaq = async (req, res) => {
  try {
    const { title, question, answer, nitprospective, link } = req.body;

    if (!title || !question || !answer || !nitprospective || !link) {
      return res.status(400).json({ message: "title, question, answer, nitprospective, and link are required" });
    }

    const exists = await ensureTreatmentTitleExists(title);
    if (!exists) {
      return res.status(400).json({ message: "Title must match an existing treatment title" });
    }

    const faq = await TreatmentFaq.create({
      title: title.trim(),
      question: question.trim(),
      answer: answer.trim(),
      nitprospective: nitprospective.trim(),
      link: link.trim(),
    });

    return res.status(201).json(faq);
  } catch (error) {
    console.error("Failed to create treatment FAQ:", error);
    return res.status(500).json({ message: "Failed to create treatment FAQ" });
  }
};

// PATCH /api/treatment-faqs/:id
const updateTreatmentFaq = async (req, res) => {
  try {
    const { title, question, answer, nitprospective, link } = req.body;
    const faq = await TreatmentFaq.findById(req.params.id);

    if (!faq) {
      return res.status(404).json({ message: "FAQ not found" });
    }

    if (title) {
      const exists = await ensureTreatmentTitleExists(title);
      if (!exists) {
        return res.status(400).json({ message: "Title must match an existing treatment title" });
      }
      faq.title = title.trim();
    }

    if (question) faq.question = question.trim();
    if (answer) faq.answer = answer.trim();
    if (nitprospective) faq.nitprospective = nitprospective.trim();
    if (link) faq.link = link.trim();

    await faq.save();
    return res.status(200).json(faq);
  } catch (error) {
    console.error("Failed to update treatment FAQ:", error);
    return res.status(500).json({ message: "Failed to update treatment FAQ" });
  }
};

// DELETE /api/treatment-faqs/:id
const deleteTreatmentFaq = async (req, res) => {
  try {
    const faq = await TreatmentFaq.findById(req.params.id);
    if (!faq) {
      return res.status(404).json({ message: "FAQ not found" });
    }

    await faq.deleteOne();
    return res.status(200).json({ message: "FAQ deleted" });
  } catch (error) {
    console.error("Failed to delete treatment FAQ:", error);
    return res.status(500).json({ message: "Failed to delete treatment FAQ" });
  }
};

module.exports = {
  getTreatmentFaqs,
  getTreatmentFaqById,
  createTreatmentFaq,
  updateTreatmentFaq,
  deleteTreatmentFaq,
};
