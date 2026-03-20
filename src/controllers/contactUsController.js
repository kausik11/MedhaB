const ContactUs = require("../models/ContactUs");

const buildFullName = (body) => {
  const fullname = body.fullname?.trim();
  if (fullname) return fullname;

  const first = body.firstname?.trim();
  const last = body.lastname?.trim();
  const combined = [first, last].filter(Boolean).join(" ").trim();
  return combined;
};

const getContacts = async (_req, res) => {
  try {
    const contacts = await ContactUs.find().sort({ createdAt: -1 });
    res.status(200).json(contacts);
  } catch (error) {
    console.error("Failed to fetch contact submissions:", error);
    res.status(500).json({ message: "Failed to fetch contact submissions" });
  }
};

const getContactById = async (req, res) => {
  try {
    const contact = await ContactUs.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({ message: "Contact submission not found" });
    }
    res.status(200).json(contact);
  } catch (error) {
    console.error("Failed to fetch contact submission:", error);
    res.status(500).json({ message: "Failed to fetch contact submission" });
  }
};

const createContact = async (req, res) => {
  try {
    const fullname = buildFullName(req.body);
    const phone = req.body.phone?.trim();
    const email = req.body.email?.trim();
    const comments = req.body.comments?.trim();

    if (!fullname || !phone || !email || !comments) {
      return res
        .status(400)
        .json({ message: "fullname (or firstname+lastname), phone, email, and comments are required" });
    }

    const contact = await ContactUs.create({
      fullname,
      phone,
      email,
      comments,
    });

    res.status(201).json(contact);
  } catch (error) {
    console.error("Failed to create contact submission:", error);
    res.status(500).json({ message: "Failed to create contact submission" });
  }
};

const updateContact = async (req, res) => {
  try {
    const contact = await ContactUs.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({ message: "Contact submission not found" });
    }

    if (req.body.fullname !== undefined || req.body.firstname !== undefined || req.body.lastname !== undefined) {
      const fullname = buildFullName(req.body);
      if (!fullname) {
        return res.status(400).json({ message: "fullname cannot be empty" });
      }
      contact.fullname = fullname;
    }

    if (req.body.phone !== undefined) {
      const value = req.body.phone.trim();
      if (!value) {
        return res.status(400).json({ message: "phone cannot be empty" });
      }
      contact.phone = value;
    }

    if (req.body.email !== undefined) {
      const value = req.body.email.trim();
      if (!value) {
        return res.status(400).json({ message: "email cannot be empty" });
      }
      contact.email = value;
    }

    if (req.body.comments !== undefined) {
      const value = req.body.comments.trim();
      if (!value) {
        return res.status(400).json({ message: "comments cannot be empty" });
      }
      contact.comments = value;
    }

    if (req.body.iscontacted !== undefined) {
      contact.iscontacted = Boolean(req.body.iscontacted);
    }

    await contact.save();
    res.status(200).json(contact);
  } catch (error) {
    console.error("Failed to update contact submission:", error);
    res.status(500).json({ message: "Failed to update contact submission" });
  }
};

const deleteContact = async (req, res) => {
  try {
    const contact = await ContactUs.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({ message: "Contact submission not found" });
    }

    await contact.deleteOne();
    res.status(200).json({ message: "Contact submission deleted" });
  } catch (error) {
    console.error("Failed to delete contact submission:", error);
    res.status(500).json({ message: "Failed to delete contact submission" });
  }
};

module.exports = {
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
};
