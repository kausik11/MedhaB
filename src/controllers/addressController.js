const Address = require("../models/Address");

const REQUIRED_FIELDS = [
  "fullName",
  "mobileNumber",
  "pincode",
  "state",
  "country",
  "houseNo",
  "street",
  "city",
];

const trimIfString = (value) =>
  typeof value === "string" ? value.trim() : value;

const buildAddressPayload = (source = {}) => ({
  fullName: trimIfString(source.fullName),
  mobileNumber: trimIfString(source.mobileNumber),
  alternateMobileNumber: trimIfString(source.alternateMobileNumber) || "",
  pincode: trimIfString(source.pincode),
  state: trimIfString(source.state),
  country: trimIfString(source.country),
  houseNo: trimIfString(source.houseNo),
  street: trimIfString(source.street),
  city: trimIfString(source.city),
  landmark: trimIfString(source.landmark) || "",
});

const getMissingRequiredFields = (payload) =>
  REQUIRED_FIELDS.filter((field) => !payload[field]);

const getAddresses = async (req, res) => {
  try {
    // const addresses = await Address.find({ user: req.userId }).sort({
    //   createdAt: -1,
    // });
    const addresses = await Address.find().sort({ createdAt: -1 });

    return res.status(200).json(addresses);
  } catch (error) {
    console.error("Failed to fetch addresses:", error);
    return res.status(500).json({ message: "Failed to fetch addresses" });
  }
};

const getAddressById = async (req, res) => {
  try {
    // const address = await Address.findOne({
    //   _id: req.params.id,
    //   user: req.userId,
    // });
    const address = await Address.findById(req.params.id);

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    return res.status(200).json(address);
  } catch (error) {
    console.error("Failed to fetch address:", error);
    return res.status(500).json({ message: "Failed to fetch address" });
  }
};

const createAddress = async (req, res) => {
  try {
    const payload = buildAddressPayload(req.body);
    const missingFields = getMissingRequiredFields(payload);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const address = await Address.create({
      ...payload,
      // user: req.userId,
    });

    return res.status(201).json(address);
  } catch (error) {
    console.error("Failed to create address:", error);
    return res.status(500).json({ message: "Failed to create address" });
  }
};

const updateAddress = async (req, res) => {
  try {
    // const address = await Address.findOne({
    //   _id: req.params.id,
    //   user: req.userId,
    // });
    const address = await Address.findById(req.params.id);

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    const payload = buildAddressPayload({
      ...address.toObject(),
      ...req.body,
    });
    const missingFields = getMissingRequiredFields(payload);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    Object.assign(address, payload);
    await address.save();

    return res.status(200).json(address);
  } catch (error) {
    console.error("Failed to update address:", error);
    return res.status(500).json({ message: "Failed to update address" });
  }
};

const deleteAddress = async (req, res) => {
  try {
    // const address = await Address.findOne({
    //   _id: req.params.id,
    //   user: req.userId,
    // });
    const address = await Address.findById(req.params.id);

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    await address.deleteOne();
    return res.status(200).json({ message: "Address deleted" });
  } catch (error) {
    console.error("Failed to delete address:", error);
    return res.status(500).json({ message: "Failed to delete address" });
  }
};

module.exports = {
  getAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
};
