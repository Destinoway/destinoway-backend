import { generateSlug } from "./slugify.js";

export const generateCMSSlug = (payload) => {
  if (payload.entityType === "hotel" && payload?.data?.hotelMeta?.hotelName) {
    return generateSlug(payload.data.hotelMeta.hotelName);
  }

  if (
    payload.entityType === "hotelCity" &&
    payload?.data?.cityMeta?.destination
  ) {
    return generateSlug(payload.data.cityMeta.destination.split(",")[0]);
  }

  return generateSlug(payload.title || "");
};
