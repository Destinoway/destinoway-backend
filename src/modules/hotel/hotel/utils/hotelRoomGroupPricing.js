export const ROOM_GROUP_RATE_BASIS = "group_total";

// AKBAR totalRate covers all roomCount occupancies in this room group.
// Count each group once; roomCount is occupancy metadata, not a multiplier.
export const getVerifiedSupplierTotal = (roomGroups) => {
  if (!Array.isArray(roomGroups) || roomGroups.length === 0) {
    throw Object.assign(new Error("Price verification returned no available rooms"), { statusCode: 409 });
  }
  const total = roomGroups.reduce((sum, group) => {
    const amount = Number(group?.totalRate);
    const roomCount = Number(group?.roomCount ?? 1);
    if (!["number", "string"].includes(typeof group?.totalRate) ||
        !Number.isFinite(amount) || amount <= 0 ||
        !Number.isInteger(roomCount) || roomCount <= 0) {
      throw Object.assign(new Error("Verified room price is invalid"), { statusCode: 409 });
    }
    return sum + amount;
  }, 0);
  if (!Number.isFinite(total)) {
    throw Object.assign(new Error("Verified room price is invalid"), { statusCode: 409 });
  }
  return Number(total.toFixed(2));
};

export const assertCurrentDraftPricing = (booking) => {
  if (booking.price?.rateBasis !== ROOM_GROUP_RATE_BASIS) {
    throw Object.assign(new Error("Please verify the hotel price again before continuing"), { statusCode: 409 });
  }
};
