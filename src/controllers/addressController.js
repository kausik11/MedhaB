const mongoose = require("mongoose");
const Address = require("../models/Address");
const User = require("../models/User");
const { ADMIN_PANEL_ROLES } = require("../constants/userRoles");

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

const isAdminRequest = (req) => ADMIN_PANEL_ROLES.includes(req.userRole);
const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const resolveRequestedAddressUser = async (req, body = {}, fallbackUserId) => {
  const requestedUserId = `${body.userId || body.user || fallbackUserId || ""}`.trim();

  if (!requestedUserId) {
    return {
      userId: req.userId,
    };
  }

  if (!isAdminRequest(req)) {
    if (requestedUserId === `${req.userId}`) {
      return {
        userId: req.userId,
      };
    }

    return {
      status: 403,
      error:
        "Only administrator and super admin users can assign addresses for another user.",
    };
  }

  if (!isValidObjectId(requestedUserId)) {
    return {
      status: 400,
      error: "userId must be a valid user id.",
    };
  }

  const targetUser = await User.findById(requestedUserId);
  if (!targetUser) {
    return {
      status: 404,
      error: "Selected user not found.",
    };
  }

  return {
    userId: `${targetUser._id}`,
  };
};

const getAddresses = async (req, res) => {
  try {
    const query = isAdminRequest(req) ? {} : { user: req.userId };
    const addresses = await Address.find(query).sort({ createdAt: -1 });

    return res.status(200).json(addresses);
  } catch (error) {
    console.error("Failed to fetch addresses:", error);
    return res.status(500).json({ message: "Failed to fetch addresses" });
  }
};

const getAddressById = async (req, res) => {
  try {
    const query = isAdminRequest(req)
      ? { _id: req.params.id }
      : { _id: req.params.id, user: req.userId };
    const address = await Address.findOne(query);

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
    const {
      userId: addressUserId,
      error: addressUserError,
      status: addressUserStatus,
    } = await resolveRequestedAddressUser(req, req.body);
    if (addressUserError) {
      return res
        .status(addressUserStatus || 400)
        .json({ message: addressUserError });
    }

    const payload = buildAddressPayload(req.body);
    const missingFields = getMissingRequiredFields(payload);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const address = await Address.create({
      ...payload,
      user: addressUserId,
    });

    return res.status(201).json(address);
  } catch (error) {
    console.error("Failed to create address:", error);
    return res.status(500).json({ message: "Failed to create address" });
  }
};

const updateAddress = async (req, res) => {
  try {
    const query = isAdminRequest(req)
      ? { _id: req.params.id }
      : { _id: req.params.id, user: req.userId };
    const address = await Address.findOne(query);

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    const {
      userId: addressUserId,
      error: addressUserError,
      status: addressUserStatus,
    } = await resolveRequestedAddressUser(req, req.body, address.user);
    if (addressUserError) {
      return res
        .status(addressUserStatus || 400)
        .json({ message: addressUserError });
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
    address.user = addressUserId;
    await address.save();

    return res.status(200).json(address);
  } catch (error) {
    console.error("Failed to update address:", error);
    return res.status(500).json({ message: "Failed to update address" });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const query = isAdminRequest(req)
      ? { _id: req.params.id }
      : { _id: req.params.id, user: req.userId };
    const address = await Address.findOne(query);

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
