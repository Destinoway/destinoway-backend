import PaymentFactory from "../src/modules/gateways/adapters/payment.factory.js";

const razorpay = PaymentFactory.create("razorpay");

console.log(razorpay.constructor.name);

const stripe = PaymentFactory.create("stripe");

console.log(stripe.constructor.name);
