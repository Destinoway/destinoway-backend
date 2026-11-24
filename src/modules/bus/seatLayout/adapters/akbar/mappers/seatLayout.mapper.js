const mapPoint = (point) => ({
  name: point.name,
  time: point.time,
  landMark: point.landMark,
  address: point.address,
  contactNumber: point.contactNumber,
  buid: point.buid,
  duid: point.duid,
});

export const mapAkbarSeatLayout = (response) => ({
  tui: response.tui,
  totalNoofRows: response.totalNoofRows,
  totalNoofColumns: response.totalNoofColumns,
  seats: response.seats.map((seat) => ({
    seatName: seat.seatName,
    seatType: seat.seatType,
    isAvailable: seat.isAvailable,
    seatStatus: seat.seatStatus,
    isLadies: seat.isLadies,
    malesSeat: seat.malesSeat,
    reservedForSocialDistancing: seat.reservedForSocialDistancing,
    columnNo: seat.columnNo,
    rowNo: seat.rowNo,
    height: seat.height,
    width: seat.width,
    xValue: seat.xValue,
    yValue: seat.yValue,
    zValue: seat.zValue,
    customerFare: seat.fare?.customerFare,
  })),
  pickPoints: (response.pickPoints || []).map(mapPoint),
  dropPoints: (response.dropPoints || []).map(mapPoint),
});
