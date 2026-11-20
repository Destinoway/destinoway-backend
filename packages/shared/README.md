# @destinoway/shared

Standalone ESM package for common Destinoway Express helpers. It has no runtime dependencies, database connections, environment configuration or business modules.

```js
import { ApiError, asyncHandler, errorHandler, sendSuccess, sendError } from "@destinoway/shared";
```

## Existing backend

The backend installs this package through `"@destinoway/shared": "file:packages/shared"`. Run `npm ci` after pulling changes and deploy the `packages/shared` folder along with the application. The shared package itself does not require a registry download.

The existing files under `src/middleware` and `src/utils/response` re-export the package helpers. Existing controllers keep working with their previous imports; new code can import the package directly. Error status handling, response shapes, default values and function argument order are preserved.

```js
sendSuccess(res, "Booking found", booking, null, 200);
sendError(res, "Booking not found", 404);
throw new ApiError(400, "Invalid request", { field: "pickup" });
```

Register `errorHandler` after routes. The existing CastError and duplicate-key mappings are preserved.

## Separate repository and cab app

Copy only this package folder into a new private shared repository, without the parent application's `.git`, environment files, credentials or business code. Creating a package folder alone does not separate repository access permissions.

Before registry setup, run `npm pack` inside this folder, transfer `destinoway-shared-1.0.0.tgz` and install it in the cab repository with `npm install ./vendor/destinoway-shared-1.0.0.tgz`. Do not give cab developers hotel repository access just to obtain helpers.

For long-term use, configure an authenticated private npm-compatible registry for the `@destinoway` scope, publish a version there, then switch both apps to the exact version, for example `"@destinoway/shared": "1.0.0"`. Publishing and registry setup have not been performed. `publishConfig.access` is restricted; confirm the chosen registry supports this before publishing. Keep registry tokens outside source code and grant consumers read-only access.

Release a new version for helper changes. Each app upgrades and deploys independently. Customer authentication, user models, JWT secrets and supplier adapters remain in their application; this package does not implement shared authentication.

## Verification

Run `npm run test:shared` from the backend repository. Tests exercise Express HTTP response/error contracts and compatibility exports. The npm package allowlist includes runtime `src` files plus standard metadata and README.
