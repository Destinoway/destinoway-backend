import Wishlist from "./wishlist.model.js";
import Country from "../priceMarkup/countryData/country.model.js";
import { getCurrencySymbol } from "../currencyConverter/currency.helper.js";
import { getCurrencyRate } from "../currencyConverter/currency.service.js";
import { getCachedHotelContent } from "../hotel/hotel/hotelSearch/service/hotelSearch.redis.service.js";
import ApiError from "../../utils/response/ApiError.js";
import { generateSlug } from "../../utils/slug/slugify.js";

export const toggleWishlistService = async (userId, hotelId) => {
  if (typeof hotelId !== "string" || !hotelId.trim()) {
    throw new ApiError(400, "Hotel id is required");
  }

  const key = { userId, hotelId: hotelId.trim() };
  const removed = await Wishlist.findOneAndDelete(key);
  if (removed) return { wishlisted: false };

  const hotel = await getCachedHotelContent(key.hotelId);
  if (!hotel) {
    throw new ApiError(404, "Hotel details not found. Refresh your hotel search and try again.");
  }

  const address = typeof hotel.address === "string" ? hotel.address : "";
  const addressParts = address.split(",").map((part) => part.trim());
  // AKBAR addresses can end in "city, state, country code and postal code".
  const hasCountrySuffix = /^[A-Z]{2}\s+\d/.test(addressParts.at(-1));
  const city = String(hotel.cityName ?? "").split(",")[0].trim() ||
    (hasCountrySuffix ? addressParts.at(-3) : "");
  const cityId = String(hotel.cityId ?? "").trim();
  if (!cityId) {
    throw new ApiError(422, "Hotel destination is unavailable");
  }

  const countryCode = String(hotel.countryCode ?? "").trim().toUpperCase();
  const country = countryCode
    ? await Country.findOne({ countryCode }).lean()
    : null;
  const starRating = Number(hotel.starRating);

  await Wishlist.updateOne(
    key,
    {
      $setOnInsert: {
        ...key,
        hotelName: hotel.hotelName,
        hotelSlug: generateSlug(hotel.hotelName),
        hotelImage: hotel.hotelImage ?? "",
        address,
        cityId,
        cityName: city || "Unknown city",
        normalizedCity: city || cityId,
        stateName: hotel.stateName || (hasCountrySuffix ? addressParts.at(-2) : "") || "",
        countryCode,
        countryName: country?.countryName ?? "",
        starRating: starRating >= 0 && starRating <= 5 ? starRating : 0,
        facilities: [...new Set(hotel.facilities)],
        supplier: hotel.supplier,
        savedPrice: null,
        savedTax: null,
      },
    },
    { upsert: true, runValidators: true },
  );

  return { wishlisted: true };
};
export const getWishlistService = async (userId) => {
  return Wishlist.aggregate([
    {
      $match: {
        userId,
      },
    },

    {
      $sort: {
        createdAt: -1,
      },
    },

    {
      $group: {
        _id: {
          city: "$normalizedCity",
          country: "$countryCode",
        },

        normalizedCity: {
          $first: "$normalizedCity",
        },

        stateName: {
          $first: "$stateName",
        },

        countryCode: {
          $first: "$countryCode",
        },

        cityId: {
          $first: "$cityId",
        },

        cityName: {
          $first: "$cityName",
        },

        coverImage: {
          $first: "$hotelImage",
        },

        hotelCount: {
          $sum: 1,
        },
      },
    },

    {
      $sort: {
        hotelCount: -1,
      },
    },
  ]);
};

// export const getWishlistCityService = async (userId, cityId) => {
//   const selected = await Wishlist.findOne({
//     userId,
//     cityId,
//   }).lean();
//   if (!selected) {
//     return [];
//   }
//   return Wishlist.find({
//     userId,
//     normalizedCity: selected.normalizedCity,
//     countryCode: selected.countryCode,
//   })
//     .sort({
//       createdAt: -1,
//     })
//     .lean();
// };

export const getWishlistCityService = async (
  userId,
  cityId,
  currency
) => {
  const selected = await Wishlist.findOne({
    userId,
    cityId,
  }).lean();

  if (!selected) {
    return [];
  }

  const hotels = await Wishlist.find({
    userId,
    normalizedCity: selected.normalizedCity,
    countryCode: selected.countryCode,
  })
    .sort({ createdAt: -1 })
    .lean();

  // currency is a STRING ("INR", "USD", etc.)
  if (!currency || currency === "INR") {
    return hotels.map((hotel) => ({
      ...hotel,
      currency: "INR",
      currencySymbol: "₹",
    }));
  }

  const hasSavedAmounts = hotels.some((hotel) => hotel.savedPrice != null || hotel.savedTax != null);
  const rate = hasSavedAmounts ? await getCurrencyRate({
    from: "INR",
    to: currency,
  }) : 1;



  return hotels.map((hotel) => ({
    ...hotel,
    savedPrice: hotel.savedPrice == null ? null : Number((hotel.savedPrice * rate).toFixed(2)),
    savedTax: hotel.savedTax == null ? null : Number((hotel.savedTax * rate).toFixed(2)),
    currency,
   currencySymbol: getCurrencySymbol(currency)
  }));
};

export const checkWishlistService = async (userId, hotelId) => {
  const exists = await Wishlist.exists({
    userId,
    hotelId,
  });

  return {
    isWishlisted: !!exists,
  };
};

export const getWishlistHotelIdsService = async (userId) => {
  const items = await Wishlist.find(
    { userId },
    {
      hotelId: 1,
      _id: 0,
    },
  ).lean();

  return items.map((item) => item.hotelId);
};
