
const formatSupplierDate = (date) => {
  if (!date) return null;

  const [month, day, year] = date.split("-");

  return `${month}/${day}/${year}`;
};

export const mapHotelSearchRequest = (payload) => {
  const {
    checkIn,
    checkOut,
    destination,
    rooms = [],
  } = payload;

  return {
    CheckInDate: formatSupplierDate(checkIn),
    CheckOutDate: formatSupplierDate(checkOut),

    HotelRoomDetail: rooms.map((room) => ({
      AdultCount: String(room.adults || 1),

      Child1Age: String(
        room.children?.[0]?.age || 0
      ),

      Child2Age: String(
        room.children?.[1]?.age || 0
      ),

      ChildCount: String(
        room.children?.length || 0
      ),
    })),

    Key:
      destination.type === "hotel"
        ? "Hotel"
        : "City",

    Origin: [
      destination.city,
      destination.state,
      destination.country,
    ]
      .filter(Boolean)
      .join(","),

    RoomCount: String(
      rooms.length || 1
    ),

    TravelType: 0,
  };
};

