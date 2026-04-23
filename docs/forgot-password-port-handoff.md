# Forgot-Password Port Handoff

## Source Branch

The feature source was:

- `origin/feat/forgotPassword`

The branch name differs from the original note only by casing: the remote branch uses `forgotPassword` with a capital `P`.

## Legacy Feature Footprint

The legacy branch changed:

- `server/controllers/authController.js`
- `server/routes/authRoutes.js`
- `client/src/App.tsx`
- `client/src/pages/LoginPage.tsx`
- `client/src/pages/forgotPassword.tsx`

It also modified `client/src/pages/LandingPage.tsx`, but that diff was unrelated to forgot-password behavior and was intentionally not ported.

## Current Port

The feature now lives in:

- `server/controllers/authController.js`
- `server/routes/authRoutes.js`
- `client/src/App.tsx`
- `client/src/pages/LoginPage.tsx`
- `client/src/pages/ForgotPasswordPage.tsx`

## Important Adaptations

The legacy branch assumed the old SQL-based auth controller. The current branch uses the canonical Prisma runtime, so the port was adapted as follows:

- forgot-password endpoints now query and update users through the current Prisma schema
- placeholder alumni accounts are blocked from forgot-password and must still activate first
- OTP state is kept in memory alongside the existing activation/change-password OTP flows
- forgot-password email responses now return a masked email string for the UI
- the new frontend route is `/forgot-password`

## Endpoints Added

- `POST /api/auth/forgot-password/request-otp`
- `POST /api/auth/forgot-password/verify-otp`
- `POST /api/auth/forgot-password/reset`

## Validation

These checks passed after the port:

- `node --check server/controllers/authController.js`
- `node --check server/routes/authRoutes.js`
- `npm.cmd run build` from `client/`

## Suggested Manual QA

Run these in the app:

1. Request a forgot-password OTP for an activated alumni account.
2. Verify the OTP.
3. Reset the password and log in with the new password.
4. Confirm the API rejects reusing the current password.
5. Confirm placeholder alumni accounts are told to activate instead of resetting.
6. Confirm resend throttling behaves correctly.
