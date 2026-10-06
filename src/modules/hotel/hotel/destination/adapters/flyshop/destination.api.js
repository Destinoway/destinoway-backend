import { supplierAPI } from "../../../../../config/supplierApi.js";
import { getAuthHeader } from "../../../../../config/supplierApi.js";

// export const searchDestinationAPI = async (searchInput) => {
//   const payload = {
//      ...getAuthHeader(),
//     SearchInput: searchInput,
//   };

//   const { data } = await supplierAPI.post(
//     "/HotelSearchbyName",
//     payload
//   );

//   return data;
// };

export const searchAKBARDestinationAPI = async (searchInput) => {
  console.log("🔍 AKBAR AUTOSUGGEST START");
  console.log("Search Input:", searchInput);

  const token = await getAKBARToken();

  console.log("✅ AKBAR token received");
  console.log("Calling AKBAR AutoSuggest API...");

  try {
    const response = await axios.get(
      `${process.env.AKBAR_HOTEL_API_URL}/api/content/autosuggest`,
      {
        params: {
          term: searchInput,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 15000,
      }
    );

    console.log("✅ AKBAR STATUS:", response.status);
    console.log("✅ AKBAR RESPONSE RECEIVED");

    return response.data;
  } catch (error) {
    console.error("❌ AKBAR AUTOSUGGEST ERROR");
    console.error("Message:", error.message);
    console.error("Status:", error.response?.status);
    console.error("Response:", error.response?.data);
    console.error("URL:", error.config?.url);
    console.error("Params:", error.config?.params);

    throw error;
  }
};