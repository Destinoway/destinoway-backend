# Case 01 review against Hotel test case sample.zip

Reference: the user-supplied `Hotel test case sample.zip`. Its contents are sample exchanges, not captured Case 01 values.

## Subsequent confirmed mapping

The user subsequently supplied the AgentProfile documentation. The backend now fetches and caches its `code`, `htdealCode` and `id` for Init. See [current AgentProfile integration and deployment notes](akbar-agent-profile-integration.md). Remaining-work observations below describe the earlier capture and are not the current implementation status; a fresh deployed run is still needed to verify actual supplier values.

The user confirmed that Signature response `TUI` is the Init request tracing key. Init now sends the complete Signature `TUI` as body field `searchTracingKey`, together with the token from the same cached Signature session. Signature TUI is stored in MongoDB as `signatureTui`. Valid legacy token records missing that field automatically refresh Signature before Init; a fresh Signature response missing TUI blocks Init with HTTP error status 502. Init response tracing-key handling for downstream calls is unchanged. This resolves the initial-source uncertainty recorded below, but does not change historical captures or resolve AgentProfile mappings.

Validation: `node --test src/modules/hotel/supplier/akbar/akbarInit.credentials.test.js src/modules/hotel/hotel/utils/hotelVerification.test.js` passes all eight tests, covering fresh, cached, expired and legacy sessions, concurrent refresh, missing TUI, full-value logging and customer details. No live supplier request was made for this validation.

## Implemented

- CreateItinerary now includes `Auxiliaries` entry `Code: "CUSTOMER DETAILS"`, with lowercase `parameters` exactly as in sample file 9. The parameter types are `Nationality` and `Country of Residence`.
- The original search nationality and country of residence are persisted and used for those parameters. Both default to `IN`, matching Init defaults, including for older cached searches.
- Future hotel supplier JSONL and console exchange records preserve actual request, response, header and credential-context values. This includes authorization, tokens, search tracing keys, PAN, GST fields, and empty values. No additional masking is applied.
- Full exchanges are written to `logs/akbar-api-exchanges.jsonl`, or the configured `AKBAR_API_LOG_FILE`. PM2 console output can truncate large records; use the JSONL file for submission.

## Still requires supplier information and a fresh capture

| Item | Evidence / remaining work |
|---|---|
| Init agentCode | Sample uses `14005`. Actual Case 01 sends an empty string. The application reads `AKBAR_AGENT_CODE`; configure your assigned agent code. The sample value has not been copied into account configuration. |
| Init segmentId | The sample comments out segmentId. Supplier email explicitly requires AgentProfile htdealCode. No AgentProfile exchange or implementation was found, so that mapping remains outstanding. |
| Init companyId | Sample sends `1`. Actual Case 01 has a redacted presence marker. The implementation uses AKBAR_COMPANY_ID or fallback 1; it does not obtain AgentProfile id. No AgentProfile response is included in the sample. |
| Init searchTracingKey | The sample provides this value in the response only. Supplier email requests it in the request. Its initial request source needs clarification; the response value is available only after Init. No sample key has been reused for new searches. |
| Existing Case 01 redactions | The original JSONL already contains redaction markers. Those actual values cannot be recovered from it. A fresh run with the updated logger is required for a submission containing every actual value. |
| Additional sample operations | Filter Hotels Result, Get Hotel Pricing Content and Cancel are present in the sample, but no corresponding exchanges exist in the supplied Case 01 capture. They have not been invented or represented as executed. |

The existing Case 01 logs and ZIPs remain historical captures. Changes above do not establish a successful new supplier run or supplier acceptance.

Validation: `node --test src/modules/hotel/hotel/utils/hotelVerification.test.js` checks actual-value logging on success and error, credential context, and customer-details mapping for non-IN countries and defaults.
