export const verifyEmailTemplate = (name, verifyLink) => {
  return `
    <div style="font-family:Arial;padding:20px">
      <h2>Welcome to Trainscafe 🚆</h2>

      <p>Hello ${name},</p>

      <p>Please verify your email:</p>

      <a href="${verifyLink}" 
         style="display:inline-block;
         padding:12px 20px;
         background:#e63946;
         color:white;
         text-decoration:none;
         border-radius:6px;">
         Verify Email
      </a>

      <p>This link expires in 24 hours.</p>

      <p>– Team TrainsCafe</p>
    </div>
  `;
};
export const otpEmailTemplate = (otp) => `
  <div style="font-family:sans-serif">
    <h2>Your Login OTP</h2>
    <p>Use this OTP to login:</p>
    <h1 style="letter-spacing:5px">${otp}</h1>
    <p>This OTP will expire in 5 minutes.</p>
  </div>
`;