import { akbarBusPost } from "../../../../supplier/akbar/akbarBus.client.js";

export const getAkbarBusAmenities = async ({ tui, busServiceId }) => {
  const data = await akbarBusPost(
    "/api/bus/getbusamenities",
    () => ({ TUI: tui, ClientId: null, BusServiceId: busServiceId }),
  );

  if (data?.code !== 0 || !Array.isArray(data?.amenities)) {
    const reason = Array.isArray(data?.msg) ? data.msg.join(", ") : data?.msg;
    const error = new Error(`AKBAR bus amenities failed${reason ? `: ${reason}` : ""}`);
    error.statusCode = 502;
    throw error;
  }

  return data;
};
