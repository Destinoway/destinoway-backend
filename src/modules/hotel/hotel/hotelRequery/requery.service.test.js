import test from "node:test";
import assert from "node:assert/strict";
import HotelItinerary from "../itinerary/hotelItinerary.model.js";
import { getHotelRequeryByUserService } from "./requery.service.js";

test("booking list excludes drafts and missing references without requiring paid status", async (t) => {
  let query;
  t.mock.method(HotelItinerary, "find", (filter) => {
    query = filter;
    return { sort: () => ({ lean: async () => [{
      bookingRefNo: "DW-2026-11-12345678",
      itineraryStatus: "created",
      paymentStatus: "pending",
      supplierBookingStatus: "awaiting_payment",
      hotel: { name: "Test hotel" },
    }] }) };
  });
  const result = await getHotelRequeryByUserService("owner");
  assert.equal(query.userId, "owner");
  assert.equal(query.itineraryStatus.$ne, "draft");
  assert.equal(query.bookingRefNo.$type, "string");
  assert.equal(query.bookingRefNo.$ne, "");
  assert.equal(query.paymentStatus, undefined);
  assert.equal(result[0].status, "awaiting_payment");
  assert.equal(result[0].bookingRefNo, "DW-2026-11-12345678");

  await getHotelRequeryByUserService("owner", undefined, "confirmed");
  assert.equal(query.supplierBookingStatus, "confirmed");
  assert.equal(query.userId, "owner");
});

test("no matching bookings retains the existing 404 contract", async (t) => {
  t.mock.method(HotelItinerary, "find", () => ({ sort: () => ({ lean: async () => [] }) }));
  await assert.rejects(getHotelRequeryByUserService("owner"), { statusCode: 404, message: "Booking not found" });
});
