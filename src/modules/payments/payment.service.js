import crypto from "crypto";
import mongoose from "mongoose";

import HotelTempBooking from "../hotel/hotelTempBooking/hotelCart.model.js"; // path adjust karna
import { addPaymentService } from "../addPayment/addPayment.service.js";
import { hotelTicketingService } from "../hotel/hotelTicketing/hotelTicketing.service.js";
import {sendBookingConfirmationEmail}  from "../../modules/mail/services/bookingConfirmation.mail.js"
import{generateHotelInvoiceService} from "../hotel/invoice/invoice.service.js"

import razorpay,{
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
}  from "../../config/razorpay.config.js";

export const createOrderService = async ({  tempBookingId,
  userId }) => {
  // ===========================
  // Validate Mongo ObjectId
  // ===========================

  if (!mongoose.Types.ObjectId.isValid(tempBookingId)) {
    throw new Error("Invalid Temp Booking Id");
  }

  // ===========================
  // Find Booking
  // ===========================

  const booking = await HotelTempBooking.findOne({
  _id: tempBookingId,
  userId,
});

  if (!booking) {
    throw new Error("Temp booking not found");
  }

  // ===========================
  // Booking Status Check
  // ===========================

  if (booking.tempBookingStatus !== "payment_pending") {
    throw new Error(
      `Booking is not ready for payment. Current Status : ${booking.tempBookingStatus}`
    );
  }

  // ===========================
  // Already Paid Check
  // ===========================

  if (booking.paymentStatus === "paid") {
    throw new Error("Payment already completed");
  }

  // ===========================
  // Amount Check
  // ===========================

  if (
    !booking.payableAmount ||
    booking.payableAmount <= 0
  ) {
    throw new Error("Invalid payable amount");
  }

  // ===========================
  // Duplicate Order Check
  // ===========================

  if (
    booking.payment?.orderId &&
    booking.payment?.status === "created"
  ) {
    return {
      orderId: booking.payment.orderId,
      amount: booking.payment.amount * 100,
      currency: booking.payment.currency,
      key: process.env.RAZORPAY_KEY_ID,
      tempBookingId: booking._id,
    };
  }

  // ===========================
  // Razorpay Order Create
  // ===========================

  const razorpayOrder = await razorpay.orders.create({
  amount: Math.round(booking.payableAmount * 100),
  currency: booking.pricing.currency,
  receipt: booking._id.toString(),
  payment_capture: 1,
});

  // ===========================
  // Save Payment Info
  // ===========================

 booking.payment = {
  gateway: "razorpay",
  orderId: razorpayOrder.id,
  amount: booking.payableAmount,
  currency: booking.pricing.currency,
  status: "created",
};

  await booking.save();

  // ===========================
  // Return Response
  // ===========================

  return {
    tempBookingId: booking._id,

    orderId: razorpayOrder.id,

    amount: razorpayOrder.amount,

    currency: razorpayOrder.currency,

    key: RAZORPAY_KEY_ID,
  };
};

