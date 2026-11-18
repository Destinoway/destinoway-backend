# AKBAR Supplier Verification — Case 02

## Case details

| Field | Value from supplied PM2 logs |
|---|---|
| Scenario requested | 1 room, 1 adult, 2 children; first child age 7, second child age 3 |
| Search request child ages | `[7, 3]` |
| Stay | 2026-11-07 to 2026-11-08 |
| Search location ID | `328605` |
| Search correlation ID | `bc1ce378-1e8f-4edf-bad8-7003a4828ceb` |
| Booking correlation ID | `6aec2b9374345c2f5d83380f` |
| Payment/retrieve correlation ID | `7b6722ec-9255-4b52-ad9e-7b770da8ab9d` |
| Supplier hotel code | `15131286` |
| Transaction ID | `260151652` |
| Net amount | `849.69` |

Credentials and bearer tokens are not included. The captured booking request/response records are intact; some large search-content/rate records are truncated in the pasted terminal output.

## Results

| Operation | Observed result |
|---|---|
| Hotel search init | HTTP 200; search ID `dddd202c-9985-49d2-a90c-857082d4986e.-NqygZTo4Q10i9onkxiIsA`; tracing key `ad43f8b2-9abd-4fe6-8f03-414488d09c23`. |
| Price verification | Two request/response pairs; both responses HTTP 200. The verified occupancy response lists child ages `[3, 7]`. |
| CreateItinerary | HTTP 200, `Code: "200"`, `Msg: ["Success"]`; `TransactionID: 260151652`; `NetAmount: 849.69`. |
| StartPay | HTTP 200, `Code: "200"`, `Msg: ["Success"]`; `CRSPNR: "TestBooking"`; `BookStatus: "B0"`. |
| RetrieveBooking | HTTP 200, `Code: "200"`, `Msg: ["Success"]`; `BookingStatus: "B0"`, `CurrentStatus: "B0"`. |

## CreateItinerary guest payload observed

The request used `GuestCode: "|1|1:A:25|2:C:3:7|"` and sent these guests in order:

```json
[
  {
    "GuestID": "0",
    "PaxType": "A",
    "Age": "25"
  },
  {
    "GuestID": "0",
    "PaxType": "C",
    "Age": "3"
  },
  {
    "GuestID": "0",
    "PaxType": "C",
    "Age": "7"
  }
]
```

### Child age order: needs correction/confirmation

The search request asked for child ages `[7, 3]`, but the price-verification response returned occupancy child ages `[3, 7]`. CreateItinerary then assigned those verified ages by index, so the guest list went out as child 1 age `3`, child 2 age `7`, and the `GuestCode` also contained `3:7`.

This captured request does **not** match the case definition (first child 7, second child 3). The adult defaults and all three `GuestID` values are correct. The cause was that the service applied the price-verification age array by index to the named guest list, even though the supplier had reordered that array.

### Code correction after this capture

The CreateItinerary mapping now keeps each named child's age from the original guest/search order, while keeping `GuestCode` child ages in the verified occupancy order. For the values in this case, the next request should therefore contain guest ages `[7, 3]` and `GuestCode` child-age sequence `3:7`. This preserves the age-to-guest association and keeps the provider's verified occupancy representation. **A new supplier log capture is still needed to confirm the corrected outgoing payload.**

The CreateItinerary response returned:

```json
{
  "Code": "200",
  "Msg": ["Success"],
  "TransactionID": 260151652,
  "NetAmount": 849.69,
  "TUI": "ad43f8b2-9abd-4fe6-8f03-414488d09c23|f2931441-c0c1-47c0-bfbc-fef38e57b4c8|20261105124243"
}
```

## StartPay and RetrieveBooking checks

StartPay request used this CreateItinerary TUI, `TransactionID: 260151652`, `ClientID: "bitest"`, and both `PaymentAmount` and `NetAmount` were `849.69`.

