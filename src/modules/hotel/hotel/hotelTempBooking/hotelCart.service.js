import { supplierAPI } from "../../../config/supplierApi.js";
import { getAuthHeader } from "../../../config/supplierAuth.service.js";
import Coupon from "../../promotionEngine/coupon.model.js";
import { findBestCoupon } from "../../promotionEngine/promotion.service.js";
import HotelTempBooking from "./hotelCart.model.js";
import { getCurrencySymbol } from "../../currencyConverter/currency.helper.js";
export const hotelTempBookingService = async (payload, pricingData) => {
  console.log("=================================");
  console.log("SERVICE START");

  if (!pricingData) {
    throw new Error("Pricing data missing");
  }

  const requestStartTime = Date.now();

  let dbRecord;

  try {
    /*
        Supplier API payload only
      */

    const requestBody = {
      ...getAuthHeader(),

      CustomerName: payload.CustomerName,

      CustomerMobile: payload.CustomerMobile,

      CustomerAddress: payload.CustomerAddress,

      CustomerPostalCode: payload.CustomerPostalCode,

      HotelKey: payload.HotelKey,

      RecommendationID: payload.RecommendationID,

      SearchKey: payload.SearchKey,

      OccupantDetails: payload.OccupantDetails,

      OccupantEmail: payload.OccupantEmail,

      OccupantMobile: payload.OccupantMobile,

      PANNumber: payload.PANNumber || "",

      Remarks: payload.Remarks,
    };

    console.log("SUPPLIER REQUEST BODY =>");

    console.log(JSON.stringify(requestBody, null, 2));

    /*
        AUTO APPLY BEST COUPON
      */
console.log("Currency =", pricingData.currency);
console.log("Currency Symbol =", pricingData.currencySymbol);
    const couponData = await findBestCoupon({
      module: "hotel",

      bookingAmount: pricingData.finalPrice - pricingData.platformFeeAndTax,

      serviceTax: pricingData.serviceTaxAmount,
      currency: pricingData.currency,

  currencySymbol: pricingData.currencySymbol,
    });
    console.log(pricingData);
console.log("cooupendata ", couponData)
    let appliedDiscount = couponData?.bestDiscount || 0;
    const maxAllowed = Number(pricingData.serviceCharge || 0) * 0.7;

if (appliedDiscount > maxAllowed) {
  appliedDiscount = maxAllowed;
}

    /*
        CREATE TEMP BOOKING
      */

    dbRecord = await HotelTempBooking.create({
      userId: payload.UserId,

      supplierData: {
        hotelKey: payload.HotelKey,

        recommendationId: payload.RecommendationID,

        searchKey: payload.SearchKey,

        customerName: payload.CustomerName,

        customerMobile: payload.CustomerMobile,

        customerAddress: payload.CustomerAddress,

        customerPostalCode: payload.CustomerPostalCode,

        occupantDetails: payload.OccupantDetails,
           OccupantEmail: payload.OccupantEmail,

  OccupantMobile: payload.OccupantMobile,
      },

      hotelData: {
        hotelImage: payload.HotelImage,
      },

      pricing: pricingData,

      /*
            OFFER SYSTEM
          */

      offer: {
        // auto applied by system
        autoCouponCode: couponData?.bestCoupon?.code || null,

        autoDiscount: appliedDiscount,

        // user manual coupon later
        couponCode: null,

        couponDiscount: 0,
      },

      payableAmount: pricingData.finalPrice - appliedDiscount,

      tempBookingStatus: "initiated",
    });

    console.log("DB RECORD CREATED =>", dbRecord._id);

    /*
        SUPPLIER API CALL
      */

    console.log("CALLING SUPPLIER API...");

    const response = await supplierAPI.post(
      "/JSONService/HotelTempBooking",
      requestBody,
    );

    console.log("SUPPLIER SUCCESS RESPONSE =>");

    console.log(JSON.stringify(response.data, null, 2));

    const responseTime = Date.now() - requestStartTime;

    /*
        SUCCESS UPDATE
      */

    dbRecord.tempBookingStatus = "payment_pending";

    dbRecord.responseTime = responseTime;

    dbRecord.supplierResponse = {
      bookingRefNo: response.data?.BookingRefNo || null,

      statusId: response.data?.ResponseHeader?.StatusId || null,
    };

    await dbRecord.save();

    return {
      tempBookingId: dbRecord._id,

      appliedCoupon: couponData?.bestCoupon?.code || null,

      discount: appliedDiscount,

      finalPayable: dbRecord.payableAmount,
      paymentRequired: true,

      nextAction: "PAYMENT",

      ...response.data,
    };
  } catch (error) {
    const responseTime = Date.now() - requestStartTime;

    console.log("=================================");

    console.log("SERVICE ERROR");

    console.log("ERROR MESSAGE =>", error.message);

    console.log("ERROR STATUS =>", error?.response?.status);

    console.log("ERROR RESPONSE =>");

    console.log(error?.response?.data);

    /*
        SAVE FAILED STATUS
      */

    if (dbRecord) {
      dbRecord.tempBookingStatus = "failed";

      dbRecord.responseTime = responseTime;

      dbRecord.errorMessage = JSON.stringify(
        error?.response?.data || error.message,
      );

      await dbRecord.save();

      console.log("FAILED STATUS UPDATED");
    }

    throw error;
  }
};

