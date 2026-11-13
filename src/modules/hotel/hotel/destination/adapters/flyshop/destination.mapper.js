export const mapDestination = (item) => {
  const parts = item.Label.split(",");

  let name = null;
  let city = null;
  let state = null;
  let country = null;

  switch (item.Key) {
    case "City":
      [city, state, country] = parts;
      name = city;
      break;

    case "Hotel":
      [name, city, state, country] = parts;
      break;

    case "Location":
      [name, city, state, country] = parts;
      break;

    default:
      name = parts[0] || null;
      city = parts[1] || null;
      state = parts[2] || null;
      country = parts[3] || null;
  }

  return {
    id: item.Label,
    name,
    type: item.Key.toLowerCase(),
    city,
    state,
    country,
    countryCode: item.CountryCode || null,
    displayName: item.Label,
  };
};

export const mapDestinationResponse = (response) => {
  return (response?.DestinationList || []).map(mapDestination);
};