const Count = require("../models/Count");

const ensureCountDocument = async () => {
  const existing = await Count.findOne();
  if (existing) return existing;
  return Count.create({});
};

const getCounts = async (_req, res, next) => {
  try {
    const doc = await ensureCountDocument();
    return res.status(200).json({
      members: doc.membersCount,
      cities: doc.citiesCount,
      updatedAt: doc.updatedAt,
    });
  } catch (error) {
    return next(error);
  }
};

const updateCounts = async (req, res, next) => {
  try {
    const incomingMembers = req.body?.members;
    const incomingCities = req.body?.cities;

    const maxUpdate = {};

    if (incomingMembers !== undefined) {
      const membersValue = Number(incomingMembers);
      if (Number.isNaN(membersValue) || membersValue < 0) {
        return res.status(400).json({ message: "members must be a non-negative number" });
      }
      maxUpdate.membersCount = membersValue;
    }

    if (incomingCities !== undefined) {
      const citiesValue = Number(incomingCities);
      if (Number.isNaN(citiesValue) || citiesValue < 0) {
        return res.status(400).json({ message: "cities must be a non-negative number" });
      }
      maxUpdate.citiesCount = citiesValue;
    }

    if (Object.keys(maxUpdate).length === 0) {
      return res.status(400).json({ message: "Provide members or cities to update" });
    }

    const updated = await Count.findOneAndUpdate(
      {},
      { $max: maxUpdate },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      members: updated.membersCount,
      cities: updated.citiesCount,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getCounts,
  updateCounts,
};
