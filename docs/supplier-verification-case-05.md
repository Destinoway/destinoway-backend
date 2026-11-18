# AKBAR Supplier Verification — Case 05

## Case details

| Field | Value from supplied PM2 logs |
|---|---|
| Scenario | 2 rooms; 1 adult and 1 child in each room |
| Search request room 1 | 1 adult, 1 child age 7 |
| Search request room 2 | 1 adult, 1 child age 4 |
| Stay | 2026-11-07 to 2026-11-08 |
| Search location ID | `328605` |
| Search correlation ID | `6afb06b8-81fb-4983-a216-ffe09b00ac8b` |
| Booking correlation ID | `6aec341a74345c2f5d833932` |
| Payment/retrieve correlation ID | `a745d077-53dd-44d4-824c-8bab12fcc681` |
| Search ID | `8222b52f-984f-4112-b760-6306c2b6b213.OYE7XtsAfhRtYjswoLpcsg` |
| Search tracing key | `03bad444-3e8c-4133-a321-630e2af64f76` |
| Supplier hotel code | `41437406` |
| Supplier room provider in payload | `TripjackV3` |
| Transaction ID | `260151665` |

Credentials and bearer tokens are omitted. The verification-related booking log entries are intact; some large search result log lines were truncated in the pasted terminal output.

## CreateItinerary room and guest payload

The request contains two room entries, each with one adult and one child. Both adults have `GuestID: "0"` and `Age: "25"`; both children have `GuestID: "0"`. The child ages remain associated with their room:

```json
[
  {
    "GuestCode": "|1|1:A:25|1:C:7|",
    "Guests": [
      { "GuestID": "0", "PaxType": "A", "Age": "25" },
      { "GuestID": "0", "PaxType": "C", "Age": "7" }
    ]
  },
  {
    "GuestCode": "|2|1:A:25|1:C:4|",
    "Guests": [
      { "GuestID": "0", "PaxType": "A", "Age": "25" },
      { "GuestID": "0", "PaxType": "C", "Age": "4" }
    ]
  }
]
```

PriceVerify returned occupancies 1 and 2, with child ages 7 and 4 respectively. The CreateItinerary `GuestCode` occupancy IDs also distinguish room 1 (`|1|`) from room 2 (`|2|`). The request includes `Phone`, `GSTAddress`, `GSTState`, and the other mapped ContactInfo fields.

The request sent `ClientID: "bitest"`, `HotelCode: "41437406"`, and `NetAmount: "11859.92"`.

## Booking responses and TUI/ClientID checks

CreateItinerary returned HTTP 200, `Code: "200"`, `Msg: ["Success"]`, `TransactionID: 260151665`, and:

```text
TUI: 03bad444-3e8c-4133-a321-630e2af64f76|ef165ebb-4e0f-4854-82ee-6a95b2cf9ea2|20261105131818
```

StartPay request used that same TUI, `TransactionID: 260151665`, `ClientID: "bitest"`, and `PaymentAmount: 5929.96`. StartPay response was HTTP 200 with `Code: "200"`, `Msg: ["Success"]`, `CRSPNR: "TestBooking"`, and `BookStatus: "B0"`.

RetrieveBooking request used the CreateItinerary/StartPay request TUI and `ReferenceNumber: "260151665"`. Its ClientID was `FVI6V120g22Ei5ztGK0FIQ==`, matching the Signature response captured in Case 01; no new Signature operation appears in this capture, so the cached Signature ClientID was reused. RetrieveBooking response was HTTP 200 with `Code: "200"`, `Msg: ["Success"]`, `BookingStatus: "B0"`, and `CurrentStatus: "B0"`.

## Amount discrepancy to verify

The CreateItinerary request sent `NetAmount: "11859.92"`, but the CreateItinerary response returned `NetAmount: 5929.96`. StartPay then used `PaymentAmount: 5929.96`, exactly half the amount sent in the CreateItinerary request:

**Supplier-response value:** `5929.96`. The `11859.92` figure below is our outbound CreateItinerary request value, included only to compare what we sent with what the supplier returned; it is not a supplier response value.

```text
Request NetAmount:             11859.92
CreateItinerary response:       5929.96
StartPay PaymentAmount:         5929.96
```

Both supplier booking responses were successful, but confirm with the supplier whether its CreateItinerary response is expected to return a per-room amount or the total for both rooms. Do not treat the pricing-total behavior as verified until this is confirmed against the supplier's expected two-room amount.

## Checklist

| Check | Case 05 result |
|---|---|
| Two room occupancies are represented | Pass: GuestCode occupancy IDs 1 and 2; one adult and one child in each. |
| Adult GuestID/Age defaults | Pass: both adults have `"0"` and `"25"`. |
| Child GuestIDs/ages | Pass: both IDs are `"0"`; room 1 child is 7 and room 2 child is 4. |
| ContactInfo fields | Pass; Phone, GSTAddress, GSTState, and other mapped fields are present. |
| RetrieveBooking TUI | Pass: matches CreateItinerary response and StartPay request. |
| RetrieveBooking ClientID | Matches the Signature response value captured in Case 01; cached value reused. |
| Supplier statuses | Pass: CreateItinerary, StartPay, and RetrieveBooking all returned HTTP 200 and Code 200. |
| Two-room total amount | **Needs supplier confirmation:** CreateItinerary request sent 11859.92; response and StartPay used 5929.96. |
