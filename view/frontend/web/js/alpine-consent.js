/**
 * Copyright © 2026 Blue Fairy Development. All rights reserved.
 *
 * Alpine.js component for the Hyvä banner. A thin view over the core engine
 * (window.BlueFairyConsent); every decision is the engine's. Registered as
 * Alpine.data('bfCookieConsent') so it also runs under Alpine's CSP build.
 */
(function (root, factory) {
    'use strict';
    var api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    } else {
        root.bfCookieConsent = api;
        // Hyvä's strict CSP runs the Alpine CSP build, where x-data must name a component
        // registered with Alpine.data(). The plain build accepts the same registration.
        if (typeof root.addEventListener === 'function') {
            root.addEventListener(
                'alpine:init',
                function () {
                    root.Alpine.data('bfCookieConsent', function () {
                        return api();
                    });
                },
                { once: true }
            );
        }
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    return function bfCookieConsent(win, doc) {
        win = win || window;
        doc = doc || document;
        return {
            ready: false,
            visible: false,
            prefsOpen: false,
            mode: 'opt_in',
            categories: (win.BlueFairyConsentConfig && win.BlueFairyConsentConfig.categories) || [],
            selected: [],
            ctl: null,
            initialised: null,

            init: function () {
                var self = this;

                // Alpine v3 calls init() itself; a second call must not build a second controller.
                if (this.initialised) {
                    return this.initialised;
                }
                if (!win.BlueFairyConsent || !win.BlueFairyConsentConfig) {
                    return Promise.resolve();
                }
                this.ctl = win.BlueFairyConsent.create(win.BlueFairyConsentConfig, win, doc);
                win.BlueFairyConsentController = this.ctl;
                this.ctl.onChange(function () {
                    self.sync();
                });
                this.initialised = this.ctl.ready.then(function () {
                    self.ready = true;
                    self.sync();
                });
                return this.initialised;
            },
            sync: function () {
                this.visible = this.ctl.bannerVisible;
                this.prefsOpen = this.ctl.preferencesOpen;
                this.mode = this.ctl.mode;
                this.selected = this.ctl.categories.slice();
            },
            isRequired: function (code) {
                return this.categories.some(function (c) {
                    return c.code === code && c.required;
                });
            },
            isSelected: function (code) {
                return this.isRequired(code) || this.selected.indexOf(code) >= 0;
            },
            toggle: function (code) {
                var i;

                if (this.isRequired(code)) {
                    return;
                }
                i = this.selected.indexOf(code);

                if (i >= 0) {
                    this.selected.splice(i, 1);
                } else {
                    this.selected.push(code);
                }
            },
            // The template may name methods only (no arguments, no "!"), so these read the
            // x-for item from this.category, which Alpine puts in scope for the call.
            isCategorySelected: function () {
                return this.isSelected(this.category.code);
            },
            toggleCategory: function () {
                this.toggle(this.category.code);
            },
            prefsClosed: function () {
                return !this.prefsOpen;
            },
            customise: function () {
                var timer = typeof win.setTimeout === 'function' ? win.setTimeout : setTimeout;

                this.prefsOpen = true;
                // Customise hides itself once the preferences are open, so keyboard focus moves
                // to the first choice the visitor can change, after Alpine has shown it.
                timer(function () {
                    var box = doc.querySelector
                        ? doc.querySelector('[data-bf-cc-prefs] input[type="checkbox"]:not([disabled])')
                        : null;

                    if (box && typeof box.focus === 'function') {
                        box.focus();
                    }
                }, 0);
            },
            acceptAll: function () {
                return this.ctl.acceptAll();
            },
            rejectAll: function () {
                return this.ctl.rejectAll();
            },
            save: function () {
                return this.ctl.save(this.selected);
            },
            reopen: function () {
                this.ctl.reopen();
            },
            showReopen: function () {
                return this.ready && !this.visible && this.mode !== 'none';
            }
        };
    };
});
