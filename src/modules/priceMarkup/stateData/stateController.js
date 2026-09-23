import State from "./state.model.js";
import { sendSuccess, sendError } from "../../../utils/response/ApiResponse.js";

export const getStatesByCountry = async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";
    const countryCode = req.params.code;

    const states = await State.find({
      countryCode,
      stateName: { $regex: search, $options: "i" }
    }).sort({ stateName: 1 });

    return sendSuccess(
      res,
      "States fetched successfully",
      states
    );

  } catch (err) {
    console.error(err);
    return sendError(
      res,
      "Failed to fetch states",
      500,
      err.message
    );
  }
};