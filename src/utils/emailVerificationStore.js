const verificationChallenges = new Map();

const OTP_TTL_MS = 10 * 60 * 1000;

const buildChallengeKey = (email, purpose = "email-verification") =>
  `${purpose}:${String(email || "").trim().toLowerCase()}`;

const cleanupExpiredChallenges = () => {
  const now = Date.now();

  for (const [challengeKey, challenge] of verificationChallenges.entries()) {
    if (challenge.expiresAt <= now) {
      verificationChallenges.delete(challengeKey);
    }
  }
};

const setEmailVerificationChallenge = ({
  email,
  otpHash,
  userId = null,
  purpose = "email-verification",
}) => {
  cleanupExpiredChallenges();
  verificationChallenges.set(buildChallengeKey(email, purpose), {
    email,
    otpHash,
    userId,
    purpose,
    expiresAt: Date.now() + OTP_TTL_MS,
  });
};

const getEmailVerificationChallenge = (
  email,
  purpose = "email-verification"
) => {
  cleanupExpiredChallenges();
  return verificationChallenges.get(buildChallengeKey(email, purpose)) || null;
};

const clearEmailVerificationChallenge = (
  email,
  purpose = "email-verification"
) => {
  verificationChallenges.delete(buildChallengeKey(email, purpose));
};

module.exports = {
  setEmailVerificationChallenge,
  getEmailVerificationChallenge,
  clearEmailVerificationChallenge,
};
