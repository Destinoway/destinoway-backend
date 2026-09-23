import jwt from "jsonwebtoken";

export const generateAccessToken = (user) =>
  jwt.sign(
    { id: user._id || user.id, role: user.role },
    process.env.JWT_SECRET,
    {
      expiresIn: "60m",
    },
  );


export const generateRefreshToken = (user) =>
  jwt.sign(
    { id: user._id || user.id, role: user.role },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: "7d",
    },
  );
