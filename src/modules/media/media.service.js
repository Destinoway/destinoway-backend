import { PutObjectCommand } from "@aws-sdk/client-s3";

import { s3 } from "../../config/s3.config.js";
import ApiError from "../../utils/response/ApiError.js";

export const uploadToS3 = async (file) => {
  if (!file) {
    throw new ApiError(400, "File is required");
  }

  const folder = file.folder || "cms";

  const fileKey = `${folder}/${Date.now()}-${file.originalname}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,

    Key: fileKey,

    Body: file.buffer,

    ContentType: file.mimetype,
  });

  await s3.send(command);

  const url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

  return {
    url,
    key: fileKey,
  };
};
