/**
 * Copyright © 2026 Blue Fairy Development. All rights reserved.
 */
const path = require('path');
const factory = require('../../view/frontend/web/js/alpine-consent.js');
const enginePath = process.env.BF_CC_ENGINE
    || path.resolve(__dirname, '../../../module-cookie-consent/view/frontend/web/js/consent-engine.js');
const engine = require(enginePath);

function env(cookie, nav) {
    const jar = {};
    String(cookie || '').split(/;\s*/).filter(Boolean).forEach(p => { jar[p.split('=')[0]] = p; });
    const doc = {
        querySelectorAll: () => [],
        get cookie() { return Object.values(jar).join('; '); },
        set cookie(v) { const p = v.split(';')[0]; jar[p.split('=')[0]] = p; }
    };
    const win = {
        navigator: nav || {}, location: { protocol: 'https:' }, dispatchEvent: () => true,
        crypto: { getRandomValues: b => b.fill(1) },
        sessionStorage: { getItem: () => null, setItem: () => {} },
        BlueFairyConsent: engine,
        BlueFairyConsentConfig: {
            cookieName: 'bf_cookie_consent', policyVersion: '1', lifetimeDays: 30, honourGpc: true,
            categories: [{ code: 'necessary', required: true }, { code: 'analytics' }, { code: 'marketing' }],
            geo: { endpoint: '' }, endpoints: {}, consentMode: { enabled: false }
        }
    };
    return { win, doc };
}

test('first visit shows the banner; reject keeps only necessary', async () => {
    const { win, doc } = env();
    const c = factory(win, doc);
    await c.init();
    expect(c.visible).toBe(true);
    expect(c.showReopen()).toBe(false);
    await c.rejectAll();
    expect(c.visible).toBe(false);
    expect(c.selected).toEqual(['necessary']);
    expect(c.showReopen()).toBe(true);
});

test('customise, toggle and save; necessary cannot be unticked', async () => {
    const { win, doc } = env();
    const c = factory(win, doc);
    await c.init();
    c.customise();
    expect(c.prefsOpen).toBe(true);
    c.toggle('necessary');
    expect(c.isSelected('necessary')).toBe(true);
    c.toggle('analytics');
    expect(c.isSelected('analytics')).toBe(true);
    c.toggle('analytics');
    c.toggle('marketing');
    await c.save();
    expect(c.selected).toEqual(['necessary', 'marketing']);
    c.reopen();
    expect(c.visible).toBe(true);
    await c.acceptAll();
    expect(c.selected).toEqual(['necessary', 'analytics', 'marketing']);
});

test('GPC withholds marketing even after accept all', async () => {
    const { win, doc } = env('', { globalPrivacyControl: true });
    const c = factory(win, doc);
    await c.init();
    await c.acceptAll();
    expect(c.selected).toEqual(['necessary', 'analytics']);
});

test('without the core engine the component stays inert', async () => {
    const c = factory({}, {});
    await c.init();
    expect(c.ready).toBe(false);
    expect(c.categories).toEqual([]);
});
