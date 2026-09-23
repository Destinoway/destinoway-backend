import { checkPermission } from "../../middleware/checkPermission.js";
import express from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { protectCustomer } from "../../middleware/customerAuth.middleware.js";
import {
  createContact,
  deleteContact,
  getAllContacts,
  getAllContactsAdmin,
  getSingleContact,
  updateContact,
  updateContactAdmin,
} from "./contact.controller.js";

const router = express.Router();
//WEBSITE
router.post("/create", protectCustomer, createContact);
router.get("/getAllContacts", protectCustomer, getAllContacts);
router.get("/getSingleContact/:id", protectCustomer, getSingleContact);
router.put("/updateContact/:id", protectCustomer, updateContact);
router.delete("/deleteContact/:id", protectCustomer, deleteContact);


//ADMIN
router.get(
  "/admin/all-contacts",
  protect,
  checkPermission("userQuery", "read"),
  getAllContactsAdmin,
);
router.patch(
  "/admin/update-contact/:id",
  protect,
  checkPermission("userQuery", "update"),
  updateContactAdmin,
);

export default router;
