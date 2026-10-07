import { akbarInitAPI } from "./api/akbarInit.api.js";
import { akbarHotelContentAPI } from "./api/akbarHotelContent.api.js";
import { akbarHotelRateAPI } from "./api/akbarHotelRate.api.js";

import { mapAkbarInitRequest } from "./mappers/akbarInit.request.mapper.js";
import { mapAkbarHotelContentResponse } from "./mappers/akbarHotelContent.response.mapper.js";
import { mapAkbarHotelRateResponse } from "./mappers/akbarHotelRate.response.mapper.js";

export const akbarHotelSearchAdapter = {

  async search(payload) {

    // 1. Common → AKBAR request
    const initPayload = mapAkbarInitRequest(payload);

    // 2. Init
    const initResponse = await akbarInitAPI(initPayload);

    if (!initResponse?.searchId) {
      throw new Error("AKBAR Init failed: searchId not received");
    }

    const searchContext = {
      searchId: initResponse.searchId,
      searchTracingKey: initResponse.searchTracingKey,
    };

    // 3. Content + Rate PARALLEL
    const [contentResponse, rateResponse] =
      await Promise.all([
        akbarHotelContentAPI(searchContext),
        akbarHotelRateAPI(searchContext),
      ]);

    // 4. Supplier → Common
    const content =
      mapAkbarHotelContentResponse(contentResponse);

    const rates =
      mapAkbarHotelRateResponse(rateResponse);

    return {
      supplier: "AKBAR",

      searchContext,

      hotels: mergeHotelContentAndRates(
        content,
        rates
      ),
    };
  },
};

const mergeHotelContentAndRates = (
  content,
  rates
) => {
  const rateMap = new Map(
    rates.map((hotel) => [
      String(hotel.supplierHotelId),
      hotel,
    ])
  );

  return content.map((hotel) => ({
    ...hotel,

    rate:
      rateMap.get(
        String(hotel.supplierHotelId)
      )?.rate || null,
  }));
};