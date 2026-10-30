import PaymentFactory from "../src/modules/gateways/adapters/payment.factory.js";

const razorpay = PaymentFactory.create("razorpay");


const stripe = PaymentFactory.create("stripe");
