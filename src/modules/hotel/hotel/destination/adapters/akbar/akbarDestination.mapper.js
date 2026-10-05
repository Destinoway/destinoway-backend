export const mapAkbarDestination = (item) => {
  return {
    id: item.id,
    name: item.name || null,
    type: item.type || null,

    city: item.city || null,
    state: item.state || null,
    country: item.country || null,
    countryCode: item.countryCode || null,

    latitude: item.coordinates?.lat || null,
    longitude: item.coordinates?.long || null,

    displayName: item.fullName || item.name || null,

    supplierData: {
      supplier: "AKBAR",
      supplierLocationId: item.id,
    },
  };
};

export const mapAkbarDestinationResponse = (response) => {
  if (!Array.isArray(response)) {
    return [];
  }

  return response.map(mapAkbarDestination);
};