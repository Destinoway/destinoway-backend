export const mapFlyshopTempBookingRequest = ({
  customerAddress,
  customerMobile,
  customerPostalCode,
  hotelKey,
  paxDetails,
  passengerEmail,
  passengerMobile,
  ratePlanId,
  remarks,
  searchKey,
  specialRequestRemarks,
  panNumber,
}) => {
  return {
    CustomerAddress: customerAddress ?? "",

    CustomerMobile: customerMobile ?? "",

    CustomerPostalCode:
      customerPostalCode ?? "",

    HotelKey: hotelKey,

    PAXDetails: (paxDetails ?? []).map(
      (pax) => ({
        EmployeeID:
          pax.employeeID ??
          pax.EmployeeID ??
          "",

        FirstName:
          pax.firstName ??
          pax.FirstName ??
          "",

        LastName:
          pax.lastName ??
          pax.LastName ??
          "",

        Passengertyp:
          pax.passengerTyp ??
          pax.Passengertyp ??
          "",

        RoomNo:
          pax.roomNo ??
          pax.RoomNo ??
          "",

        Title:
          pax.title ??
          pax.Title ??
          "",
      })
    ),

    PassengerEmail:
      passengerEmail ?? "",

    PassengerMobile:
      passengerMobile ?? "",

    RateplanId: ratePlanId,

    Remarks:
      remarks ?? "Book",

    SearchKey: searchKey,

    SpecialRequestRemarks:
      specialRequestRemarks ?? "Book",

    PANnumber:
      panNumber ?? "",
  };
};