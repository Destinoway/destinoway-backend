// import "dotenv/config";
// import axios from "axios";
// import redisClient from "../src/config/redis.js";

// const TOKEN_KEY = "benzy:hotel:token";
// const TOKEN_TTL = 10 * 24 * 60 * 60; // 10 days

// async function testBenzySignature() {
//   try {
//     console.log("=================================");
//     console.log("Benzy Signature API Test");
//     console.log("=================================");

//     // Check Redis
//     console.log("\n1. Checking Redis...");

//     const existingToken = await redisClient.get(TOKEN_KEY);

//     if (existingToken) {
//       const ttl = await redisClient.ttl(TOKEN_KEY);

//       console.log("✅ Token already exists in Redis");
//       console.log(`⏳ Remaining TTL: ${ttl} seconds`);
//       console.log("➡️ Signature API will NOT be called.");

//       return;
//     }

//     console.log("⚠️ Token not found in Redis.");
//     console.log("➡️ Calling Benzy Signature API...");

//     // Signature API
//     const response = await axios.post(
//       process.env.BENZY_SIGNATURE_URL,
//       {
//         MerchantID: process.env.BENZY_MERCHANT_ID,
//         ApiKey: process.env.BENZY_API_KEY,
//         ClientID: process.env.BENZY_CLIENT_ID,
//         Password: process.env.BENZY_PASSWORD,
//         AgentCode: process.env.BENZY_AGENT_CODE,
//         BrowserKey: process.env.BENZY_BROWSER_KEY,
//         Key: process.env.BENZY_KEY,
//       },
//       {
//         headers: {
//           "Content-Type": "application/json",
//         },
//         timeout: 30000,
//       }
//     );

//     console.log("\n2. Signature API Response");

//     console.log("Code:", response.data?.Code);
//     console.log("Message:", response.data?.Msg);
//     console.log("TUI received:", !!response.data?.TUI);
//     console.log("Token received:", !!response.data?.Token);

//     if (response.data?.Code !== "200" || !response.data?.Token) {
//       throw new Error("Signature API did not return a valid token");
//     }

//     // Save token in Redis
//     await redisClient.set(TOKEN_KEY, response.data.Token, {
//       EX: TOKEN_TTL,
//     });

//     const ttl = await redisClient.ttl(TOKEN_KEY);

//     console.log("\n3. Redis");

//     console.log("✅ Token saved in Redis");
//     console.log(`⏳ TTL: ${ttl} seconds`);

//     console.log("\n=================================");
//     console.log("✅ TEST PASSED");
//     console.log("=================================");
//   } catch (error) {
//     console.log("\n=================================");
//     console.log("❌ TEST FAILED");
//     console.log("=================================");

//     if (error.response) {
//       console.log("HTTP Status:", error.response.status);
//       console.log("Response:", error.response.data);
//     } else {
//       console.log("Error:", error.message);
//     }
//   } finally {
//     await redisClient.quit();
//   }
// }

// await testBenzySignature();

import dotenv from "dotenv";
dotenv.config();
import axios from "axios";
import redisClient from "../src/config/redis.js";



const BENZY_TOKEN_KEY = "benzy:hotel:token";
const BENZY_TOKEN_TTL = 10 * 24 * 60 * 60; // 10 days

const BENZY_SIGNATURE_URL="https://b2bapiutils.benzyinfotech.com/Utils/Signature"

