const verificationChallenges = new Map();

const OTP_TTL_MS = 10 * 60 * 1000;

const cleanupExpiredChallenges = () => {
  const now = Date.now();

  for (const [email, challenge] of verificationChallenges.entries()) {
    if (challenge.expiresAt <= now) {
      verificationChallenges.delete(email);
    }
  }
};

const setEmailVerificationChallenge = ({ email, otpHash, userId = null }) => {
  cleanupExpiredChallenges();
  verificationChallenges.set(email, {
    email,
    otpHash,
    userId,
    expiresAt: Date.now() + OTP_TTL_MS,
  });
};

const getEmailVerificationChallenge = (email) => {
  cleanupExpiredChallenges();
  return verificationChallenges.get(email) || null;
};

const clearEmailVerificationChallenge = (email) => {
  verificationChallenges.delete(email);
};

module.exports = {
  setEmailVerificationChallenge,
  getEmailVerificationChallenge,
  clearEmailVerificationChallenge,
};
