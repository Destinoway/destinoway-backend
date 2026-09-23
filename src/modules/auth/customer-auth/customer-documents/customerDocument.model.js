import mongoose from "mongoose";

const customerDocumentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    passportNumber: {
      type: String,
      trim: true,
    },

    passportExpiryDate: {
      type: Date,
    },

    passportIssuingCountry: {
      type: String,
      trim: true,
    },

    panCardNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
  },
  {
    timestamps: true,
  },
);

const CustomerDocument = mongoose.model(
  "CustomerDocument",
  customerDocumentSchema,
);

export default CustomerDocument;
