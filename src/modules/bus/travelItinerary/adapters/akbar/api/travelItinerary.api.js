import { akbarBusPost } from "../../../../supplier/akbar/akbarBus.client.js";

export const createAkbarTravelItinerary = async (body) => {
  const data = await akbarBusPost("/api/bus/GetTravelItinerary", (session) => ({
    ...body,
    ClientId: session.clientId,
  }));

  if (String(data?.code) !== "200" || !data?.transactionID) {
    const reason = Array.isArray(data?.msg) ? data.msg.join(", ") : data?.msg;
    const error = new Error(`AKBAR bus travel itinerary failed${reason ? `: ${reason}` : ""}`);
    error.statusCode = 502;
    throw error;
  }
  return data;
};
