# AKBAR token storage

AKBAR Signature tokens are stored in MongoDB, not Redis, in the `akbartokens`
collection using a single `hotel` document. The token is encrypted with
AES-256-GCM before it is written. The encryption key is kept outside MongoDB and
must be available to every backend process that reads or refreshes the token.

Add `AKBAR_TOKEN_ENCRYPTION_KEY` to the backend environment as a base64-encoded
32-byte key. Generate one with:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Keep the generated key in the deployment secret manager or local `.env`; do not
commit it. Keep the same key across application restarts and instances; a lost
or rotated key makes existing token records unreadable. If the key is missing
or invalid, token lookup fails explicitly and does not store a plaintext token.

Tokens expire after the existing ten-day lifetime and the scheduled refresh
checks MongoDB every 15 minutes, refreshing when one hour or less remains. An
expired or absent MongoDB document triggers a Signature API request; Redis is
not read as a fallback. Consequently, any token left in the old Redis key is
ignored and the first successful signature request after deploying this change
creates the encrypted MongoDB record.
