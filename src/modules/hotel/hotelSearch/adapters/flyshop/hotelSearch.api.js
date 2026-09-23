
import {
  supplierAPI,
  getAuthHeader,
} from "../../../../../config/supplierApi.js";

// =====================================================
// HOTEL SEARCH
// =====================================================

export const searchHotelAPI = async (payload) => {
  const supplierPayload = {
    ...getAuthHeader(),
    ...payload,
  };

  const { data } = await supplierAPI.post(
    "/HotelSearch",
    supplierPayload
  );

  return data;
};

// =====================================================
// HOTEL SEARCH MORE
// =====================================================

export const searchMoreHotelsAPI = async ({
  searchId,
  searchKey,
}) => {
  const supplierPayload = {
    ...getAuthHeader(),

    SearchID: searchId,
    SearchKey: searchKey,
  };

  const { data } = await supplierAPI.post(
    "/HotelSearchMore",
    supplierPayload
  );

  return data;
};

