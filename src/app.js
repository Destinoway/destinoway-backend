import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
//import "./cron/hotelCache.cron.js";
import { currencyMiddleware } from "./middleware/currency.middleware.js";
import { errorHandler } from "./middleware/error.middleware.js";
import addBalanceRoute from "./modules/addPayment/addPaymentRoutes.js";
import authRoutes from "./modules/auth/admin-auth/auth.routes.js";
import otpRoutes from "./modules/auth/customer-auth/auth.routes.js";
import customerProfileRoutes from "./modules/auth/customer-auth/customer-documents/customerDocument.routes.js";
import profileRoutes from "./modules/auth/customer-auth/customerProfile/profile.routes.js";
import destinationSearch from "./modules/hotel/destination/destination.routes.js";
import cmsRoutes from "./modules/cms/cms.routes.js";
import contactUs from "./modules/contactUsForm/contact.routes.js";
import newsletter from "./modules/contactUsForm/newsletter.routes.js";
import currencyRoutes from "./modules/currencyConverter/currency.route.js";
//import dashboardhotelsearch from "./modules/dashboardHotels/hotel.routes.js";
import masterRoutes from "./modules/master-data/masterData.routes.js";
import grievanceRedressal from "./modules/grievanceRedressal/grievanceRedressal.routes.js";
// import hotelSearch from "./modules/hotel/hotel.route.js";
import hotelCancellation from "./modules/hotel/hotelCancellation/cancellation.route.js";
//import hotelDetails from "./modules/hotel/hotelDetails/hotel.routes.js";
import hotelRequery from "./modules/hotel/hotelRequery/requery.route.js";

import hotelTicketing from "./modules/hotel/hotelTicketing/hotelTicketing.route.js";
import invoiceRoutes from "./modules/hotel/invoice/invoice.route.js";

import paymentRoutes from "./modules/payments/payment.routes.js";
import gatewayroutewebhook from "./modules/gateways/routes/webhook.routes.js";
import mediaRoutes from "./modules/media/media.routes.js";
import countryRoutes from "./modules/priceMarkup/countryData/country.routes.js";
import markeupRoutes from "./modules/priceMarkup/markup/markup.routes.js";
import stateRoutes from "./modules/priceMarkup/stateData/state.routes.js";
import couponCode from "./modules/promotionEngine/promotion.routes.js";
import roleRoutes from "./modules/role/role.routes.js";
import support from "./modules/supportContact/support.routes.js";
import tax from "./modules/tax/tax.route.js";
import userRoutes from "./modules/user/user.routes.js";
import homecontent from "./modules/HomeContent/homeContent.route.js";
import wishlistRoutes from "./modules/wishlist/wishlist.routes.js";
import theme from "./modules/theme/theme.route.js";
import testRoutes from "./test.routes.js";
import searchApi from "./modules/hotel/hotelSearch/search.routes.js"
import hoteldetails from "./modules/hotel/hotelDetail/hotelDetail.route.js"
import hotelTempBooking from "./modules/hotel/hotelTempbooking/tempBooking.route.js"

import path from "path";


const app = express();
app.set("trust proxy", 1);
app.use((req, res, next) => {
  console.log("📡 REQUEST HIT:", req.method, req.url);
  next();
});

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://main.d1lddnidhuqzni.amplifyapp.com",
      "https://main.d2s4wo3hb5kyyq.amplifyapp.com",
      "https://www.panjourney.com",
      "https://panjourney.com",
    ],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "currency"],
  }),
);
app.use(currencyMiddleware);
app.use(cookieParser());
app.use(
  "/api/v1/payment/webhook",
  express.raw({ type: "application/json" })
);
app.use(express.json());
app.use(express.static("public"));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/media", mediaRoutes);
app.use("/api/v1", contactUs);
app.use("/api/v1", support);
app.use("/api/v1", grievanceRedressal);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/newsletter", newsletter);
app.use("/api/v1/tax", tax);
app.use("/api/v1/couponCode", couponCode);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/homecontent", homecontent);
app.use("/api/v1/HotelSearch", searchApi);
app.use("/api/v1/HotelDetails", hoteldetails);
app.use("/api/v1/hotelTempBooking", hotelTempBooking);
app.use("/api/v1/cms", cmsRoutes);
app.use("/api/v1/theme", theme);
app.use("/api/v1/roles", roleRoutes);
app.use("/api/v1/destination", destinationSearch);
app.use("/api/webhooks", gatewayroutewebhook);

app.use("/api/v1", hotelRequery);
app.use("/api/v1", addBalanceRoute);
app.use("/api/v1", hotelCancellation);
app.use("/api/v1/customer/auth/", otpRoutes);
app.use("/api/v1/customer/profile", profileRoutes);
app.use("/api/v1/markup", markeupRoutes);
app.use("/api/v1/currency", currencyRoutes);
app.use("/api/v1", testRoutes);
app.use("/api/v1/newsletter", newsletter);
app.use("/api/v1", invoiceRoutes);

app.use("/api/v1/masterData", masterRoutes);
app.use("/api/v1/customer", customerProfileRoutes);
app.use("/api/v1", countryRoutes);
app.use("/api/v1/states", stateRoutes);
app.use("/api/v1", hotelTicketing);
//  app.use("/api/v1/", dashboardhotelsearch);
app.use("/api/v1", wishlistRoutes);
//app.use("/api/v1", hotelDetails);
app.use(errorHandler);

export default app;
