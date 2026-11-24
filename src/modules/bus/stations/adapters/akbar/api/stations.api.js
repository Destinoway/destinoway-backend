import { akbarBusPost } from "../../../../supplier/akbar/akbarBus.client.js";

// AKBAR: POST /api/bus/getbusstations
// Request : { RegionId, Term, ClientId }
// Response: { station: [{ name, type, alternatecity }], tui, code, msg }
export const getBusStationsAPI = async ({ term = "" } = {}) => {
  const data = await akbarBusPost(
    "/api/bus/getbusstations",
    (session) => ({
      RegionId: process.env.AKBAR_BUS_REGION_ID || "1",
      Term: term,
      ClientId: session.clientId,
    }),
    { timeout: 15000 },
  );

  // code 0 = success for this API
  if (data?.code !== 0 && data?.code !== undefined) {
    const reason = Array.isArray(data?.msg) ? data.msg.join(", ") : data?.msg;

    const error = new Error(
      `AKBAR bus stations failed${reason ? `: ${reason}` : ""}`,
    );
    error.statusCode = 502;
    throw error;
  }

  return data;
};
