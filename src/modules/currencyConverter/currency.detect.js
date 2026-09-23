import geoip from "geoip-lite";

const countryCurrencyMap = {
  IN: "INR",
  US: "USD",
  GB: "GBP",
  AE: "AED",
  AU: "AUD",
  CA: "CAD",
  SG: "SGD",
  JP: "JPY",
  TH: "THB",
  MY: "MYR",
  SA: "SAR",
  QA: "QAR",
  KW: "KWD",
  OM: "OMR",
  BH: "BHD",
  PK: "PKR",
  NP: "NPR",
  LK: "LKR",
};

export const detectCurrencyFromIP = (req) => {
  try {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress;
  //  const ip = "8.8.8.8";
    const geo = geoip.lookup(ip);

    if (!geo?.country) {
      return "INR";
    }

    return (
      countryCurrencyMap[geo.country] ||
      "INR"
    );
  } catch (error) {
    return "INR";
  }
};