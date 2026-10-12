

export const mapHotelPricing = (data) => ({
  pricing: data?.pricing ?? data?.data?.pricing ?? data?.data ?? data,
});