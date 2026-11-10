# Shipped image review — module-cookie-consent-hyva

Captured 2026-11-09 (M2MAP-854, round 2) on the AWS Magento rig, Magento 2.4.9 / PHP 8.5, Hyvä `default-csp`
store view, with this repo at `3223012` and the core module at `b7e7c4d` installed by `bin/rig gate` (GREEN). The
theme's CSS was rebuilt after install (`hyva:config:generate`, then `npm ci` and `npm run build` in the theme's
`web/tailwind`), as the README tells merchants to do. Script:
`blueSites/playwright/scripts/capture-CookieConsent-images.js`. Each image was opened and checked after capture.
No personal data: fresh test browser sessions, default banner text.

| image | shows | sha256 | status |
| :--- | :--- | :--- | :--- |
| `hyva-banner.png` | Hyvä default home page, 1440x900, banner centred at the bottom with padding and shadow: "We value your privacy", message with "Cookie policy" link, Reject all and Accept all (same style), Customise. Another installed module's chat launcher shows bottom right. | `8bc5d75ca798d759c828ee24cbe408cbf1e12817a9f5f00389a341f15a4bf110` | current |
| `hyva-preferences.png` | Same page after Customise: Strictly necessary (checked), Analytics and Marketing (unchecked) with descriptions; Reject all, Accept all, Save choices; Customise hidden. | `b5ffc8854ee473eafe4628a9a834f144c6f733b0007ce1872c21d98c43e98684` | current |
