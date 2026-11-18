// AKBAR station -> our format
//
// AKBAR "type" values seen: "From", "To", "popular"
export const mapAkbarStation = (station) => ({
  name: station?.name || null,
  type: String(station?.type || "").toLowerCase() || null, // from | to | popular
  alternateCity: station?.alternatecity || null,
});

export const mapAkbarStationsResponse = (response) => {
  const stations = Array.isArray(response?.station) ? response.station : [];

  return stations.map(mapAkbarStation).filter((station) => station.name);
};
