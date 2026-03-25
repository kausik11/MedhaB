const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { USER_ROLES } = require("../constants/userRoles");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    address: { type: String, trim: true },
    designation: { type: String, trim: true },
    userImage: { type: String, trim: true },
    userImagePublicId: { type: String, trim: true },
    password: { type: String, required: true, minlength: 6 },
    tokenVersion : { type: Number, default: 0 },
    isVerifiedEmail: { type: Boolean, default: false },
    role: { type: String, required: true, enum: USER_ROLES, default: "normal" },
  },
  { timestamps: true }
  
);

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
