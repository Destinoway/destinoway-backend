import { getHotelSearchMeta } from "../hotelSearch/service/hotelSearch.redis.service.js";

export const resolveSupplierSearch = async (searchId) => {
  if (!searchId) {
    const error = new Error("Search ID is required");
    error.statusCode = 400;
    throw error;
  }

  const meta = await getHotelSearchMeta(searchId);

  if (!meta) {
    const error = new Error("Hotel search not found or expired");
    error.statusCode = 404;
    throw error;
  }

  const supplierCode = meta.supplier ?? "AKBAR";
  const supplierSearchId =
    meta.supplierSearchIds?.[supplierCode] ??
    meta[`${supplierCode.toLowerCase()}SearchId`] ??
    (supplierCode === "AKBAR" ? meta.akbarSearchId : null);

  if (!supplierSearchId) {
    const error = new Error(
      "Supplier search ID is not available for this search"
    );
    error.statusCode = 409;
    throw error;
  }

  return {
    internalSearchId: searchId,
    supplier: "1",
    supplierCode,
    supplierSearchId,
    searchTracingKey: meta.searchTracingKey,
    checkIn: meta.checkIn,
    checkOut: meta.checkOut,
    occupancies: meta.occupancies ?? [],
  };
};
