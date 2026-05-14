const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const cloudinary = require("../config/cloudinary");
const User = require("../models/User");
const { ADMIN_PANEL_ROLES, USER_ROLES } = require("../constants/userRoles");
const sendEmail = require("../utils/sendEmail");
const registrationSuccess = require("../utils/registrationSuccess");
const emailVerificationOtp = require("../utils/emailVerificationOtp");
const forgotPasswordOtp = require("../utils/forgotPasswordOtp");
const {
  setEmailVerificationChallenge,
  getEmailVerificationChallenge,
  clearEmailVerificationChallenge,
} = require("../utils/emailVerificationStore");
const {
  lookupFirebaseAccount,
  verifyFirebasePhoneIdToken,
} = require("../utils/firebasePhoneAuth");

const { JWT_SECRET } = process.env;

const ensureJwtConfigured = () => {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET not configured");
  }
};

const generateToken = (userId, tokenVersion) => {
  ensureJwtConfigured();
  return jwt.sign({ userId, tokenVersion }, JWT_SECRET, { expiresIn: "7d" });
};

const hashValue = (value) =>
  crypto.createHash("sha256").update(String(value)).digest("hex");

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const trimString = (value) => String(value || "").trim();
const hasOwn = (source, key) =>
  Object.prototype.hasOwnProperty.call(source || {}, key);
const toFiniteNumber = (value) => {
  const nextNumber = Number(value);
  return Number.isFinite(nextNumber) ? nextNumber : null;
};

const generateEmailOtp = () =>
  String(Math.floor(100000 + Math.random() * 900000));

const createEmailOtpChallengeToken = (email, otp) => {
  ensureJwtConfigured();
  return jwt.sign(
    {
      purpose: "email-otp-challenge",
      email,
      otpHash: hashValue(otp),
    },
    JWT_SECRET,
    { expiresIn: "10m" }
  );
};

const createPasswordResetOtpChallengeToken = (email, otp) => {
  ensureJwtConfigured();
  return jwt.sign(
    {
      purpose: "password-reset-otp-challenge",
      email,
      otpHash: hashValue(otp),
    },
    JWT_SECRET,
    { expiresIn: "10m" }
  );
};

const createVerifiedEmailToken = (email) => {
  ensureJwtConfigured();
  return jwt.sign(
    {
      purpose: "email-verified",
      email,
    },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
};

const createPasswordResetToken = ({ email, userId, tokenVersion }) => {
  ensureJwtConfigured();
  return jwt.sign(
    {
      purpose: "password-reset",
      email,
      userId,
      tokenVersion,
    },
    JWT_SECRET,
    { expiresIn: "15m" }
  );
};

const hasVerifiedEmailToken = (email, verifiedEmailToken) => {
  if (!verifiedEmailToken) {
    return false;
  }

  try {
    const payload = jwt.verify(verifiedEmailToken, JWT_SECRET);
    return payload?.purpose === "email-verified" && payload.email === email;
  } catch {
    return false;
  }
};

const issueUserSession = async (res, user, statusCode = 200, extra = {}) => {
  user.tokenVersion += 1;
  await user.save();

  const token = generateToken(user._id, user.tokenVersion);
  return res.status(statusCode).json({ user, token, ...extra });
};

const uploadUserImage = async (file) => {
  const base64Image = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
  const uploadResult = await cloudinary.uploader.upload(base64Image, {
    folder: "savemedha/users",
    resource_type: "auto",
  });

  return {
    imageUrl: uploadResult.secure_url,
    imagePublicId: uploadResult.public_id,
  };
};

const buildDeliveryLocationPayload = (source = {}) => {
  const city = trimString(source.city);
  const pincode = trimString(source.pincode);
  const state = trimString(source.state);
  const country = trimString(source.country);
  const resolvedAddress = trimString(source.resolvedAddress);
  const latitude = toFiniteNumber(source.latitude);
  const longitude = toFiniteNumber(source.longitude);

  if (
    !city ||
    !pincode ||
    !state ||
    !country ||
    !resolvedAddress ||
    latitude === null ||
    longitude === null
  ) {
    return {
      error:
        "city, pincode, state, country, latitude, longitude and resolvedAddress are required",
      status: 400,
    };
  }

  return {
    deliveryLocation: {
      city,
      pincode,
      state,
      country,
      latitude,
      longitude,
      resolvedAddress,
    },
  };
};

const sendRegistrationEmailOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const firstName = String(req.body.firstName || "").trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Valid email is required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const otp = generateEmailOtp();
    setEmailVerificationChallenge({
      email,
      otpHash: hashValue(otp),
      userId: null,
    });
    const emailVerificationToken = createEmailOtpChallengeToken(email, otp);
    const emailSent = await sendEmail(
      email,
      "Verify Your Email",
      emailVerificationOtp({ firstName, otp })
    );

    if (!emailSent) {
      return res.status(500).json({ message: "Failed to send email OTP" });
    }

    return res.status(200).json({
      message: "Email OTP sent successfully",
      email,
      emailVerificationToken,
    });
  } catch (error) {
    console.error("Failed to send registration email OTP:", error);
    return res.status(500).json({ message: "Failed to send email OTP" });
  }
};

