import { convertCurrency } from "./../../currencyConverter/currency.service.js";

// ============================================================
// CONVERT SINGLE HOTEL PRICING
// ============================================================

export const convertHotelPricing = async (
  pricing = {},
  targetCurrency,
  sourceCurrency = "INR"
) => {
  if (!pricing || !targetCurrency) {
    return pricing;
  }

  const from = (
    pricing.currency || sourceCurrency
  ).toUpperCase();

  const to = targetCurrency.toUpperCase();

  // ==========================================================
  // SAME CURRENCY
  // ==========================================================

  if (from === to) {
    return {
      ...pricing,
      currency: to,
    };
  }

  // ==========================================================
  // CONVERT PRICING
  // ==========================================================

  const convertedPricing = {
    ...pricing,
    currency: to,
  };

  const priceFields = [
    "basicAmount",
    "tax",
    "totalAmount",
    "serviceFee",
    "markup",
    "gst",
  ];

  await Promise.all(
    priceFields.map(async (field) => {
      if (
        convertedPricing[field] !== undefined &&
        convertedPricing[field] !== null
      ) {
        convertedPricing[field] = await convertCurrency(
          convertedPricing[field],
          from,
          to
        );
      }
    })
  );

  return convertedPricing;
};


// ============================================================
// CONVERT HOTEL ROOMS
// ============================================================

export const convertHotelRoomsPricing = async (
  rooms = [],
  targetCurrency,
  sourceCurrency = "INR"
) => {
  if (!Array.isArray(rooms) || !targetCurrency) {
    return rooms;
  }

  return Promise.all(
    rooms.map(async (room) => {
      if (!room?.pricing) {
        return room;
      }

      return {
        ...room,

        pricing: await convertHotelPricing(
          room.pricing,
          targetCurrency,
          sourceCurrency
        ),
      };
    })
  );
};