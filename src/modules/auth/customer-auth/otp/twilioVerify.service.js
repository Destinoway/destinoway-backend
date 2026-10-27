import twilio from "twilio";

let twilioClient;

const getTwilioConfig = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !verifyServiceSid) {
    const error = new Error(
      "Twilio Verify is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_VERIFY_SERVICE_SID.",
    );
    error.statusCode = 503;
    throw error;
  }

  if (!/^VA[a-f\d]{32}$/i.test(verifyServiceSid)) {
    const error = new Error(
      "TWILIO_VERIFY_SERVICE_SID must be the Verify Service SID starting with VA.",
    );
    error.statusCode = 503;
    throw error;
  }

  return { accountSid, authToken, verifyServiceSid };
};

const getTwilioClient = ({ accountSid, authToken }) => {
  if (!twilioClient) twilioClient = twilio(accountSid, authToken);
  return twilioClient;
};

const toE164 = (mobile) => {
  const countryCodeDigits = String(
    process.env.TWILIO_DEFAULT_COUNTRY_CODE || "+91",
  ).replace(/\D/g, "");
  if (!countryCodeDigits) {
    const error = new Error("TWILIO_DEFAULT_COUNTRY_CODE is invalid");
    error.statusCode = 503;
    throw error;
  }
  return `+${countryCodeDigits}${mobile}`;
};

const getTwilioError = (error, action) => {
  if (error.code === 60200 && action === "send") {
    const invalidParameter = new Error(
      "Twilio rejected the phone number or request format. Check the E.164 phone number and Verify Service configuration.",
    );
    invalidParameter.statusCode = 400;
    return invalidParameter;
  }

  const statusCode = error.status === 429 ? 429 : 502;
  const result = new Error(`Could not ${action} OTP through Twilio`);
  result.statusCode = statusCode;
  return result;
};

export const startTwilioVerification = async (mobile) => {
  const config = getTwilioConfig();
  const client = getTwilioClient(config);
  const to = toE164(mobile);

  try {
    return await client.verify.v2
      .services(config.verifyServiceSid)
      .verifications.create({
        to,
        channel: "sms",
      });
  } catch (error) {
    if (error.statusCode) throw error;
    const twilioMessage = String(error.message ?? "")
      .replace(/\+?\d[\d\s().-]{7,}\d/g, "[REDACTED_NUMBER]")
      .replace(/\b(?:AC|VA|SK)[a-f\d]{32}\b/gi, "[REDACTED_SID]");
    const invalidParameter = twilioMessage.match(
      /invalid parameter:?\s*["']?([a-z]+)/i,
    )?.[1] ?? null;
    console.error("Twilio Verify send failed", {
      status: error.status ?? null,
      code: error.code ?? null,
      invalidParameter,
      twilioMessage,
      toFormat: {
        startsWithPlus: to.startsWith("+"),
        digitCount: to.replace(/\D/g, "").length,
        countryCode: `+${String(
          process.env.TWILIO_DEFAULT_COUNTRY_CODE || "+91",
        ).replace(/\D/g, "")}`,
      },
      verifyServiceSidValid: /^VA[a-f\d]{32}$/i.test(
        config.verifyServiceSid,
      ),
      channel: "sms",
    });
    throw getTwilioError(error, "send");
  }
};

export const checkTwilioVerification = async (mobile, code) => {
  const config = getTwilioConfig();
  const client = getTwilioClient(config);

  let verification;
  try {
    verification = await client.verify.v2
      .services(config.verifyServiceSid)
      .verificationChecks.create({
        to: toE164(mobile),
        code,
      });
  } catch (error) {
    console.error("Twilio Verify check failed", {
      status: error.status ?? null,
      code: error.code ?? null,
    });
    if (error.status === 404 || error.status === 400) {
      const invalidCodeError = new Error("Invalid or expired OTP");
      invalidCodeError.statusCode = 400;
      throw invalidCodeError;
    }
    throw getTwilioError(error, "verify");
  }

  if (verification.status !== "approved") {
    const invalidCodeError = new Error("Invalid or expired OTP");
    invalidCodeError.statusCode = 400;
    throw invalidCodeError;
  }

  return true;
};
