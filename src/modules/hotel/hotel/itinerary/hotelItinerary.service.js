import HotelItinerary from "./hotelItinerary.model.js";
import { createAkbarHotelItineraryAPI } from "./adapters/akbar/api/createHotelItinerary.api.js";
import { getHotelPriceVerificationContext } from "../priceVerify/services/hotelPriceVerify.service.js";
import { randomUUID } from "node:crypto";

const getError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const mapContactInfo = (contactInfo, netAmount) => ({
  Title: contactInfo.title.trim(),
  FName: contactInfo.firstName.trim(),
  LName: contactInfo.lastName.trim(),
  Mobile: contactInfo.mobile.trim(),
  Email: contactInfo.email.trim(),
  Address: contactInfo.address.trim(),
  State: contactInfo.state.trim(),
  City: contactInfo.city.trim(),
  PIN: contactInfo.pin.trim(),
  GSTCompanyName: "",
  GSTTIN: "",
  GSTMobile: "",
  GSTEmail: "",
  UpdateProfile: true,
  IsGuest: true,
  CountryCode: process.env.AKBAR_COUNTRY_CODE || "IN",
  MobileCountryCode: process.env.AKBAR_MOBILE_COUNTRY_CODE || "+91",
  NetAmount: String(netAmount),
});

const mapStoredContactInfo = (contactInfo) => ({
  title: contactInfo.title.trim(),
  firstName: contactInfo.firstName.trim(),
  lastName: contactInfo.lastName.trim(),
  mobile: contactInfo.mobile.trim(),
  email: contactInfo.email.trim(),
  address: contactInfo.address.trim(),
  state: contactInfo.state.trim(),
  city: contactInfo.city.trim(),
  pin: contactInfo.pin.trim(),
});

const mapStoredRooms = (submittedRooms) =>
  submittedRooms.map((room) => ({
    occupancyId: Number(room.occupancyId),
    adults: room.adults.map((guest) => ({
      title: guest.title.trim(),
      firstName: guest.firstName.trim(),
      middleName: guest.middleName?.trim() ?? "",
      lastName: guest.lastName.trim(),
      mobileNo: guest.mobileNo?.trim() ?? "",
      email: guest.email?.trim() ?? "",
      pan: guest.pan?.trim() ?? "",
    })),
    children: room.children.map((guest) => ({
      title: guest.title.trim(),
      firstName: guest.firstName.trim(),
      middleName: guest.middleName?.trim() ?? "",
      lastName: guest.lastName.trim(),
      age: Number(guest.age),
      mobileNo: guest.mobileNo?.trim() ?? "",
      email: guest.email?.trim() ?? "",
      pan: guest.pan?.trim() ?? "",
    })),
  }));

const getOccupancyGuestDetails = (occupancy, submittedRoom) => {
  if (!submittedRoom) {
    throw getError(
      `Guest details are missing for room occupancy ${occupancy.occupancyId}`
    );
  }

  if (
    submittedRoom.adults.length !== Number(occupancy.numOfAdults) ||
    submittedRoom.children.length !== Number(occupancy.numOfChildren)
  ) {
    throw getError(
      `Guest count does not match search occupancy ${occupancy.occupancyId}`
    );
  }

  return {
    guestCode: [
      `|${occupancy.occupancyId}|`,
      submittedRoom.adults.length
        ? `${submittedRoom.adults.length}:A:${submittedRoom.adults
            .map(() => "25")
            .join(":")}|`
        : "",
      submittedRoom.children.length
        ? `${submittedRoom.children.length}:C:${submittedRoom.children
            .map((guest) => Number(guest.age))
            .join(":")}|`
        : "",
    ].join(""),
    guests: [
      ...submittedRoom.adults.map((guest) => ({ ...guest, paxType: "A" })),
      ...submittedRoom.children.map((guest) => ({ ...guest, paxType: "C" })),
    ],
  };
};

const mapSupplierGuest = (guest) => ({
  GuestID: randomUUID(),
  Operation: "U",
  Title: guest.title.trim(),
  FirstName: guest.firstName.trim(),
  MiddleName: guest.middleName?.trim() ?? "",
  LastName: guest.lastName.trim(),
  MobileNo: guest.mobileNo?.trim() ?? "",
  PaxType: guest.paxType,
  Age: guest.paxType === "C" ? String(guest.age) : "",
  Email: guest.email?.trim() ?? "",
  Pan: guest.pan?.trim() ?? "",
});

