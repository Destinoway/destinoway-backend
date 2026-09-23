import User from "../../../user/user.model.js";

export const getProfileService = async (userId) => {
  const user = await User.findById(userId);

  if (!user) throw new Error("User not found");

  return user;
};
export const updateProfileService = async (userId, payload) => {

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: payload },   // 🔥 MAGIC LINE
    { new: true, runValidators: true }
  );

  if (!user) throw new Error("User not found");

  // profile completion logic
  user.profileCompleted = !!(user.name && (user.email || user.mobile));
  await user.save();

  return user;
};
