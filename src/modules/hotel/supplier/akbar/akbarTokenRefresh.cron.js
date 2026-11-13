import cron from "node-cron";
import { logHotelEvent } from "../../hotel/utils/hotelObservability.js";
import { refreshAKBARTokenIfDue } from "./akbarAuth.service.js";

cron.schedule("*/15 * * * *", async () => {
  try {
    await refreshAKBARTokenIfDue();
  } catch (error) {
  }
});
