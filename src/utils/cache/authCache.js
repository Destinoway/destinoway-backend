import redisClient from "../../config/redis.js";

export const saveRefreshToken = async (userId, token) => {
  const key = `refresh:${userId}:${token}`;

  await redisClient.set(key, "valid", {
    EX: 7 * 24 * 60 * 60,
  });
};

export const isRefreshTokenValid = async (userId, token) => {
  const key = `refresh:${userId}:${token}`;
  return await redisClient.get(key);
};

export const deleteRefreshToken = async (userId, token) => {
  const key = `refresh:${userId}:${token}`;
  await redisClient.del(key);
};

export const saveVerifyToken = async (userId, token) => {
  const key = `verify:${userId}:${token}`;

  await redisClient.set(key, "valid", {
    EX: 10 * 60, 
  });
};

export const isVerifyTokenValid = async (userId, token) => {
  return await redisClient.get(`verify:${userId}:${token}`);
};

export const deleteVerifyToken = async (userId, token) => {
  await redisClient.del(`verify:${userId}:${token}`);
};