// cron/markup.cron.js

import cron from "node-cron";
import Markup from "../markup.model.js";

cron.schedule("*/5 * * * *", async () => {
  try {
    const now = new Date();

    // ✅ Activate
    await Markup.updateMany(
      {
        startDate: { $lte: now },
        endDate: { $gte: now },
      },
      {
        $set: { isActive: true },
      }
    );

    // ✅ Deactivate
    await Markup.updateMany(
      {
        endDate: { $lt: now },
      },
      {
        $set: { isActive: false },
      }
    );

    console.log("✅ Markup cron executed");

  } catch (err) {
    console.error("❌ Markup cron error", err);
  }
});