

const otpStore = new Map();

export const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000);
};

const normalizeKey = (key) => {
  if (!key) return "";

  return key.toString().trim().replace(/\s+/g, "");
};

const buildKey = (type, value) => {
  const normalized = normalizeKey(value);

  return `${type}:${normalized}`;
};

export const sendOtp = async (type, value) => {
  const key = buildKey(type, value);

  const otp = generateOtp();

  otpStore.set(key, {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  console.log(`📲 OTP for ${key}: ${otp}`);

  return otp; // ✅ THIS IS CRITICAL
};
export const verifyOtp = async (type, value, inputOtp) => {
  const key = buildKey(type, value);

  const record = otpStore.get(key);

  console.log("🔍 VERIFY:", key, inputOtp, record);

  if (!record) {
    throw new Error("OTP not found");
  }

  if (record.expiresAt < Date.now()) {
    otpStore.delete(key);
    throw new Error("OTP expired");
  }

  if (record.otp !== Number(inputOtp)) {
    throw new Error("Invalid OTP");
  }

  otpStore.delete(key);

  return true;
};