RetrieveBooking request fields:

```json
{
  "TUI": "ad43f8b2-9abd-4fe6-8f03-414488d09c23|f2931441-c0c1-47c0-bfbc-fef38e57b4c8|20261105124243",
  "ReferenceType": "T",
  "ReferenceNumber": "260151652",
  "ServiceType": null,
  "ClientID": "FVI6V120g22Ei5ztGK0FIQ==",
  "RequestMode": "RB",
  "Contact": null,
  "Name": null
}
```

The RetrieveBooking TUI matches the CreateItinerary response and StartPay request. Its ClientID matches the Signature response captured in Case 01 (`FVI6V120g22Ei5ztGK0FIQ==`). No new Signature exchange appears in this Case 02 capture; the existing cached Signature client ID was reused.

## Checklist

| Supplier requirement | Case 02 result |
|---|---|
| GuestID defaults to `"0"` | Pass for adult and both children. |
| Adult age defaults to `"25"` | Pass; GuestCode also says `A:25`. |
| Customer detail fields included | Pass; `Phone`, `GSTAddress`, `GSTState` and other mapped fields are present in the request. |
| RetrieveBooking TUI is the CreateItinerary/StartPay request TUI | Pass. |
| RetrieveBooking ClientID is from Signature response | Value matches Case 01's Signature response; no new Signature response was logged in this case. |
| Child ages preserve requested order 7 then 3 | **Failed in this captured request; implementation corrected afterward. Retest pending.** |
| Booking flow responses | CreateItinerary, StartPay, and RetrieveBooking all returned HTTP 200 and supplier Code 200. |

## Log completeness

The pasted output contains the full, parseable verification records for CreateItinerary, StartPay, and RetrieveBooking. Three large search-content/rate lines are around 65 KB and do not parse as complete JSON, so this capture is not a complete copy of every search response. For a smaller, readable capture, filter the PM2 output to the verification operations only:

```bash
pm2 logs destinoway-backend --lines 1000 | grep --line-buffered -E '"operation":"(signature|create_itinerary|start_payment|retrieve_booking)"'
```

## Corrected retest — 2026-11-05

The later PM2 capture, after the child-age mapping correction, confirms the requested order in the CreateItinerary `Guests` array:

```json
{
  "GuestCode": "|1|1:A:25|2:C:3:7|",
  "Guests": [
    { "GuestID": "0", "PaxType": "A", "Age": "25" },
    { "GuestID": "0", "PaxType": "C", "Age": "7" },
    { "GuestID": "0", "PaxType": "C", "Age": "3" }
  ]
}
```

The search request still had child ages `[7, 3]`, while PriceVerify returned `[3, 7]`. The corrected mapping preserved the original guest association in `Guests` and kept the supplier's verified order in `GuestCode`.

| Operation | Corrected retest result |
|---|---|
| CreateItinerary | HTTP 200, `Code: "200"`, `Msg: ["Success"]`; `TransactionID: 260151656`; `NetAmount: 851.18`. |
| StartPay request | Its TUI matches CreateItinerary response; `TransactionID: 260151656`; `PaymentAmount: 851.18`. |
| StartPay response | HTTP 200, `Code: "200"`, `Msg: ["Success"]`; `CRSPNR: "TestBooking"`; `BookStatus: "B0"`. |
| RetrieveBooking request | TUI matches the CreateItinerary response and StartPay request. ClientID is `FVI6V120g22Ei5ztGK0FIQ==`, matching the Signature response recorded in Case 01. |
| RetrieveBooking response | HTTP 200, `Code: "200"`, `Msg: ["Success"]`; `BookingStatus: "B0"`, `CurrentStatus: "B0"`. |

**Corrected child-age order and booking flow pass in this retest.** There is no new Signature exchange in this capture; the cached Signature ClientID was reused. The large hotel search-result log records remain truncated, but the booking verification records above are intact.
