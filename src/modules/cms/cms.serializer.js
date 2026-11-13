import { buildCMSUrl } from "../../utils/cms/buildCMSUrl.js";

export const serializeCMSPage = (page) => {
  if (!page) return null;

  const obj = page.toObject ? page.toObject() : page;

  return {
    ...obj,
    canonicalUrl: obj.canonicalUrl ?? "",
    schema: obj.schema ?? null,
    featuredImageAlt: obj.featuredImageAlt ?? "",
    url: buildCMSUrl(obj),
  };
};
