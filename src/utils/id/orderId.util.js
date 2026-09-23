import { randomBytes } from "crypto";

export const generateOrderId = () => {
  const date = new Date();

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  const randomPart = randomBytes(3).toString("hex").toUpperCase();

  return `TC-${yyyy}${mm}${dd}-${randomPart}`;
};
