import test from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import HotelItinerary from "../src/modules/hotel/hotel/itinerary/hotelItinerary.model.js";
import Coupon from "../src/modules/promotionEngine/coupon.model.js";
import AkbarToken from "../src/modules/hotel/supplier/akbar/akbarToken.model.js";
import { getVerifiedSupplierTotal } from "../src/modules/hotel/hotel/utils/hotelRoomGroupPricing.js";

test("supplier total counts each group once and rejects invalid verified prices", () => {
  assert.equal(getVerifiedSupplierTotal([{ roomCount: 2, totalRate: 895.59 }]), 895.59);
  assert.equal(getVerifiedSupplierTotal([{ roomCount: 1, totalRate: 799.98 }]), 799.98);
  assert.equal(getVerifiedSupplierTotal([{ roomCount: 2, totalRate: 895.59 }, { roomCount: 3, totalRate: "100.10" }]), 995.69);
  for (const groups of [[], [{ totalRate: null }], [{ totalRate: -1 }], [{ totalRate: Infinity }], [{ totalRate: 1, roomCount: 0 }]]) {
    assert.throws(() => getVerifiedSupplierTotal(groups), { statusCode: 409 });
  }
});

test("verified group totals flow through customer pricing, coupons, itinerary and supplier payment", async (t) => {
  const url = (file) => new URL(`../src/${file}`, import.meta.url).href;
  let pricing, draft, discount = 10;
  const search = { supplierCode: "AKBAR", supplier: "AKBAR", internalSearchId: "search", supplierSearchId: "supplier-search", searchTracingKey: "trace", checkIn: "2026-11-30", checkOut: "2026-12-01", occupancies: [] };
  const makeGroup = (id, totalRate, occupancies) => ({ id, totalRate, baseRate: totalRate, roomCount: occupancies.length, occupancies, providerName: "Veturis", room: { id: `room-${id}`, name: "Test room" }, currency: "INR" });
  t.mock.module(url("modules/hotel/hotel/utils/resolveSupplierSearch.js"), { namedExports: { resolveSupplierSearch: async () => search } });
  t.mock.module(url("modules/hotel/hotel/utils/hotelRoomProviderCache.js"), { namedExports: {
    cacheHotelRoomProviders: async () => {}, getCachedHotelRoomProvider: async () => "Veturis", getCachedHotelRoomRecommendationMeta: async () => ({}),
  } });
  t.mock.module(url("modules/hotel/hotel/hotelSearch/service/hotelSearch.redis.service.js"), { namedExports: {
    getHotelSearchResults: async () => [{ supplierHotelId: "hotel", name: "Test hotel", address: "Test address" }], getHotelSearchMeta: async () => ({ destinationCountryCode: "IN" }),
  } });
  t.mock.module(url("modules/hotel/hotel/priceVerify/adapters/akbar/api/hotelPriceVerify.api.js"), { namedExports: { akbarHotelPriceVerifyAPI: async () => pricing } });
  t.mock.module(url("modules/hotel/hotel/hotelDetail/adapters/akbar/api/hotelRooms.api.js"), { namedExports: { hotelRoomsAPI: async () => { throw Error("Unexpected room fetch"); } } });
  t.mock.module(url("modules/promotionEngine/promotion.service.js"), { namedExports: { findBestCouponFromList: () => ({ bestCoupon: discount ? { code: "TEST", title: "Test" } : null, bestDiscount: discount, availableCoupons: [] }) } });
  // Isolate the rate/markup calculation so these tests exercise aggregation,
  // allocation and propagation without depending on configured business rules.
  t.mock.module(url("modules/priceMarkup/pricing/hotelPricing.service.js"), { namedExports: {
    loadHotelPricingConfig: async () => ({}),
    priceHotelForSearch: (hotel) => ({ customerPrice: { totalPriceBeforeCoupon: Number((hotel.rate.total + 110).toFixed(2)), serviceTaxAmount: 5, "platform&servicetax": 10 } }),
  } });
  t.mock.module(url("modules/hotel/hotel/utils/hotelObservability.js"), { namedExports: {
    logHotelEvent: () => {}, maskSupplierTracingKey: () => "trace", logSupplierApiExchange: async (_context, execute) => execute(),
  } });
  let itineraryPayload, paymentPayload;
  t.mock.module(url("modules/hotel/hotel/itinerary/adapters/akbar/api/createHotelItinerary.api.js"), { namedExports: {
    createAkbarHotelItineraryAPI: async ({ payload }) => {
      itineraryPayload = payload;
      return { Code: "200", Msg: ["Success"], TransactionID: 1234, TUI: "created-tui", NetAmount: Number(payload.NetAmount) };
    },
  } });
  t.mock.method(Coupon, "find", () => ({ lean: async () => [] }));
  t.mock.method(Coupon, "findOne", () => ({ lean: async () => ({ code: "TEST" }) }));
  t.mock.method(HotelItinerary, "findOneAndUpdate", async (_query, update) => {
    draft = { _id: "draft", ...update.$setOnInsert, ...update.$set, markModified: () => {}, save: async () => {} };
    return draft;
  });
  t.mock.method(HotelItinerary, "findOne", async () => draft);
  t.mock.method(AkbarToken, "findOne", () => ({ select: () => ({ lean: async () => ({ token: "test-token" }) }) }));
  t.mock.method(axios, "post", async (_endpoint, body) => { paymentPayload = body; return { data: { Code: "200" }, status: 200 }; });
  const env = { AKBAR_CLIENT_ID: "test-client", AKBAR_HOTEL_API_URL: "https://supplier.example", AKBAR_BROWSER_KEY: "test-browser", AKBAR_AGENT_INFO: "test-agent", AKBAR_MERCHANT_ID: "300", START_PAY_URL: "https://supplier.example/Payment/StartPay" };
  const before = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  Object.assign(process.env, env);
  t.after(() => { for (const [key, value] of Object.entries(before)) value === undefined ? delete process.env[key] : process.env[key] = value; });
  const { verifyHotelPrice } = await import(url("modules/hotel/hotel/priceVerify/services/hotelPriceVerify.service.js"));
  const { createHotelItinerary, updateHotelItineraryCoupon } = await import(url("modules/hotel/hotel/itinerary/hotelItinerary.service.js"));
  const { startAkbarHotelPay } = await import(url("modules/hotel/hotel/payments/adapters/akbar/startPay.api.js"));
  const params = { searchId: "search", hotelId: "hotel", recommendationId: "recommendation", userId: "owner" };
  const contactInfo = { title: "Mr", firstName: "Test", lastName: "Guest", mobile: "9876543210", email: "test@example.com", address: "Test", state: "Test", city: "Test", pin: "123456" };
  const book = () => createHotelItinerary({ ...params, itineraryId: "draft", contactInfo, rooms: search.occupancies.map(() => ({ adults: [{ title: "Mr", firstName: "Test", lastName: "Guest" }], children: [] })) });

  await t.test("Case 04: two rooms stay 895.59 through supplier and payment; customer totals counted once", async () => {
    search.occupancies = [1, 2].map(occupancyId => ({ occupancyId, numOfAdults: 1, numOfChildren: 0, childAges: [] }));
    pricing = { roomGroup: [makeGroup("group", 895.59, search.occupancies)] };
    await verifyHotelPrice(params);
    assert.equal(draft.price.supplierTotal, 895.59);
    assert.equal(draft.price.totalBeforeCoupon, 1005.59);
    assert.equal(draft.price.serviceTax, 5);
    assert.equal(draft.price.total, 995.59);
    assert.equal(draft.price.basePrice, 985.59);
    assert.equal(draft.price.roomGroups[0].customerPrice.couponDiscount, 10);
    await updateHotelItineraryCoupon({ itineraryId: "draft", userId: "owner", couponCode: null });
    assert.equal(draft.price.total, 1005.59);
    assert.equal(draft.price.roomGroups[0].customerPrice.couponDiscount, 0);
    await updateHotelItineraryCoupon({ itineraryId: "draft", userId: "owner", couponCode: "TEST" });
    assert.equal(draft.price.total, 995.59);
    const bookingResponse = await book();
    assert.equal(itineraryPayload.NetAmount, "895.59");
    assert.equal(itineraryPayload.Rooms.length, 2);
    assert.equal(bookingResponse.amount, 995.59);
    await startAkbarHotelPay({ booking: draft });
    assert.equal(paymentPayload.PaymentAmount, 895.59);
    // Missing supplier response amount must fall back to saved supplier total,
    // never to the customer amount (which includes markup/tax/coupon).
    delete draft.itineraryResponse.NetAmount;
    await startAkbarHotelPay({ booking: draft });
    assert.equal(paymentPayload.PaymentAmount, 895.59);
    delete draft.price.supplierNetAmount;
    delete draft.price.supplierTotal;
    paymentPayload = null;
    await assert.rejects(startAkbarHotelPay({ booking: draft }), { statusCode: 409 });
    assert.equal(paymentPayload, null, "customer price cannot be sent as a fallback supplier payment");
  });

  await t.test("multiple groups allocate coupon once and sum to the booking total", async () => {
    search.occupancies = [...search.occupancies, { occupancyId: 3, numOfAdults: 1, numOfChildren: 0 }];
    pricing = { roomGroup: [makeGroup("group", 895.59, search.occupancies.slice(0, 2)), makeGroup("other", 100, search.occupancies.slice(2))] };
    await verifyHotelPrice(params);
    assert.equal(draft.price.supplierTotal, 995.59);
    assert.equal(draft.price.totalBeforeCoupon, 1215.59);
    assert.equal(draft.price.total, 1205.59);
    const prices = draft.price.roomGroups.map(g => g.customerPrice);
    assert.equal(Number(prices.reduce((n, g) => n + g.couponDiscount, 0).toFixed(2)), 10);
    assert.equal(Number(prices.reduce((n, g) => n + g.totalPrice, 0).toFixed(2)), draft.price.total);
    assert.equal(draft.price.serviceTax, 10);
    await updateHotelItineraryCoupon({ itineraryId: "draft", userId: "owner", couponCode: "TEST" });
    assert.equal(Number(draft.price.roomGroups.reduce((n, g) => n + g.customerPrice.totalPrice, 0).toFixed(2)), 1205.59);
    await book();
    assert.equal(itineraryPayload.NetAmount, "995.59");
    assert.equal(itineraryPayload.Rooms.length, 3);
    await startAkbarHotelPay({ booking: draft });
    assert.equal(paymentPayload.PaymentAmount, 995.59);
  });

  await t.test("single-room amounts remain unchanged", async () => {
    search.occupancies = [{ occupancyId: 1, numOfAdults: 1, numOfChildren: 0 }];
    pricing = { roomGroup: [makeGroup("single", 799.98, search.occupancies)] };
    discount = 0;
    await verifyHotelPrice(params);
    assert.equal(draft.price.supplierTotal, 799.98);
    await book();
    assert.equal(itineraryPayload.NetAmount, "799.98");
  });

  await t.test("legacy drafts and changed prices cannot send stale amounts to supplier", async () => {
    await verifyHotelPrice(params);
    delete draft.price.rateBasis;
    itineraryPayload = null;
    await assert.rejects(book(), { statusCode: 409 });
    await assert.rejects(updateHotelItineraryCoupon({ itineraryId: "draft", userId: "owner", couponCode: null }), { statusCode: 409 });
    assert.equal(itineraryPayload, null);
    await verifyHotelPrice(params);
    pricing.roomGroup[0].totalRate = 800;
    await assert.rejects(book(), { statusCode: 409 });
    assert.equal(itineraryPayload, null);
  });
});
