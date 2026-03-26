const SITE_KEY = process.env.RECAPTCHA_SITE_KEY;
const API_KEY = process.env.RECAPTCHA_API_KEY;
const PROJECT_ID = process.env.RECAPTCHA_PROJECT_ID || "medhabotanics-c1833";
const SCORE_THRESHOLD = 0.5;

const verifyRecaptcha = async (req, res, next) => {
  const token = req.body.recaptchaToken;

  if (!token) {
    return res.status(400).json({ message: "reCAPTCHA token is required" });
  }

  try {
    const url = `https://recaptchaenterprise.googleapis.com/v1/projects/${PROJECT_ID}/assessments?key=${API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: {
          token,
          siteKey: SITE_KEY,
        },
      }),
    });

    const data = await response.json();

    if (!data.tokenProperties?.valid) {
      return res.status(400).json({ message: "Invalid reCAPTCHA token" });
    }

    const score = data.riskAnalysis?.score ?? 0;
    if (score < SCORE_THRESHOLD) {
      return res.status(403).json({ message: "reCAPTCHA score too low. Possible bot activity detected." });
    }

    next();
  } catch (error) {
    console.error("reCAPTCHA verification error:", error);
    return res.status(500).json({ message: "reCAPTCHA verification failed" });
  }
};

module.exports = verifyRecaptcha;
