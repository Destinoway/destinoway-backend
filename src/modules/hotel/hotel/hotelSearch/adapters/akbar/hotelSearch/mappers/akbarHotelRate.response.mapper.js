export const mapAkbarHotelRateResponse = (response) => {
  const hotels = response?.hotels || [];

  return hotels.map((hotel) => ({
    supplier: "AKBAR",

    supplierHotelId:
      hotel.id || null,

    rate:
      hotel.rate ??
      hotel.rates ??
      null,

    rawSupplierData: hotel,
  }));
};