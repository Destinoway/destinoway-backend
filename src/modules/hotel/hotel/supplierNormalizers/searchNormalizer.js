
export const normalizeSearchHotels = (
  supplierResponse
) => {
  return supplierResponse.HotelFareDetails.map(
    (hotel) => ({
      hotelId: hotel.HotelId,
      supplierAmount: Number(hotel.TotalAmount),
      baseAmount: Number(hotel.BasicAmount),
      taxAmount: Number(hotel.TaxAmount),
    })
  );
};
const normalizedHotels =
  normalizeSearchHotels(response);

const pricedHotels =
  normalizedHotels.map((hotel) => ({
    ...hotel,
    pricing: calculateFinalPrice({
      supplierAmount:
        hotel.supplierAmount,
      markup,
      serviceTax,
      additionalTax,
      slabTaxRule,
    }),
  }));