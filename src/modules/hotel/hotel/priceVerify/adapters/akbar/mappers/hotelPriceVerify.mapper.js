export const mapAkbarHotelPriceVerifyResponse = (response) =>
  response?.pricing ?? response?.data?.pricing ?? response?.data ?? response;
