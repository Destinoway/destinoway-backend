// export const mapAkbarDestination = (item) => {
//   return {
//     id: item.id,
//     name: item.name || null,
//     type: item.type || null,

//     city: item.city || null,
//     state: item.state || null,
//     country: item.country || null,
//     countryCode: item.countryCode || null,

//     latitude: item.coordinates?.lat || null,
//     longitude: item.coordinates?.long || null,

//     displayName: item.fullName || item.name || null,

//     supplierData: {
//       supplier: "AKBAR",
//       supplierLocationId: item.id,
//     },
//   };
// };

// export const mapAkbarDestinationResponse = (response) => {
//   if (!Array.isArray(response)) {
//     return [];
//   }

//   return response.map(mapAkbarDestination);
// };


export const mapAkbarDestination = (item) => {
  return {
    id: item.id || null,

    displayName: item.name || null,

    type: item.type || null,

    city: item.city || null,
    state: item.state || null,
    country: item.country || null,
    countryCode: item.country || null,

    latitude: item.coordinates?.lat ?? null,
    longitude: item.coordinates?.long ?? null,

    // AKBAR additional fields
    code: item.code || null,
    score: item.score ?? null,
    referenceId: item.referenceId || null,
    coordinates: item.coordinates || null,

    supplierData: {
      supplier: "AKBAR",
      supplierLocationId: item.id,
    },
  };
};

export const mapAkbarDestinationResponse = (response) => {
  const locations = response?.locations || [];

  return locations.map(mapAkbarDestination);
};