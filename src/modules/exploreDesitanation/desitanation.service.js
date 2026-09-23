import { DESTINATIONS } from "./desitanation.data.js";

export const getHomeDestinations = async (type) => {
  if (!type || !DESTINATIONS[type]) {
    throw new Error("Invalid destination type");
  }

  return DESTINATIONS[type];
};
//updateDestinationService
import Destination from "./destination.model.js";

export const createDestinationService = async (payload) => {
  return await Destination.create(payload);
};

export const getDestinationService = async (type) => {
  const filter = {
    isActive: true,
  };

  if (type) filter.type = type;

  return await Destination.find(filter).sort({ placeName: 1 });
};

export const updateDestinationService = async (id, payload) => {
  return await Destination.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

export const deleteDestinationService = async (id) => {
  return await Destination.findByIdAndDelete(id);
};