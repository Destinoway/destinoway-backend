import {
  createDestinationService,
  deleteDestinationService,
  getDestinationService,
  getHomeDestinations,
  updateDestinationService,
} from "./desitanation.service.js";

import { sendError, sendSuccess } from "../../utils/response/ApiResponse.js";
export const getHomeDestinationsController = async (req, res) => {
  try {
    const { type } = req.query;

    const data = await getHomeDestinations(type);

    res.json({
      success: true,
      type,
      count: data.length,
      data,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
//updateDestinationcontroller

// import {
//   createDestinationService,
//   getDestinationService,
//   updateDestinationService,
//   deleteDestinationService,
// } from "./destination.service.js";

export const createDestination = async (req, res) => {
  try {
    const data = await createDestinationService(req.body);

    return sendSuccess(
      res,
      "Destination created successfully",
      data,
      null,
      201,
    );
  } catch (err) {
    return sendError(res, err);
  }
};

export const getDestinations = async (req, res) => {
  try {
    const { type } = req.query;

    const data = await getDestinationService(type);

    return sendSuccess(res, "Destination list", data);
  } catch (err) {
    return sendError(res, err);
  }
};

export const updateDestination = async (req, res) => {
  try {
    const data = await updateDestinationService(req.params.id, req.body);

    return sendSuccess(res, "Destination updated successfully", data);
  } catch (err) {
    return sendError(res, err);
  }
};

export const deleteDestination = async (req, res) => {
  try {
    await deleteDestinationService(req.params.id);

    return sendSuccess(res, "Destination deleted successfully");
  } catch (err) {
    return sendError(res, err);
  }
};
