export const mapAkbarBusSearch = (response) => {
  const buses = (Array.isArray(response.trips) ? response.trips : [])
    .flatMap((trip) => Array.isArray(trip?.journey) ? trip.journey : [])
    .map((bus) => ({
      busServiceId: bus.busServiceId,
      provider: bus.provider,
      operatorName: bus.operatorName,
      operatorId: bus.operatorId,
      busType: bus.busType,
      from: bus.from,
      to: bus.to,
      departureTime: bus.departureTime,
      arrivalTime: bus.arrivalTime,
      durationMinutes: Number(bus.duration),
      availableSeats: bus.availableSeats,
      customerFare: bus.fare?.customerFare,
      refundable: bus.refundable,
      partialCancellation: bus.partialCancellation,
      zeroCancellation: bus.zeroCancellation,
      pickups: bus.pickups || [],
      dropoffs: bus.dropoffs || [],
    }));

  return {
    tui: response.tui,
    completed: response.completed === true || String(response.completed).toLowerCase() === "true",
    buses,
    notices: response.notices || [],
  };
};
