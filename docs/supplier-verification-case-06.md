# AKBAR Supplier Verification — Case 06

## Case details

| Field | Value from supplied PM2 logs |
|---|---|
| Scenario | 2 rooms; 2 adults and 2 children in each room |
| Search request room 1 | 2 adults, children ages `[8, 10]` |
| Search request room 2 | 2 adults, children ages `[6, 7]` |
| Stay | 2026-11-07 to 2026-11-08 |
| Search location ID | `328605` |
| Search correlation ID | `9bad5897-2b90-4d4d-9895-e73ef61c8658` |
| Booking correlation ID | `6aec38ab74345c2f5d833948` |
| Payment/retrieve correlation ID | `63f8d03e-0b27-4ab0-ab32-1225a15ecde0` |
| Search ID | `8126affa-3ae8-4147-991e-d6d7b6c76717.U6Jy0pCQfB3Aw6wJIlyGOw` |
| Search tracing key | `303fd11d-50d1-4aba-b4fc-cacf3442fd44` |
| Supplier hotel code | `15401363` |
| Supplier room provider in payload | `WithinEarth` |
| Transaction ID | `260151670` |

Bearer tokens are omitted. The booking verification records are intact; some large search-result log entries are truncated in the pasted terminal output.

## CreateItinerary rooms and guests

PriceVerify returned one room group with `roomCount: 2`, and occupancies 1 and 2. CreateItinerary sent a separate room entry for each occupancy:

```json
[
  {
    "GuestCode": "|1|2:A:25:25|2:C:8:10|",
    "Guests": [
      { "GuestID": "0", "PaxType": "A", "Age": "25" },
      { "GuestID": "0", "PaxType": "A", "Age": "25" },
      { "GuestID": "0", "PaxType": "C", "Age": "8" },
      { "GuestID": "0", "PaxType": "C", "Age": "10" }
    ]
  },
  {
    "GuestCode": "|2|2:A:25:25|2:C:6:7|",
    "Guests": [
      { "GuestID": "0", "PaxType": "A", "Age": "25" },
      { "GuestID": "0", "PaxType": "A", "Age": "25" },
      { "GuestID": "0", "PaxType": "C", "Age": "6" },
      { "GuestID": "0", "PaxType": "C", "Age": "7" }
    ]
  }
]
```

All four adults use `GuestID: "0"`, `Age: "25"`; all four children use `GuestID: "0"`. The child ages remain associated with the correct room and guest order. The request sent `ClientID: "bitest"`, `HotelCode: "15401363"`, and `NetAmount: "9688.92"`.

## Booking responses and TUI/ClientID checks

CreateItinerary returned HTTP 200, `Code: "200"`, `Msg: ["Success"]`, `TransactionID: 260151670`, and:

```text
TUI: 303fd11d-50d1-4aba-b4fc-cacf3442fd44|9f23bad3-bf02-460c-9131-f9b72d9658ee|20261105133755
```

StartPay request used this TUI, `TransactionID: 260151670`, `ClientID: "bitest"`, and `PaymentAmount: 4844.46`. StartPay response was HTTP 200 with `Code: "200"`, `Msg: ["Success"]`, `CRSPNR: "TestBooking"`, and `BookStatus: "B0"`.

RetrieveBooking request used the CreateItinerary/StartPay request TUI and `ReferenceNumber: "260151670"`. Its ClientID was `FVI6V120g22Ei5ztGK0FIQ==`, matching the Signature response captured in Case 01; this capture has no new Signature event, so the cached ClientID was reused. RetrieveBooking returned HTTP 200 with `Code: "200"`, `Msg: ["Success"]`, `BookingStatus: "B0"`, and `CurrentStatus: "B0"`.

## Amount discrepancy to verify

PriceVerify returned `totalRate: 4844.46` for a group with `roomCount: 2`. Our CreateItinerary request sent `NetAmount: "9688.92"` (`4844.46 × 2`), while the supplier response returned `NetAmount: 4844.46`; StartPay also used `PaymentAmount: 4844.46`.

**Supplier-response value:** `4844.46`. `9688.92` is our outbound request value, included only to compare what we sent with what the supplier returned.

```text
PriceVerify totalRate × roomCount: 4844.46 × 2 = 9688.92
Our CreateItinerary request NetAmount:             9688.92
Supplier CreateItinerary response NetAmount:       4844.46
StartPay PaymentAmount:                            4844.46
```

The booking statuses succeeded, but ask the supplier whether `totalRate` represents a per-room rate or the total for both rooms. The two-room amount is not verified until confirmed.

## Checklist

| Check | Case 06 result |
|---|---|
| Two room occupancies are represented | Pass: GuestCode occupancy IDs 1 and 2; two adults and two children in each. |
| Adult GuestID/Age defaults | Pass for all four adults. |
| Child GuestIDs/ages | Pass for all four children; ages match each room's requested occupancy. |
| RetrieveBooking TUI | Pass: matches CreateItinerary response and StartPay request. |
| RetrieveBooking ClientID | Matches the Signature response captured in Case 01; cached value reused. |
| Supplier statuses | Pass: CreateItinerary, StartPay, and RetrieveBooking returned HTTP 200 and Code 200. |
| Two-room total amount | **Needs supplier confirmation:** our request sent 9688.92; supplier response and StartPay used 4844.46. |
