import { formatAkbarHotelDate } from "../../../../../utils/hotelDate.js";

export const mapAkbarInitRequest = (payload) => {
  return {
    geoCode: {
      lat: String(payload.geoCode?.lat || ""),
      long: String(payload.geoCode?.long || ""),
    },

    locationId: payload.locationId || "",

    currency: payload.currency || "INR",

    culture: "en-US",

    checkIn: formatAkbarHotelDate(payload.checkIn),

    checkOut: formatAkbarHotelDate(payload.checkOut),

    rooms: (payload.rooms || []).map((room) => ({
      adults: String(room.adults || 0),
      children: String(room.children || 0),
      childAges: room.childAges || [],
    })),

    agentCode: process.env.AKBAR_AGENT_CODE,

    destinationCountryCode:
      payload.destinationCountryCode || "IN",

    nationality:
      payload.nationality || "IN",

    countryOfResidence:
      payload.countryOfResidence || "IN",

    channelId:
      process.env.AKBAR_CHANNEL_ID || "b2bIndiaDeals",

    affiliateRegion:
      process.env.AKBAR_AFFILIATE_REGION || "B2B_India",

    segmentId: "",

    companyId:
      process.env.AKBAR_COMPANY_ID || "1",

    gstPercentage:
      Number(process.env.AKBAR_GST_PERCENTAGE || 0),

    tdsPercentage:
      Number(process.env.AKBAR_TDS_PERCENTAGE || 0),
  };
};