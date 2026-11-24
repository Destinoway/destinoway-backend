import axios from "axios";
import Country from "../countryData/country.model.js";
import State from "../stateData/state.model.js";
import CityCache from "./city.model.js";
import { cityMemory } from "./city.memory.js";

const pending = new Map();
const exact = (value) => new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
const fail = (message, statusCode) => Object.assign(new Error(message), { statusCode });

const memoryKey = (country, state) => JSON.stringify([country.trim().toLowerCase(), state.trim().toLowerCase()]);
const remember = (cached, requestedCountry) => {
  for (const country of [requestedCountry, cached.countryCode, cached.countryName]) {
    cityMemory.set(memoryKey(country, cached.stateName), cached);
  }
};
const resultFor = (cached, search) => {
  const term = search.trim().toLowerCase();
  return {
    countryCode: cached.countryCode,
    countryName: cached.countryName,
    stateName: cached.stateName,
    cities: term ? cached.cities.filter((city) => city.toLowerCase().includes(term)) : [...cached.cities],
  };
};

const providerDetails = (error) => ({
  code: error.code || null,
  status: error.response?.status || null,
});

const fetchCityList = async (body) => {
  const endpoint = "https://countriesnow.space/api/v0.1/countries/state/cities";
  try {
    return await axios.post(endpoint, body, { timeout: 20000 });
  } catch (postError) {
    const status = postError.response?.status;
    // Alternate read endpoint helps when a proxy rejects POST or the provider
    // temporarily fails. Do not retry invalid input or rate-limited requests.
    if (status && ![301, 302, 303, 307, 308, 403, 405].includes(status) && status < 500) {
      console.error("[city_provider] POST failed", providerDetails(postError));
      throw Object.assign(fail("City provider rejected the request; please retry", 502), {
        details: { provider: "CountriesNow", ...providerDetails(postError) },
      });
    }
    console.warn("[city_provider] POST failed; trying GET", providerDetails(postError));
    try {
      return await axios.get(`${endpoint}/q`, { params: body, timeout: 20000 });
    } catch (getError) {
      const details = { provider: "CountriesNow", post: providerDetails(postError), get: providerDetails(getError) };
      console.error("[city_provider] both requests failed", details);
      throw Object.assign(fail("City provider is unavailable; please retry", 502), { details });
    }
  }
};

export const getCities = async ({ country, countryCode, state, search = "" } = {}) => {
  const countryValue = countryCode ?? country;
  if (typeof countryValue !== "string" || !countryValue.trim() || countryValue.length > 100 ||
      typeof state !== "string" || !state.trim() || state.length > 150 ||
      typeof search !== "string" || search.length > 150) {
    throw fail("Provide country (name or code), state name and an optional search string", 400);
  }

  const value = countryValue.trim();
  const warm = cityMemory.get(memoryKey(value, state));
  if (warm) return resultFor(warm, search);

  // A saved entry already identifies a validated country/state. On a cold
  // process, ISO-code requests need only this compound-index lookup.
  if (/^[a-z]{2}$/i.test(value)) {
    const saved = await CityCache.findOne({ countryCode: value.toUpperCase(), stateKey: state.trim().toLowerCase() }).lean();
    if (saved) {
      remember(saved, value);
      return resultFor(saved, search);
    }
  }
  const countryRecord = await Country.findOne({ $or: [
    { countryCode: exact(value) }, { countryName: exact(value) },
  ] }).lean();
  if (!countryRecord) throw fail("Country not found", 404);

  const stateRecord = await State.findOne({
    countryCode: countryRecord.countryCode,
    stateName: exact(state.trim()),
  }).lean();
  if (!stateRecord) throw fail("State not found for this country", 404);

  const key = { countryCode: countryRecord.countryCode, stateKey: stateRecord.stateName.toLowerCase() };
  let cached = await CityCache.findOne(key).lean();
  if (!cached) {
    const pendingKey = JSON.stringify(key);
    let request = pending.get(pendingKey);
    if (!request) {
      request = (async () => {
        const response = await fetchCityList({
          country: countryRecord.countryName,
          state: stateRecord.stateName,
        });
        const payload = response.data;
        if (payload?.error !== false || !Array.isArray(payload.data) ||
            payload.data.some((city) => typeof city !== "string" || !city.trim())) {
          throw fail("City provider returned an invalid response; please retry", 502);
        }
        const cities = [...new Set(payload.data.map((city) => city.trim()))]
          .sort((a, b) => a.localeCompare(b));
        try {
          return await CityCache.findOneAndUpdate(key, { $setOnInsert: {
            ...key, countryName: countryRecord.countryName,
            stateName: stateRecord.stateName, cities,
          } }, { upsert: true, new: true, runValidators: true }).lean();
        } catch (error) {
          // Another backend process may have inserted the same cache entry.
          if (error.code === 11000) {
            const winner = await CityCache.findOne(key).lean();
            if (winner) return winner;
          }
          throw error;
        }
      })();
      pending.set(pendingKey, request);
    }
    try {
      cached = await request;
    } finally {
      if (pending.get(pendingKey) === request) pending.delete(pendingKey);
    }
  }
  remember(cached, value);
  return resultFor(cached, search);
};
