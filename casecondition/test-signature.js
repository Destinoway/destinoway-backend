import crypto from "crypto";
 const RAZORPAY_SECRET="fMFzXkokRrBOREY7BekxF7Aq"

const orderId =
  "order_T4dWkoTag6BkJV";   // from DB

const paymentId =
  "pay_test_123";

const body =
  orderId + "|" + paymentId;

const signature =
  crypto
    .createHmac(
      "sha256",
      RAZORPAY_SECRET
    )
    .update(body)
    .digest("hex");

console.log(signature);