const verifyRegistrationEmailOtp = async (req, res) => {
  try {
    ensureJwtConfigured();

    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || "").trim();
    const emailVerificationToken = req.body.emailVerificationToken;

    if (!email || !otp || !emailVerificationToken) {
      return res.status(400).json({
        message: "Email, OTP and email verification token are required",
      });
    }

    let payload;
    try {
      payload = jwt.verify(emailVerificationToken, JWT_SECRET);
    } catch {
      return res.status(400).json({ message: "Invalid or expired email OTP session" });
    }

    if (
      payload?.purpose !== "email-otp-challenge" ||
      payload.email !== email ||
      payload.otpHash !== hashValue(otp)
    ) {
      return res.status(400).json({ message: "Invalid email OTP" });
    }

    clearEmailVerificationChallenge(email);

    return res.status(200).json({
      message: "Email verified successfully",
      email,
      verifiedEmailToken: createVerifiedEmailToken(email),
    });
  } catch (error) {
    console.error("Failed to verify registration email OTP:", error);
    return res.status(500).json({ message: "Failed to verify email OTP" });
  }
};

const sendEmailVerificationOtp = async (req, res) => {
  try {
    const user = req.user;
    const email = normalizeEmail(user?.email);

    if (!user || !email) {
      return res.status(401).json({ message: "Unauthorized user" });
    }

    if (user.isVerifiedEmail) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    const otp = generateEmailOtp();
    setEmailVerificationChallenge({
      email,
      otpHash: hashValue(otp),
      userId: String(user._id),
    });

    const emailSent = await sendEmail(
      email,
      "Verify Your Email",
      emailVerificationOtp({ firstName: user.firstName, otp })
    );

    if (!emailSent) {
      return res.status(500).json({ message: "Failed to send email OTP" });
    }

    return res.status(200).json({
      message: "Email OTP sent successfully",
      email,
    });
  } catch (error) {
    console.error("Failed to send email verification OTP:", error);
    return res.status(500).json({ message: "Failed to send email OTP" });
  }
};

const verifyEmailOtp = async (req, res) => {
  try {
    const user = req.user;
    const email = normalizeEmail(user?.email);
    const otp = String(req.body.otp || "").trim();

    if (!user || !email) {
      return res.status(401).json({ message: "Unauthorized user" });
    }

    if (!otp) {
      return res.status(400).json({ message: "OTP is required" });
    }

    const challenge = getEmailVerificationChallenge(email);

    if (!challenge || challenge.userId !== String(user._id)) {
      return res.status(400).json({ message: "Invalid or expired email OTP session" });
    }

    if (challenge.otpHash !== hashValue(otp)) {
      return res.status(400).json({ message: "Invalid email OTP" });
    }

    clearEmailVerificationChallenge(email);
    user.isVerifiedEmail = true;
    await user.save();

    return res.status(200).json({
      message: "Email verified successfully",
      user: user.toJSON(),
    });
  } catch (error) {
    console.error("Failed to verify email OTP:", error);
    return res.status(500).json({ message: "Failed to verify email OTP" });
  }
};

