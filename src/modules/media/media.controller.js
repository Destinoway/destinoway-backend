import { asyncHandler } from "../../middleware/asyncHandler.js";
import { sendSuccess } from "../../utils/response/ApiResponse.js";

import { uploadToS3 } from "./media.service.js";

export const uploadMedia = asyncHandler(async (req, res) => {
  const data = await uploadToS3({
    ...req.file,
    folder: req.body.folder,
  });

  sendSuccess(res, "File uploaded successfully", data);
});
