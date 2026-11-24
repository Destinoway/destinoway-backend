import { akbarBusPost } from "../../../../supplier/akbar/akbarBus.client.js";

export const getAkbarBusAmenities = async ({ tui, busServiceId }) => {
  const data = await akbarBusPost(
    "/api/bus/getbusamenities",
    () => ({ TUI: tui, ClientId: null, BusServiceId: busServiceId }),
  );

  if (data?.code !== 0 || (data?.amenities != null && !Array.isArray(data.amenities))) {
    const reason = Array.isArray(data?.msg) ? data.msg.join(", ") : data?.msg;
    console.warn("AKBAR BUS amenities unexpected response", {
      code: data?.code ?? null,
      message: reason || null,
      amenitiesType: Array.isArray(data?.amenities) ? "array" : typeof data?.amenities,
      responseKeys: data && typeof data === "object" ? Object.keys(data) : [],
    });
    const error = new Error(`AKBAR bus amenities failed${reason ? `: ${reason}` : ""}`);
    error.statusCode = 502;
    throw error;
  }

  return data;
};
