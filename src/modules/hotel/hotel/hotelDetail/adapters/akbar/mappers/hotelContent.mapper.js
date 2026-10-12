export const mapHotelContent = (data) => ({
  hotel: data?.hotel ?? data?.data?.hotel ?? data?.data ?? data,
});