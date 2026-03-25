module.exports = ({ firstName = "there", otp }) => `
  <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
    <h2 style="margin-bottom: 12px;">Verify your email address</h2>
    <p>Hello ${firstName},</p>
    <p>
      Use the one-time password below to verify your email address for your
      Medha Botanics account registration.
    </p>
    <div
      style="
        margin: 24px 0;
        display: inline-block;
        padding: 14px 20px;
        border-radius: 12px;
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        font-size: 28px;
        font-weight: 700;
        letter-spacing: 0.3em;
        color: #0f172a;
      "
    >
      ${otp}
    </div>
    <p>This OTP will expire in 10 minutes.</p>
    <p>If you did not request this, you can ignore this email.</p>
    <p>
      Regards,<br />
      <strong>Team Medha Botanics</strong>
    </p>
  </div>
`;
