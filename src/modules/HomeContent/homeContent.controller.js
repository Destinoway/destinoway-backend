import {
  createHomeContent,
  deleteHomeContent,
  getAdminHomeContent,
  getHomeContent,
  updateHomeContent,
} from "./homeContent.service.js";

import { sendError, sendSuccess } from "../../utils/response/ApiResponse.js";

// ADMIN CREATE

export const createHomeContentController = async (req, res) => {
  try {
    const data = await createHomeContent(req.body);

    return sendSuccess(
      res,
      "Home content created successfully",
      data,
      null,
      201,
    );
  } catch (error) {
    return sendError(res, error.message);
  }
};

// ADMIN GET ALL

export const getAdminHomeContentController = async (req, res) => {
  try {
    const data = await getAdminHomeContent();

    return sendSuccess(res, "Home content fetched successfully", data);
  } catch (error) {
    return sendError(res, error.message);
  }
};

// PUBLIC GET

export const getHomeContentController = async (req, res) => {
  try {
    const data = await getHomeContent();

    return sendSuccess(res, "Home content fetched successfully", data);
  } catch (error) {
    return sendError(res, error.message);
  }
};

// ADMIN UPDATE

export const updateHomeContentController = async (req, res) => {
  try {
    const data = await updateHomeContent(req.params.id, req.body);

    return sendSuccess(res, "Home content updated successfully", data);
  } catch (error) {
    return sendError(res, error.message);
  }
};

// ADMIN DELETE

export const deleteHomeContentController = async (req, res) => {
  try {
    const data = await deleteHomeContent(req.params.id);

    return sendSuccess(res, "Home content deleted successfully", data);
  } catch (error) {
    return sendError(res, error.message);
  }
};
