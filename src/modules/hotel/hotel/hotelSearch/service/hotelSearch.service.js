import { akbarHotelSearchAdapter } from "../adapters/akbar/hotelSearch/akbarHotelSearch.adapter.js";

const supplierAdapters = {
  AKBAR: akbarHotelSearchAdapter,
};

export const searchHotels = async (payload) => {

  const supplier = "AKBAR";

  const adapter = supplierAdapters[supplier];

  if (!adapter) {
    throw new Error(
      `Hotel supplier not configured: ${supplier}`
    );
  }

  return await adapter.search(payload);
};