import HotelItinerary from "../hotel/itinerary/hotelItinerary.model.js";

const stageFilters = {
  price_checked: { itineraryStatus: "draft" },
  itinerary_created: { itineraryStatus: "created" },
  paid: { paymentStatus: "paid" },
  cancelled: { cancellationStatus: "cancelled" },
  failed: {
    $or: [
      { itineraryStatus: "failed" },
      { paymentStatus: "failed" },
      { supplierBookingStatus: "failed" },
      { cancellationStatus: "failed" },
    ],
  },
};

const parsePositiveInteger = (value, fallback, max = Number.MAX_SAFE_INTEGER) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0
    ? Math.min(parsed, max)
    : fallback;
};

export const getAdminHotelBookings = async (query = {}) => {
  const page = parsePositiveInteger(query.page, 1);
  const limit = parsePositiveInteger(query.limit, 20, 100);
  const filter = {};

  if (query.status) {
    const stage = String(query.status).trim().toLowerCase();
    if (!Object.hasOwn(stageFilters, stage)) {
      const error = new Error(
        "status must be price_checked, itinerary_created, paid, cancelled or failed",
      );
      error.statusCode = 400;
      throw error;
    }
    Object.assign(filter, stageFilters[stage]);
  }

  for (const field of ["itineraryStatus", "paymentStatus", "cancellationStatus"]) {
    if (query[field]) filter[field] = String(query[field]).trim().toLowerCase();
  }

  if (query.search) {
    const search = String(query.search).trim();
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(escaped, "i");
      filter.$and = [
        ...(filter.$and ?? []),
        {
          $or: [
            { bookingRefNo: searchRegex },
            { transactionId: searchRegex },
            { "hotel.name": searchRegex },
            { "contactInfo.firstName": searchRegex },
            { "contactInfo.lastName": searchRegex },
            { "contactInfo.email": searchRegex },
            { "contactInfo.mobile": searchRegex },
          ],
        },
      ];
    }
  }

  const [bookings, total] = await Promise.all([
    HotelItinerary.find(filter)
      .select("-__v -itineraryResponse -supplierBookingResponse -verifiedPrice -supplierRooms")
      .populate("userId", "name email mobile")
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    HotelItinerary.countDocuments(filter),
  ]);

  return {
    bookings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
};
