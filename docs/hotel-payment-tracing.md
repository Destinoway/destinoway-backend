# Hotel payment tracing

Hotel payment operations emit structured JSON log entries with a request
`correlationId`. Customer payment endpoints generate a new ID per request;
webhook handlers do the same. Each asynchronous payment step emits
`hotel.payment.trace` with `phase` set to `started`, `completed`, or `failed`.

Trace points cover booking and transaction database reads/writes, gateway order,
verification and refund calls, supplier booking claims, AKBAR StartPay, and
webhook processing. If a step stalls, its last `started` event has no matching
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
