import {
  createSupportService,
  getAllSupportService,
  getSingleSupportService,
  updateSupportService,
  deleteSupportService,
} from "./support.service.js";

import {
  sendSuccess,
  sendError,
} from "../../utils/response/ApiResponse.js";


// CREATE
export const createSupport = async (req, res) => {
  try {
    const result = await createSupportService(req.body);

    return sendSuccess(
      res,
      result.message,
      result.data,
      null,
      201
    );
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// GET ALL
export const getAllSupport = async (req, res) => {
  try {
    const result = await getAllSupportService();

    return sendSuccess(
      res,
      "Support data fetched successfully",
      result
    );
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getSingleSupport = async (req, res) => {
  try {
    console.log(req.params); 
    // should print { supportType: 'contact_us' }

    const result = await getSingleSupportService(
      req.params.supportType
    );

    return sendSuccess(
      res,
      "Support fetched successfully",
      result
    );
  } catch (error) {
    return sendError(res, error.message, 404);
  }
};
// GET SINGLE
// export const getSingleSupport = async (req, res) => {
//   try {
//     const result = await getSingleSupportService(
//       req.params.id
//     );

//     return sendSuccess(
//       res,
//       "Support fetched successfully",
//       result
//     );
//   } catch (error) {
//     return sendError(res, error.message, 404);
//   }
// };


// UPDATE
export const updateSupport = async (req, res) => {
  try {
    const payload = normalizeArrayFields(req.body);

    const result = await updateSupportService(
      req.params.id,
      payload
    );

    return sendSuccess(
      res,
      "Support updated successfully",
      result
    );
  } catch (error) {
    return sendError(res, error.message, 404);
  }
};

// DELETE
export const deleteSupport = async (req, res) => {
  try {
    await deleteSupportService(req.params.id);

    return sendSuccess(
      res,
      "Support deleted successfully"
    );
  } catch (error) {
    return sendError(res, error.message, 404);
  }
};

const normalizeArrayFields = (payload) => {
  const fields = [
    "customerSupport",
    "whatsappSupport",
    "bookingSupport",
    "bussinessPartnership",
  ];

  fields.forEach((field) => {
    if (payload[field]) {
      payload[field] = Array.isArray(payload[field])
        ? payload[field]
        : [payload[field]];
    }
  });

  return payload;
};