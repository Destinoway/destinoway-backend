import redisClient from "../../config/redis.js";

export const getCache = async (key) => {
  try {
    const data = await redisClient.get(key);

    if (data) {
      return JSON.parse(data);
    }

    return null;
  } catch (err) {
    console.log("Redis GET Error:", err.message);
    return null;
  }
};

export const setCache = async (key, data, ttl = 3600) => {
  try {
    await redisClient.set(key, JSON.stringify(data), {
      EX: ttl,
    });
  } catch (err) {
    console.log(" Redis SET Error:", err.message);
  }
};

export const deleteCache = async (key) => {
  try {
    await redisClient.del(key);
  } catch (err) {
    console.log("Redis DEL Error:", err.message);
  }
};

export const deleteByPattern = async (pattern) => {
  try {
    const keys = await redisClient.keys(pattern);

    if (keys.length === 0) {
      return;
    }

    await redisClient.del(keys);
  } catch (err) {
    console.log("Redis Pattern Delete Error:", err.message);
  }
};
