import {
  updateThemeService,
  getThemeService,
} from "./theme.service.js";

import { sendSuccess, sendError } from "../../utils/response/ApiResponse.js";

export const updateThemeController = async (req, res) => {
  try {
    const theme = await updateThemeService(req.body);

    return sendSuccess(
      res,
      "Theme updated successfully",
      theme
    );
  } catch (error) {
    console.error("Update Theme Error:", error);
    return sendError(
      res,
      error.message || "Failed to update theme"
    );
  }
};

export const getThemeController = async (req, res) => {
  try {
    const theme = await getThemeService();

    return sendSuccess(
      res,
      "Theme fetched successfully",
      theme
    );
  } catch (error) {
    console.error("Get Theme Error:", error);
    return sendError(
      res,
      error.message || "Failed to fetch theme"
    );
  }
};