export const updateCouponService = async ({ tempBookingId, couponCode }) => {
  const booking = await HotelTempBooking.findOne({
    _id: tempBookingId,
  });
  console.log("booking =", booking);
  if (!booking) {
    throw new Error("Booking not found");
  }

  const coupon = await Coupon.findOne({
    code: couponCode,
    isActive: true,
  });

  if (!coupon) {
    throw new Error("Invalid coupon");
  }

  // module validation
  if (!coupon.applicableModules.includes("hotel")) {
    throw new Error("Coupon not valid for hotel");
  }

  let discount = 0;

  if (coupon.discountType === "flat") {
    discount = coupon.discountValue;
  }

  if (coupon.discountType === "percent") {
    discount = (booking.pricing.finalPrice * coupon.discountValue) / 100;
  }

  const maxAllowed = booking.pricing.serviceCharge * 0.7;

  if (discount > maxAllowed) {
    discount = maxAllowed;
  }

  booking.offer = {
    ...booking.offer,

    couponCode: coupon.code,

    couponDiscount: discount,

    autoCouponCode: null,

    autoDiscount: 0,
  };

  booking.payableAmount = booking.pricing.finalPrice - discount;

  await booking.save();

  return booking;
};

export const removeCouponService = async ({ tempBookingId }) => {
  const booking = await HotelTempBooking.findById(tempBookingId);

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (!booking.offer?.couponCode && !booking.offer?.autoCouponCode) {
    throw new Error("No coupon applied");
  }

  booking.offer = {
    couponCode: null,
    couponDiscount: 0,
    autoCouponCode: null,
    autoDiscount: 0,
  };

  booking.payableAmount = booking.pricing.finalPrice;

  booking.markModified("offer"); // important

  await booking.save();

  return booking;
};

const now = new Date();
export const getTempBookingByBookingRefService = async (
  userId,
  bookingRefNo,
) => {
  const now = new Date();
  console.time("Total Service");

  console.time("Booking Query");

  const booking = await HotelTempBooking.findOne({
    userId,
    paymentStatus: "pending",
    tempBookingStatus: "payment_pending",
    "supplierResponse.bookingRefNo": bookingRefNo,
  }).lean();
console.log("Booking =", booking)
  if (!booking) {
    throw new Error("Booking not found");
  }

  const baseAmount =
    booking.pricing.finalPrice - booking.pricing.platformFeeAndTax;

  const totalAmount = baseAmount + booking.pricing.platformFeeAndTax;
  console.timeEnd("Booking Query");

  console.time("Coupon Query");

  const coupons = await Coupon.find({
    isActive: true,
    applicableModules: "hotel",
    minAmount: { $lte: totalAmount },
    "validity.startDate": { $lte: now },
    "validity.endDate": { $gte: now },
  })
    .select(
      "code title image discountType discountValue minAmount maxDiscountPercentOfServiceTax isAutoApply usageLimit usedCount",
    )
    .lean();
  console.timeEnd("Coupon Query");

  console.timeEnd("Total Service");

  const availableCoupons = coupons.filter(
    (coupon) =>
      coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit,
  );

  return {
    tempBookingId: booking._id,

    bookingReference: booking?.supplierResponse?.bookingRefNo || null,

    supplier: booking.supplier,

    hotel: {
      image: booking?.hotelData?.hotelImage || null,
    },

    customer: {
      name: booking?.supplierData?.customerName || "",
      mobile: booking?.supplierData?.customerMobile || "",
    },

    guestDetails:
      booking?.supplierData?.occupantDetails?.map((guest) => ({
        firstName: guest.FirstName,
        lastName: guest.LastName,
        title: guest.Title,
        occupantType: guest.OccupantType,
        roomNumber: guest.RoomNo,
      })) || [],

    priceSummary: {
      totalAmount,
      baseAmount,
      serviceCharge: booking?.pricing?.serviceCharge || 0,
      platformChargeandTax: booking?.pricing?.platformFeeAndTax || 0,
      couponCode:
        booking?.offer?.couponCode || booking?.offer?.autoCouponCode || null,
      couponDiscount:
        booking?.offer?.couponDiscount || booking?.offer?.autoDiscount || 0,
      totalPayableAmountAfterDiscount: booking?.payableAmount || 0,
      currencySymbol:booking?.pricing?.currencySymbol||"₹"
      
    },

    availableCoupons,

    bookingStatus: {
      reservationStatus: booking?.tempBookingStatus,
      paymentStatus: booking?.paymentStatus,
    },

    createdAt: booking.createdAt,
  };
};
