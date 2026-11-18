# Case 01 - raw exchange verification

Source: case-01-raw.jsonl, 13 November 2026, 06:23:09.207-06:26:48.131 UTC (11:53:09.207-11:56:48.131 IST).

29 valid JSON records: 14 requests, 14 responses, 1 credential-context record. No error events, unanswered requests, or overlapping ambiguous pairs were found in this extracted capture. Every captured HTTP response is 200. Request/response pairing uses operation, correlation ID, method, endpoint, and chronological order.

| Operation | Requests | Responses | HTTP status |
|---|---:|---:|---|
| hotel_search_init | 1 | 1 | 200 |
| hotel_search_content | 2 | 2 | 200 |
| hotel_search_rate | 4 | 4 | 200 |
| hotel_details_rooms | 1 | 1 | 200 |
| hotel_details_content | 1 | 1 | 200 |
| hotel_price_verify | 2 | 2 | 200 |
| create_itinerary | 1 | 1 | 200 |
| start_payment | 1 | 1 | 200 |
| retrieve_booking | 1 | 1 | 200 |

## Booking consistency

- Init response searchId matches CreateItinerary request SearchId.
- CreateItinerary response TUI matches both StartPay and RetrieveBooking request TUI. StartPay and RetrieveBooking return their own response TUIs.
- Transaction ID 260152323 matches itinerary response, payment request, retrieval reference, and retrieval response.
- Itinerary NetAmount, StartPay PaymentAmount, and RetrieveBooking NetFare match: 1409.65.
- CreateItinerary and StartPay request ClientID is bitest; RetrieveBooking request ClientID is FVI6V120g22Ei5ztGK0FIQ==. This difference is recorded, not treated as a verified supplier requirement.

## Scope and limitations

- Init headers, endpoint, complete captured request, and complete captured response are included in file 1. All repeated polls and price-verification calls are preserved. GET query parameters are included in the captured request object.
- Captured redaction markers are retained unchanged. Authorization, tracing keys, and other redacted values cannot be recovered from this file. Headers are the application-captured headers, not a network-level capture of every automatically added HTTP header.
- StartPay returns redirect mode R, PaymentID null, and TestBooking. RetrieveBooking reports BookingStatus B0, PaymentStatus I8, and BookingConfirmationId TestBooking. These logs do not establish a completed live paid booking; supplier confirmation or redirect/callback evidence is needed.
- No Signature, cancellation, separate filter, or separate pricing-content API exchange appears in this extracted capture. No replacement exchanges have been invented. The sample ZIP's extra operations are not evidence that every operation is required for this scenario; confirm the required case checklist with the supplier.
- This report supersedes missing-response observations in the earlier PM2-based summary. It verifies completeness of captured exchanges, not supplier acceptance or the full business outcome.
