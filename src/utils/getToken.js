require("dotenv").config();
const { google } = require("googleapis");

// Run this script locally (node src/utils/getToken.js) to get the Google OAuth consent URL.
// After you authorize, exchange the code for a refresh token in the browser, then copy it
// into OAUTH_REFRESH_TOKEN in your .env.
const {
  OAUTH_CLIENT_ID,
  OAUTH_CLIENT_SECRET,
  OAUTH_REDIRECT_URI = "https://developers.google.com/oauthplayground",
} = process.env;

if (!OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET) {
  throw new Error("Set OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET in the environment first");
}

const oAuth2Client = new google.auth.OAuth2(
  OAUTH_CLIENT_ID,
  OAUTH_CLIENT_SECRET,
  OAUTH_REDIRECT_URI
);

console.log(
  "Authorize URL:",
  oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://mail.google.com/"],
    prompt: "consent",
  })
);