export const verifyPaymentService = async ({

    tempBookingId,

    razorpay_order_id,

    razorpay_payment_id,

    razorpay_signature,

    userId

}) => {

    // ============================
    // Validate Booking Id
    // ============================

    if (
        !mongoose.Types.ObjectId.isValid(
            tempBookingId
        )
    ) {

        throw new Error(
            "Invalid Temp Booking Id"
        );

    }

    // ============================
    // Find Booking
    // ============================

  const booking = await HotelTempBooking.findOne({
  _id: tempBookingId,
  userId,
});

    if (!booking) {

        throw new Error(
            "Booking not found"
        );

    }

    // ============================
    // Already Paid
    // ============================

    if (
        booking.paymentStatus ===
        "paid"
    ) {

        return {

            alreadyVerified: true,

            paymentId:
            booking.payment.paymentId,

            orderId:
            booking.payment.orderId

        };

    }

    // ============================
    // Order Id Check
    // ============================

    if (
        booking.payment.orderId !==
        razorpay_order_id
    ) {

        throw new Error(
            "Invalid Order Id"
        );

    }

    // ============================
    // Signature Verify
    // ============================

 const generatedSignature = crypto
  .createHmac("sha256", RAZORPAY_KEY_SECRET)
  .update(`${razorpay_order_id}|${razorpay_payment_id}`)
  .digest("hex");

    if (
        generatedSignature !==
        razorpay_signature
    ) {

        booking.payment.status =
        "failed";

        booking.paymentStatus =
        "failed";

        booking.tempBookingStatus =
        "payment_failed";

        await booking.save();

        throw new Error(
            "Invalid payment signature"
        );

    }

    // ============================
    // Fetch Payment
    // ============================

    const payment =
    await razorpay.payments.fetch(

        razorpay_payment_id

    );

    if (
        payment.status !==
        "captured"
    ) {

        throw new Error(
            "Payment not captured"
        );

    }

    if (
        payment.order_id !==
        razorpay_order_id
    ) {

        throw new Error(
            "Order mismatch"
        );

    }

    if (
        payment.amount !==
        Math.round(
            booking.payableAmount * 100
        )
    ) {

        throw new Error(
            "Amount mismatch"
        );

    }

    // ============================
    // Update Payment
    // ============================

    booking.payment.paymentId =
    razorpay_payment_id;

    booking.payment.signature =
    razorpay_signature;

    booking.payment.status =
    "success";

    booking.payment.amount =
    booking.payableAmount;
    booking.payment.currency = payment.currency;

    booking.payment.gatewayResponse =
    payment;

    booking.payment.paidAt =
    new Date();

    // ============================
    // Update Booking
    // ============================

    booking.paymentStatus =
    "paid";

    booking.tempBookingStatus =
    "payment_success";

    await booking.save();

    // ============================
// Supplier Add Payment
// ============================
// ============================================
// SUPPLIER ADD PAYMENT
// ============================================

const addPaymentResponse = await addPaymentService({
  BookingRefNo: booking.supplierResponse.bookingRefNo,
});

const responseHeader = addPaymentResponse?.Response_Header;

if (
  responseHeader?.Error_Code !== "0000" ||
  responseHeader?.Status_Id !== "11"
) {
  throw new Error(
    responseHeader?.Error_Desc || "Supplier Add Payment Failed"
  );
}

// ============================================
// HOTEL TICKETING + REQUERY
// ============================================

const ticketResult = await hotelTicketingService({
  BookingRefNo: booking.supplierResponse.bookingRefNo,
  SearchKey: booking.supplierData.searchKey,
});

// ============================================
// UPDATE HOTEL CART
// ============================================

booking.supplierResponse = {
  ...booking.supplierResponse,

  hotelTicketResponse: ticketResult.ticketingData,

  hotelRequeryResponse: ticketResult.requeryData,

  hotelVoucherNumber:
    ticketResult.hotelVoucherNumber,

  voucherNumber:
    ticketResult.requeryData?.VoucherNumber,

  invoiceNumber:
    ticketResult.requeryData?.InvoiceNumber,

  ticketStatusId:
    ticketResult.requeryData?.TicketStatusId,

  ticketStatusDesc:
    ticketResult.requeryData?.TicketStatusDesc,

  checkInDate:
    ticketResult.requeryData?.CheckInDate,

  checkOutDate:
    ticketResult.requeryData?.CheckOutDate,

  confirmedAt: new Date(),
};

await booking.save();
// ============================================
// GENERATE INVOICE + SEND EMAIL
// ============================================

try {

  const pdfBuffer = await generateHotelInvoiceService(
    booking.userId,
    booking.supplierResponse.bookingRefNo
  );

  await sendBookingConfirmationEmail({

    email:
    booking.supplierData.OccupantEmail,

    customerName:
      booking.supplierData.customerName,

    bookingRefNo:
      booking.supplierResponse.bookingRefNo,

    hotelName:
      booking.supplierResponse.hotelRequeryResponse?.HotelDetails?.HotelName,

    hotelAddress:
      booking.supplierResponse.hotelRequeryResponse?.HotelDetails?.Address,

    city:
      booking.supplierResponse.hotelRequeryResponse?.HotelDetails?.City,

    checkIn:
      booking.supplierResponse.checkInDate,

    checkOut:
      booking.supplierResponse.checkOutDate,

    rooms:
      booking.supplierResponse.hotelRequeryResponse?.RoomDetails?.length || 0,

    guests:
      booking.supplierResponse.hotelRequeryResponse?.PAXDetails?.length || 0,

    amount:
      booking.payment.amount,

    currency:
      booking.payment.currency,

    pdfBuffer,
  });

  console.log("Booking confirmation email sent successfully.");

} catch (error) {

  console.error("Email sending failed:", error.message);

  // Email fail hone se booking fail nahi honi chahiye.
}

// ============================================
// FINAL RESPONSE
// ============================================

return {
  success: true,

  paymentVerified: true,

  tempBookingId: booking._id,

  bookingRefNo: booking.supplierResponse.bookingRefNo,

  paymentId: razorpay_payment_id,

  orderId: razorpay_order_id,

  amount: booking.payableAmount,
   currency: booking.payment.currency,

  currencySymbol: booking.pricing.currencySymbol,

  

 
};}