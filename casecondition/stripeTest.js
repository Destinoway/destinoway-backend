import StripeAdapter from "../src/modules/gateways/adapters/stripe.adapter.js";

const gateway = new StripeAdapter();

const result = await gateway.createOrder({
  amount: 10,

  currency: "usd",
});

console.log(result);
