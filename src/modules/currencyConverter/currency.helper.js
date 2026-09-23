export const convertHotelPrices = ({ hotels, rate, currency }) => {
  return hotels.map((hotel) => {
    return {
      ...hotel,

      originalPrice: hotel.price,

      originalTax: hotel.tax,

      price: Number((hotel.price * rate).toFixed(2)),

      tax: Number((hotel.tax * rate).toFixed(2)),

      currency,
    };
  });
};

export const getCurrencySymbol = (currencyCode) => {
  try {
    const parts = new Intl.NumberFormat("en", {
      style: "currency",
      currency: currencyCode,
    }).formatToParts(1);

    return parts.find((p) => p.type === "currency")?.value || currencyCode;
  } catch {
    return currencyCode;
  }
};
