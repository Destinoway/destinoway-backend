import {
  createGrievanceService,
  getAllGrievanceService,
  getSingleGrievanceService,
  updateGrievanceService,
  deleteGrievanceService,
  getAllGrievanceAdminService,
  updateGrievanceStatusAdminService
} from "./grievanceRedressal.service.js";

import {
  sendSuccess,
  sendError,
} from "../../utils/response/ApiResponse.js";
import Contact from "../contactUsForm/contact.model.js";
import { sendMail } from "../contactUsForm/mail.service.js";
import { grievanceTemplate } from "./grievanceTemplate.js";



// CREATE

export const createGrievance = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      UserId: req.user._id,
    };

    // Step 1: Check ticketId exists in Contact collection
    const contactExists = await Contact.findOne({
      ticketId: payload.ticketId,
    });

    if (!contactExists) {
      return sendError(
        res,
        "Invalid Ticket ID. No support ticket found.",
        400
      );
    }

    // Step 2: Create grievance
    const result = await createGrievanceService(payload);

    // Step 3: Send mail only if contact ticket exists
    if (result?.email) {
      await sendMail({
        to: result.email,
        subject: "Grievance Request Received",
        html: grievanceTemplate({
          fullName: result.fullName,
          ticketId: payload.ticketId,
          subject: result.subject,
            grievanceRedressalid: result.grievanceRedressalid,
          status: "Open",
        }),
      });
    }

    return sendSuccess(
      res,
      "Grievance created successfully",
      result,
      null,
      201
    );

  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
// export const updateGrievanceStatusAdmin = async (req, res) => {
//   try {
//     const result =
//       await updateGrievanceStatusAdminService(
//         req.params.id,
//         req.body
//       );

//     // respond immediately
//     sendSuccess(
//       res,
//       "Grievance status updated successfully",
//       result
//     );

//     // mail in background
//     if (result?.email) {
//       sendMail({
//         to: result.email,
//         subject: "Grievance Status Updated",
//         html: grievanceStatusTemplate({
//           fullName: result.fullName,
//           grievanceId: result.grievanceRedressalid,
//           status: result.status,
//         }),
//       }).catch((err) => {
//         console.log("Mail failed =>", err.message);
//       });
//     }

//   } catch (error) {
//     return sendError(res, error.message, 500);
//   }
// };

export const updateGrievanceStatusAdmin =
  async (req, res) => {
    try {
      const result =
        await updateGrievanceStatusAdminService(
          req.params.id,
          req.body
        );

      // send status update mail
      if (result?.email) {
         sendMail({
          to: result.email,
          subject: "Grievance Status Updated",
          html: grievanceTemplate({
            fullName: result.fullName,
             ticketId: result.ticketId,
          subject: result.subject,
            grievanceRedressalid: result.grievanceRedressalid,
        
            status: result.status,
          }),
        });
      }

      return sendSuccess(
        res,
        "Grievance status updated successfully",
        result
      );

    } catch (error) {
      return sendError(
        res,
        error.message,
        500
      );
    }
};
// GET ALL
export const getAllGrievance = async (req, res) => {
  try {
    const result =
      await getAllGrievanceService(
        req.user._id
      );

    return sendSuccess(
      res,
      "Grievances fetched successfully",
      result
    );
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
export const getAllGrievanceAdmin = async (req, res) => {
  try {
    const result =
      await getAllGrievanceAdminService(
        req.query.grievanceId
      );

    return sendSuccess(
      res,
      "Grievance fetched successfully",
      result
    );
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};


// GET SINGLE
export const getSingleGrievance = async (
  req,
  res
) => {
  try {
    const result =
      await getSingleGrievanceService(
        req.params.id,
        req.user._id
      );

    return sendSuccess(
      res,
      "Grievance fetched successfully",
      result
    );
  } catch (error) {
    return sendError(res, error.message, 404);
  }
};


// UPDATE
export const updateGrievance = async (
  req,
  res
) => {
  try {
    const result =
      await updateGrievanceService(
        req.params.id,
        req.user._id,
        req.body
      );

    return sendSuccess(
      res,
      "Grievance updated successfully",
      result
    );
  } catch (error) {
    return sendError(res, error.message, 404);
  }
};


// DELETE
export const deleteGrievance = async (
  req,
  res
) => {
  try {
    await deleteGrievanceService(
      req.params.id,
      req.user._id
    );

    return sendSuccess(
      res,
      "Grievance deleted successfully"
    );
  } catch (error) {
    return sendError(res, error.message, 404);
  }
};