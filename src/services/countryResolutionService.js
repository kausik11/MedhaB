const { DEFAULT_COUNTRY } = require("../constants/pricing");

const GEOLOCATION_TIMEOUT_MS = Number(process.env.GEOLOCATION_TIMEOUT_MS) || 5000;

const normalizeCountryCode = (value) => {
  if (!value) {
    return null;
  }

  const normalizedValue = `${value}`.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalizedValue) ? normalizedValue : null;
};

const normalizeIp = (value) => {
  if (!value) {
    return null;
  }

  let normalizedValue = `${value}`.trim();

  if (normalizedValue.includes(",")) {
    normalizedValue = normalizedValue.split(",")[0].trim();
  }

  if (normalizedValue.startsWith("::ffff:")) {
    normalizedValue = normalizedValue.slice(7);
  }

  if (normalizedValue === "::1") {
    return "127.0.0.1";
  }

  return normalizedValue || null;
};

const isPrivateIpv4 = (ipAddress) => {
  const octets = ipAddress.split(".").map(Number);

  if (octets.length !== 4 || octets.some((octet) => Number.isNaN(octet))) {
    return false;
  }

  return (
    octets[0] === 10 ||
    octets[0] === 127 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
};

const isPrivateIp = (ipAddress) => {
  if (!ipAddress) {
    return true;
  }

  if (ipAddress.includes(":")) {
    return (
      ipAddress === "::1" ||
      ipAddress.startsWith("fc") ||
      ipAddress.startsWith("fd") ||
      ipAddress.startsWith("fe80:")
    );
  }

  return isPrivateIpv4(ipAddress);
};

const extractClientIp = (req) =>
  normalizeIp(
    req.headers["cf-connecting-ip"] ||
      req.headers["x-real-ip"] ||
      req.headers["x-forwarded-for"] ||
      req.ip ||
      req.socket?.remoteAddress
  );

const fetchJson = async (url) => {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), GEOLOCATION_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Geolocation request failed with status ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeoutHandle);
  }
};

const getCountryFromIpApiResponse = (payload) =>
  normalizeCountryCode(payload?.country_code || payload?.countryCode || payload?.country);

const geolocationProviders = [
  async (ipAddress) => {
    const payload = await fetchJson(`https://ipwho.is/${encodeURIComponent(ipAddress)}`);

    if (payload?.success === false) {
      throw new Error(payload?.message || "ipwho.is lookup failed");
    }

    return getCountryFromIpApiResponse(payload);
  },
  async (ipAddress) => {
    const payload = await fetchJson(`https://ipapi.co/${encodeURIComponent(ipAddress)}/json/`);

    if (payload?.error) {
      throw new Error(payload?.reason || "ipapi.co lookup failed");
    }

    return getCountryFromIpApiResponse(payload);
  },
];

const detectCountryFromIp = async (ipAddress) => {
  if (!ipAddress || isPrivateIp(ipAddress)) {
    return null;
  }

  for (const provider of geolocationProviders) {
    try {
      const countryCode = await provider(ipAddress);
      if (countryCode) {
        return countryCode;
      }
    } catch (error) {
      console.error("Country lookup provider failed:", error.message);
    }
  }

  return null;
};

const resolveRequestCountry = async (req) => {
  const cloudflareCountry = normalizeCountryCode(req.headers["cf-ipcountry"]);
  if (cloudflareCountry) {
    return cloudflareCountry;
  }

  const clientIp = extractClientIp(req);
  const detectedCountry = await detectCountryFromIp(clientIp);

  return detectedCountry || DEFAULT_COUNTRY;
};

module.exports = {
  extractClientIp,
  resolveRequestCountry,
};
