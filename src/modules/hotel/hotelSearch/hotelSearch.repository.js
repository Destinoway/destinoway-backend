

import HotelSearch from "./hotelSearch.model.js";


// =====================================================
// SAVE HOTEL SEARCH
// =====================================================

export const saveHotelSearch = async (data) => {
  return HotelSearch.create(data);
};


// =====================================================
// GET HOTEL SEARCH BY ID
// =====================================================

export const getHotelSearchById = async (searchId) => {
  return HotelSearch.findOne({
    searchId,
  }).lean();
};


// =====================================================
// FIND HOTEL SEARCH CACHE
// =====================================================

export const findHotelSearchCache = async ({
  cacheKey,
}) => {
  return HotelSearch.findOne({
    cacheKey,
    expiresAt: {
      $gt: new Date(),
    },
  }).lean();
};


// =====================================================
// APPEND MORE HOTELS
// =====================================================

export const appendHotelSearchHotels = async ({
  searchId,
  hotels = [],
  moreHotels,
}) => {

  if (!searchId || !hotels.length) {
    return null;
  }

  const updateData = {
    $push: {
      hotels: {
        $each: hotels,
      },
    },
  };

  // MoreHotels agar supplier response me mila hai
  if (typeof moreHotels === "boolean") {
    updateData.$set = {
      moreHotels,
    };
  }

  return HotelSearch.findOneAndUpdate(
    {
      searchId,
    },
    updateData,
    {
      new: true,
    }
  ).lean();
};


// =====================================================
// DELETE EXPIRED HOTEL SEARCH
// =====================================================

export const deleteExpiredHotelSearch = async () => {
  return HotelSearch.deleteMany({
    expiresAt: {
      $lt: new Date(),
    },
  });
};

