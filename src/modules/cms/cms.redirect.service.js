import mongoose from "mongoose";

import ApiError from "../../utils/response/ApiError.js";
import { buildCMSUrl } from "../../utils/cms/buildCMSUrl.js";
import CMSPage from "./cms.model.js";
import CMSRedirect, { isSafeRedirectPath } from "./cms.redirect.model.js";

const toPlain = (page) => (page?.toObject ? page.toObject() : page);

// Public URL of a page as produced by the project's routing helper (may include a query).
export const getCMSPublicUrl = (page) => buildCMSUrl(toPlain(page));

const stripQuery = (url) => url.split(/[?#]/)[0];

const normalizePath = (value) => {
  if (typeof value !== "string") return null;

  let path = stripQuery(value.trim()).toLowerCase();

  if (path.length > 1) path = path.replace(/\/+$/, "");

  return isSafeRedirectPath(path) ? path : null;
};

/*
Records old -> new when a page's public path changed.
Keeps older redirects of the same page pointing at the newest path (no chains),
and drops a redirect whose source is the page's own current path (no loops).
*/
export const recordCMSRedirect = async (pageId, oldUrl, newUrl, entityType) => {
  const fromPath = normalizePath(oldUrl);
  const newPath = normalizePath(newUrl);

  if (!fromPath || !newPath || !isSafeRedirectPath(newUrl)) return null;

  await CMSRedirect.deleteMany({ fromPath: newPath });

  if (fromPath === newPath) return null;

  await CMSRedirect.updateMany({ pageId }, { $set: { toPath: newUrl } });

  return CMSRedirect.findOneAndUpdate(
    { fromPath },
    { $set: { toPath: newUrl, pageId, entityType, statusCode: 301 } },
    { upsert: true, new: true, runValidators: true },
  );
};

export const resolveCMSRedirect = async (path) => {
  const fromPath = normalizePath(path);

  if (!fromPath) return null;

  const redirect = await CMSRedirect.findOne({ fromPath }).lean();

  if (!redirect) return null;

  const page = await CMSPage.findById(redirect.pageId).lean();

  if (!page) return null;

  // always point at the page's current URL, even if stored data is stale
  const location = buildCMSUrl(page);

  if (!isSafeRedirectPath(location) || normalizePath(location) === fromPath) {
    return null;
  }

  return { statusCode: 301, location };
};

export const getCMSPageRedirects = async (pageId) => {
  if (!mongoose.isValidObjectId(pageId)) {
    throw new ApiError(400, "Invalid CMS page id");
  }

  return CMSRedirect.find({ pageId }).sort({ createdAt: -1 }).lean();
};
