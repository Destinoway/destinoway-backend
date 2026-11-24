# Ola Maps integration

Set `OLA_MAPS_API_KEY` in the backend environment. Keep the key on the server;
the browser should call these backend endpoints instead of Ola Maps directly.

## Autocomplete

`GET /api/v1/ola-maps/autocomplete?input=Jaipur`

An optional `location` query parameter can bias suggestions toward a latitude
and longitude:

`GET /api/v1/ola-maps/autocomplete?input=Airport&location=26.9124,75.7873`

Debounce autocomplete requests in the client to avoid unnecessary API usage.

## Place details

Pass the selected autocomplete result's `place_id` to:

`GET /api/v1/ola-maps/place-details?place_id=<place_id>`

Both endpoints return the Ola Maps response in the standard API success
envelope. Missing backend credentials return HTTP 503; provider request
failures return HTTP 502.
