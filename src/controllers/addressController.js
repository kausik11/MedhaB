const Address = require("../models/Address");

const getAddresses = async (_req, res) => {
  try {
    const addresses = await Address.find().sort({ createdAt: -1 });
    res.status(200).json(addresses);
  } catch (error) {
    console.error("Failed to fetch addresses:", error);
    res.status(500).json({ message: "Failed to fetch addresses" });
  }
};

const getAddressById = async (req, res) => {
  try {
    const address = await Address.findById(req.params.id);
    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }
    res.status(200).json(address);
  } catch (error) {
    console.error("Failed to fetch address:", error);
    res.status(500).json({ message: "Failed to fetch address" });
  }
};

const createAddress = async (req, res) => {
  try {
    const title = req.body.title?.trim();
    const addressText = req.body.address?.trim();
    const phone = req.body.phone?.trim();
    const mapLocation = req.body.mapLocation?.trim();

    if (!title || !addressText || !phone || !mapLocation) {
      return res
        .status(400)
        .json({ message: "title, address, phone, and mapLocation are required" });
    }

    const address = await Address.create({
      title,
      address: addressText,
      phone,
      mapLocation,
    });

    res.status(201).json(address);
  } catch (error) {
    console.error("Failed to create address:", error);
    res.status(500).json({ message: "Failed to create address" });
  }
};

const updateAddress = async (req, res) => {
  try {
    const address = await Address.findById(req.params.id);
    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    if (req.body.title !== undefined) {
      const value = req.body.title.trim();
      if (!value) {
        return res.status(400).json({ message: "title cannot be empty" });
      }
      address.title = value;
    }

    if (req.body.address !== undefined) {
      const value = req.body.address.trim();
      if (!value) {
        return res.status(400).json({ message: "address cannot be empty" });
      }
      address.address = value;
    }

    if (req.body.phone !== undefined) {
      const value = req.body.phone.trim();
      if (!value) {
        return res.status(400).json({ message: "phone cannot be empty" });
      }
      address.phone = value;
    }

    if (req.body.mapLocation !== undefined) {
      const value = req.body.mapLocation.trim();
      if (!value) {
        return res.status(400).json({ message: "mapLocation cannot be empty" });
      }
      address.mapLocation = value;
    }

    await address.save();
    res.status(200).json(address);
  } catch (error) {
    console.error("Failed to update address:", error);
    res.status(500).json({ message: "Failed to update address" });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const address = await Address.findById(req.params.id);
    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    await address.deleteOne();
    res.status(200).json({ message: "Address deleted" });
  } catch (error) {
    console.error("Failed to delete address:", error);
    res.status(500).json({ message: "Failed to delete address" });
  }
};

module.exports = {
  getAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
};
