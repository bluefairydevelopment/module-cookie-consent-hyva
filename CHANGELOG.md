# Changelog

## 1.0.0 — 2026-11-09

### Fixed

- The banner works under Hyvä's strict CSP (Alpine CSP build). The component is registered with `Alpine.data('bfCookieConsent')` and every Alpine attribute names a property or a method instead of holding an expression (`@click="rejectAll"`, `x-show="prefsClosed"`, `:checked="isCategorySelected"`). Behaviour without strict CSP is unchanged. Needs the matching `bluefairy/module-cookie-consent` change, which registers the head scripts with Hyvä's CSP helper.
- Customise moves keyboard focus to the first choice the visitor can change; the button hides itself, so focus was lost.
- npm's cache and logs (`.cache/`) are no longer part of the package.
- Requires Hyvä theme-module 1.5 or later; 1.3.x is fatal on Magento 2.4.9.
- The Alpine component no longer initialises twice. The template called `init()` from `x-init` although Alpine v3 already calls it, so each page built two consent controllers, fetched the region twice and sent duplicate Consent Mode updates and `bf-cookie-consent` events. `init()` is now also safe to call more than once.
- An absolute http(s) Cookie Policy Page URL now links to that URL instead of being appended to the store base URL. Needs the matching `bluefairy/module-cookie-consent` change (`Consent::getPolicyHref()`).

### Added

- Alpine.js banner and preferences centre for Hyvä, driven by the core consent engine.
