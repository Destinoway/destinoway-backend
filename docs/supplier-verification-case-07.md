# AKBAR Supplier Verification — Case 07

## Case details

| Field | Value from supplied PM2 logs |
|---|---|
| Scenario | 3 nights, 1 room, 1 adult and 1 child |
| Check-in / check-out | 2026-11-10 to 2026-11-13 |
| Nights | 3 |
| Search request | 1 adult, 1 child age 8 |
| Search location ID | `328605` |
| Search correlation ID | `58f01687-76f5-4bd9-aef0-bf9d7a0fcc47` |
| Booking correlation ID | `6aec3a6274345c2f5d833951` |
| Payment/retrieve correlation ID | `dfd77dc2-31c5-4d62-9fad-76002c1dacd3` |
| Search ID | `f8628fef-42d2-4abd-896f-0ed28befe63d.OUbVKFoa6OybM5f20_8kRQ` |
| Search tracing key | `f54c40fc-1c1a-4f61-b771-011975c1a83f` |
| Supplier hotel code | `37670290` |
| Supplier room provider in payload | `SunHotels` |
| Transaction ID | `260151674` |

Bearer tokens are omitted. Some large hotel search log lines were truncated in the pasted PM2 output; the booking verification records are intact.

## CreateItinerary room and guest payload

PriceVerify returned one room group, `roomCount: 1`, `totalRate: 4163`, and occupancy 1 with one adult and one child age 8. CreateItinerary sent:

```json
{
  "GuestCode": "|1|1:A:25|1:C:8|",
  "Guests": [
    { "GuestID": "0", "PaxType": "A", "Age": "25" },
    { "GuestID": "0", "PaxType": "C", "Age": "8" }
  ]
}
```

The request included the mapped ContactInfo fields, including `Phone`, `GSTAddress`, and `GSTState`. It sent `ClientID: "bitest"`, `HotelCode: "37670290"`, check-in `2026-11-10`, check-out `2026-11-13`, and `NetAmount: "4163"`.

## Booking responses and TUI/ClientID checks

CreateItinerary returned HTTP 200, `Code: "200"`, `Msg: ["Success"]`, `TransactionID: 260151674`, `NetAmount: 4163`, and:

```text
TUI: f54c40fc-1c1a-4f61-b771-011975c1a83f|0dede596-fb81-4d6a-a20a-5ef88432d09a|20261105134537
```

StartPay request used that TUI, `ClientID: "bitest"`, `TransactionID: 260151674`, and `PaymentAmount: 4163`. StartPay response was HTTP 200 with `Code: "200"`, `Msg: ["Success"]`, `CRSPNR: "TestBooking"`, and `BookStatus: "B0"`.

RetrieveBooking request used the CreateItinerary/StartPay request TUI and `ReferenceNumber: "260151674"`. Its ClientID was `FVI6V120g22Ei5ztGK0FIQ==`, matching the Signature response captured in Case 01; this capture has no new Signature event, so the cached value was reused. RetrieveBooking response was HTTP 200 with `Code: "200"`, `Msg: ["Success"]`, `BookingStatus: "B0"`, and `CurrentStatus: "B0"`.

## Amount check

The one-room CreateItinerary request sent `NetAmount: "4163"`; the supplier response returned `NetAmount: 4163`, and StartPay used `PaymentAmount: 4163`. The request and response amounts match.

## Checklist

| Check | Case 07 result |
|---|---|
| Stay duration | Pass: 2026-11-10 to 2026-11-13 is 3 nights. |
| Adult GuestID/Age | Pass: `GuestID: "0"`, `Age: "25"`. |
| Child GuestID/Age | Pass: `GuestID: "0"`, `Age: "8"`. |
| ContactInfo fields | Pass; mapped customer fields are present. |
| RetrieveBooking TUI | Pass: matches CreateItinerary response and StartPay request. |
| RetrieveBooking ClientID | Matches the Signature response captured in Case 01; cached value reused. |
| Supplier statuses | Pass: CreateItinerary, StartPay, and RetrieveBooking returned HTTP 200 and Code 200. |
| Amount | Pass for this case: request, supplier response, and StartPay amount are all 4163. |

**Case 07 passes the checked booking fields and amount checks.**
