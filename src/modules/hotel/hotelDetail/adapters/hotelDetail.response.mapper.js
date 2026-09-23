// ============================================================
// HOTEL DETAIL RESPONSE MAPPER
// ============================================================

const toNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === "") {
    return defaultValue;
  }

  const number = Number(value);

  return Number.isNaN(number) ? defaultValue : number;
};

// ============================================================
// BOOLEAN HELPER
// ============================================================

const toBoolean = (value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return Boolean(value);
};

// ============================================================
// NULL HELPER
// ============================================================

const toNull = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return value;
};

// ============================================================
// AMENITIES
// ============================================================

const mapAmenities = (amenities) => {
  if (!amenities) {
    return [];
  }

  if (Array.isArray(amenities)) {
    return amenities.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(amenities)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

// ============================================================
// GALLERY
// ============================================================

const mapGallery = (gallery) => {
  if (!Array.isArray(gallery)) {
    return [];
  }

  const uniqueImages = new Map();

  for (const image of gallery) {
    const url = image?.ImageURL?.trim();

    if (!url) {
      continue;
    }

    if (!uniqueImages.has(url)) {
      uniqueImages.set(url, {
        description: toNull(image?.ImageDesc),
        url,
      });
    }
  }

  return Array.from(uniqueImages.values());
};

// ============================================================
// ROOM MAPPER
// ============================================================

const mapRoom = (room) => {
  return {
    roomType: toNull(room?.HotelRoomTypeDesc),

    ratePlanId: toNull(room?.RateplanId),

    roomTypeId: toNull(room?.RoomTypeID),

    inclusion: toNull(room?.Inclusion),

    additionalInfo: toNull(room?.AdditionalInfo),

    pricing: {
      // SAME PRICE KEYS AS SEARCH API
      currency: toNull(room?.LocalCurrency),

      basicAmount: toNumber(room?.Basic_Amount),

      tax: toNumber(room?.Tax),

      totalAmount: toNumber(room?.Total_Amount),

      serviceFee: toNumber(room?.Service_Fee_Amount),

      markup: toNumber(room?.Trade_Markup_Amount),

      gst: toNumber(room?.GST),
    },

    cancellationPolicy: toNull(room?.CancellationPolicy),

    cancellationCharges: toNull(room?.cancellationCharges),

        cancellationCharges:
      toNull(room?.cancellationCharges),

    payment: {
      creditCardRequired: toBoolean(room?.CCRequired),

      panMandatory: toBoolean(room?.PANMandatory),
    },
  };
};

// ============================================================
// HOTEL DETAILS MAPPER
// ============================================================

export const mapHotelDetailResponse = ({ hotel, details }) => {
  return {
    hotelDetailId: toNull(hotel?.hotelDetailId),
    hotel: {
      // ======================================================
      // HOTEL BASIC INFORMATION
      // ======================================================

      hotelId:
        toNull(hotel?.hotelId),
        

      hotelKey: toNull(hotel?.hotelKey),

      name: toNull(hotel?.name),

      description: toNull(hotel?.description),

      // ======================================================
      // LOCATION
      // ======================================================

      location: {
        address: toNull(hotel?.location?.address),

        city: toNull(hotel?.location?.city || details?.City),

        state: toNull(hotel?.location?.state),

        country: toNull(hotel?.location?.country || details?.Country),

        pincode: toNull(hotel?.location?.pincode),

        latitude:
          hotel?.location?.latitude !== undefined
            ? toNumber(hotel.location.latitude, null)
            : null,

        longitude:
          hotel?.location?.longitude !== undefined
            ? toNumber(hotel.location.longitude, null)
            : null,
      },

      // ======================================================
      // CONTACT
      // ======================================================

      contact: {
        phone: toNull(hotel?.contact?.phone),

        email: toNull(hotel?.contact?.email),
      },

      // ======================================================
      // IMAGE
      // ======================================================

      image: toNull(hotel?.image),

      // ======================================================
      // STAR
      // ======================================================

      starCategory:
        hotel?.starCategory !== undefined
          ? toNumber(hotel.starCategory, null)
          : null,

      // ======================================================
      // FACILITIES
      // ======================================================

      facilities: Array.isArray(hotel?.facilities) ? hotel.facilities : [],

      // ======================================================
      // PRICING
      // SAME STRUCTURE AS SEARCH API
      // ======================================================

      pricing: {
        currency: toNull(hotel?.pricing?.currency),

        basicAmount: toNumber(hotel?.pricing?.basicAmount),

        tax: toNumber(hotel?.pricing?.tax),

        totalAmount: toNumber(hotel?.pricing?.totalAmount),

        serviceFee: toNumber(hotel?.pricing?.serviceFee),

        markup: toNumber(hotel?.pricing?.markup),

        gst: toNumber(hotel?.pricing?.gst),
      },

      // ======================================================
      // CHECK IN
      // ======================================================

      checkIn: {
        date: toNull(hotel?.checkIn?.date),

        time: toNull(hotel?.checkIn?.time),
      },

      // ======================================================
      // CHECK OUT
      // ======================================================

      checkOut: {
        date: toNull(hotel?.checkOut?.date),

        time: toNull(hotel?.checkOut?.time),
      },

      // ======================================================
      // POLICY
      // ======================================================

      policy: {
        applicableCode: toNull(hotel?.policy?.applicableCode),

        state: toNull(hotel?.policy?.state),

        outPolicyReason: toNull(hotel?.policy?.outPolicyReason),
      },

      // ======================================================
      // SUPPLIER
      // ======================================================

      supplier: toNull(hotel?.supplier),
    },

    // ========================================================
    // HOTEL DETAILS
    // ========================================================

    details: {
      aboutHotel: toNull(details?.AboutHotel),

      amenities: mapAmenities(details?.Amenities),

      gallery: mapGallery(details?.HotelGallery),

      importantInformation: toNull(details?.ImportantInformation),

      rooms: Array.isArray(details?.HotelRatePlanDetails)
        ? details.HotelRatePlanDetails.map(mapRoom)
        : [],
    },
  };
};