const mapSupplierRooms = (roomGroups, submittedRooms, occupancies) => {
  if (roomGroups.length === 0) {
    throw getError("Price verification returned no available rooms", 409);
  }

  return roomGroups.map((roomGroup) => {
    if (
      !roomGroup?.id ||
      !roomGroup?.room?.id ||
      typeof roomGroup?.providerName !== "string" ||
      !roomGroup.providerName.trim()
    ) {
      throw getError("Verified room identifiers are missing", 409);
    }

    const groupOccupancies = Array.isArray(roomGroup.occupancies) &&
      roomGroup.occupancies.length > 0
      ? roomGroup.occupancies
      : occupancies;

    const resolvedOccupancies = groupOccupancies.map((occupancy) => {
      const searchOccupancy = occupancies.find(
        (item) => Number(item.occupancyId) === Number(occupancy.occupancyId)
      );
      const submittedRoom = submittedRooms.find(
        (item) => Number(item.occupancyId) === Number(occupancy.occupancyId)
      );

      if (!searchOccupancy) {
        throw getError(
          `Room occupancy ${occupancy.occupancyId} is not part of this search`,
          409
        );
      }

      return getOccupancyGuestDetails(searchOccupancy, submittedRoom);
    });

    return {
      RoomId: roomGroup.room.id,
      GuestCode: resolvedOccupancies.map((item) => item.guestCode).join(""),
      SupplierName: roomGroup.providerName,
      RoomGroupId: roomGroup.id,
      Guests: resolvedOccupancies.flatMap((item) =>
        item.guests.map(mapSupplierGuest)
      ),
    };
  });
};

const getNetAmount = (roomGroups) => {
  if (roomGroups.length === 0) {
    throw getError("Price verification returned no available rooms", 409);
  }

  return roomGroups.reduce((total, room) => {
    const amount = Number(room.totalRate);
    const roomCount = Number(room.roomCount ?? 1);
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isInteger(roomCount) ||
      roomCount <= 0
    ) {
      throw getError("Verified room price is invalid", 409);
    }

    return total + amount * roomCount;
  }, 0);
};

const getTransactionId = (response) =>
  response?.TransactionID ??
  response?.TransactionId ??
  response?.transactionID ??
  response?.transactionId ??
  response?.data?.TransactionID ??
  response?.data?.TransactionId ??
  response?.data?.transactionID ??
  response?.data?.transactionId ??
  null;

const getSupplierMessage = (response) => {
  const message =
    response?.Msg ??
    response?.Message ??
    response?.message ??
    response?.data?.Msg ??
    response?.data?.Message ??
    response?.data?.message;

  return Array.isArray(message)
    ? message.filter(Boolean).join("; ")
    : typeof message === "string"
      ? message.trim()
      : "";
};

