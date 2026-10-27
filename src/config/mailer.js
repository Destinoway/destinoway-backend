let cachedToken = null;
let tokenExpiresAt = 0;

const getGraphConfig = () => {
  const config = {
    tenantId: process.env.M365_TENANT_ID,
    clientId: process.env.M365_CLIENT_ID,
    clientSecret: process.env.M365_CLIENT_SECRET,
    senderEmail: process.env.M365_SENDER_EMAIL,
  };

  if (Object.values(config).some((value) => !value)) {
    const error = new Error(
      "Microsoft 365 mail is not configured. Set M365_TENANT_ID, M365_CLIENT_ID, M365_CLIENT_SECRET and M365_SENDER_EMAIL.",
    );
    error.statusCode = 503;
    throw error;
  }

  return config;
};

const getGraphAccessToken = async ({ tenantId, clientId, clientSecret }) => {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    },
  );

  const tokenData = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenData.access_token) {
    const error = new Error(
      `Microsoft 365 authentication failed (${tokenResponse.status})`,
    );
    error.statusCode = 502;
    throw error;
  }

  cachedToken = tokenData.access_token;
  tokenExpiresAt = Date.now() + Number(tokenData.expires_in || 3600) * 1000;
  return cachedToken;
};

const mapRecipients = (value) => {
  const recipients = Array.isArray(value) ? value : String(value ?? "").split(",");
  return recipients
    .map((recipient) => {
      const address =
        typeof recipient === "string"
          ? recipient.trim()
          : recipient?.address ?? recipient?.emailAddress?.address;
      return address ? { emailAddress: { address } } : null;
    })
    .filter(Boolean);
};

const mapAttachments = (attachments = []) =>
  attachments.map((attachment) => {
    const content = Buffer.isBuffer(attachment.content)
      ? attachment.content
      : Buffer.from(attachment.content ?? "");

    return {
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: attachment.filename ?? "attachment",
      contentType: attachment.contentType ?? "application/octet-stream",
      contentBytes: content.toString("base64"),
      ...(attachment.cid ? { contentId: attachment.cid, isInline: true } : {}),
    };
  });

export const sendMail = async ({
  to,
  cc,
  bcc,
  subject,
  html,
  text,
  attachments = [],
}) => {
  const config = getGraphConfig();
  const accessToken = await getGraphAccessToken(config);
  const message = {
    subject,
    body: {
      contentType: html ? "HTML" : "Text",
      content: html ?? text ?? "",
    },
    toRecipients: mapRecipients(to),
    ...(cc ? { ccRecipients: mapRecipients(cc) } : {}),
    ...(bcc ? { bccRecipients: mapRecipients(bcc) } : {}),
    ...(attachments.length ? { attachments: mapAttachments(attachments) } : {}),
  };

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.senderEmail)}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, saveToSentItems: true }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const error = new Error(
      `Microsoft 365 email send failed (${response.status}): ${errorBody.error?.code ?? "GraphError"}`,
    );
    error.statusCode = 502;
    throw error;
  }

  return { accepted: mapRecipients(to).map((recipient) => recipient.emailAddress.address) };
};

const transporter = { sendMail };
export default transporter;