const sendForgotPasswordOtp = async (req, res) => {
  try {
    ensureJwtConfigured();

    const email = normalizeEmail(req.body.email);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Valid email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = generateEmailOtp();
    setEmailVerificationChallenge({
      email,
      otpHash: hashValue(otp),
      userId: String(user._id),
      purpose: "forgot-password",
    });

    const passwordResetOtpToken = createPasswordResetOtpChallengeToken(
      email,
      otp
    );
    const emailSent = await sendEmail(
      email,
      "Reset Your Password",
      forgotPasswordOtp({ firstName: user.firstName, otp })
    );

    if (!emailSent) {
      clearEmailVerificationChallenge(email, "forgot-password");
      return res.status(500).json({ message: "Failed to send password reset OTP" });
    }

    return res.status(200).json({
      message: "Password reset OTP sent successfully",
      email,
      passwordResetOtpToken,
    });
  } catch (error) {
    console.error("Failed to send forgot password OTP:", error);
    return res.status(500).json({ message: "Failed to send password reset OTP" });
  }
};

const verifyForgotPasswordOtp = async (req, res) => {
  try {
    ensureJwtConfigured();

    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || "").trim();
    const passwordResetOtpToken = req.body.passwordResetOtpToken;

    if (!email || !otp || !passwordResetOtpToken) {
      return res.status(400).json({
        message: "Email, OTP and password reset OTP token are required",
      });
    }

    let payload;
    try {
      payload = jwt.verify(passwordResetOtpToken, JWT_SECRET);
    } catch {
      return res.status(400).json({
        message: "Invalid or expired password reset OTP session",
      });
    }

    const challenge = getEmailVerificationChallenge(email, "forgot-password");

    if (
      !challenge ||
      payload?.purpose !== "password-reset-otp-challenge" ||
      payload.email !== email ||
      payload.otpHash !== hashValue(otp) ||
      challenge.otpHash !== hashValue(otp)
    ) {
      return res.status(400).json({ message: "Invalid password reset OTP" });
    }

    const user = await User.findOne({ email });
    if (!user || challenge.userId !== String(user._id)) {
      return res.status(400).json({
        message: "Invalid or expired password reset OTP session",
      });
    }

    clearEmailVerificationChallenge(email, "forgot-password");

    return res.status(200).json({
      message: "Password reset OTP verified successfully",
      email,
      passwordResetToken: createPasswordResetToken({
        email,
        userId: String(user._id),
        tokenVersion: user.tokenVersion,
      }),
    });
  } catch (error) {
    console.error("Failed to verify forgot password OTP:", error);
    return res.status(500).json({ message: "Failed to verify password reset OTP" });
  }
};

const resetForgotPassword = async (req, res) => {
  try {
    ensureJwtConfigured();

    const email = normalizeEmail(req.body.email);
    const newPassword = String(req.body.newPassword || "");
    const passwordResetToken = req.body.passwordResetToken;

    if (!email || !newPassword || !passwordResetToken) {
      return res.status(400).json({
        message: "Email, newPassword and password reset token are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
      });
    }

    let payload;
    try {
      payload = jwt.verify(passwordResetToken, JWT_SECRET);
    } catch {
      return res.status(400).json({
        message: "Invalid or expired password reset token",
      });
    }

    if (
      payload?.purpose !== "password-reset" ||
      payload.email !== email ||
      !payload.userId
    ) {
      return res.status(400).json({ message: "Invalid password reset token" });
    }

    const user = await User.findOne({ _id: payload.userId, email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      return res.status(400).json({ message: "Password reset token expired" });
    }

    user.password = newPassword;
    user.tokenVersion += 1;
    await user.save();

    clearEmailVerificationChallenge(email, "forgot-password");

    return res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Failed to reset forgotten password:", error);
    return res.status(500).json({ message: "Failed to reset password" });
  }
};

const registerUser = async (req, res) => {
  try {
    ensureJwtConfigured();

    const {
      firstName,
      lastName,
      phoneNumber,
      email,
      address,
      designation,
      password,
      role,
      verifiedEmailToken,
    } = req.body;

    if (!firstName || !lastName || !phoneNumber || !email || !password || !role) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const normalizedEmail = normalizeEmail(email);

    // check a valid email or not 
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ message: "Valid email is required" });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    let uploadedImage;
    if (req.file) {
      uploadedImage = await uploadUserImage(req.file);
    }

    if(!USER_ROLES.includes(role)){
      return res.status(400).json({ message: "Invalid role" });
    }

    const isVerifiedEmail = hasVerifiedEmailToken(normalizedEmail, verifiedEmailToken);

    const user = await User.create({
      firstName,
      lastName,
      phoneNumber,
      email: normalizedEmail,
      address,
      designation,
      userImage: uploadedImage?.imageUrl,
      userImagePublicId: uploadedImage?.imagePublicId,
      password,
      isVerifiedEmail,
      role,
    });

    // send email to user
    sendEmail(
      user.email,
      "Registration Success",
      registrationSuccess(user)
    )

    // const token = generateToken(user._id);
    return issueUserSession(res, user, 201);
  } catch (error) {
    console.error("Failed to register user:", error);
    return res.status(500).json({ message: "Failed to register user" });
  }
};

