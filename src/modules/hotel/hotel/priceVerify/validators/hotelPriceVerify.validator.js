const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

export const validateHotelPriceVerifyRequest = (req, res, next) => {
  const { searchId, hotelId } = req.params;
  const { recommendationId } = req.body ?? {};

  if (
    !isNonEmptyString(searchId) ||
    !isNonEmptyString(hotelId) ||
    !isNonEmptyString(recommendationId)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "searchId, hotelId and recommendationId are required",
      data: null,
      meta: null,
    });
  }

  next();
};
