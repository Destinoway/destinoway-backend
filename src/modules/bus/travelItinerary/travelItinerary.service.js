import { getAkbarBusSearch } from "../search/adapters/akbar/api/search.api.js";
import { getCachedBusSearch } from "../search/searchCache.js";
import { getAkbarSeatLayout } from "../seatLayout/adapters/akbar/api/seatLayout.api.js";
import { createAkbarTravelItinerary } from "./adapters/akbar/api/travelItinerary.api.js";
import { mapAkbarTravelItinerary } from "./adapters/akbar/mappers/travelItinerary.mapper.js";

const fail = (message, statusCode = 409) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

export const createBusTravelItineraryService = async ({ tui, busServiceId, seatName, buid, duid, passenger, contact }) => {
  const search = await getCachedBusSearch(tui) || await getAkbarBusSearch(tui);
  if (String(search.completed).toLowerCase() !== "true") fail("Bus search is not complete");

  if (!Array.isArray(search.trips)) fail("Search results are unavailable; fetch results again before selecting a bus");

  const bus = search.trips?.flatMap((trip) => trip.journey || [])
    .find((item) => String(item.busServiceId) === busServiceId);
  if (!bus) fail("busServiceId does not belong to this search TUI; use both values from the same completed result");

  const journeyDate = String(bus.departureTime || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(journeyDate)) fail("Supplier did not return a journey date", 502);

  const layout = await getAkbarSeatLayout({ tui, busServiceId, journeyDate, providerCode: bus.provider });
  const seat = layout.seats.find((item) => item.seatName === seatName);
  if (!seat?.isAvailable) fail("Selected seat is no longer available");

  const pickPoint = layout.pickPoints?.find((item) => String(item.buid) === String(buid));
  const dropPoint = layout.dropPoints?.find((item) => String(item.duid) === String(duid));
  if (!pickPoint || !dropPoint) fail("Selected boarding or dropping point is unavailable");

  const netFare = Number(seat.fare?.netFare);
  const grossFare = Number(seat.fare?.grossFare);
  if (!Number.isFinite(netFare) || netFare <= 0 || !Number.isFinite(grossFare) || grossFare <= 0) {
    fail("Supplier did not return a valid seat fare", 502);
  }

  const body = {
    TUI: tui,
    NumberOfPassengers: 1,
    IsTrvavelerSave: false,
    NetFare: netFare,
    GrossFare: grossFare,
    FareChangeAcceptor: false,
    MultiPayment: "",
    BusSeatBlockKey: "",
    PaymentGatewayCode: "",
    LANIP: "",
    WANIP: "",
    PassengerType: "A",
    SearchType: "O",
    agentAddOnMarkUp: 0,
    AgentAddOnDiscount: 0,
    Passengers: [{
      PassengerID: 1,
      Title: passenger.title,
      ApproverManagers: { Managers: [], Type: "" },
      FirstName: passenger.firstName,
      LastName: passenger.lastName,
      Age: String(passenger.age),
    }],
    ContactDetails: {
      EmailID: contact.email,
      PhoneNo: contact.phone,
      CountryCode: "+91",
      GSTHolderName: "",
      GSTCustomerTIN: "",
      SaveGST: false,
    },
    travelItinerary: {
      bUSTrvItiOnwardReq: [{
        ProviderCode: bus.provider,
        ConversationID: "",
        RowNumber: "0",
        busTrvItiBusDetails: {
          BUID: pickPoint.buid,
          DUID: dropPoint.duid,
          ServiceID: busServiceId,
          SourceName: bus.from,
          DestinationName: bus.to,
          BoardingPointName: pickPoint.name,
          DroppingPointName: dropPoint.name,
          BPName: pickPoint.name,
          BusTypeDet: bus.busType,
          SeatName: seatName,
          AllowPartialCancellation: Boolean(bus.partialCancellation),
          BPDPSeatLayout: "",
        },
      }],
    },
  };

  return mapAkbarTravelItinerary(await createAkbarTravelItinerary(body));
};
