import mongoose from "mongoose";
import HotelTempBooking from "../hotelTempBooking/hotelCart.model.js";
import { generateInvoicePdf } from "./utils/pdfGenerator.js";

export const generateHotelInvoiceService = async (
  userId,
  bookingRefNo
) => {
  const booking = await HotelTempBooking.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    "supplierResponse.bookingRefNo": bookingRefNo,
  }).lean();

  if (!booking) {
    throw new Error("Booking not found");
  }

  return await generateInvoicePdf(booking);
};