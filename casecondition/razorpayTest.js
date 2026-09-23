import RazorpayAdapter from "../src/modules/gateways/adapters/razorpay.adapter.js";

const gateway = new RazorpayAdapter();

const result = await gateway.createOrder({
  amount: 500,

  currency: "INR",
});

console.log(result);
