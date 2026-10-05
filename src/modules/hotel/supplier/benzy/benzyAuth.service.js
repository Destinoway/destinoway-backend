import dotenv from "dotenv";
dotenv.config();
import axios from "axios";
import redisClient from "../../../../config/redis.js";

const AKBAR_TOKEN_KEY = "AKBAR:hotel:token";
const AKBAR_TOKEN_TTL = 10 * 24 * 60 * 60; // 10 days

export const getAKBARToken = async () => {
  // 1. Check Redis
  const cachedToken = await redisClient.get(AKBAR_TOKEN_KEY);

  if (cachedToken) {
    console.log("AKBAR token found in Redis");
    return cachedToken;
  }

  // 2. Generate new token
  console.log("AKBAR token not found. Calling Signature API...");

  const { data } = await axios.post(
    process.env.AKBAR_SIGNATURE_URL,
    {
      MerchantID: process.env.AKBAR_MERCHANT_ID,
      ApiKey: process.env.AKBAR_API_KEY,
      ClientID: process.env.AKBAR_CLIENT_ID,
      Password: process.env.AKBAR_PASSWORD,
      AgentCode: process.env.AKBAR_AGENT_CODE,
      BrowserKey: process.env.AKBAR_BROWSER_KEY,
      Key: process.env.AKBAR_KEY,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  if (data?.Code !== "200" || !data?.Token) {
    throw new Error("Failed to generate AKBAR token");
  }

  // 3. Save token in Redis for 10 days
  await redisClient.set(AKBAR_TOKEN_KEY, data.Token, {
    EX: AKBAR_TOKEN_TTL,
  });

  console.log("New AKBAR token saved in Redis");

  return data.Token;
};
