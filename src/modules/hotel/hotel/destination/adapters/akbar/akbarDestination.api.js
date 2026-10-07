import axios from "axios";
import { getAKBARToken } from "./../../../../supplier/benzy/akbarAuth.service.js";

export const searchAKBARDestinationAPI = async (searchInput) => {
  const token = await getAKBARToken();

  const { data } = await axios.get(
    `${process.env.AKBAR_HOTEL_API_URL}/api/content/autosuggest`,
    {
      params: {
        term: searchInput,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return data;
};
