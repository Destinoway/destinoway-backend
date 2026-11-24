const badRequest = (res, message) =>
  res.status(400).json({
    success: false,
    message,
    data: null,
    meta: null,
  });

const isCoordinatePair = (value) => {
  if (typeof value !== "string") return false;

  const coordinates = value.split(",");
  if (coordinates.length !== 2 || coordinates.some((part) => !part.trim())) {
    return false;
  }

  const [latitude, longitude] = coordinates.map(Number);
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
};

export const validateAutocompleteRequest = (req, res, next) => {
  const { input, location } = req.query;

  if (typeof input !== "string" || !input.trim() || input.length > 200) {
    return badRequest(res, "input must be a non-empty string of max 200 characters");
  }

  if (location !== undefined && !isCoordinatePair(location)) {
    return badRequest(res, "location must be latitude,longitude coordinates");
  }

  return next();
};

export const validatePlaceDetailsRequest = (req, res, next) => {
  const { place_id: placeId } = req.query;

  if (
    typeof placeId !== "string" ||
    !placeId.trim() ||
    placeId.length > 512
  ) {
    return badRequest(
      res,
      "place_id must be a non-empty string of max 512 characters",
    );
  }

  return next();
};