const authenticateUser = async (req, res, { adminOnly = false } = {}) => {
  try {
    ensureJwtConfigured();

    const email = normalizeEmail(req.body.email);
    const { password } = req.body;
    // console.log("dfvnfvk",email,password);
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (adminOnly && !ADMIN_PANEL_ROLES.includes(user.role)) {
      return res.status(403).json({
        message: "You don't have permission to access admin panel",
      });
    }
 
    user.tokenVersion += 1;
    await user.save();
    // const token = generateToken(user._id);
    const token = generateToken(user._id, user.tokenVersion);
    return res.status(200).json({ user, token });
  } catch (error) {
    console.error("Failed to login:", error);
    return res.status(500).json({ message: "Failed to login" });
  }
};

const loginUser = async (req, res) => authenticateUser(req, res);

const loginAdminUser = async (req, res) =>
  authenticateUser(req, res, { adminOnly: true });

const splitDisplayName = (displayName = "", email = "") => {
  const parts = String(displayName || "").trim().split(/\s+/).filter(Boolean);

  if (parts.length > 1) {
    return {
      firstName: parts.slice(0, -1).join(" "),
      lastName: parts.at(-1),
    };
  }

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: "Customer",
    };
  }

  const emailPrefix = String(email || "").split("@")[0] || "Google";
  return {
    firstName: emailPrefix,
    lastName: "Customer",
  };
};

const loginWithGoogle = async (req, res) => {
  try {
    ensureJwtConfigured();

    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "Google session token is required" });
    }

    const account = await lookupFirebaseAccount(idToken);
    const email = normalizeEmail(account.email);

    if (!email) {
      return res.status(400).json({ message: "Google account email is required" });
    }

    const providerUserInfo = Array.isArray(account.providerUserInfo)
      ? account.providerUserInfo
      : [];
    const hasGoogleProvider = providerUserInfo.some(
      (provider) => provider?.providerId === "google.com"
    );

    if (!hasGoogleProvider) {
      return res.status(400).json({ message: "Firebase token is not a Google login" });
    }

    const displayName =
      account.displayName ||
      providerUserInfo.find((provider) => provider?.providerId === "google.com")
        ?.displayName ||
      "";
    const photoUrl =
      account.photoUrl ||
      providerUserInfo.find((provider) => provider?.providerId === "google.com")
        ?.photoUrl ||
      "";
    const firebaseUid = account.localId;

    if (!firebaseUid) {
      return res.status(400).json({ message: "Firebase user id is required" });
    }

    let user = await User.findOne({ firebaseUid });
    let isNewUser = false;

    if (!user) {
      user = await User.findOne({ email });
    }

    if (user) {
      user.firebaseUid = firebaseUid;
      user.authProvider = user.authProvider === "password" ? "password" : "google";
      user.isVerifiedEmail = account.emailVerified !== false;

      if (!user.userImage && photoUrl) {
        user.userImage = photoUrl;
      }

      await user.save();
      return issueUserSession(res, user, 200, {
        isNewUser,
        needsProfileCompletion: !user.phoneNumber,
      });
    }

    const { firstName, lastName } = splitDisplayName(displayName, email);
    user = await User.create({
      firstName,
      lastName,
      phoneNumber: "",
      email,
      address: "",
      userImage: photoUrl,
      password: crypto.randomBytes(24).toString("hex"),
      firebaseUid,
      authProvider: "google",
      isVerifiedEmail: account.emailVerified !== false,
      role: "normal",
    });
    isNewUser = true;

    sendEmail(user.email, "Registration Success", registrationSuccess(user));

    return issueUserSession(res, user, 201, {
      isNewUser,
      needsProfileCompletion: true,
    });
  } catch (error) {
    console.error("Failed to login with Google:", error);
    return res.status(500).json({
      message: error.message || "Failed to login with Google",
    });
  }
};

