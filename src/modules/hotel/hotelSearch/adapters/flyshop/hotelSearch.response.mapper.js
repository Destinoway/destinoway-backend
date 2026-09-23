

export const mapHotelSearchResponse = (response) => {


  const hotels =
    response?.HotelDetails ||
    response?.hotels ||
    [];
     const hotelDetailId =
    response?.hotelDetailId || null;

  return {
      hotelDetailId:
      response?.hotelDetailId || null,
    hotels: hotels.map((hotel) => ({
      id:
        hotel?.HotelId ||
        hotel?.hotelId ||
        null,
          hotelName:
        hotel?.name ||
        hotel?.name ||
        null,


      description:
        hotel?.HotelDesc ||
        hotel?.description ||
        null,

      location: {
        address:
          hotel?.Address ||
          hotel?.location?.address ||
          null,

        city:
          hotel?.City ||
          hotel?.location?.city ||
          null,

        state:
          hotel?.state ||
          hotel?.location?.state ||
          null,

        country:
          hotel?.Country ||
          hotel?.location?.country ||
          null,

        pincode:
          hotel?.Pincode ||
          hotel?.location?.pincode ||
          null,

        latitude:
          hotel?.Latitude !== undefined &&
          hotel?.Latitude !== null
            ? Number(hotel.Latitude)
            : hotel?.location?.latitude ?? null,

        longitude:
          hotel?.Longitude !== undefined &&
          hotel?.Longitude !== null
            ? Number(hotel.Longitude)
            : hotel?.location?.longitude ?? null,
      },

      contact: {
        phone:
          hotel?.HotelPhone ||
          hotel?.contact?.phone ||
          null,

        email:
          hotel?.HotelEmail ||
          hotel?.contact?.email ||
          null,
      },

      rating: {
        id:
          hotel?.StarCategoryId !== undefined &&
          hotel?.StarCategoryId !== null
            ? Number(hotel.StarCategoryId)
            : hotel?.starCategory ??
              hotel?.rating?.id ??
              null,
      },

      image:
        hotel?.HotelImage ||
        hotel?.image ||
        null,

      facilities: (
        hotel?.HotelFacilities ||
        hotel?.facilities ||
        []
      ).map((facility) => ({
        id:
          facility?.FacilityId ||
          facility?.id ||
          null,

        name:
          facility?.FacilityName?.trim?.() ||
          facility?.name ||
          null,
      })),

      pricing: {
        currency:
          hotel?.Currencycode ||
          hotel?.pricing?.currency ||
          null,

        basicAmount:
          hotel?.LowestBasicAmount !== undefined
            ? Number(hotel.LowestBasicAmount)
            : Number(
                hotel?.pricing?.basicAmount || 0
              ),

        tax:
          hotel?.LowestRateTax !== undefined
            ? Number(hotel.LowestRateTax)
            : Number(
                hotel?.pricing?.tax || 0
              ),

        totalAmount:
          hotel?.TotalAmount !== undefined
            ? Number(hotel.TotalAmount)
            : Number(
                hotel?.pricing?.totalAmount || 0
              ),

        gst:
          hotel?.GST !== undefined
            ? Number(hotel.GST)
            : Number(
                hotel?.pricing?.gst || 0
              ),
      },

      policy: {
        applicableCode:
          hotel?.ApplicablePolicyCode ||
          hotel?.policy?.applicableCode ||
          null,

        state:
          hotel?.PolicyState ||
          hotel?.policy?.state ||
          null,

        outPolicyReason:
          hotel?.OutPolicyReason ||
          hotel?.policy?.outPolicyReason ||
          null,
      },
    })),
  };
};

