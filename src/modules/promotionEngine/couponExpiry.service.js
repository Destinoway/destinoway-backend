import Coupon from "./coupon.model.js";

export const disableExpiredCoupons =
  async () => {
    try {

      const now =
        new Date();

      const result =
        await Coupon.updateMany(
          {
            "validity.startDate": {
              $lt: now
            },

            isActive: true
          },

          {
            $set: {
              isActive: false
            }
          }
        );

      console.log(
        `${result.modifiedCount} expired coupons disabled`
      );

    } catch (error) {
      console.log(
        error.message
      );
    }
  };