const loginWithOtp = async (req, res) => {
  try {
    ensureJwtConfigured();

    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "OTP session token is required" });
    }

    const { phoneNumber } = await verifyFirebasePhoneIdToken(idToken);
    const user = await User.findOne({ phoneNumber });

    if (!user) {
      return res.status(404).json({
        message: "User not found for this phone number. Please register first.",
      });
    }

    return issueUserSession(res, user);
  } catch (error) {
    console.error("Failed to login with OTP:", error);
    return res.status(500).json({
      message: error.message || "Failed to login with OTP",
    });
  }
};

const registerWithOtp = async (req, res) => {
  try {
    ensureJwtConfigured();

    const { idToken, firstName, lastName, email, address } = req.body;

    if (!idToken || !firstName || !lastName || !email) {
      return res.status(400).json({
        message: "OTP session token, firstName, lastName and email are required",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Valid email is required" });
    }

    const { phoneNumber } = await verifyFirebasePhoneIdToken(idToken);

    const existingByPhone = await User.findOne({ phoneNumber });
    if (existingByPhone) {
      return res.status(409).json({
        message: "Phone number already registered. Please login with OTP.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingByEmail = await User.findOne({ email: normalizedEmail });
    if (existingByEmail) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const generatedPassword = crypto.randomBytes(24).toString("hex");
    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phoneNumber,
      email: normalizedEmail,
      address: typeof address === "string" ? address.trim() : "",
      password: generatedPassword,
      isVerifiedEmail: false,
      role: "normal",
    });

    sendEmail(user.email, "Registration Success", registrationSuccess(user));

    return issueUserSession(res, user, 201, { isNewUser: true });
  } catch (error) {
    console.error("Failed to register with OTP:", error);
    return res.status(500).json({
      message: error.message || "Failed to register with OTP",
    });
  }
};

const getUsers = async (_req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    return res.status(200).json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return res.status(500).json({ message: "Failed to fetch users" });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json(user);
  } catch (error) {
    console.error("Failed to fetch user:", error);
    return res.status(500).json({ message: "Failed to fetch user" });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized user" });
    }

    return res.status(200).json(req.user.toJSON());
  } catch (error) {
    console.error("Failed to fetch current user:", error);
    return res.status(500).json({ message: "Failed to fetch user" });
  }
};

const applyUserUpdates = async (
  user,
  body = {},
  { allowRole = false, allowDesignation = false, allowPassword = false } = {}
) => {
  if (allowPassword && body.password) {
    user.password = body.password;
  }

  if (allowRole && hasOwn(body, "role")) {
    if (!USER_ROLES.includes(body.role)) {
      return { status: 400, error: "Invalid role" };
    }

    user.role = body.role;
  }

  const nextFirstName = hasOwn(body, "firstName")
    ? trimString(body.firstName)
    : user.firstName;
  const nextLastName = hasOwn(body, "lastName")
    ? trimString(body.lastName)
    : user.lastName;
  const nextPhoneNumber = hasOwn(body, "phoneNumber")
    ? trimString(body.phoneNumber)
    : user.phoneNumber;
  const nextEmail = hasOwn(body, "email")
    ? normalizeEmail(body.email)
    : normalizeEmail(user.email);
  const nextAddress = hasOwn(body, "address")
    ? trimString(body.address)
    : user.address || "";
  const nextDesignation = allowDesignation
    ? hasOwn(body, "designation")
      ? trimString(body.designation)
      : user.designation || ""
    : user.designation;

  if (!nextFirstName || !nextLastName || !nextPhoneNumber || !nextEmail) {
    return {
      status: 400,
      error: "First name, last name, phone number and email are required",
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
    return {
      status: 400,
      error: "Valid email is required",
    };
  }

  const duplicateUser = await User.findOne({
    email: nextEmail,
    _id: { $ne: user._id },
  });
  if (duplicateUser) {
    return {
      status: 409,
      error: "Email already registered",
    };
  }

  const previousEmail = normalizeEmail(user.email);
  user.firstName = nextFirstName;
  user.lastName = nextLastName;
  user.phoneNumber = nextPhoneNumber;
  user.email = nextEmail;
  user.address = nextAddress;

  if (allowDesignation) {
    user.designation = nextDesignation;
  }

  if (nextEmail !== previousEmail) {
    user.isVerifiedEmail = false;
  }

  return { user };
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.file) {
      if (user.userImagePublicId) {
        await cloudinary.uploader.destroy(user.userImagePublicId).catch(() => {});
      }
      const uploaded = await uploadUserImage(req.file);
      user.userImage = uploaded.imageUrl;
      user.userImagePublicId = uploaded.imagePublicId;
    }

    if (password) {
      user.password = password;
    }

    const { error, status } = await applyUserUpdates(user, req.body, {
      allowRole: true,
      allowDesignation: true,
      allowPassword: true,
    });
    if (error) {
      return res.status(status || 400).json({ message: error });
    }

    await user.save();
    const safeUser = user.toJSON();
    return res.status(200).json(safeUser);
  } catch (error) {
    console.error("Failed to update user:", error);
    return res.status(500).json({ message: "Failed to update user" });
  }
};

const updateCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.file) {
      if (user.userImagePublicId) {
        await cloudinary.uploader.destroy(user.userImagePublicId).catch(() => {});
      }

      const uploaded = await uploadUserImage(req.file);
      user.userImage = uploaded.imageUrl;
      user.userImagePublicId = uploaded.imagePublicId;
    }

    if (req.body.password) {
      const currentPassword = String(req.body.currentPassword || "");

      if (!currentPassword) {
        return res.status(400).json({
          message: "Current password is required to change password",
        });
      }

      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      if (String(req.body.password).length < 6) {
        return res.status(400).json({
          message: "Password must be at least 6 characters long",
        });
      }

      user.password = req.body.password;
    }

    const { error, status } = await applyUserUpdates(user, req.body, {
      allowRole: false,
      allowDesignation: false,
      allowPassword: false,
    });
    if (error) {
      return res.status(status || 400).json({ message: error });
    }

    await user.save();
    return res.status(200).json(user.toJSON());
  } catch (error) {
    console.error("Failed to update current user:", error);
    return res.status(500).json({ message: "Failed to update user" });
  }
};

const updateCurrentUserLocation = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { deliveryLocation, error, status } = buildDeliveryLocationPayload(
      req.body
    );

    if (error) {
      return res.status(status || 400).json({ message: error });
    }

    user.deliveryLocation = deliveryLocation;
    await user.save();

    return res.status(200).json(user.toJSON());
  } catch (error) {
    console.error("Failed to update current user location:", error);
    return res.status(500).json({ message: "Failed to update user location" });
  }
};

module.exports = {
  sendRegistrationEmailOtp,
  verifyRegistrationEmailOtp,
  sendEmailVerificationOtp,
  verifyEmailOtp,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetForgotPassword,
  registerUser,
  loginUser,
  loginAdminUser,
  loginWithGoogle,
  loginWithOtp,
  registerWithOtp,
  getUsers,
  getCurrentUser,
  getUserById,
  updateCurrentUser,
  updateCurrentUserLocation,
  updateUser,
};
