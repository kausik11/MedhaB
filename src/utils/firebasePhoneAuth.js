const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY;

function normalizePhoneNumber(phoneNumber) {
  const digits = String(phoneNumber || "").replace(/\D/g, "");

  if (digits.length < 10) {
    throw new Error("Invalid phone number from OTP provider");
  }

  return digits.slice(-10);
}

async function verifyFirebasePhoneIdToken(idToken) {
  if (!FIREBASE_WEB_API_KEY) {
    throw new Error("FIREBASE_WEB_API_KEY not configured");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
      FIREBASE_WEB_API_KEY
    )}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idToken }),
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok || !Array.isArray(data?.users) || data.users.length === 0) {
    throw new Error("Invalid or expired OTP session");
  }

  const account = data.users[0];

  if (!account.phoneNumber) {
    throw new Error("Phone number not found in OTP session");
  }

  return {
    firebaseUid: account.localId || null,
    rawPhoneNumber: account.phoneNumber,
    phoneNumber: normalizePhoneNumber(account.phoneNumber),
  };
}

module.exports = {
  normalizePhoneNumber,
  verifyFirebasePhoneIdToken,
};
