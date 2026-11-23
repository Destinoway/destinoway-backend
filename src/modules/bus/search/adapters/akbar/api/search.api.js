import { akbarBusPost } from "../../../../supplier/akbar/akbarBus.client.js";

const assertSuccess = (data, operation) => {
  if (data?.code !== 0 || !data?.tui) {
    const reason = Array.isArray(data?.msg) ? data.msg.join(", ") : data?.msg;
    const error = new Error(`AKBAR bus ${operation} failed${reason ? `: ${reason}` : ""}`);
    error.statusCode = 502;
    throw error;
  }
  return data;
};

export const startAkbarBusSearch = async ({ from, to, onward }) =>
  assertSuccess(
    await akbarBusPost("/api/bus/expresssearch", (session) => ({
      Source: null,
      Mode: "AS",
      PaymentType: "",
      TUI: "",
      ClientId: session.clientId,
      Trips: [{ From: from, To: to, Return: null, Onward: onward }],
    })),
    "expresssearch",
  );

export const getAkbarBusSearch = async (tui) =>
  assertSuccess(
    await akbarBusPost("/api/bus/getexpresssearch", (session) => ({
      TUI: tui,
      ClientID: session.clientId,
    })),
    "getexpresssearch",
  );
