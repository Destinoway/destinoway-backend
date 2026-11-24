import { akbarBusPost } from "../../../../supplier/akbar/akbarBus.client.js";

export const getAkbarCancellationPolicy = async ({ tui, busServiceId }) => {
  const data = await akbarBusPost(
    "/api/bus/getcancellationpolicy",
    (session) => ({
      TUI: tui,
      ClientId: session.clientId,
      BusServiceId: busServiceId,
    }),
  );

  if (data?.code !== 0 || !Array.isArray(data?.policies)) {
    const reason = Array.isArray(data?.msg) ? data.msg.join(", ") : data?.msg;
    const error = new Error(`AKBAR bus cancellation policy failed${reason ? `: ${reason}` : ""}`);
    error.statusCode = 502;
    throw error;
  }

  return data;
};
