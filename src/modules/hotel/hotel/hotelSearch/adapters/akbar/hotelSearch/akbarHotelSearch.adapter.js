// import { akbarInitAPI } from "./api/akbarInit.api.js";
// import { akbarHotelContentAPI } from "./api/akbarHotelContent.api.js";
// import { akbarHotelRateAPI } from "./api/akbarHotelRate.api.js";

// import { mapAkbarInitRequest } from "./mappers/akbarInit.request.mapper.js";
// import { mapAkbarHotelContentResponse } from "./mappers/akbarHotelContent.response.mapper.js";
// import { mapAkbarHotelRateResponse } from "./mappers/akbarHotelRate.response.mapper.js";

// export const akbarHotelSearchAdapter = {

//   async search(payload) {

//     // 1. Common → AKBAR request
//     const initPayload = mapAkbarInitRequest(payload);

//     // 2. Init
//     const initResponse = await akbarInitAPI(initPayload);

//     if (!initResponse?.searchId) {
//       throw new Error("AKBAR Init failed: searchId not received");
//     }

//     const searchContext = {
//       searchId: initResponse.searchId,
//       searchTracingKey: initResponse.searchTracingKey,
//     };

//     // 3. Content + Rate PARALLEL
//     const [contentResponse, rateResponse] =
//       await Promise.all([
//         akbarHotelContentAPI(searchContext),
//         akbarHotelRateAPI(searchContext),
//       ]);

//     // 4. Supplier → Common
//     const content =
//       mapAkbarHotelContentResponse(contentResponse);

//     const rates =
//       mapAkbarHotelRateResponse(rateResponse);

//     return {
//       supplier: "AKBAR",

//       searchContext,

//       hotels: mergeHotelContentAndRates(
//         content,
//         rates
//       ),
//     };
//   },
// };

// const mergeHotelContentAndRates = (
//   content,
//   rates
// ) => {
//   const rateMap = new Map(
//     rates.map((hotel) => [
//       String(hotel.supplierHotelId),
//       hotel,
//     ])
//   );

//   return content.map((hotel) => ({
//     ...hotel,

//     rate:
//       rateMap.get(
//         String(hotel.supplierHotelId)
//       )?.rate || null,
//   }));
// };


export const akbarHotelSearchAdapter = {
  async search(payload) {
    console.log("========== AKBAR SEARCH START ==========");
    console.log("AKBAR SEARCH PAYLOAD:", JSON.stringify(payload, null, 2));

    const initPayload = mapAkbarInitRequest(payload);

    console.log("========== AKBAR INIT ==========");
    console.log(
      "AKBAR INIT PAYLOAD:",
      JSON.stringify(initPayload, null, 2)
    );

    const initResponse = await akbarInitAPI(initPayload);

    console.log("AKBAR INIT RESPONSE:", JSON.stringify(initResponse, null, 2));

    if (!initResponse?.searchId) {
      throw new Error("AKBAR Init failed: searchId not received");
    }

    const searchContext = {
      searchId: initResponse.searchId,
      searchTracingKey: initResponse.searchTracingKey,
    };

    console.log("AKBAR SEARCH CONTEXT:", searchContext);

    console.log("========== AKBAR CONTENT + RATE ==========");

    const [contentResponse, rateResponse] = await Promise.all([
      akbarHotelContentAPI(searchContext),
      akbarHotelRateAPI(searchContext),
    ]);

    console.log(
      "AKBAR CONTENT RESPONSE:",
      JSON.stringify(contentResponse, null, 2)
    );

    console.log(
      "AKBAR RATE RESPONSE:",
      JSON.stringify(rateResponse, null, 2)
    );

    const content = mapAkbarHotelContentResponse(contentResponse);
    const rates = mapAkbarHotelRateResponse(rateResponse);

    console.log("MAPPED CONTENT:", JSON.stringify(content, null, 2));
    console.log("MAPPED RATES:", JSON.stringify(rates, null, 2));

    const hotels = mergeHotelContentAndRates(content, rates);

    console.log("FINAL HOTELS:", JSON.stringify(hotels, null, 2));

    console.log("========== AKBAR SEARCH END ==========");

    return {
      supplier: "AKBAR",
      searchContext,
      hotels,
    };
  },
};

const mergeHotelContentAndRates = (content, rates) => {
  console.log("CONTENT COUNT:", content.length);
  console.log("RATE COUNT:", rates.length);

  console.log(
    "CONTENT HOTEL IDS:",
    content.map((hotel) => hotel.supplierHotelId)
  );

  console.log(
    "RATE HOTEL IDS:",
    rates.map((hotel) => hotel.supplierHotelId)
  );

  const rateMap = new Map(
    rates.map((hotel) => [
      String(hotel.supplierHotelId),
      hotel,
    ])
  );

  console.log("RATE MAP:", rateMap);

  return content.map((hotel) => ({
    ...hotel,
    rate:
      rateMap.get(String(hotel.supplierHotelId))?.rate || null,
  }));
};