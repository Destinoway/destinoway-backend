import {
  createContactService,
  deleteContactService,
  getAllContactsAdminService,
  getAllContactsService,
  getSingleContactService,
  updateContactService,
  updateContactServiceAdmin,
} from "./contact.service.js";

import { sendError, sendSuccess } from "../../utils/response/ApiResponse.js";
import { sendMail } from "../contactUsForm/mail.service.js";
import HotelBooking from "../hotel/hotelTempBooking/hotelCart.model.js";
import { contactUsTemplate } from "./contactUsTemplate.js";

export const createContact = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      UserId: req.user._id,
    };

    // first check only booking ref
    const bookingByRef = await HotelBooking.findOne({
      "supplierResponse.bookingRefNo": payload.BookingRefNo,
    });
console.log(bookingByRef)
    // then strict check with user
    const bookingExists = await HotelBooking.findOne({
      "supplierResponse.bookingRefNo": payload.BookingRefNo,

      // force string compare if stored as string
      UserId: req.user._id.toString(),
    });

    if (!bookingExists) {
      return sendError(res, "Invalid Booking Reference Number", 400);
    }

    const result = await createContactService(payload);

    if (result?.email) {
      await sendMail({
        to: result.email,
        subject: "Your Support Request Has Been Received",
        html: contactUsTemplate({
          fullName: result.fullName,
          ticketId: result.ticketId,
          subject: result.subject,
          supportCategory: result.supportCategory,
          status: result.status,
          BookingRefNo: result.BookingRefNo,
        }),
      });
    }

    return sendSuccess(res, "Contact created successfully", result, null, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// GET ALL CONTACTS
export const getAllContacts = async (req, res) => {
  try {
    const result = await getAllContactsService({
      ...req.query,
      UserId: req.user._id,
    });

    return sendSuccess(res, "Contacts fetched successfully", result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getAllContactsAdmin = async (req, res) => {
  try {
    const result = await getAllContactsAdminService(req.query);

    const message =
      result.contacts.length === 0
        ? "No matching contacts found"
        : "Contacts fetched successfully";

    return sendSuccess(res, message, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
// GET SINGLE CONTACT
export const getSingleContact = async (req, res) => {
  try {
    const result = await getSingleContactService(req.params.id, req.user._id);

    return sendSuccess(res, "Contact fetched successfully", result);
  } catch (error) {
    return sendError(res, error.message, 404);
  }
};

export const updateContactAdmin = async (req, res) => {
  try {
    const result = await updateContactServiceAdmin(req.params.id, req.body);

    if (result?.email) {
       sendMail({
        to: result.email,
        subject: "Your Support Request Has Been Received",
        html: contactUsTemplate({
          fullName: result.fullName,
          ticketId: result.ticketId,
          subject: result.subject,
          supportCategory: result.supportCategory,
          status: result.status,
          BookingRefNo: result.BookingRefNo,
        }),
      });
    }
    return sendSuccess(res, "Contact updated successfully", result);
  } catch (error) {
    return sendError(res, error.message, 404);
  }
};

// UPDATE CONTACT
export const updateContact = async (req, res) => {
  try {
    const result = await updateContactService(
      req.params.id,
      req.user._id,
      req.body,
    );

    return sendSuccess(res, "Contact updated successfully", result);
  } catch (error) {
    return sendError(res, error.message, 404);
  }
};

// DELETE CONTACT
export const deleteContact = async (req, res) => {
  try {
    await deleteContactService(req.params.id, req.user._id);

    return sendSuccess(res, "Contact deleted successfully");
  } catch (error) {
    return sendError(res, error.message, 404);
  }
};
