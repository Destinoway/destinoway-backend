export const mapHotelForFrontend = (hotel) => {
  return {
    supplierHotelId: hotel.supplierHotelId,
    name: hotel.name,
    starRating: hotel.starRating,
    address: hotel.address,
    distance: hotel.distance,
    heroImage: hotel.heroImage,
    facilities: hotel.facilities,
    geoCode: hotel.geoCode,
    userReview: hotel.userReview,
    propertyType: hotel.propertyType,
    images: hotel.images,
    isSoldOut: hotel.isSoldOut,

    price: {
      basePrice: hotel.rate?.baseRate ?? 0,
      totalPrice: hotel.rate?.total ?? 0,
      currency: hotel.currency ?? "INR",
    },

    isRecommended: hotel.isRecommended ?? false,
    isRefundable: hotel.isRefundable ?? false,
    moreRatesExpected: hotel.moreRatesExpected ?? false,
    freeBreakfast: hotel.freeBreakfast ?? false,
    payAtHotel: hotel.payAtHotel ?? false,
    freeCancellation: hotel.freeCancellation ?? false,
  };
};

export const mapHotelSearchResponse = (result) => {
  return {
    ...result,
    items: result.items.map(mapHotelForFrontend),
  };
};