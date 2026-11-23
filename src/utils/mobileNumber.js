const invalid = (message) => Object.assign(new Error(message), { statusCode: 400 });

export const normalizeMobileCountryCode = (value = "+91") => {
  if (typeof value !== "string" || !/^\+?[1-9]\d{0,2}$/.test(value.trim())) {
    throw invalid("mobileCountryCode must be a calling code such as +91 or +1");
  }
  return `+${value.trim().replace(/^\+/, "")}`;
};

export const parseMobileNumber = (value, countryCode = "+91") => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    countryCode = value.mobileCountryCode ?? countryCode;
    value = value.mobile;
  }
  const mobileCountryCode = normalizeMobileCountryCode(countryCode);
  if (typeof value !== "string" || !/^[+\d\s().-]+$/.test(value)) {
    throw invalid("Invalid mobile number");
  }
  let mobile = value.replace(/[\s().-]/g, "");
  if (mobile.startsWith("+")) {
    if (!mobile.startsWith(mobileCountryCode)) throw invalid("Mobile number does not match mobileCountryCode");
    mobile = mobile.slice(mobileCountryCode.length);
  }
  if (!/^\d{4,14}$/.test(mobile) || mobile.length + mobileCountryCode.length - 1 > 15 ||
      (mobileCountryCode === "+91" && mobile.length !== 10)) {
    throw invalid("Invalid mobile number length for mobileCountryCode");
  }
  return { mobile, mobileCountryCode };
};

// Retain the existing globally unique national-number constraint. In particular,
// never merge an account belonging to a different calling code during OTP login.
export const assertMobileCountryMatches = (user, countryCode) => {
  if (user && (user.mobileCountryCode || "+91") !== countryCode) {
    throw invalid("This mobile number is already registered with a different country code");
  }
};
