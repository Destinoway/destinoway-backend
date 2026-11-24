import { akbarBusPost } from "../../../../supplier/akbar/akbarBus.client.js";

export const getAkbarCancellationPolicy = async ({ tui, busServiceId }) => {
  const data = await akbarBusPost(
    "/api/bus/getcancellationpolicy",
    () => ({
      TUI: tui,
      ClientId: null,
      BusServiceId: busServiceId,
    }),
  );

  if (data?.code !== 0 || !Array.isArray(data?.policies)) {
    const reason = Array.isArray(data?.msg) ? data.msg.join(", ") : data?.msg;
    console.warn("AKBAR BUS cancellation policy unexpected response", {
      code: data?.code ?? null,
      message: reason || null,
      policiesType: Array.isArray(data?.policies) ? "array" : typeof data?.policies,
      responseKeys: data && typeof data === "object" ? Object.keys(data) : [],
    });
    const error = new Error(`AKBAR bus cancellation policy failed${reason ? `: ${reason}` : ""}`);
    error.statusCode = 502;
    throw error;
  }

  return data;
};
