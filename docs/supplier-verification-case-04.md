# AKBAR Supplier Verification — Case 04

## Case details

| Field | Value from supplied PM2 logs |
|---|---|
| Scenario | 2 rooms, 1 adult per room |
| Stay | 2026-11-07 to 2026-11-08 |
| Search location ID | `328605` |
| Search correlation ID | `4ed2c5c1-b3b9-4ea9-be89-b79cce5d82ef` |
| Booking correlation ID | `6aec356e74345c2f5d833939` |
| Payment/retrieve correlation ID | `9178efd0-6b0a-40cc-9fcc-2565706ed092` |
| Search ID | `f97f155e-8174-47ce-95fb-a35929d56ac0.-NqygZTo4Q10i9onkxiIsA` |
| Search tracing key | `912cdc1b-8a46-4cce-a53a-34158eb5be39` |
| Supplier hotel code | `15131286` |
| Supplier room provider in payload | `CleartripAPI` |
| Transaction ID | `260151666` |

Bearer tokens are omitted. The booking verification records are intact; some large search-result lines in the pasted terminal output are truncated.

## CreateItinerary room and guest payload

PriceVerify returned one room group with `roomCount: 2` and two occupancies: occupancy 1 has one adult; occupancy 2 has one adult. CreateItinerary sent two room entries with the corresponding occupancy IDs and one adult each:

```json
[
  {
    "GuestCode": "|1|1:A:25|",
    "Guests": [
      { "GuestID": "0", "PaxType": "A", "Age": "25" }
    ]
  },
  {
    "GuestCode": "|2|1:A:25|",
    "Guests": [
      { "GuestID": "0", "PaxType": "A", "Age": "25" }
    ]
  }
]
```

The request sent `ClientID: "bitest"`, `HotelCode: "15131286"`, and `NetAmount: "2810.5"`.

## Booking responses and TUI/ClientID checks

CreateItinerary returned HTTP 200, `Code: "200"`, `Msg: ["Success"]`, `TransactionID: 260151666`, and:

```text
TUI: 912cdc1b-8a46-4cce-a53a-34158eb5be39|1b0cb470-af48-451b-87ac-be773b6789cf|20261105132352
```

StartPay request used that TUI, `TransactionID: 260151666`, `ClientID: "bitest"`, and `PaymentAmount: 1405.25`. StartPay response was HTTP 200 with `Code: "200"`, `Msg: ["Success"]`, `CRSPNR: "TestBooking"`, and `BookStatus: "B0"`.

RetrieveBooking request used the CreateItinerary/StartPay request TUI and `ReferenceNumber: "260151666"`. Its `ClientID` was `FVI6V120g22Ei5ztGK0FIQ==`, matching the Signature response recorded in Case 01; no new Signature exchange appears in this capture, so the cached Signature ClientID was reused. RetrieveBooking returned HTTP 200 with `Code: "200"`, `Msg: ["Success"]`, `BookingStatus: "B0"`, and `CurrentStatus: "B0"`.

## Amount discrepancy to verify

The price-check result reported `totalRate: 1405.25` for the room group with `roomCount: 2`. CreateItinerary sent `NetAmount: "2810.5"` (1405.25 × 2), but the supplier response returned `NetAmount: 1405.25`. StartPay then used `PaymentAmount: 1405.25`, half the two-room request amount:

**Supplier-response value:** `1405.25`. The `2810.50` figure below is our outbound CreateItinerary request value, included only to compare what we sent with what the supplier returned; it is not a supplier response value.

```text
PriceVerify totalRate × roomCount: 1405.25 × 2 = 2810.50
CreateItinerary request NetAmount:                 2810.50
CreateItinerary response NetAmount:                1405.25
StartPay PaymentAmount:                            1405.25
```

The booking-status responses succeeded, but confirm with the supplier whether `totalRate` in this room-group response is a per-room rate or already includes both rooms. The amount for two rooms is not verified until that contract is confirmed.

## Checklist

| Check | Case 04 result |
|---|---|
| Two room occupancies are represented | Pass: GuestCode IDs 1 and 2, one adult guest in each. |
| GuestID/Age defaults | Pass: both adults have `GuestID: "0"` and `Age: "25"`. |
| RetrieveBooking TUI | Pass: matches CreateItinerary response and StartPay request. |
| RetrieveBooking ClientID | Matches the Signature response recorded in Case 01; cached value reused. |
| Supplier statuses | Pass: CreateItinerary, StartPay, and RetrieveBooking returned HTTP 200 and Code 200. |
| Two-room amount | **Needs supplier confirmation:** request total was 2810.50; response and StartPay amount were 1405.25. |
