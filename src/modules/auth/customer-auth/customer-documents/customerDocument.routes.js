import express from "express";

import {
  getCustomerDocuments,
  updateCustomerDocuments,
} from "./customerDocument.controller.js";

import { protectCustomer } from "../../../../middleware/customerAuth.middleware.js";

const router = express.Router();

// GET DOCUMENTS
router.get("/profile/documents", protectCustomer, getCustomerDocuments);

// UPDATE DOCUMENTS
router.put("/profile/documents", protectCustomer, updateCustomerDocuments);

export default router;
