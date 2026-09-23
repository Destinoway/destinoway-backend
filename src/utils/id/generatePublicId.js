import { v4 as uuidv4 } from "uuid";

// 🔥 universal public id generator
export const generatePublicId = (module) => {
  return `PJ_${module}_${uuidv4()}`;
};