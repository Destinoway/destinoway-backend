# AKBAR Supplier Verification — Case 01

## Case details

This document contains only the latest PM2 capture supplied for Case 01 (13 November 2026). Earlier captures and findings have been removed.

| Field | Observed value |
|---|---|
| Scenario | 1 room, 1 adult, 0 children |
| Destination | Pune |
| Stay | 2026-11-18 to 2026-11-19 |
| Search location ID | `328605` |
| Hotel | Hotel Sargam, Nagar Road |
| Supplier hotel code | `39778998` |
| Search correlation ID | `d5e4920b-3d7a-496e-ba64-b521bc1c477c` |
| CreateItinerary correlation ID | `6af6ad1ad05bd6ab5d7c4d4a` |
| StartPay/RetrieveBooking correlation ID | `9499ec00-f008-4757-83c4-030967c3c8db` |
| Transaction ID | `260152323` |
| Net amount | `1409.65` |

Authorization/token values are redacted. Guest details below are transcribed from the supplied CreateItinerary request; absent GST/PAN values retain the logger's redacted-presence markers.

## Search and hotel details

`hotel_search_init` sent one room with one adult and zero children. The request used check-in `11/18/2026`, check-out `11/19/2026`, and location ID `328605`. AKBAR returned HTTP 200 with `status: "success"` and search ID:

```text
80cfbf6c-9226-4abb-bc4c-b75dc0a4010d.xK1p0IOwBYovhpulxsj1SQ
```

| Operation | Requests in capture | Responses in capture | Result |
|---|---:|---:|---|
| `hotel_search_rate` | 4 | 1 | One HTTP 200 response says `searchStatus: "inProgress"`; the other requests have no matching response/error in this PM2 excerpt. |
| `hotel_search_content` | 2 | 0 | No matching response/error appears in this PM2 excerpt. |
| `hotel_details_content` | 1 | 1 | HTTP 200. |
| `hotel_details_rooms` | 1 | 1 | HTTP 200. |
| `hotel_price_verify` | 2 | 2 | Both responses HTTP 200. |

The hotel selected for booking was Hotel Sargam, Nagar Road (`39778998`). The price-verify endpoint used provider `CleartripAPI` and recommendation ID `252e1821-230c-4553-87ec-e2ded945d5a4`.

The missing search/content response lines above are absent from the supplied PM2 excerpt; this alone does not establish whether those calls failed. Check the JSONL exchange log for the same correlation ID to confirm whether response/error records exist.

## CreateItinerary

Endpoint: `https://b2bapihotels.benzyinfotech.com/Hotel/CreateItinerary`

The request contained:

| Field | Value |
|---|---|
| `HotelCode` | `39778998` |
| `SearchId` | `80cfbf6c-9226-4abb-bc4c-b75dc0a4010d.xK1p0IOwBYovhpulxsj1SQ` |
| `CheckInDate` / `CheckOutDate` | `2026-11-18` / `2026-11-19` |
| `ClientID` | `bitest` |
| `NetAmount` | `1409.65` |
| Guest count | 1 |
| Guest ID / adult age | `0` / `25` |

Request TUI: `200beb7f-e22d-4f40-bd52-b81e65de5bd5`.

Guest/contact details sent in the request:

```json
{
  "ContactInfo": {
    "Title": "Mr",
    "FName": "gsgs",
    "LName": "gsdgs",
    "Mobile": "1234567890",
    "Phone": "",
    "Email": "info@destinoway.com",
    "Address": "fdfd",
    "State": "fdfsdf",
    "City": "fdsf",
    "PIN": "123456",
    "GSTCompanyName": { "redacted": true, "present": false },
    "GSTTIN": { "redacted": true, "present": false },
    "GSTMobile": "",
    "GSTEmail": "",
    "GSTAddress": "",
    "GSTState": "",
    "CountryCode": "IN",
    "MobileCountryCode": "+91",
    "UpdateProfile": true,
    "IsGuest": false
  },
  "Guests": [
    {
      "GuestID": "0",
      "Operation": "U",
      "Title": "Mr",
      "FirstName": "gsgs",
      "MiddleName": "",
      "LastName": "gsdgs",
      "MobileNo": "",
      "PaxType": "A",
      "Age": "25",
      "Email": "",
      "Pan": { "redacted": true, "present": false }
    }
  ]
}
```

AKBAR returned HTTP 200, `Code: "200"`, `Msg: ["Success"]`, `TransactionID: 260152323`, and `NetAmount: 1409.65`. The response TUI was:

```text
200beb7f-e22d-4f40-bd52-b81e65de5bd5|325594fc-efc5-4955-b0cf-264de8b838d6|20261113115702
```

## StartPay

Endpoint: `https://b2bapiflights.benzyinfotech.com/Payment/StartPay`

The request used the CreateItinerary response TUI, `ClientID: "bitest"`, `TransactionID: 260152323`, and `PaymentAmount`/`NetAmount: 1409.65`.

AKBAR returned HTTP 200, `Code: "200"`, `Msg: ["Success"]`, `TransactionID: 260152323`, `BookStatus: "B0"`, `CRSPNR: "TestBooking"`, and `RedirectMode: "R"`. `PaymentID` was null and `RedirectUrl` was present.

This is a redirect-mode response: a null `PaymentID` by itself does not mean StartPay failed. The redirect/payment result is needed to confirm the final payment outcome.

## RetrieveBooking

Endpoint: `https://b2bapiflights.benzyinfotech.com/Utils/RetrieveBooking`

The request used `ReferenceType: "T"`, `ReferenceNumber: "260152323"`, `RequestMode: "RB"`, and this TUI, matching the CreateItinerary response TUI sent to StartPay:

```text
200beb7f-e22d-4f40-bd52-b81e65de5bd5|325594fc-efc5-4955-b0cf-264de8b838d6|20261113115702
```

The request `ClientID` was `FVI6V120g22Ei5ztGK0FIQ==`. The `credential_context` event shows this ClientID was read from the MongoDB token cache; no Signature API call appears in this capture.

AKBAR returned HTTP 200, `Code: "200"`, `Msg: ["Success"]`, `PaxCount: 1`, `NetFare: 1409.65`, `BookingStatus: "B0"`, `CurrentStatus: "B0"`, `PaymentStatus: "I8"`, and `BookingConfirmationId: "TestBooking"`.

## Case result

The CreateItinerary, StartPay, and RetrieveBooking exchanges all returned HTTP 200 with supplier success codes. StartPay used redirect mode, so `PaymentID: null` is not by itself a failure. The retrieved record is marked `TestBooking` with `PaymentStatus: "I8"`; this capture does not establish a live paid booking. Confirm the final result from the redirect/callback or AKBAR.

## Supplier checklist

| Requested verification | Value in this capture | Result |
|---|---|---|
| Guest details passed | ContactInfo and the single adult Guest object above | Present |
| TUI passed through booking flow | CreateItinerary response TUI matches StartPay and RetrieveBooking request TUI | Match |
| RetrieveBooking ClientID | `FVI6V120g22Ei5ztGK0FIQ==`; credential-context event identifies MongoDB token cache as source | Present; Signature was not called in this capture |

To inspect the full request/response bodies, including large hotel-content responses, use the server JSONL file rather than PM2's truncated console output:

```bash
jq 'select(.correlationId == "d5e4920b-3d7a-496e-ba64-b521bc1c477c" or .correlationId == "6af6ad1ad05bd6ab5d7c4d4a" or .correlationId == "9499ec00-f008-4757-83c4-030967c3c8db")' logs/akbar-api-exchanges.jsonl
```
