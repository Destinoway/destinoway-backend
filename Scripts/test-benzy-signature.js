import "dotenv/config";
import axios from "axios";
import redisClient from "./src/config/redis.js";

const TOKEN_KEY = "benzy:hotel:token";
const TOKEN_TTL = 10 * 24 * 60 * 60; // 10 days

async function testBenzySignature() {
  try {
    console.log("=================================");
    console.log("Benzy Signature API Test");
    console.log("=================================");

    // Check Redis
    console.log("\n1. Checking Redis...");

    const existingToken = await redisClient.get(TOKEN_KEY);

    if (existingToken) {
      const ttl = await redisClient.ttl(TOKEN_KEY);

      console.log("✅ Token already exists in Redis");
      console.log(`⏳ Remaining TTL: ${ttl} seconds`);
      console.log("➡️ Signature API will NOT be called.");

      return;
    }

    console.log("⚠️ Token not found in Redis.");
    console.log("➡️ Calling Benzy Signature API...");

    // Signature API
    const response = await axios.post(
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
        timeout: 30000,
      }
    );

    console.log("\n2. Signature API Response");

    console.log("Code:", response.data?.Code);
    console.log("Message:", response.data?.Msg);
    console.log("TUI received:", !!response.data?.TUI);
    console.log("Token received:", !!response.data?.Token);

    if (response.data?.Code !== "200" || !response.data?.Token) {
      throw new Error("Signature API did not return a valid token");
    }

    // Save token in Redis
    await redisClient.set(TOKEN_KEY, response.data.Token, {
      EX: TOKEN_TTL,
    });

    const ttl = await redisClient.ttl(TOKEN_KEY);

    console.log("\n3. Redis");

    console.log("✅ Token saved in Redis");
    console.log(`⏳ TTL: ${ttl} seconds`);

    console.log("\n=================================");
    console.log("✅ TEST PASSED");
    console.log("=================================");
  } catch (error) {
    console.log("\n=================================");
    console.log("❌ TEST FAILED");
    console.log("=================================");

    if (error.response) {
      console.log("HTTP Status:", error.response.status);
      console.log("Response:", error.response.data);
    } else {
      console.log("Error:", error.message);
    }
  } finally {
    await redisClient.quit();
  }
}

await testBenzySignature();