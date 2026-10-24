import mongoose from "mongoose";
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

const mapAdminBookingSummary = (booking) => ({
  bookingId: String(booking._id),
  bookingRefNo: booking.bookingRefNo ?? null,
  userName: booking.userId?.name ?? null,
  hotelName: booking.hotel?.name ?? null,
  checkIn: booking.stay?.checkIn ?? null,
  checkOut: booking.stay?.checkOut ?? null,
  priceCheckStatus: booking.verifiedPrice || booking.price ? "completed" : "pending",
  itineraryStatus: booking.itineraryStatus ?? null,
  paymentStatus: booking.paymentStatus ?? null,
  bookingStatus:
    booking.supplierBookingStatus ??
    booking.supplierBookingDetails?.bookingStatus ??
    null,
});

export const getAdminHotelBookingById = async (bookingId) => {
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    const error = new Error("Valid booking ID is required");
    error.statusCode = 400;
    throw error;
  }

  const booking = await HotelItinerary.findById(bookingId)
    .select("-__v")
    .populate("userId", "name email mobile")
    .lean();

  if (!booking) {
    const error = new Error("Hotel booking not found");
    error.statusCode = 404;
    throw error;
  }

  return booking;
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
      .select("userId hotel.name stay.checkIn stay.checkOut bookingRefNo verifiedPrice price itineraryStatus paymentStatus supplierBookingStatus supplierBookingDetails.bookingStatus createdAt")
      .populate("userId", "name")
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    HotelItinerary.countDocuments(filter),
  ]);

  return {
    bookings: bookings.map(mapAdminBookingSummary),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
};
