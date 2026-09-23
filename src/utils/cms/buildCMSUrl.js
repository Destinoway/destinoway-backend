import { generateSlug } from "../slug/slugify.js";

export const buildCMSUrl = (page) => {
  switch (page.entityType) {
    case "hotel": {
      const citySlug = generateSlug(
        page?.data?.cityMeta?.destination?.split(",")[0] || "",
      );

      return `/hotel-details/${citySlug}/${page.slug}?hid=${page.entityId}`;
    }

    case "hotelCity":
      return `/hotels/${page.slug}`;

    case "static":
    case "marketing":
    default:
      return `/${page.slug}`;
  }
};
