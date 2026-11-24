export const mapAkbarBusAmenities = (response) => ({
  tui: response.tui,
  amenities: response.amenities.filter((item) => typeof item === "string"),
});
