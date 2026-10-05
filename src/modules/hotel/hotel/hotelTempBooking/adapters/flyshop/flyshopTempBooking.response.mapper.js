export const mapFlyshopTempBookingResponse = (
  response
) => {
  return {
    bookingRefNo:
      response?.BookingRefNo ?? null,

    isPriceChanged:
      response?.IsPriceChanged ?? false,

    responseHeader: {
      errorCode:
        response?.ResponseHeader?.ErrorCode ??
        null,

      errorDesc:
        response?.ResponseHeader?.ErrorDesc ??
        null,

      errorInnerException:
        response?.ResponseHeader
          ?.ErrorInnerException ?? null,

      statusId:
        response?.ResponseHeader?.StatusId ??
        null,
    },

    revisedFare:
      response?.RevisedFare ?? null,
  };
};