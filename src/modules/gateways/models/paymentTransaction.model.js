import mongoose from "mongoose";

const schema =
 new mongoose.Schema({

   transactionId:{
     type:String,
     unique:true
   },

   bookingId:{
     type:String,
     required:true
   },

   userId:{
     type:String,
     required:true
   },

   gateway:{
     type:String
   },

   amount:{
     type:Number
   },

   currency:{
     type:String
   },

   gatewayOrderId:{
     type:String
   },

   gatewayPaymentId:{
     type:String
   },

   bookingStatus:{
  type:String,

  enum:[
    "not_started",
    "processing",
    "confirmed",
    "failed",
    "refund_processing",
    "refunded"
  ],

  default:"not_started"
},
  refundAmount: {
    type: Number,
    default: 0
  },

  refundedAt: Date

 },
 {
   timestamps:true
 });

export default mongoose.model(
 "PaymentTransaction",
 schema
);