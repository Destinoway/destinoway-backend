import dotenv from "dotenv";
import app from "./app.js";
import { connectDB } from "./config/db.js";

import "./modules/priceMarkup/markup/cron/markup.cron.js";
import "./modules/promotionEngine/couponExpiry.job.js";

import {
  disableExpiredCoupons
} from "./modules/promotionEngine/couponExpiry.service.js";

dotenv.config();

const PORT = process.env.PORT || 8000;

connectDB();

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
