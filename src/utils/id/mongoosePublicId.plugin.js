import { generatePublicId } from "./id/generatePublicId.js";

const mongoosePublicIdPlugin = (schema, options = {}) => {
  const moduleName = options.module || "GEN";

  // uuid field add
  schema.add({
    uuid: {
      type: String,
      unique: true,
      index: true,
    },
  });

  // ⭐⭐⭐ MODERN MONGOOSE MIDDLEWARE (NO NEXT)
  schema.pre("save", function () {
    if (!this.uuid) {
      this.uuid = generatePublicId(moduleName);
    }
  });
};

export default mongoosePublicIdPlugin;