"BENZY_MERCHANT_ID"="300"
"BENZY_API_KEY"="kXAY9yHARK"
"BENZY_CLIENT_ID"="bitest"
"BENZY_PASSWORD"="staging@1"
"BENZY_AGENT_CODE"=
"BENZY_BROWSER_KEY"="caecd3cd30225512c1811070dce615c1"
"BENZY_KEY"="ef20-925c-4489-bfeb-236c8b406f7e"
async function testBenzySignature() {
  try {
    console.log("=================================");
    console.log("Benzy Signature API Test");
    console.log("=================================");

    // --------------------------------------------------
    // 1. Check Environment Variables
    // --------------------------------------------------

    console.log("\n1. Checking Environment Configuration...");

    console.log(
      "Signature URL:",
     BENZY_SIGNATURE_URL || "❌ NOT FOUND"
    );

    console.log(
      "Merchant ID exists:",
      BENZY_MERCHANT_ID
    );

    console.log(
      "API Key exists:",
      BENZY_API_KEY
    );

    console.log(
      "Client ID exists:",
      BENZY_CLIENT_ID
    );

    console.log(
      "Password exists:",
     BENZY_PASSWORD
    );

    console.log(
      "Agent Code exists:",
      BENZY_AGENT_CODE
    );

    console.log(
      "Browser Key exists:",
      BENZY_BROWSER_KEY
    );

    console.log(
      "Benzy Key exists:",
      BENZY_KEY
    );

    // --------------------------------------------------
    // 2. Validate Signature URL
    // --------------------------------------------------

    if (!process.env.BENZY_SIGNATURE_URL) {
      throw new Error(
        "BENZY_SIGNATURE_URL is missing from environment variables"
      );
    }

    // --------------------------------------------------
    // 3. Check Redis
    // --------------------------------------------------

    console.log("\n2. Checking Redis...");

    const existingToken = await redisClient.get(BENZY_TOKEN_KEY);

    if (existingToken) {
      const ttl = await redisClient.ttl(BENZY_TOKEN_KEY);

      console.log("✅ Token already exists in Redis");
      console.log(`⏳ Remaining TTL: ${ttl} seconds`);
      console.log(
        `⏳ Remaining TTL: ${(ttl / 86400).toFixed(2)} days`
      );

      console.log("➡️ Signature API will NOT be called.");

      return;
    }

    console.log("⚠️ Token not found in Redis.");
    console.log("➡️ Calling Benzy Signature API...");

    // --------------------------------------------------
    // 4. Call Benzy Signature API
    // --------------------------------------------------

    const response = await axios.post(
      process.env.BENZY_SIGNATURE_URL,
      {
        MerchantID:BENZY_MERCHANT_ID,
        ApiKey:BENZY_API_KEY,
        ClientID:BENZY_CLIENT_ID,
        Password:BENZY_PASSWORD,
        AgentCode:BENZY_AGENT_CODE,
        BrowserKey:BENZY_BROWSER_KEY,
        Key:BENZY_KEY,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    // --------------------------------------------------
    // 5. Signature API Response
    // --------------------------------------------------

    console.log("\n3. Signature API Response");

    console.log(
      "HTTP Status:",
      response.status
    );

    console.log(
      "Code:",
      response.data?.Code
    );

    console.log(
      "Message:",
      response.data?.Msg
    );

    console.log(
      "TUI received:",
      !!response.data?.TUI
    );

    console.log(
      "Token received:",
      !!response.data?.Token
    );

    // --------------------------------------------------
    // 6. Validate Token
    // --------------------------------------------------

    if (
      response.data?.Code !== "200" ||
      !response.data?.Token
    ) {
      throw new Error(
        "Signature API did not return a valid token"
      );
    }

    // --------------------------------------------------
    // 7. Save Token in Redis
    // --------------------------------------------------

    console.log("\n4. Saving Token in Redis...");

    await redisClient.set(
      BENZY_TOKEN_KEY,
      response.data.Token,
      {
        EX: BENZY_TOKEN_TTL,
      }
    );

    const ttl = await redisClient.ttl(
      BENZY_TOKEN_KEY
    );

    console.log("✅ Token saved in Redis");

    console.log(
      `⏳ TTL: ${ttl} seconds`
    );

    console.log(
      `⏳ TTL: ${(ttl / 86400).toFixed(2)} days`
    );

    // --------------------------------------------------
    // 8. Final Result
    // --------------------------------------------------

    console.log("\n=================================");
    console.log("✅ TEST PASSED");
    console.log("=================================");

  } catch (error) {
    console.log("\n=================================");
    console.log("❌ TEST FAILED");
    console.log("=================================");

    if (error.response) {
      console.log(
        "HTTP Status:",
        error.response.status
      );

      console.log(
        "Response Code:",
        error.response.data?.Code
      );

      console.log(
        "Response Message:",
        error.response.data?.Msg
      );
    } else {
      console.log(
        "Error:",
        error.message
      );
    }

  } finally {
    // Close Redis connection because this is a standalone test script
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  }
}

await testBenzySignature();