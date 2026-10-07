// export const mapAkbarHotelContentResponse = (response) => {
//   const hotels = response?.hotels || [];

//   return hotels.map((hotel) => ({
//     hotelId: null,

//     supplier: "AKBAR",

//     supplierHotelId: hotel.id || null,

//     name: hotel.name || null,

//     starRating:
//       hotel.starRating ??
//       hotel.star ??
//       null,

//     address:
//       hotel.address || null,

//     city:
//       hotel.city || null,

//     country:
//       hotel.country || null,

//     images:
//       hotel.images || [],

//     rawSupplierData: hotel,
//   }));
// };

export const mapAkbarHotelContentResponse = (response) => {
  const hotels = response?.hotels || [];

  const mappedHotels = hotels.map((hotel) => ({
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

  // ========================================
  // MAPPER DEBUG
  // ========================================

  console.log(
    "========== AKBAR CONTENT MAPPER DEBUG =========="
  );

  console.log(
    "RAW HOTEL COUNT:",
    hotels.length
  );

  console.log(
    "MAPPED HOTEL COUNT:",
    mappedHotels.length
  );

  console.log(
    "MAPPED HOTEL SAMPLE:",
    mappedHotels.slice(0, 3).map((hotel) => ({
      supplierHotelId: hotel.supplierHotelId,
      name: hotel.name,
      city: hotel.city,
    }))
  );

  console.log(
    "================================================="
  );

  return mappedHotels;
};