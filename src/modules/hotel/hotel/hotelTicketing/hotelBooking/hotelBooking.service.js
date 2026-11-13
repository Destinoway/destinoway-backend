import TempBooking from "../../hotelTempbooking/tempBooking.model.js";

import {
  addPaymentService,
} from "../../../addPayment/addPayment.service.js";

import {
  hotelTicketingService,
} from "../../hotelTicketing/hotelTicketing.service.js";

export const confirmHotelBookingService = async ({
  refNo,
}) => {

  // ======================================================
  // 1. VALIDATE REF NO
  // ======================================================

  if (!refNo) {
    throw new Error(
      "refNo is required"
    );
  }


  // ======================================================
  // 2. FIND TEMP BOOKING
  // ======================================================

  const tempBooking =
    await TempBooking.findOne({
      "supplierResponse.bookingRefNo":
        refNo,
    });

  if (!tempBooking) {
    throw new Error(
      `Temp booking not found for booking reference: ${refNo}`
    );
  }


  // ======================================================
  // 3. VALIDATE TEMP BOOKING STATUS
  // ======================================================

  if (
    tempBooking.status !==
    "TEMP_BOOKED"
  ) {
    throw new Error(
      `Booking is not in TEMP_BOOKED status. Current status: ${tempBooking.status}`
    );
  }


  // ======================================================
  // 4. GET SEARCH KEY FROM DB
  // ======================================================

  const searchKey =
    tempBooking.searchKey;

  if (!searchKey) {
    throw new Error(
      "SearchKey not found in TempBooking"
    );
  }


  // ======================================================
  // 5. ADD PAYMENT
  // ======================================================

  let paymentResponse;

  try {

    paymentResponse =
      await addPaymentService({
        BookingRefNo: refNo,

        transactionType: 0,

        productId: "3",

        clientRefNo: "",
      });


    // SAVE PAYMENT SUCCESS

    tempBooking.paymentStatus =
      "SUCCESS";

    tempBooking.paymentResponse =
      paymentResponse;

    await tempBooking.save();

  } catch (error) {

    // SAVE PAYMENT FAILURE

    tempBooking.paymentStatus =
      "FAILED";

    tempBooking.paymentResponse = {
      error: error.message,
    };

    await tempBooking.save();

    // IMPORTANT:
    // Ticketing will NOT be called

    throw new Error(
      `Add Payment failed: ${error.message}`
    );
  }


  // ======================================================
  // 6. HOTEL TICKETING
  // ======================================================

  let ticketingResponse;

  try {

    ticketingResponse =
      await hotelTicketingService({
        bookingRefNo: refNo,

        searchKey,
      });


    // SAVE TICKETING SUCCESS

    tempBooking.ticketingStatus =
      "SUCCESS";

    tempBooking.ticketingResponse =
      ticketingResponse;

    await tempBooking.save();

  } catch (error) {

    // SAVE TICKETING FAILURE

    tempBooking.ticketingStatus =
      "FAILED";

    tempBooking.ticketingResponse = {
      error: error.message,
    };

    await tempBooking.save();

    throw new Error(
      `Hotel Ticketing failed: ${error.message}`
    );
  }


  // ======================================================
  // 7. FINAL RESPONSE
  // ======================================================

  return {

    success: true,

    bookingRefNo: refNo,

    payment: {
      status:
        tempBooking.paymentStatus,

      response:
        paymentResponse,
    },

    ticketing: {
      status:
        tempBooking.ticketingStatus,

      response:
        ticketingResponse,
    },

  };
};