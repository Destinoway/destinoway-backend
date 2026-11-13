import crypto from "crypto";

import HotelDetail from "../hotelDetail/hotelDetail.model.js";
import TempBooking from "./tempBooking.model.js";

import {
  createTempBookingAPI,
} from "./adapters/flyshop/flyshopTempBooking.adapter.js";

export const createTempBookingService = async ({
  hotelDetailId,
  roomId,

  customerAddress,
  customerMobile,
  customerPostalCode,

  paxDetails,

  passengerEmail,
  passengerMobile,

  remarks,
  specialRequestRemarks,

  panNumber,
}) => {
  // ==========================================================
  // 1. VALIDATION
  // ==========================================================

  if (!hotelDetailId) {
    throw new Error(
      "hotelDetailId is required"
    );
  }

  if (!roomId) {
    throw new Error(
      "roomId is required"
    );
  }

  if (
    !Array.isArray(paxDetails) ||
    paxDetails.length === 0
  ) {
    throw new Error(
      "paxDetails is required"
    );
  }

  // ==========================================================
  // 2. FIND HOTEL DETAIL + ROOM
  //
  // BOTH MUST BE IN SAME DOCUMENT
  // ==========================================================

  const hotelDetail =
    await HotelDetail.findOne({
      hotelDetailId: String(
        hotelDetailId
      ),

      "rooms.roomId": String(roomId),
    }).lean();

  if (!hotelDetail) {
    throw new Error(
      "Hotel detail not found or room does not belong to this hotel detail"
    );
  }

  // ==========================================================
  // 3. FIND SELECTED ROOM
  // ==========================================================

  const room =
    hotelDetail.rooms?.find(
      (item) =>
        String(item.roomId) ===
        String(roomId)
    );

  if (!room) {
    throw new Error(
      "Room not found"
    );
  }

  // ==========================================================
  // 4. GET SUPPLIER DATA FROM DB
  // ==========================================================

  const hotelKey =
    hotelDetail.hotelKey;

  const searchKey =
    hotelDetail.searchKey;

  const ratePlanId =
    room.ratePlanId;

  if (!hotelKey) {
    throw new Error(
      "HotelKey not found"
    );
  }

  if (!searchKey) {
    throw new Error(
      "SearchKey not found"
    );
  }

  if (!ratePlanId) {
    throw new Error(
      "RatePlanId not found for selected room"
    );
  }

  // ==========================================================
  // 5. AUTH HEADER
  // ==========================================================

  const authHeader = {
    ipAddress:
      process.env.FLYSHOP_IP_ADDRESS,

    password:
      process.env.FLYSHOP_PASSWORD,

    requestId:
      `${Date.now()}-${crypto.randomUUID()}`,

    userId:
      process.env.FLYSHOP_USER_ID,
  };

  // ==========================================================
  // 6. CREATE INTERNAL DATA FOR ADAPTER
  // ==========================================================

  const adapterData = {
    authHeader,

    customerAddress:
      customerAddress ?? "",

    customerMobile:
      customerMobile ?? "",

    customerPostalCode:
      customerPostalCode ?? "",

    hotelKey,

    paxDetails,

    passengerEmail:
      passengerEmail ?? "",

    passengerMobile:
      passengerMobile ?? "",

    ratePlanId,

    remarks:
      remarks ?? "Book",

    searchKey,

    specialRequestRemarks:
      specialRequestRemarks ?? "Book",

    panNumber:
      panNumber ?? "",
  };

  // ==========================================================
  // 7. CREATE PENDING RECORD
  // ==========================================================

  const tempBooking =
    await TempBooking.create({
      // ========================================================
      // REFERENCE
      // ========================================================

      hotelDetailId:
        hotelDetail.hotelDetailId,

      hotelId:
        hotelDetail.hotelId,

      roomId:
        room.roomId,

      // ========================================================
      // SUPPLIER DATA
      // ========================================================

      hotelKey,

      searchKey,

      ratePlanId,

      // ========================================================
      // HOTEL DETAILS
      // ========================================================

      hotelName:
        hotelDetail.name ?? null,

      hotelLocation:
        hotelDetail.location ?? null,

      hotelStarCategory:
        hotelDetail.starCategory ?? null,

      hotelCheckIn:
        hotelDetail.checkIn ?? null,

      hotelCheckOut:
        hotelDetail.checkOut ?? null,

      hotelPolicy:
        hotelDetail.policy ?? null,

      // ========================================================
      // ROOM DETAILS
      // ========================================================

      roomType:
        room.roomType ?? null,

      roomTypeId:
        room.roomTypeId ?? null,

      inclusion:
        room.inclusion ?? null,

      additionalInfo:
        room.additionalInfo ?? null,

      pricing:
        room.pricing ?? null,

      cancellationPolicy:
        room.cancellationPolicy ?? null,

      cancellationCharges:
        room.cancellationCharges ?? null,

      payment:
        room.payment ?? null,

      // ========================================================
      // CUSTOMER
      // ========================================================

      customerAddress:
        customerAddress ?? null,

      customerMobile:
        customerMobile ?? null,

      customerPostalCode:
        customerPostalCode ?? null,

      passengerEmail:
        passengerEmail ?? null,

      passengerMobile:
        passengerMobile ?? null,

      remarks:
        remarks ?? null,

      specialRequestRemarks:
        specialRequestRemarks ?? null,

      panNumber:
        panNumber ?? null,

      paxDetails,

      status: "PENDING",
    });

  // ==========================================================
  // 8. CALL TEMP BOOKING ADAPTER
  // ==========================================================

  let supplierResponse;

  try {
    supplierResponse =
      await createTempBookingAPI(
        adapterData
      );
  } catch (error) {
    // ========================================================
    // SUPPLIER CALL FAILED
    // ========================================================

    await TempBooking.findByIdAndUpdate(
      tempBooking._id,
      {
        $set: {
          status: "FAILED",
          supplierResponse: {
            bookingRefNo: null,

            isPriceChanged: false,

            responseHeader: {
              errorCode: "500",
              errorDesc:
                error.message,

              errorInnerException:
                "",

              statusId: "0",
            },

            revisedFare: null,
          },
        },
      }
    );

    throw error;
  }

  // ==========================================================
  // 9. DETERMINE BOOKING STATUS
  // ==========================================================

  let status = "FAILED";

  if (
    supplierResponse?.responseHeader
      ?.errorCode === "0000"
  ) {
    if (
      supplierResponse.isPriceChanged
    ) {
      status = "PRICE_CHANGED";
    } else {
      status = "TEMP_BOOKED";
    }
  }

  // ==========================================================
  // 10. SAVE SUPPLIER RESPONSE
  // ==========================================================

  const updatedTempBooking =
    await TempBooking.findByIdAndUpdate(
      tempBooking._id,

      {
        $set: {
          status,

          supplierResponse,
        },
      },

      {
        new: true,
      }
    ).lean();

  // ==========================================================
  // 11. FINAL RESPONSE
  // ==========================================================

  return {
    tempBookingId:
      updatedTempBooking._id,

    status:
      updatedTempBooking.status,

    hotelDetailId:
      updatedTempBooking.hotelDetailId,

    hotelId:
      updatedTempBooking.hotelId,

    roomId:
      updatedTempBooking.roomId,

    ratePlanId:
      updatedTempBooking.ratePlanId,

    bookingRefNo:
      updatedTempBooking
        .supplierResponse
        ?.bookingRefNo ?? null,

    isPriceChanged:
      updatedTempBooking
        .supplierResponse
        ?.isPriceChanged ?? false,

    responseHeader:
      updatedTempBooking
        .supplierResponse
        ?.responseHeader ?? null,

    revisedFare:
      updatedTempBooking
        .supplierResponse
        ?.revisedFare ?? null,

    hotel: {
      name:
        updatedTempBooking.hotelName,

      location:
        updatedTempBooking.hotelLocation,

      starCategory:
        updatedTempBooking.hotelStarCategory,

      checkIn:
        updatedTempBooking.hotelCheckIn,

      checkOut:
        updatedTempBooking.hotelCheckOut,

      policy:
        updatedTempBooking.hotelPolicy,
    },

    room: {
      roomId:
        updatedTempBooking.roomId,

      roomType:
        updatedTempBooking.roomType,

      roomTypeId:
        updatedTempBooking.roomTypeId,

      inclusion:
        updatedTempBooking.inclusion,

      additionalInfo:
        updatedTempBooking.additionalInfo,

      pricing:
        updatedTempBooking.pricing,

      cancellationPolicy:
        updatedTempBooking.cancellationPolicy,

      cancellationCharges:
        updatedTempBooking.cancellationCharges,

      payment:
        updatedTempBooking.payment,
    },

    customer: {
      address:
        updatedTempBooking.customerAddress,

      mobile:
        updatedTempBooking.customerMobile,

      postalCode:
        updatedTempBooking.customerPostalCode,

      email:
        updatedTempBooking.passengerEmail,

      passengerMobile:
        updatedTempBooking.passengerMobile,
    },

    paxDetails:
      updatedTempBooking.paxDetails,
  };
};