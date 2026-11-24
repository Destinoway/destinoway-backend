import { akbarBusPost } from "../../../../supplier/akbar/akbarBus.client.js";

export const getAkbarSeatLayout = async ({ tui, busServiceId, journeyDate, providerCode }) => {
  const data = await akbarBusPost("/api/bus/getseatlayout", (session) => ({
    TUI: tui,
    ClientId: session.clientId,
    BusServiceId: busServiceId,
    JourneyDate: journeyDate,
    ProviderCode: providerCode,
  }));

  if (data?.code !== 0 || !Array.isArray(data?.seats)) {
    const reason = Array.isArray(data?.msg) ? data.msg.join(", ") : data?.msg;
    const error = new Error(`AKBAR bus seat layout failed${reason ? `: ${reason}` : ""}`);
    error.statusCode = 502;
    throw error;
  }

  return data;
};
