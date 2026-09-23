import Support from "./support.model.js";

// CREATE
export const createSupportService = async (payload) => {
  const existingSupport = await Support.findOne({
    supportType: payload.supportType,
  });

  // If already exists → update
  if (existingSupport) {
    const updatedSupport = await Support.findByIdAndUpdate(
      existingSupport._id,
      payload,
      {
        new: true,
        runValidators: true,
      }
    );

    return {
      message: "Support already exists, updated successfully",
      data: updatedSupport,
    };
  }

  // Else create new
  const support = await Support.create(payload);

  return {
    message: "Support created successfully",
    data: support,
  };
};

export const updateSupportService = async (id, payload) => {
  const support = await Support.findByIdAndUpdate(
    id,
    payload,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!support) {
    throw new Error("Support not found");
  }

  return support;
};

// GET ALL
export const getAllSupportService = async () => {
  return await Support.find().sort({ createdAt: -1 });
};

export const getSingleSupportService = async (supportType) => {
  const support = await Support.findOne({
    supportType: supportType,
  });

  if (!support) {
    throw new Error("Support not found");
  }

  return support;
};

// DELETE
export const deleteSupportService = async (id) => {
  const support = await Support.findByIdAndDelete(id);

  if (!support) {
    throw new Error("Support not found");
  }

  return true;
};