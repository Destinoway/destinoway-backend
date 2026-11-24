import { akbarBusPost } from "../../../supplier/akbar/akbarBus.client.js";
import { getAkbarBusSession } from "../../../supplier/akbar/akbarBus.auth.js";

export const getAkbarBookedBusItinerary = async (booking) => {
  const fyearId = Number(process.env.AKBAR_BUS_FYEAR_ID);
  if (!Number.isSafeInteger(fyearId) || fyearId <= 0) {
    const error = new Error("AKBAR_BUS_FYEAR_ID is not configured");
    error.statusCode = 503;
    throw error;
  }

  const session = await getAkbarBusSession();
  if (!session.signatureTui) await getAkbarBusSession({ forceRefresh: true });

  const data = await akbarBusPost("/api/bus/getbusitinerary", (currentSession) => ({
    TransactionID: booking.supplierTransactionId,
    FyearID: fyearId,
    ClientID: currentSession.clientId,
    TUI: currentSession.signatureTui,
  }));
  if (data?.code !== 0) {
    const reason = Array.isArray(data?.msg) ? data.msg.join(", ") : data?.msg;
    const error = new Error(`AKBAR bus itinerary lookup failed${reason ? `: ${reason}` : ""}`);
    error.statusCode = 502;
    throw error;
  }
  return data;
};
