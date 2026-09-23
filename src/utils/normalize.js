// src/utils/normalize.js

export const normalizeCity = (city) => {
  if (!city) return "";

  return city
    .toString()
    .trim()        // extra spaces remove
    .toLowerCase() // DELHI -> delhi
};