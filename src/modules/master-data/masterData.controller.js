import {
  createMasterDataService,
  getMasterDataService,
  updateMasterDataService,
  deleteMasterDataService,
} from "./masterData.service.js";

import { sendError, sendSuccess } from "../../utils/response/ApiResponse.js";

export const createMasterData = async (req, res) => {
  try {
    const data = await createMasterDataService(req.body);

    return sendSuccess(
      res,
      "Master data created successfully",
      data,
      null,
      201
    );
  } catch (err) {
    return sendError(res, err);
  }
};

export const getMasterData = async (req, res) => {
  try {
    const { data, meta } = await getMasterDataService(req.query);

    return sendSuccess(
      res,
      "Master data fetched successfully",
      data,
      meta
    );
  } catch (error) {
    return sendError(res, error.message);
  }
};

// export const getMasterData = async (req, res) => {
//   try {
//     const { type } = req.query;

//     const data = await getMasterDataService(type);

//     return sendSuccess(res, "Master data list", data);
//   } catch (err) {
//     return sendError(res, err);
//   }
// };

export const updateMasterData = async (req, res) => {
  try {
    const data = await updateMasterDataService(req.params.id, req.body);

    return sendSuccess(res, "Master data updated successfully", data);
  } catch (err) {
    return sendError(res, err);
  }
};

export const deleteMasterData = async (req, res) => {
  try {
    await deleteMasterDataService(req.params.id);

    return sendSuccess(res, "Master data deleted successfully");
  } catch (err) {
    return sendError(res, err);
  }
};