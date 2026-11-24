export const mapAkbarTravelItinerary = (response) => ({
  tui: response.tui,
  transactionId: String(response.transactionID),
  newGrossFare: response.newGrossFare,
  newNetFare: response.newNetFare,
  oldNetFare: response.oldNetFare,
  fareChanged: Number(response.newGrossFare) > 0 || Number(response.newNetFare) > 0,
});
