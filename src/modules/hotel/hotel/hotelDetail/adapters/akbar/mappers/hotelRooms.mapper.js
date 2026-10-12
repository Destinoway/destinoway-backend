export const mapHotelRooms = (data) => ({
  rooms: data?.rooms ?? data?.data?.rooms ?? data?.data ?? data,
});