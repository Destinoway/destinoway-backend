const pick = (source, fields) => {
  if (!source || typeof source !== "object") {
    return source;
  }

  return Object.fromEntries(
    fields
      .filter((field) => source[field] !== undefined)
      .map((field) => [field, source[field]])
  );
};

const mapItems = (items, fields) =>
  Array.isArray(items)
    ? items.map((item) => pick(item, fields))
    : items;

const mapHotel = (hotel) => {
  if (!hotel || typeof hotel !== "object") {
    return hotel;
  }

  return {
    ...pick(hotel, [
      "id",
      "name",
      "type",
      "category",
      "starRating",
      "chainName",
      "geoCode",
      "neighbourhoods",
      "checkinInfo",
      "checkoutInfo",
      "heroImage",
      "distance",
      "locationName",
    ]),
    descriptions: mapItems(hotel.descriptions, ["type", "text"]),
    facilityGroups: mapItems(hotel.facilityGroups, ["name"]),
    facilities: mapItems(hotel.facilities, ["name"]),
    nearByAttractions: mapItems(hotel.nearByAttractions, [
      "name",
      "distance",
      "unit",
      "description",
    ]),
    policies: mapItems(hotel.policies, ["type", "text"]),
    fees: mapItems(hotel.fees, ["type", "text"]),
    contact: {
      address: pick(hotel.contact?.address, [
        "line1",
        "line2",
        "city",
        "state",
        "country",
        "postalCode",
      ]),
      ...pick(hotel.contact, ["phones", "website"]),
    },
    images: mapItems(hotel.images, [
      "caption",
      "category",
      "roomCodes",
      "url",
    ]),
    reviews: mapItems(hotel.reviews, ["count", "rating"]),
  };
};

export const mapHotelContent = (data) => ({
  hotel: mapHotel(
    data?.hotel ?? data?.data?.hotel ?? data?.data ?? data
  ),
});
