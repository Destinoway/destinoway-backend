import GrievanceRedressal from "./grievanceRedressal.model.js";


// CREATE

export const createGrievanceService = async (data) => {
  data.grievanceRedressalid =
    `GR${Math.floor(100000 + Math.random() * 900000)}`;

  return await GrievanceRedressal.create(data);
};;


// GET ALL (only logged in user)
export const getAllGrievanceService = async (userId) => {
  return await GrievanceRedressal.find({
    UserId: userId,
  }).sort({ createdAt: -1 });
};
export const getAllGrievanceAdminService = async (
  grievanceId
) => {
  const query = {};

  if (grievanceId) {
    query.grievanceRedressalid = {
      $regex: grievanceId,   // ✅ use parameter
      $options: "i",
    };
  }

  return await GrievanceRedressal.find(query)
    .sort({ createdAt: -1 });
};

// GET SINGLE
export const getSingleGrievanceService = async (
  id,
  userId
) => {
  const grievance = await GrievanceRedressal.findOne({
    _id: id,
    UserId: userId,
  });

  if (!grievance) {
    throw new Error("Grievance not found");
  }

  return grievance;
};


// UPDATE
export const updateGrievanceService = async (
  id,
  userId,
  payload
) => {
  const grievance =
    await GrievanceRedressal.findOneAndUpdate(
      {
        _id: id,
        UserId: userId,
      },
      payload,
      {
        new: true,
        runValidators: true,
      }
    );

  if (!grievance) {
    throw new Error("Grievance not found");
  }

  return grievance;
};


export const updateGrievanceStatusAdminService = async (
  id,
  data
) => {
  const grievance =
    await GrievanceRedressal.findByIdAndUpdate(
      id,
      {
        $set: data,
      },
      {
        new: true,
        runValidators: true,
      }
    );

  if (!grievance) {
    throw new Error("Grievance not found");
  }

  return grievance;
};
// DELETE
export const deleteGrievanceService = async (
  id,
  userId
) => {
  const grievance =
    await GrievanceRedressal.findOneAndDelete({
      _id: id,
      UserId: userId,
    });

  if (!grievance) {
    throw new Error("Grievance not found");
  }

  return true;
};