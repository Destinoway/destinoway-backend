// import mongoose from "mongoose";
// import dotenv from "dotenv";
// import PaymentGateway from "../src/modules/payments/models/paymentGateway.model.js";

// dotenv.config();
// const MONGO_URI="mongodb://himanshu11752_db_user:Himanshu12@ac-ymu25xd-shard-00-00.ad4pvxh.mongodb.net:27017,ac-ymu25xd-shard-00-01.ad4pvxh.mongodb.net:27017,ac-ymu25xd-shard-00-02.ad4pvxh.mongodb.net:27017/hotel_Booiking?ssl=true&replicaSet=atlas-qpn1xm-shard-0&authSource=admin&retryWrites=true&w=majority"
// async function run() {
//   try {
//     await mongoose.connect(
//       MONGO_URI
//     );

//     console.log("Mongo connected");

//     const gateways =
//       await PaymentGateway.find();

//     console.log(gateways);

//     process.exit(0);

//   } catch (error) {
//     console.error(error);
//   }
// }

// run();
import mongoose from "mongoose";
import PaymentTransaction from "../src/modules/gateways/models/paymentTransaction.model.js";

const MONGO_URI =
  "mongodb://himanshu11752_db_user:Himanshu12@ac-ymu25xd-shard-00-00.ad4pvxh.mongodb.net:27017,ac-ymu25xd-shard-00-01.ad4pvxh.mongodb.net:27017,ac-ymu25xd-shard-00-02.ad4pvxh.mongodb.net:27017/hotel_Booiking?ssl=true&replicaSet=atlas-qpn1xm-shard-0&authSource=admin&retryWrites=true&w=majority";

async function run() {
  try {
    await mongoose.connect(MONGO_URI);

    console.log("Mongo connected");

    const txn = await PaymentTransaction.create({
      transactionId: "txn_001",

      bookingId: "booking_123",

      userId: "user_123",

      gateway: "razorpay",

      amount: 5000,

      currency: "INR",
    });

    console.log(txn);

    await mongoose.disconnect();
  } catch (error) {
    console.error(error);
  }
}

run();
