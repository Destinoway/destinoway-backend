import Markup from "./markup.model.js";

 export const extractNormalizedCity = (input) => {
  if (!input) return null;

  const parts = input.split(",").map((item) => item.trim());

  if (parts.length >= 3) {
    return parts.slice(-3).join(", ");
  }

  return input.trim();
};



export const getMarkup = async ({
  hotelId,
  cityName,
  stateName,
  countryCode,
}) => {

  // 1 hotel
 const normalizeHotelId = (hotelId) => {
  const id = String(hotelId);

  // Agar already 99 se start ho rahi hai to dobara mat lagao
  return id.startsWith("99") ? id : `99${id}`;
};

const normalizedHotelId = normalizeHotelId(hotelId);

console.log("incoming hotel =", hotelId);
console.log("normalized hotel =", normalizedHotelId);

let markup = await Markup.findOne({
  level: "hotel",
  hotelId: normalizedHotelId,
  isActive: true,
});
  // 2 city
  const normalizedCity = extractNormalizedCity(cityName);

  if (!markup) {
    markup = await Markup.findOne({
      level: "city",
    
      isActive: true,
    });
  }

console.log("incoming cityName =", cityName);
  // 3 state
  if (!markup) {
    markup = await Markup.findOne({
      level: "state",
      stateName,
      isActive: true,
    });
  }

  // 4 country
  if (!markup) {
    markup = await Markup.findOne({
      level: "country",
      countryCode,
      isActive: true,
    });
  }
  console.log("incoming countryName =", countryCode);

  // 5 worldwide
  if (!markup) {
    markup = await Markup.findOne({
      level: "worldwide",
      isActive: true,
    });
  }

  const serviceTax = await Markup.findOne({
    level: "serviceTax",
    isActive: true,
  });

  return  markup ;
};
