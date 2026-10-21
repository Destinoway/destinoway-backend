# Hotel payment tracing

Hotel payment operations emit structured JSON log entries with a request
`correlationId`. Customer payment endpoints generate a new ID per request;
webhook handlers do the same. Each asynchronous payment step emits
`hotel.payment.trace` with `phase` set to `started`, `completed`, or `failed`.

Trace points cover booking and transaction database reads/writes, gateway order,
verification and refund calls, supplier booking claims, AKBAR StartPay and
RetrieveBooking, and webhook processing. After StartPay confirms a booking, the
backend retrieves AKBAR booking details using the itinerary `TransactionID` as
`ReferenceNumber` (`ReferenceType: "T"`, `RequestMode: "RB"`). It uses the same
HTTPS host configured by `START_PAY_URL`, with the path `/Utils/RetrieveBooking`.
Only recognized PNR, booking status, booking confirmation ID, hotel
confirmation number, voucher number, TUI, and `FinYearID` fields are saved under
`supplierBookingDetails`; the full RetrieveBooking response is not persisted.
A RetrieveBooking failure is logged but does not undo the supplier booking
confirmation.

Customers can request cancellation with
`POST /api/v1/cancel-booking/:bookingId` using
`{ "confirmCancellation": true, "remarks": "Customer requested cancellation" }`.
The API uses the saved AKBAR `TUI`, itinerary `TransactionID`, and `FinYearID`
as `TUI`, `TransactionID`, and `YearType` in `/Hotel/CancelHotelBooking`.
For older bookings missing TUI or `FinYearID`, it retrieves and saves those
references before requesting cancellation. A request that may have reached
AKBAR is not automatically retried; its cancellation status is recorded as
`unknown` for manual supplier verification. Customer payment refunds are not
initiated by this endpoint.

If a step stalls, its last `started` event has no matching
`completed` or `failed` event; filter by that event's `correlationId` to see
where execution stopped. The service also emits higher-level
`hotel.payment.*` events for outcomes such as `order.completed`,
`verification.rejected`, `supplier_booking.failed`, and `refund.completed`.

Example fields:

```json
{
  "event": "hotel.payment.trace",
  "correlationId": "server-generated-id",
  "flow": "hotel_payment",
  "step": "gateway.razorpay.create_order",
  "phase": "started",
  "bookingId": "booking-id",
  "gateway": "razorpay"
}
```

These events intentionally omit request and response bodies, payment
signatures, tokens, authorization headers, and customer contact details. Do not
add those values to payment logs when extending this flow.
