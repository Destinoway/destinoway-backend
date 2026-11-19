# Case 01 review against Hotel test case sample.zip

Reference: the user-supplied `Hotel test case sample.zip`. Its contents are sample exchanges, not captured Case 01 values.

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
