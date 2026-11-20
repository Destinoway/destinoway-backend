# AKBAR backend Init credentials

The supplier documentation supplied in the conversation defines POST `{UtilityURL}/utils/AgentProfile`, authenticated with the Signature bearer token. The backend requests profile only with `Mode: ["A"]`; it does not request account balance.

## Request sequence

1. Reuse a valid cached Signature token and complete Signature TUI. Legacy token records without a TUI refresh Signature automatically.
2. Reuse the AgentProfile cached with that token. If missing, POST `{ "TUI": "<complete Signature TUI>", "Mode": ["A"] }` with `Authorization: Bearer <same token>`.
3. Require response `Code: "200"`, and map lowercase `code` to `agentCode`, `htdealCode` to `segmentId`, and `id` to `companyId`. Uppercase `Code` is the status, not the account code.
4. Send Init with those three profile values and `searchTracingKey` equal to the complete Signature TUI, as confirmed by the user. Backend credentials override any caller-supplied values.
5. Continue using the Init response search ID and tracing key for downstream search, room, price and itinerary calls as before. Existing payment and RetrieveBooking request construction is unchanged.

## Configuration

For the supplied test environment, the explicit profile endpoint is:

```dotenv
AKBAR_AGENT_PROFILE_URL=https://b2bapiutils.benzyinfotech.com/utils/AgentProfile
```

If omitted, the backend derives `/utils/AgentProfile` from the origin of `AKBAR_SIGNATURE_URL`. Set the explicit endpoint if the supplier assigns a different UtilityURL. Other existing Signature credentials remain required. `AKBAR_AGENT_CODE` is still sent to Signature according to the account's supplier-issued credentials; do not substitute a sample account value there. Init agentCode, segmentId and companyId now come from AgentProfile, with no environment fallback.

## Cache and failure behavior

Only the three required mapped profile values are persisted under `agentProfile` in the existing hotel token document. No frontend change or manual database migration is needed. Old records fetch the missing profile lazily. Signature refresh clears the profile; subsequent Init retrieves a profile for the new session. Simultaneous profile requests share one in-flight promise per token within a process. A token-conditioned MongoDB update prevents a late profile response from being written into a newer token session. Multiple server processes can each issue their own initial fetch, then reuse MongoDB's cache.

AgentProfile uses a 30-second request timeout. Supplier failures, empty agent code/company ID, or absent/null/non-string htdealCode stop Init. An explicitly returned string `htdealCode: ""` is preserved as `segmentId: ""`, cached, and logged as `supplier_returned_empty_deal_code`. This matches the actual staging response supplied on 19 November 2026 (`code: "14005"`, `id: "1"`, `htdealCode: ""`); no sample deal code is substituted. A populated deal code still requires supplier account configuration or confirmation for verification. Failed profiles are not cached, so the next search can retry. Existing token and Signature ClientID getters remain usable independently of AgentProfile; booking operations do not gain this new dependency.

Full AgentProfile request/response exchanges are recorded as operation `agent_profile`, using the search correlation ID and the existing full-value JSONL logger. Cache hits do not invent a new API exchange.

## Validation and deployment

```bash
node --test src/modules/hotel/supplier/akbar/akbarInit.credentials.test.js src/modules/hotel/hotel/utils/hotelVerification.test.js
```

All 15 tests pass. They cover fresh/cached/expired/legacy sessions, concurrent refresh, actual request mappings, caller override protection, missing TUI or profile fields, an explicitly empty deal code through Init and Mongoose cache validation, invalid deal code types, supplier failure and retry, existing credential getters after profile failure, endpoint derivation, cache invalidation and session-change races. Existing full-value logging and customer-details tests also pass. Tests mock supplier HTTP and MongoDB; no live supplier call or server deployment has been performed.

Deploy these changes, set the profile URL if desired, restart the backend with its updated environment, then capture Case 01 again. Confirm actual AgentProfile code/htdealCode/id values match the outgoing Init fields and review the supplier responses before declaring verification complete.
