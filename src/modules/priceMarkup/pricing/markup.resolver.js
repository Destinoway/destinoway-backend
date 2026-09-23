export const resolveRule = ({
  hotelId,
  cityName,
  stateName,
  countryCode,
  rules,
  normalizeCity = false,
}) => {
  // HOTEL
  let found = rules.find(
    (r) =>
      r.level === "hotel" &&
      String(r.hotelId) === String(hotelId)
  );

  if (found) return found;

  // CITY
  let finalCity = cityName;

  if (normalizeCity && cityName) {
    finalCity = cityName
      .split(",")
      .slice(-3)
      .join(", ")
      .trim();
  }

  found = rules.find(
    (r) =>
      r.level === "city" &&
      r.cityName?.trim().toLowerCase() ===
        finalCity?.trim().toLowerCase()
  );

  if (found) return found;

  // STATE
  found = rules.find(
    (r) =>
      r.level === "state" &&
      r.stateName?.trim().toLowerCase() ===
        stateName?.trim().toLowerCase() &&
      r.countryCode?.trim().toUpperCase() ===
        countryCode?.trim().toUpperCase()
  );

  if (found) return found;

  // COUNTRY
  found = rules.find(
    (r) =>
      r.level === "country" &&
      r.countryCode?.trim().toUpperCase() ===
        countryCode?.trim().toUpperCase()
  );

  if (found) return found;

  // WORLDWIDE
  found = rules.find(
    (r) => r.level === "worldwide"
  );

  return found || null;
};