import cron from "node-cron";

import {
  disableExpiredCoupons
} from "./couponExpiry.service.js";

cron.schedule(
  "0 0 * * *",

  async () => {
    console.log(
      "Checking expired coupons..."
    );

    await disableExpiredCoupons();
  }
);