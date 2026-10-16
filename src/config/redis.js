import "dotenv/config";
import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const parsedRedisUrl = new URL(redisUrl);

const redisClient = createClient({
  url: redisUrl,
});

redisClient.on("error", (err) => {
  console.log("Redis Error:", err);
});

console.info(
  JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "info",
    event: "redis.connection.configured",
    host: parsedRedisUrl.hostname,
    port: parsedRedisUrl.port || "6379",
    database: parsedRedisUrl.pathname || "/0",
    authenticationConfigured: Boolean(
      parsedRedisUrl.username || parsedRedisUrl.password
    ),
  })
);

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
