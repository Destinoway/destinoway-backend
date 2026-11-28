import test from "node:test";
import assert from "node:assert/strict";
import HotelItinerary from "../itinerary/hotelItinerary.model.js";
import { getHotelRequeryByUserController } from "./requery.controller.js";
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

test("no matching bookings returns an empty list", async (t) => {
  t.mock.method(HotelItinerary, "find", () => ({ sort: () => ({ lean: async () => [] }) }));
  assert.deepEqual(await getHotelRequeryByUserService("owner"), []);
});

test("empty booking list responds with 200 and omits data", async (t) => {
  t.mock.method(HotelItinerary, "find", () => ({ sort: () => ({ lean: async () => [] }) }));
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return body;
    },
  };

  await getHotelRequeryByUserController(
    {
      params: {},
      query: {},
      user: { _id: "owner" },
    },
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.message, "Booking does not exist");
  assert.equal(Object.hasOwn(res.body, "data"), false);
});
