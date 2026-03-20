const nodemailer = require("nodemailer");
const { google } = require("googleapis");

const {
  SMTP_USER,
  OAUTH_CLIENT_ID,
  OAUTH_CLIENT_SECRET,
  OAUTH_REFRESH_TOKEN,
  OAUTH_REDIRECT_URI = "https://developers.google.com/oauthplayground",
} = process.env;

// Build a reusable OAuth2 client from env vars so we can request fresh access tokens.
const oAuth2Client = new google.auth.OAuth2(
  OAUTH_CLIENT_ID,
  OAUTH_CLIENT_SECRET,
  OAUTH_REDIRECT_URI
);

const sendEmail = async (to, subject, message) => {
  try {
    if (!SMTP_USER || !OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET || !OAUTH_REFRESH_TOKEN) {
      throw new Error("Missing OAuth2 email environment variables");
    }

    oAuth2Client.setCredentials({ refresh_token: OAUTH_REFRESH_TOKEN });
    const accessToken = await oAuth2Client.getAccessToken();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: SMTP_USER,
        clientId: OAUTH_CLIENT_ID,
        clientSecret: OAUTH_CLIENT_SECRET,
        refreshToken: OAUTH_REFRESH_TOKEN,
        accessToken: accessToken?.token,
      },
    });

    const mailOptions = {
      from: SMTP_USER,
      to,
      subject,
      html: message, // render HTML templates such as registrationSuccess
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
  } catch (error) {
    console.error("Email failed to send", error);
  }
};

module.exports = sendEmail;
