const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

export const validateCreateHotelItineraryRequest = (req, res, next) => {
  const { searchId, hotelId } = req.params;
  const { recommendationId, contactInfo, rooms } = req.body ?? {};

  if (!isNonEmptyString(req.body?.itineraryId)) {
    return res.status(400).json({
      success: false,
      message: "itineraryId is required and must be a non-empty string",
      data: null,
      meta: null,
    });
  }

  if (
    !isNonEmptyString(searchId) ||
    !isNonEmptyString(hotelId) ||
    !isNonEmptyString(recommendationId)
  ) {
    return res.status(400).json({
      success: false,
      message: "searchId, hotelId, recommendationId and itineraryId are required",
      data: null,
      meta: null,
    });
  }

  const requiredContactFields = [
    "title",
    "firstName",
    "lastName",
    "mobile",
    "email",
    "address",
    "state",
    "city",
    "pin",
  ];

  if (
    !contactInfo ||
    requiredContactFields.some(
      (field) => !isNonEmptyString(contactInfo[field])
    ) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactInfo.email)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "contactInfo must include title, firstName, lastName, mobile, email, address, state, city and pin",
      data: null,
      meta: null,
    });
  }

  if (!Array.isArray(rooms) || rooms.length === 0) {
    return res.status(400).json({
      success: false,
      message: "rooms must contain guest details for each searched room",
      data: null,
      meta: null,
    });
  }

  if (
    req.body.specialServiceRequest !== undefined &&
    (typeof req.body.specialServiceRequest !== "string" ||
      req.body.specialServiceRequest.length > 500)
  ) {
    return res.status(400).json({
      success: false,
      message: "specialServiceRequest must be a string of at most 500 characters",
      data: null,
      meta: null,
    });
  }

  for (const room of rooms) {
    if (
      !room ||
      !Array.isArray(room?.adults) ||
      !Array.isArray(room?.children)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Each room must include adults and children arrays",
        data: null,
        meta: null,
      });
    }

    for (const guest of [...room.adults, ...room.children]) {
      if (
        !isNonEmptyString(guest?.title) ||
        !isNonEmptyString(guest?.firstName) ||
        !isNonEmptyString(guest?.lastName)
      ) {
        return res.status(400).json({
          success: false,
          message: "Each guest must include title, firstName and lastName",
          data: null,
          meta: null,
        });
      }
    }

    if (
      room.children.some((guest) => {
        if (guest?.age === undefined || guest?.age === null || guest?.age === "") {
          return false;
        }
        return (
          !Number.isInteger(Number(guest.age)) ||
          Number(guest.age) < 0 ||
          Number(guest.age) > 17
        );
      })
    ) {
      return res.status(400).json({
        success: false,
        message: "Each provided child age must be an integer between 0 and 17",
        data: null,
        meta: null,
      });
    }
  }

  next();
};
