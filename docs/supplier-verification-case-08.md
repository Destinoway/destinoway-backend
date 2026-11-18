# AKBAR Supplier Verification — Case 08

## Case details

| Field | Value from supplied PM2 logs |
|---|---|
| Scenario | 3 nights; 2 rooms, each with 2 adults and 2 children |
| Search room 1 | 2 adults, child ages `[8, 9]` |
| Search room 2 | 2 adults, child ages `[2, 9]` |
| Check-in / check-out | 2026-11-10 to 2026-11-13 |
| Nights | 3 |
| Search location ID | `328605` |
| Search correlation ID | `77a84a83-7baa-4e27-83b5-8b6560695a82` |
| Booking correlation ID | `6aec3c6774345c2f5d83395e` |
| Payment/retrieve correlation ID | `70b34356-ce53-4f7a-8ce5-a15f31734c5f` |
| Search ID | `770b77d5-3165-4691-bc85-5c9096a8fa83.U6Jy0pCQfB3Aw6wJIlyGOw` |
| Search tracing key | `ba2a7ec7-571e-4991-a909-53609bb22928` |
| Supplier hotel code | `15131286` |
| Supplier room provider in payload | `CleartripAPI` |
| Transaction ID | `260151675` |

Bearer tokens are omitted. Some large search-result log lines are truncated in the pasted PM2 output; the booking verification records are intact.

## CreateItinerary rooms and guests

PriceVerify returned one room group with `roomCount: 2` and two occupancies. CreateItinerary sent separate room entries with the correct occupancy IDs, adult counts, and child ages:

```json
[
  {
    "GuestCode": "|1|2:A:25:25|2:C:8:9|",
    "Guests": [
      { "GuestID": "0", "PaxType": "A", "Age": "25" },
      { "GuestID": "0", "PaxType": "A", "Age": "25" },
      { "GuestID": "0", "PaxType": "C", "Age": "8" },
      { "GuestID": "0", "PaxType": "C", "Age": "9" }
    ]
  },
  {
    "GuestCode": "|2|2:A:25:25|2:C:2:9|",
    "Guests": [
      { "GuestID": "0", "PaxType": "A", "Age": "25" },
      { "GuestID": "0", "PaxType": "A", "Age": "25" },
      { "GuestID": "0", "PaxType": "C", "Age": "2" },
      { "GuestID": "0", "PaxType": "C", "Age": "9" }
    ]
  }
]
```

All four adults use `GuestID: "0"`, `Age: "25"`; all four children use `GuestID: "0"`. The request includes mapped ContactInfo fields, including `Phone`, `GSTAddress`, and `GSTState`. It sent `ClientID: "bitest"`, `HotelCode: "15131286"`, and `NetAmount: "14996.68"`.

## Booking responses and TUI/ClientID checks

CreateItinerary returned HTTP 200, `Code: "200"`, `Msg: ["Success"]`, `TransactionID: 260151675`, and:

```text
TUI: ba2a7ec7-571e-4991-a909-53609bb22928|6307f2c2-a82c-443f-8db9-6303b85661ad|20261105135401
```

StartPay request used that TUI, `TransactionID: 260151675`, `ClientID: "bitest"`, and `PaymentAmount: 7498.34`. StartPay response was HTTP 200 with `Code: "200"`, `Msg: ["Success"]`, `CRSPNR: "TestBooking"`, and `BookStatus: "B0"`.

RetrieveBooking request used the CreateItinerary/StartPay request TUI and `ReferenceNumber: "260151675"`. Its ClientID was `FVI6V120g22Ei5ztGK0FIQ==`, matching the Signature response recorded in Case 01; this capture has no new Signature event, so the cached value was reused. RetrieveBooking returned HTTP 200 with `Code: "200"`, `Msg: ["Success"]`, `BookingStatus: "B0"`, and `CurrentStatus: "B0"`.

## Amount discrepancy to verify

PriceVerify returned `totalRate: 7498.34` for the group with `roomCount: 2`. Our CreateItinerary request sent `NetAmount: "14996.68"` (`7498.34 × 2`), while the supplier response returned `NetAmount: 7498.34`; StartPay also used `PaymentAmount: 7498.34`.

**Supplier-response value:** `7498.34`. `14996.68` is our outbound request value, included only for comparison; it is not a supplier response value.

```text
PriceVerify totalRate × roomCount: 7498.34 × 2 = 14996.68
Our CreateItinerary request NetAmount:             14996.68
Supplier CreateItinerary response NetAmount:       7498.34
StartPay PaymentAmount:                            7498.34
```

The booking statuses succeeded, but ask the supplier whether `totalRate` represents a per-room rate or the total for both rooms. The two-room amount is not verified until confirmed.

## Checklist

| Check | Case 08 result |
|---|---|
| Stay duration | Pass: 2026-11-10 to 2026-11-13 is 3 nights. |
| Two room occupancies | Pass: GuestCode occupancy IDs 1 and 2; 2 adults and 2 children in each. |
| Adult GuestID/Age defaults | Pass for all four adults. |
| Child GuestIDs/ages | Pass for all four children; ages match each room's requested order. |
| RetrieveBooking TUI | Pass: matches CreateItinerary response and StartPay request. |
| RetrieveBooking ClientID | Matches the Signature response captured in Case 01; cached value reused. |
| Supplier statuses | Pass: CreateItinerary, StartPay, and RetrieveBooking returned HTTP 200 and Code 200. |
| Two-room total amount | **Needs supplier confirmation:** our request sent 14996.68; supplier response and StartPay used 7498.34. |
