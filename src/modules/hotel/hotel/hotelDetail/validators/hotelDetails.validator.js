const isValidId = (value) =>
  typeof value === "string" && value.trim().length > 0;

export const validateHotelDetailsParams = (req, res, next) => {
  const { searchId, hotelId } = req.params;

  if (!isValidId(searchId) || !isValidId(hotelId)) {
    return res.status(400).json({
      success: false,
      message: "Valid searchId and hotelId are required",
      data: null,
      meta: null,
    });
  }

  next();
};

export const validateHotelPricingParams = (req, res, next) => {
  const { searchId, hotelId } = req.params;
  const { providerName, recommendationId } = req.body ?? {};

  if (
    !isValidId(searchId) ||
    !isValidId(hotelId) ||
    !isValidId(providerName) ||
    !isValidId(recommendationId)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "searchId, hotelId, providerName and recommendationId are required",
      data: null,
      meta: null,
    });
  }

  next();
};