export const createHotelItinerary = async ({
  searchId,
  hotelId,
  recommendationId,
  contactInfo,
  rooms: submittedRooms,
  specialServiceRequest = "",
  userId = null,
}) => {
  const { search, hotel, pricing } =
    await getHotelPriceVerificationContext({
      searchId,
      hotelId,
      recommendationId,
    });

  if (search.supplierCode !== "AKBAR") {
    throw getError(
      `Itinerary creation is not configured for supplier: ${search.supplierCode}`,
      501
    );
  }

  if (!process.env.AKBAR_CLIENT_ID) {
    throw getError("AKBAR_CLIENT_ID must be configured", 503);
  }

  if (
    !process.env.AKBAR_HOTEL_ITINERARY_URL &&
    !process.env.AKBAR_HOTEL_API_URL
  ) {
    throw getError(
      "AKBAR_HOTEL_ITINERARY_URL or AKBAR_HOTEL_API_URL must be configured",
      503
    );
  }

  const roomGroups = Array.isArray(pricing?.roomGroup)
    ? pricing.roomGroup
    : [];
  if (submittedRooms.length !== search.occupancies.length) {
    throw getError(
      "Provide guest details for each searched room, in the same order as the search"
    );
  }

  const normalizedSubmittedRooms = submittedRooms.map((room, index) => ({
    ...room,
    occupancyId: search.occupancies[index].occupancyId,
  }));
  const netAmount = getNetAmount(roomGroups);
  const supplierRooms = mapSupplierRooms(
    roomGroups,
    normalizedSubmittedRooms,
    search.occupancies
  );
  const countryCode = process.env.AKBAR_CUSTOMER_COUNTRY || "IN";
  const supplierRequest = {
    TUI: search.searchTracingKey ?? "",
    ServiceEnquiry: "",
    SpecialServiceRequest: specialServiceRequest.trim(),
    ContactInfo: mapContactInfo(contactInfo, netAmount),
    Auxiliaries: [
      {
        Code: "PROMO",
        Parameters: [
          { Type: "Code", Value: "" },
          { Type: "ID", Value: "" },
          { Type: "Amount", Value: "" },
        ],
      },
      {
        Code: "CUSTOMER DETAILS",
        Parameters: [
          { Type: "Nationality", Value: countryCode },
          { Type: "Country of Residence", Value: countryCode },
        ],
      },
    ],
    Rooms: supplierRooms,
    NetAmount: String(netAmount),
    ClientID: process.env.AKBAR_CLIENT_ID,
    DeviceID: process.env.AKBAR_DEVICE_ID || "",
    AppVersion: process.env.AKBAR_APP_VERSION || "",
    SearchId: search.supplierSearchId,
    RecommendationId: recommendationId,
    LocationName:
      hotel.locationName ?? hotel.rawSupplierData?.locationName ?? null,
    HotelCode: String(hotelId),
    CheckInDate: search.checkIn,
    CheckOutDate: search.checkOut,
    TravelingFor: process.env.AKBAR_TRAVELING_FOR || "NTF",
  };

  const booking = await HotelItinerary.create({
    userId,
    searchId: search.internalSearchId,
    supplierSearchId: search.supplierSearchId,
    hotelId: String(hotelId),
    recommendationId,
    supplier: "AKBAR",
    hotel: {
      hotelId: String(hotelId),
      name: hotel.name ?? null,
      address: hotel.address ?? null,
      starRating: hotel.starRating ?? null,
    },
    stay: {
      checkIn: search.checkIn,
      checkOut: search.checkOut,
    },
    contactInfo: mapStoredContactInfo(contactInfo),
    rooms: mapStoredRooms(normalizedSubmittedRooms),
    supplierRooms,
    price: {
      total: netAmount,
      currency:
        roomGroups[0]?.conversionRate?.toCurrency ??
        roomGroups[0]?.currency ??
        "INR",
      roomGroups: roomGroups.map((room) => ({
        roomGroupId: room.id,
        roomId: room.room?.id ?? null,
        providerName: room.providerName ?? null,
        roomCount: room.roomCount ?? 1,
        baseRate: room.baseRate ?? null,
        totalRate: room.totalRate ?? null,
      })),
    },
    specialServiceRequest,
    paymentStatus: "pending",
  });

  try {
    const supplierResponse = await createAkbarHotelItineraryAPI({
      payload: supplierRequest,
      searchTracingKey: search.searchTracingKey,
    });
    const transactionId = getTransactionId(supplierResponse);
    const supplierCode = supplierResponse?.Code ?? supplierResponse?.code;
    const supplierMessage = getSupplierMessage(supplierResponse);
    const transactionIdValue = String(transactionId ?? "").trim();
    const hasTransactionId =
      transactionIdValue !== "" && !/^0+(?:\.0+)?$/.test(transactionIdValue);
    const supplierRejected =
      supplierCode !== undefined &&
      supplierCode !== null &&
      String(supplierCode) !== "200";

    if (!hasTransactionId || supplierRejected) {
      const itineraryError = supplierRejected
        ? `Supplier rejected itinerary (Code ${supplierCode})${
            supplierMessage ? `: ${supplierMessage}` : ""
          }`
        : "Supplier did not return a valid TransactionID";
      booking.itineraryStatus = "failed";
      booking.itineraryResponse = supplierResponse;
      booking.itineraryError = itineraryError;
      await booking.save();
      throw getError(itineraryError, 502);
    }

    booking.transactionId = String(transactionId);
    booking.itineraryStatus = "created";
    booking.itineraryResponse = supplierResponse;
    await booking.save();

    return {
      bookingId: booking._id,
      transactionId: booking.transactionId,
      itineraryStatus: booking.itineraryStatus,
      paymentStatus: booking.paymentStatus,
      amount: netAmount,
      currency: booking.price.currency,
    };
  } catch (error) {
    if (booking.itineraryStatus !== "failed") {
      booking.itineraryStatus = "failed";
      booking.itineraryError = error.message;
      await booking.save();
    }

    if (error.statusCode) {
      throw error;
    }

    throw getError(
      `Failed to create hotel itinerary: ${error.message}`,
      502
    );
  }
};
