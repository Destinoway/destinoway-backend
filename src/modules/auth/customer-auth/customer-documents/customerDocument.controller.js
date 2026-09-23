import { asyncHandler } from "../../../../middleware/asyncHandler.js";
import { sendSuccess } from "../../../../utils/response/ApiResponse.js";

import {
  getCustomerDocumentService,
  updateCustomerDocumentService,
} from "./customerDocument.service.js";

import { updateCustomerDocumentValidation } from "./customerDocument.validation.js";

// GET CUSTOMER DOCUMENTS
export const getCustomerDocuments = asyncHandler(async (req, res) => {
  const documents = await getCustomerDocumentService(req.user._id);

  return sendSuccess(res, "Customer documents fetched", {
    passportNumber: documents.passportNumber || null,
    passportExpiryDate: documents.passportExpiryDate || null,
    passportIssuingCountry: documents.passportIssuingCountry || null,
    panCardNumber: documents.panCardNumber || null,
  });
});

// UPDATE CUSTOMER DOCUMENTS
export const updateCustomerDocuments = asyncHandler(async (req, res) => {
  const { error, value } = updateCustomerDocumentValidation.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  // EMPTY STRING => NULL
  Object.keys(value).forEach((key) => {
    if (value[key] === "") {
      value[key] = null;
    }
  });

  const documents = await updateCustomerDocumentService(req.user._id, value);

  return sendSuccess(res, "Customer documents updated", {
    passportNumber: documents.passportNumber,
    passportExpiryDate: documents.passportExpiryDate,
    passportIssuingCountry: documents.passportIssuingCountry,
    panCardNumber: documents.panCardNumber,
  });
});
