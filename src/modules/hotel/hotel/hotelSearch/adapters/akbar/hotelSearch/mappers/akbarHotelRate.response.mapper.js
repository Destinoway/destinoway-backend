export const mapAkbarHotelRateResponse = (
  response
) => {
  const hotels = response?.hotels || [];

  return hotels
    .filter((hotel) => hotel?.id)
    .map((hotel) => ({
      supplier: "AKBAR",

      supplierHotelId:
        String(hotel.id),

      rate: hotel.rate
        ? {
            total:
              hotel.rate.total ?? null,

            baseRate:
              hotel.rate.baseRate ?? null,

            commission:
              hotel.rate.commission ?? null,

            discounts:
              hotel.rate.discounts ?? null,

            taxes:
              hotel.rate.taxes ?? null,

            provider:
              hotel.rate.provider ?? null,

            pointEquivalent:
              hotel.rate.pointEquivalent ?? null,

            otherRateComponents:
              hotel.rate.otherRateComponents || [],

            offer:
              hotel.rate.offer ?? null,

            gstOnCommission:
              hotel.rate.gstOnCommission ?? null,
          }
        : null,

      isRecommended:
        hotel.isRecommended ?? false,

      moreRatesExpected:
        hotel.moreRatesExpected ?? false,

      isRefundable:
        hotel.isRefundable ?? false,

      freeBreakfast:
        hotel.freeBreakfast ?? null,

      payAtHotel:
        hotel.payAtHotel ?? false,

      freeCancellation:
        hotel.freeCancellation ?? false,

      availableSuppliers:
        hotel.availableSuppliers || [],

      rawSupplierData: hotel,
    }));
};
