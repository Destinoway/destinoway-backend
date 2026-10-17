import "dotenv/config";
import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL?.trim();
let redisOptions;
let redisConnectionInfo;
let authenticationConfigured;

if (redisUrl) {
  const parsedRedisUrl = new URL(redisUrl);
  redisOptions = { url: redisUrl };
  authenticationConfigured = Boolean(
    parsedRedisUrl.username || parsedRedisUrl.password
  );
  redisConnectionInfo = {
    configurationSource: "REDIS_URL",
    host: parsedRedisUrl.hostname,
    port:
      parsedRedisUrl.port ||
      (parsedRedisUrl.protocol === "rediss:" ? "6380" : "6379"),
    database:
      parsedRedisUrl.pathname && parsedRedisUrl.pathname !== "/"
        ? parsedRedisUrl.pathname
        : "/0",
  };
} else {
  const host = process.env.REDIS_HOST?.trim() || "localhost";
  const port = Number(process.env.REDIS_PORT || 6379);
  const database = Number(process.env.REDIS_DB || 0);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("REDIS_PORT must be an integer between 1 and 65535");
  }
  if (!Number.isInteger(database) || database < 0) {
    throw new Error("REDIS_DB must be a non-negative integer");
  }
  redisOptions = {
    socket: { host, port },
    database,
    ...(process.env.REDIS_USERNAME
      ? { username: process.env.REDIS_USERNAME }
      : {}),
    ...(process.env.REDIS_PASSWORD
      ? { password: process.env.REDIS_PASSWORD }
      : {}),
  };
  authenticationConfigured = Boolean(
    process.env.REDIS_USERNAME || process.env.REDIS_PASSWORD
  );
  redisConnectionInfo = {
    configurationSource: "REDIS_HOST",
    host,
    port: String(port),
    database: `/${database}`,
  };
}

export { redisConnectionInfo };

const redisClient = createClient(redisOptions);

redisClient.on("error", (err) => {
  console.log("Redis Error:", err);
});

console.info(
  JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "info",
    event: "redis.connection.configured",
    processId: process.pid,
    nodeEnv: process.env.NODE_ENV ?? null,
    ...redisConnectionInfo,
    authenticationConfigured,
  })
);

await redisClient.connect();

export default redisClient;
