// generate 6 digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// expiry time (5 minutes)
export const otpExpiryTime = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 5);
  return date;
};