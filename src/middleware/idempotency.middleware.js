import Redis
from "ioredis";

const redis =
 new Redis({

   host:
    process.env
    .REDIS_HOST,

   port:
    process.env
    .REDIS_PORT
 });

export default async function (
  req,
  res,
  next
) {
  const key =
   req.headers[
    "x-idempotency-key"
   ];

  if (!key) {
    return res
      .status(400)
      .json({
        success:false,
        message:
         "Missing idempotency key"
      });
  }

  const exists =
   await redis.get(key);

  if (exists) {
    return res
      .status(409)
      .json({
        success:false,
        message:
         "Duplicate request"
      });
  }

  await redis.set(
    key,
    "processing",
    "EX",
    300
  );

  next();
}