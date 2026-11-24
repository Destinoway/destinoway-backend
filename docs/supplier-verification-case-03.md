# AKBAR Supplier Verification — Case 03

## Case details

| Field | Value from supplied PM2 logs |
|---|---|
| Scenario | 1 room, 2 adults, 2 children of different ages |
| Search request child ages | `[7, 3]` |
| Stay | 2026-11-07 to 2026-11-08 |
| Search location ID | `328605` |
| Search correlation ID | `fbb9a558-7c3a-46b3-8d10-36d77fa1d1b9` |
| Booking correlation ID | `6aec31a674345c2f5d833921` |
| Payment/retrieve correlation ID | `32df8a27-04ca-47d8-ac2f-5d07128a897b` |
| Search ID | `44ae7720-0102-4827-a8a8-124e339b3e55.OUbVKFoa6OybM5f20_8kRQ` |
| Search tracing key | `d0c169b7-b3f6-421c-8e77-11fca442b950` |
| Supplier hotel code | `15131286` |
| Supplier room source | `Atharva` |
| Transaction ID | `260151660` |
| Net amount | `848.22` |

Bearer tokens are omitted. Some large search-content/rate lines in the pasted PM2 output are truncated, but the CreateItinerary, StartPay, and RetrieveBooking records used for this verification are intact.

## CreateItinerary guest values

Search requested child ages `[7, 3]`. PriceVerify returned verified occupancy ages `[3, 7]`. The corrected code preserved the original child-to-age association in the `Guests` list and retained the verified occupancy order in `GuestCode`:

```json
{
  "GuestCode": "|1|2:A:25:25|2:C:3:7|",
  "Guests": [
    { "GuestID": "0", "PaxType": "A", "Age": "25" },
    { "GuestID": "0", "PaxType": "A", "Age": "25" },
    { "GuestID": "0", "PaxType": "C", "Age": "7" },
    { "GuestID": "0", "PaxType": "C", "Age": "3" }
  ]
}
```

The CreateItinerary request also included `Phone`, `GSTAddress`, and `GSTState` in `ContactInfo`, plus the remaining mapped contact fields. It sent `ClientID: "bitest"`, `HotelCode: "15131286"`, and `NetAmount: "848.22"`.

The supplier returned:

```json
{
  "Code": "200",
  "Msg": ["Success"],
  "TransactionID": 260151660,
  "NetAmount": 848.22,
  "TUI": "d0c169b7-b3f6-421c-8e77-11fca442b950|2a2a475c-0b93-42d5-9c0a-1a4e2dd0d2d3|20261105130804"
}
```

## StartPay and RetrieveBooking

StartPay request used the CreateItinerary response TUI, `TransactionID: 260151660`, `ClientID: "bitest"`, and `PaymentAmount`/`NetAmount` of `848.22`.

StartPay returned HTTP 200, `Code: "200"`, `Msg: ["Success"]`, `CRSPNR: "TestBooking"`, and `BookStatus: "B0"`.

RetrieveBooking request fields:

```json
{
  "TUI": "d0c169b7-b3f6-421c-8e77-11fca442b950|2a2a475c-0b93-42d5-9c0a-1a4e2dd0d2d3|20261105130804",
  "ReferenceType": "T",
  "ReferenceNumber": "260151660",
  "ServiceType": null,
  "ClientID": "FVI6V120g22Ei5ztGK0FIQ==",
  "RequestMode": "RB",
  "Contact": null,
  "Name": null
}
```

RetrieveBooking returned HTTP 200, `Code: "200"`, `Msg: ["Success"]`, `BookingStatus: "B0"`, and `CurrentStatus: "B0"`. Its TUI matches CreateItinerary response and StartPay request. The ClientID matches the Signature response recorded in Case 01; this capture does not include a new Signature exchange, so the cached value was reused.

## Checklist

| Supplier requirement | Case 03 result |
|---|---|
| Adult GuestID is `"0"` and adult age is `"25"` | Pass for both adults. |
| Child GuestID defaults to `"0"` | Pass for both children. |
| Child ages stay associated with submitted guests | Pass: guest ages are `[7, 3]` despite PriceVerify returning `[3, 7]`. |
| GuestCode uses verified occupancy child-age order | Pass: `2:C:3:7`. |
| Customer detail fields are present | Pass; `Phone`, `GSTAddress`, `GSTState`, and other mapped fields appear. |
| RetrieveBooking TUI matches CreateItinerary/StartPay request | Pass. |
| RetrieveBooking ClientID matches Signature response | Value matches Case 01 Signature response; no new Signature event in this capture. |
| Supplier booking responses | CreateItinerary, StartPay, and RetrieveBooking all returned HTTP 200 and Code 200. |

**Case 03 passes the checked booking fields and supplier response checks.**
