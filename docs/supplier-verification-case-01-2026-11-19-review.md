# AKBAR Case 01 — 19 November 2026 capture review

Source: `C:\Users\G L H\Downloads\case-01-new.zip`, entry `case-01-new.jsonl` (6,764,288 uncompressed bytes). Historical captures have not been replaced. The source archive retains every captured value; this report summarizes verification findings.

## Exchange completeness

The capture contains 35 parseable JSON records: 17 requests, 17 responses and one credential-context event. Every response has HTTP status 200. No error event, unanswered request, unmatched response, or overlapping request with an identical pairing key was found. Pairing uses operation, correlation ID, method, endpoint and chronological order. No `redacted: true` markers were found. Completeness refers to the captured application exchanges, not supplier acceptance or every network-level header.

| Operation | Requests | Responses |
|---|---:|---:|
| hotel_search_init | 1 | 1 |
| hotel_search_content | 3 | 3 |
| hotel_search_rate | 6 | 6 |
| hotel_details_content | 1 | 1 |
| hotel_details_rooms | 1 | 1 |
| hotel_price_verify | 2 | 2 |
| create_itinerary | 1 | 1 |
| start_payment | 1 | 1 |
| retrieve_booking | 1 | 1 |

The final search-rate response reports `searchStatus: "completed"` and `status: "success"`.

## Supplier requirements

| Requirement | Actual captured value | Finding |
|---|---|---|
| Init request searchTracingKey | Field absent; no search-tracing-key header on Init either | Still missing from the request. Its initial request source remains unconfirmed. |
| Init agentCode | `""` | Still empty. |
| Init segmentId = AgentProfile htdealCode | `""` | Still empty. No AgentProfile exchange was captured. |
| Init companyId = AgentProfile id | `"1"` | Present, but matching AgentProfile cannot be verified without its response. |
| CreateItinerary Auxiliaries CUSTOMER DETAILS | Lowercase `parameters` array with `Nationality: "IN"` and `Country of Residence: "IN"` | Present; matches the supplied sample structure. Retrieved nationality and residence are also IN. |
| Actual values in logs | No redaction markers; actual headers, tracing keys and credentials present in source JSONL | The logging change is reflected in this capture. |

The supplied sample puts searchTracingKey in the Init response, not the Init request. This does not resolve the supplier email's request requirement. Sample account values must not be substituted for this account's AgentProfile response.

## Case and cross-exchange consistency

| Field | Captured value |
|---|---|
| Search request timestamp UTC | `2026-11-19T07:12:50.036Z` |
| Search request timestamp IST | 19 November 2026, 12:42:50.036 |
| Occupancy | 1 room, 1 adult, 0 children |
| Destination / location ID | Jaipur / `227736` |
| Check-in / check-out | `2026-11-26` / `2026-11-27` |
| Supplier hotel code / provider | `70530067` / `WithinEarth` |
| Search correlation ID | `835d6aae-3641-4018-87e9-8689a4b268c8` |
| Itinerary correlation ID | `6afea19a60d09d5b366f139f` |
| Payment / retrieval correlation ID | `4f682f02-54d2-4e9f-8e0e-b5ee1850e0fb` |
| SearchId | `58ebcdd7-6070-4fea-8018-1c3132a181b7.cDxgr7mPUurwyhO2CyBdVw` |
| Init response searchTracingKey / itinerary request TUI | `47a0be8b-36ed-4f51-bce6-74f66b8f18e8` |
| Itinerary response TUI / payment and retrieval request TUI | `47a0be8b-36ed-4f51-bce6-74f66b8f18e8|2a179e3d-54db-4bfe-a920-df0167c49782|20261119124617` |
| Transaction ID | `260153258` |
| Itinerary request and response NetAmount / StartPay PaymentAmount / retrieved NetFare | `1464.03` |
| Itinerary and StartPay request ClientID | `bitest` |
| RetrieveBooking request / cached Signature ClientID | `FVI6V120g22Ei5ztGK0FIQ==` |

SearchId, TUI propagation, transaction references and amounts match across the booking flow. RetrieveBooking ClientID matches the captured credential-context ClientID. No new Signature exchange appears; credentials were read from cache.

## Booking result and remaining work

CreateItinerary, StartPay and RetrieveBooking each return supplier `Code: "200"` and `Msg: ["Success"]`. StartPay returns `RedirectMode: "R"`, `PaymentID: null`, `BookStatus: "B0"` and `CRSPNR: "TestBooking"`. RetrieveBooking returns `BookingStatus: "B0"`, `CurrentStatus: "B0"`, `PaymentStatus: "I8"`, `BookingConfirmationId: "TestBooking"`, and `PaxCount: 1`.

This capture establishes a successful supplier test-flow response, but not a completed live paid booking. The supplier checklist remains incomplete until agentCode, segmentId, the AgentProfile companyId mapping and the Init request tracing-key requirement are resolved. Another run before those fixes would reproduce the same outstanding issues.
