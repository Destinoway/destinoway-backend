export const mapAkbarHotelContentResponse = (response) => {
  const hotels = response?.hotels || [];

  return hotels.map((hotel) => ({
    hotelId: null,

    supplier: "AKBAR",

    supplierHotelId: hotel.id || null,

    name: hotel.name || null,

    starRating:
      hotel.starRating ??
      hotel.star ??
      null,

    address:
      hotel.address || null,

    city:
      hotel.city || null,

    country:
      hotel.country || null,

    images:
      hotel.images || [],

    rawSupplierData: hotel,
  }));
};