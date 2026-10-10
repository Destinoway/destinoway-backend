import axios from "axios";
import { getAKBARToken } from "../../../../../../supplier/akbar/akbarAuth.service.js";

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const isFailureResponse = (data) => {
  const status = String(data?.status || "").toLowerCase();
  const searchStatus = String(data?.searchStatus || "").toLowerCase();

  return (
    status === "failure" ||
    status === "failed" ||
    status === "error" ||
    searchStatus === "failure" ||
    searchStatus === "failed" ||
    searchStatus === "error"
  );
};

export const akbarHotelContentAPI = async ({
  searchId,
  searchTracingKey,
  limit,
  offset,
  shouldContinue,
}) => {
  const url =
    `${process.env.AKBAR_HOTEL_API_URL}` +
    `/api/hotels/search/result/${searchId}/content`;

  let attempt = 0;

  while (true) {
    attempt++;

    if (shouldContinue) {
      const active = await shouldContinue();

      if (!active) {
        console.log(
          `🛑 AKBAR CONTENT STOPPED: SEARCH ${searchId}`
        );
        return null;
      }
    }

    const token = await getAKBARToken();
    const apiStart = performance.now();

    console.log("🏨 AKBAR CONTENT START");
    console.log("Search ID:", searchId);
    console.log("Limit:", limit);
    console.log("Offset:", offset);
    console.log("Attempt:", attempt);

    try {
      const response = await axios.get(url, {
        params: {
          limit,
          offset,
          filterdata: false,
        },
        headers: {
          Authorization: `Bearer ${token}`,
          "search-tracing-key": searchTracingKey,
        },
        timeout: 60000,
      });

      const data = response.data;
      const hotels = data?.hotels || [];

      const total =
        data?.total ??
        data?.Count ??
        data?.count ??
        0;

      const elapsed = performance.now() - apiStart;

      console.log(
        `⏱️ AKBAR CONTENT API TIME (${offset}): ${elapsed.toFixed(2)} ms`
      );
      console.log("✅ AKBAR CONTENT STATUS:", response.status);
      console.log("📊 CONTENT SEARCH STATUS:", data?.searchStatus);
      console.log("📦 CONTENT HOTELS RECEIVED:", hotels.length);
      console.log("📊 CONTENT TOTAL:", total);
      console.log(
        "🔍 AKBAR RAW CONTENT RESPONSE:",
        JSON.stringify(data, null, 2)
      );

      if (isFailureResponse(data)) {
        throw new Error(
          `AKBAR content search failed: ${
            data?.searchStatus || data?.status || "Unknown error"
          }`
        );
      }

      // First content call can return 200 + empty data while supplier
      // is still preparing content. Keep polling until content arrives.
      // For later pages, an empty page means pagination is finished.
      if (hotels.length > 0 || total > 0 || offset !== -1) {
        return data;
      }

      console.log(
        "⏳ AKBAR CONTENT EMPTY ON FIRST PAGE. RETRYING..."
      );

      await sleep(1000);
    } catch (error) {
      console.error("❌ AKBAR CONTENT ERROR");
      console.error("Message:", error.message);
      console.error("Status:", error.response?.status);
      console.error(
        "Response:",
        JSON.stringify(error.response?.data, null, 2)
      );
      console.error("URL:", error.config?.url);
      console.error("Params:", error.config?.params);

      throw error;
    }
  }
};
