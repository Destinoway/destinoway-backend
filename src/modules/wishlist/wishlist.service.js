import Wishlist from "./wishlist.model.js";

import Country from "../priceMarkup/countryData/country.model.js"
import { getCurrencySymbol } from "../currencyConverter/currency.helper.js";

import { getCurrencyRate } from "../currencyConverter/currency.service.js";

export const toggleWishlistService = async (
  userId,
  payload
) => {
  try {
    console.log("========== TOGGLE WISHLIST START ==========");
    console.log("Incoming userId:", userId);
    console.log("Incoming payload:", payload);

    // STEP 1 → Check existing wishlist
    const existing = await Wishlist.findOne({
      userId,
      hotelId: payload.hotelId,
    });

    console.log("Existing wishlist found:", !!existing);

    if (existing) {
      console.log(
        "Hotel already wishlisted → deleting existing record"
      );

      await existing.deleteOne();

      console.log("Wishlist removed successfully");
      console.log("========== TOGGLE WISHLIST END ==========");

      return {
        wishlisted: false,
      };
    }

    // STEP 2 → Validations
    if (!payload.hotelName) {
      console.log("❌ hotelName missing");
      throw new Error("Hotel name is required");
    }

    if (!payload.cityId) {
      console.log("❌ cityId missing");
      throw new Error("City id is required");
    }

    // STEP 3 → Normalize city
    const cityParts = (payload.cityName || "")
      .split(",")
      .map((v) => v.trim());

    console.log("City parts:", cityParts);

    let normalizedCity = "";

    switch (payload.searchType) {
      case "Hotel":
      case "PointOfInterest":
      case "Neighborhood":
        normalizedCity =
          cityParts[1] ||
          cityParts[0] ||
          "";
        break;

      default:
        normalizedCity =
          cityParts[0] || "";
    }

    console.log("Normalized city:", normalizedCity);

    // STEP 4 → Facilities cleanup
    const facilities = [
      ...new Set(payload.facilities || []),
    ];

    console.log("Facilities count:", facilities.length);

    // STEP 5 → Country lookup
    console.log(
      "Searching country with code:",
      payload.countryCode
    );

    const country = await Country.findOne({
      countryCode: payload.countryCode,   // check field name
    }).lean();

    console.log("Country found:", !!country);
    console.log("Country data:", country);

    const actualCountryName =
      country?.countryName || "";

    console.log(
      "Resolved countryName:",
      actualCountryName
    );

    // STEP 6 → Final create payload
    const createPayload = {
      userId,

      hotelId: payload.hotelId,
      hotelName: payload.hotelName,
      hotelSlug: payload.hotelSlug,
      hotelImage: payload.hotelImage,

      cityId: payload.cityId,
      cityName: payload.cityName,
      normalizedCity,

      stateName:
        payload.stateName || "",

      countryCode:
        payload.countryCode || "",

      // fixed value from DB
      countryName:
        actualCountryName,

      address:
        payload.address || "",

      starRating: Number(
        payload.starRating || 0
      ),

      checkInDate:
        payload.CheckInDate || "",

      checkOutDate:
        payload.CheckOutDate || "",

      roomCount: Number(
        payload.RoomCount || 1
      ),

      facilities,

      freeCancellation:
        payload.freeCancellation ||
        false,

      savedPrice: Number(
        payload.savedPrice || 0
      ),

      savedTax: Number(
        payload.savedTax || 0
      ),

      supplier:
        payload.supplier || "TBO",
    };

    console.log(
      "Final Wishlist Create Payload:"
    );
    console.log(
      JSON.stringify(
        createPayload,
        null,
        2
      )
    );

    // STEP 7 → Create wishlist
    const created =
      await Wishlist.create(
        createPayload
      );

    console.log(
      "Wishlist created successfully"
    );
    console.log(
      "Created document:",
      created
    );

    console.log(
      "========== TOGGLE WISHLIST END =========="
    );

    return {
      wishlisted: true,
    };

  } catch (error) {
    console.error(
      "❌ Wishlist Service Error"
    );
    console.error(
      "Message:",
      error.message
    );
    console.error(error);

    throw error;
  }
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

  const rate = await getCurrencyRate({
    from: "INR",
    to: currency,
  });



  return hotels.map((hotel) => ({
    ...hotel,
    savedPrice: Number((hotel.savedPrice * rate).toFixed(2)),
    savedTax: Number((hotel.savedTax * rate).toFixed(2)),
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
