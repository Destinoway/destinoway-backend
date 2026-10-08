export const mapAkbarHotelContentResponse = (
  response
) => {
  const hotels =
    response?.hotels || [];

  return hotels
    .filter((hotel) => hotel?.id)
    .map((hotel) => ({
      supplier: "AKBAR",

      supplierHotelId:
        String(hotel.id),

      name:
        hotel.name || null,

      starRating:
        hotel.starRating ?? null,

      address:
        hotel.address || null,

      distance:
        hotel.distance ?? null,

      heroImage:
        hotel.heroImage || null,

      facilities:
        hotel.facilities || [],

      geoCode:
        hotel.geoCode || null,

      provider:
        hotel.provider || null,

      userReview:
        hotel.userReview || null,

      relevanceScore:
        hotel.relevanceScore ??
        null,

      chainName:
        hotel.chainName || null,

      propertyType:
        hotel.propertyType || null,

      images:
        hotel.images || [],

      isSoldOut:
        hotel.isSoldOut ?? false,

      rawSupplierData: hotel,
    }));
};