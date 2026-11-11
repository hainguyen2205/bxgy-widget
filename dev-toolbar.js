// Dev preview bar — chỉ để preview, bỏ file này khi đưa vào theme app extension.
//  - Offer: chọn 1 case (trigger × reward) trong mock-data.js
//  - Start: trạng thái selection ban đầu (Empty / Almost / Unlocked) — không áp dụng cho trigger Fixed
//  - Sold out item: giả lập product hết hàng
//  - Width: frame giả lập section Shopify (mặc định 560)
(function () {
    const store = {
        get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
        set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    };
    // Mỗi trang preview (index / ecomposer) lưu lựa chọn riêng
    const KEY = 'bxgy-dev-preview-v3' + (document.body.dataset.devPage ? '-' + document.body.dataset.devPage : '');
    const BASELINE_WIDTH = 560;
    const TYPE = { fixed: 'Fixed', mixMatch: 'Mix & match', spend: 'Spend' };

    const prefs = Object.assign({}, window.BXGY.DEFAULTS, { width: BASELINE_WIDTH, theme: 'ec' }, store.get(KEY));

    /* ---------- stylesheet: EComposer (bxgy-ec2026.css) | Prototype (style.css) ---------- */
    const THEMES = { ec: 'bxgy-ec2026.css', proto: 'style.css' };
    const sheetLink = document.querySelector('[data-dev-stylesheet]');
    function setTheme(theme) {
        if (!sheetLink) return; // trang không có option Style (ecomposer.html)
        const href = THEMES[theme] || THEMES.ec;
        if (sheetLink.getAttribute('href') !== href) sheetLink.setAttribute('href', href);
    }
    setTheme(prefs.theme);

    /* ---------- width ---------- */
    const range = document.querySelector('[data-dev-width-range]');
    const input = document.querySelector('[data-dev-width-input]');
    const frame = document.querySelector('[data-dev-frame]');
    const label = document.querySelector('[data-dev-frame-label]');
    const presets = document.querySelectorAll('[data-dev-presets] [data-width]');

    function setWidth(value) {
        const w = Math.min(1920, Math.max(320, Math.round(Number(value) || BASELINE_WIDTH)));
        frame.style.width = w + 'px';
        range.value = w;
        input.value = w;
        label.textContent = w + 'px';
        presets.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.width) === w)));
        prefs.width = w;
        store.set(KEY, prefs);
    }
    range.addEventListener('input', (e) => setWidth(e.target.value));
    input.addEventListener('change', (e) => setWidth(e.target.value));
    presets.forEach((b) => b.addEventListener('click', () => setWidth(b.dataset.width)));

    /* ---------- offer ---------- */
    const offerSel = document.querySelector('[data-dev-offer]');
    const info = document.querySelector('[data-dev-offer-info]');
    offerSel.innerHTML = window.BXGY.offers.map((o) => `<option value="${o.id}">${o.label}</option>`).join('');

    function describe(o) {
        const t = o.trigger, r = o.reward;
        const trig = t.type === 'fixed' ? `${t.items.length} items, qty cố định`
            : t.type === 'mixMatch' ? `chọn tối thiểu ${t.minQty} trong ${t.items.length} products`
            : `chi tối thiểu $${t.minAmount} trong ${t.items.length} products`;
        const rew = r.type === 'fixed' ? `tặng ${r.items.length} quà cố định` : `chọn ${r.chooseQty} trong ${r.items.length} quà`;
        return `Trigger ${TYPE[t.type]}: ${trig} · Reward ${TYPE[r.type]}: ${rew}`;
    }

    /* ---------- options ---------- */
    const segs = document.querySelectorAll('[data-dev-opt]');

    function apply() {
        const offer = window.BXGY.offers.find((o) => o.id === prefs.offerId) || window.BXGY.offers[0];
        prefs.offerId = offer.id;
        offerSel.value = offer.id;
        info.textContent = describe(offer);

        segs.forEach((seg) => seg.querySelectorAll('button').forEach((b) =>
            b.setAttribute('aria-checked', String(b.dataset.value === prefs[seg.dataset.devOpt]))));
        // Trigger fixed không có điều kiện → Start không áp dụng
        const startSeg = document.querySelector('[data-dev-opt="start"]');
        const noStart = offer.trigger.type === 'fixed';
        startSeg.classList.toggle('is-disabled', noStart);
        startSeg.querySelectorAll('button').forEach((b) => (b.disabled = noStart));

        setTheme(prefs.theme);
        store.set(KEY, prefs);
        window.BXGY.load(prefs);
    }

    offerSel.addEventListener('change', () => { prefs.offerId = offerSel.value; apply(); });
    segs.forEach((seg) => seg.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-value]');
        if (!b || b.disabled) return;
        prefs[seg.dataset.devOpt] = b.dataset.value;
        apply();
    }));
    document.querySelector('[data-dev-reset]').addEventListener('click', apply);

    setWidth(prefs.width);
    apply();
})();
