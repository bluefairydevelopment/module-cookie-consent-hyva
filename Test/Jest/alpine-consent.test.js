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

test('init is idempotent: Alpine calling it twice creates one controller', async () => {
    const { win, doc } = env();
    let created = 0;
    const realCreate = engine.create;
    win.BlueFairyConsent = Object.assign({}, engine, {
        create: function () { created++; return realCreate.apply(null, arguments); }
    });
    const c = factory(win, doc);
    const first = c.init();
    const second = c.init();
    await Promise.all([first, second]);
    expect(created).toBe(1);
    expect(c.visible).toBe(true);
});

test('the template does not call init() from x-init as well (Alpine v3 calls it already)', () => {
    const fs = require('fs');
    const tpl = fs.readFileSync(path.resolve(__dirname, '../../view/frontend/templates/banner.phtml'), 'utf8');
    expect(tpl).toContain('x-data="bfCookieConsent"');
    expect(tpl).not.toMatch(/x-init="init\(\)"/);
});

test('the policy link uses the view model, so an absolute URL is not appended to the base URL', () => {
    const fs = require('fs');
    const tpl = fs.readFileSync(path.resolve(__dirname, '../../view/frontend/templates/banner.phtml'), 'utf8');
    expect(tpl).toContain('$viewModel->getPolicyHref($block->getBaseUrl())');
    expect(tpl).not.toContain("'_direct'");
});

test('customise moves keyboard focus to the first choice it can change', async () => {
    const { win, doc } = env();
    const focused = [];
    const necessary = { focus: () => focused.push('necessary') };
    const analytics = { focus: () => focused.push('analytics') };
    doc.querySelector = sel => (sel.indexOf(':not([disabled])') >= 0 ? analytics : necessary);
    win.setTimeout = fn => fn();
    const c = factory(win, doc);
    await c.init();
    c.customise();
    expect(c.prefsOpen).toBe(true);
    expect(focused).toEqual(['analytics']);
});

test('registers itself with Alpine.data on alpine:init, for the Alpine CSP build', () => {
    const vm = require('vm');
    const fs = require('fs');
    const src = fs.readFileSync(path.resolve(__dirname, '../../view/frontend/web/js/alpine-consent.js'), 'utf8');
    const listeners = {};
    const registered = {};
    const sandbox = {
        addEventListener: (name, fn, opts) => { listeners[name] = { fn, opts }; },
        Alpine: { data: (name, fn) => { registered[name] = fn; } }
    };
    sandbox.self = sandbox;
    sandbox.window = sandbox;
    sandbox.document = {};
    vm.runInNewContext(src, sandbox);
    expect(typeof sandbox.bfCookieConsent).toBe('function');
    expect(listeners['alpine:init']).toBeDefined();
    expect(listeners['alpine:init'].opts).toEqual({ once: true });
    listeners['alpine:init'].fn();
    expect(typeof registered.bfCookieConsent).toBe('function');
    const data = registered.bfCookieConsent();
    expect(typeof data.init).toBe('function');
    expect(typeof data.rejectAll).toBe('function');
});

test('loop methods read the x-for item from this.category, as the template names them without arguments', async () => {
    const { win, doc } = env();
    const c = factory(win, doc);
    await c.init();
    const scope = item => Object.assign(Object.create(c), { category: item });
    expect(c.isCategorySelected.call(scope({ code: 'necessary' }))).toBe(true);
    expect(c.isCategorySelected.call(scope({ code: 'analytics' }))).toBe(false);
    c.toggleCategory.call(scope({ code: 'analytics' }));
    expect(c.isSelected('analytics')).toBe(true);
    c.toggleCategory.call(scope({ code: 'necessary' }));
    expect(c.isSelected('necessary')).toBe(true);
    expect(c.prefsClosed()).toBe(true);
    c.customise();
    expect(c.prefsClosed()).toBe(false);
});

test('every method the template names exists on the component', () => {
    const fs = require('fs');
    const tpl = fs.readFileSync(path.resolve(__dirname, '../../view/frontend/templates/banner.phtml'), 'utf8');
    const c = factory({}, {});
    const names = [];
    tpl.replace(/\s(?:@[\w.:-]+|x-show|:checked|:disabled)="([A-Za-z_$][\w$]*)"/g, (m, n) => { names.push(n); return m; });
    expect(names.length).toBeGreaterThanOrEqual(9);
    names.forEach(n => expect([n, typeof c[n]]).toEqual([n, typeof c[n] === 'boolean' ? 'boolean' : 'function']));
});
