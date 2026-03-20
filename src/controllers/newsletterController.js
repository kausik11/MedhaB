const Newsletter = require("../models/Newsletter");

const createSubscription = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Valid email is required" });
    }

    const existing = await Newsletter.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: "Email already subscribed" });
    }

    const subscription = await Newsletter.create({ email });
    res.status(201).json(subscription);
  } catch (error) {
    console.error("Failed to create newsletter subscription:", error);
    res.status(500).json({ message: "Failed to create newsletter subscription" });
  }
};

const listSubscriptions = async (_req, res) => {
  try {
    const subscriptions = await Newsletter.find().sort({ createdAt: -1 });
    res.status(200).json(subscriptions);
  } catch (error) {
    console.error("Failed to fetch newsletter subscriptions:", error);
    res.status(500).json({ message: "Failed to fetch newsletter subscriptions" });
  }
};

const getSubscription = async (req, res) => {
  try {
    const subscription = await Newsletter.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    res.status(200).json(subscription);
  } catch (error) {
    // console.error("Failed to fetch newsletter subscription:", error);
    // res.status(500).json({ message: "Failed to fetch newsletter subscription" });
    
    // this error is handled by global error handler
    error.statusCode = 500;
      error.message = "Failed to fetch newsletter subscriptions";
       return next(error); // ❗ Sends error to global middleware
  }
};

const updateSubscription = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Valid email is required" });
    }

    const subscription = await Newsletter.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    subscription.email = email;
    await subscription.save();

    res.status(200).json(subscription);
  } catch (error) {
    console.error("Failed to update newsletter subscription:", error);
    res.status(500).json({ message: "Failed to update newsletter subscription" });
  }
};

const deleteSubscription = async (req, res) => {
  try {
    const subscription = await Newsletter.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    await subscription.deleteOne();
    res.status(200).json({ message: "Subscription deleted" });
  } catch (error) {
    console.error("Failed to delete newsletter subscription:", error);
    res.status(500).json({ message: "Failed to delete newsletter subscription" });
  }
};

module.exports = {
  createSubscription,
  listSubscriptions,
  getSubscription,
  updateSubscription,
  deleteSubscription,
};
