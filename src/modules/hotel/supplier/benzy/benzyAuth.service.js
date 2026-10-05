import axios from "axios";
import redisClient from "../../../../config/redis.js";
import dotenv from "dotenv";
dotenv.config();



const BENZY_TOKEN_KEY = "benzy:hotel:token";
const BENZY_TOKEN_TTL = 10 * 24 * 60 * 60; // 10 days

export const getBenzyToken = async () => {
  // 1. Check Redis
  const cachedToken = await redisClient.get(BENZY_TOKEN_KEY);

  if (cachedToken) {
    console.log("Benzy token found in Redis");
    return cachedToken;
  }

  // 2. Generate new token
  console.log("Benzy token not found. Calling Signature API...");

  const { data } = await axios.post(
    process.env.BENZY_SIGNATURE_URL,
    {
      MerchantID: process.env.BENZY_MERCHANT_ID,
      ApiKey: process.env.BENZY_API_KEY,
      ClientID: process.env.BENZY_CLIENT_ID,
      Password: process.env.BENZY_PASSWORD,
      AgentCode: process.env.BENZY_AGENT_CODE,
      BrowserKey: process.env.BENZY_BROWSER_KEY,
      Key: process.env.BENZY_KEY,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (data?.Code !== "200" || !data?.Token) {
    throw new Error("Failed to generate Benzy token");
  }

  // 3. Save token in Redis for 10 days
  await redisClient.set(BENZY_TOKEN_KEY, data.Token, {
    EX: BENZY_TOKEN_TTL,
  });

  console.log("New Benzy token saved in Redis");

  return data.Token;
};