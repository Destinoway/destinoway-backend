export const normalizeMobile = (mobile) => {
  // 🔥 handle object भी
  if (typeof mobile === "object" && mobile !== null) {
    mobile = mobile.mobile || "";
  }

  return String(mobile)
    .replace(/\D/g, "")
    .slice(-10);
};