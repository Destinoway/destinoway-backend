import Coupon from "./coupon.model.js";

const CACHE_TTL_MS = 15_000;
const cache = new Map();

export const clearHomeCouponsCache = () => cache.clear();

export const getHomeCouponsService = async (query = {}) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  const filter = {};
  if (query.isActive !== undefined) filter.isActive = query.isActive === "true";
  if (query.module) filter.applicableModules = query.module;
  if (query.search) filter.code = { $regex: String(query.search).trim(), $options: "i" };

  const key = JSON.stringify({ page, limit, filter });
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return { data: cached.data, cacheHit: true };
  }

  const [coupons, total] = await Promise.all([
    Coupon.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Coupon.countDocuments(filter),
  ]);
  const data = { coupons, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return { data, cacheHit: false };
};
