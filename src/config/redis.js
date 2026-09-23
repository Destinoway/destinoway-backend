import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("error", (err) => {
  console.log("Redis Error:", err);
});

await redisClient.connect();

export default redisClient;


// import { createClient } from "redis";

// const redisClient = createClient({
//   url: process.env.REDIS_URL,
// });

// redisClient.on("error", (err) => {
//   console.log("Redis Error:", err.message);
// });

// if (process.env.REDIS_ENABLED === "true") {
//   await redisClient.connect();
// }

// export default redisClient;

