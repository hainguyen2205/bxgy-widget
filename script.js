// BXGY widget — prototype chạy trên mock data.
//  - Mỗi offer: trigger (fixed | mixMatch | spend) × reward (fixed | mixMatch)
//  - Selection là state thật: Choose/Edit → sheet chọn theo option → Add / bỏ chọn
//  - Điều kiện, progress, khoá/mở quà, tổng tiền, CTA đều tính lại từ selection
(function () {
    const M = window.BXGY_MOCK;
    const widget = document.querySelector('[data-bxgy-widget]');
    if (!M || !widget) return;

    const root = widget.querySelector('[data-bxgy-root]');
    const sheet = widget.querySelector('[data-bxgy-sheet]');
    const sheetBody = sheet.querySelector('[data-bxgy-sheet-body]');

    /* =====================================================================
       HELPERS
       ===================================================================== */
    const money = (n) => M.currency + (Number.isInteger(n) ? n : n.toFixed(2));
    const money2 = (n) => M.currency + n.toFixed(2);
    const icon = (id, cls = '') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
    const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
    const sum = (arr) => arr.reduce((a, b) => a + b, 0);
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const firstAvail = (p) => Math.max(0, p.variants.findIndex((v) => v.available));
    const isSingle = (p) => p.variants.length === 1;
    const isSoldOut = (p) => !p.variants.some((v) => v.available);
    const soldOutCopy = (p) => ({ ...p, variants: p.variants.map((v) => ({ ...v, available: false })) });
    const zeros = (products) => products.map((p) => p.variants.map(() => 0));
    // Ảnh sản phẩm: ảnh thật nếu có, fallback icon minh hoạ. Inline style để chạy với cả 2 stylesheet.
    const media = (p) => (p.image
        ? `<img src="${p.image}" alt="" loading="lazy" decoding="async" class="bxgy-img" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit">`
        : icon(p.icon));
    const clone = (sel) => sel.map((row) => [...row]);

    /* =====================================================================
       STATE
       ===================================================================== */
    let prefs = null;   // { offerId, start: empty|almost|unlocked, soldOut: on|off }
    let offer = null;   // offer đang preview
    let buys = [], gets = [];
    let tSel = [], rSel = [];   // selection: [productIndex][variantIndex] = qty
    let model = null;

    // Product của offer (kèm max / qty cố định), áp preview "sold out"
    function resolveProducts() {
        const so = prefs.soldOut === 'on';
        buys = offer.trigger.items.map((it, i, a) => {
            const base = M.products[it.id];
            const p = { ...base, max: offer.trigger.type === 'fixed' ? it.qty : it.qty || base.max, fixedQty: it.qty || 1 };
            return so && i === a.length - 1 && a.length > 1 ? soldOutCopy(p) : p;
        });
        gets = offer.reward.items.map((it, i) => {
            const p = { ...M.products[it.id], max: 1, fixedQty: it.qty || 1 };
            return so && i === 1 ? soldOutCopy(p) : p;
        });
    }

    /* =====================================================================
       START PRESETS — trạng thái ban đầu khi mở preview
       ===================================================================== */
    const fixedSel = (products, skipSoldOut) => products.map((p) => p.variants.map((_, v) => (
        v === firstAvail(p) && !(skipSoldOut && isSoldOut(p)) ? p.fixedQty : 0)));

    // Tự chọn lần lượt (1 unit / variant còn hàng, tới max) cho tới khi đạt / gần đạt điều kiện
    function autoFill(qualified) {
        const t = offer.trigger;
        const sel = zeros(buys);
        let units = 0, amount = 0;
        const unitTarget = t.type === 'mixMatch' ? t.minQty - (qualified ? 0 : 1) : Infinity;
        outer:
        for (let i = 0; i < buys.length; i++) {
            const p = buys[i];
            let taken = 0;
            for (let v = 0; v < p.variants.length && taken < p.max; v++) {
                if (!p.variants[v].available) continue;
                if (units >= unitTarget) break outer;
                if (t.type === 'spend' && (qualified ? amount >= t.minAmount : amount + p.price >= t.minAmount)) break outer;
                sel[i][v]++; taken++; units++; amount += p.price;
            }
        }
        return sel;
    }

    function pickGifts() {
        const sel = zeros(gets);
        let left = offer.reward.chooseQty;
        gets.forEach((p, i) => { if (left > 0 && !isSoldOut(p)) { sel[i][firstAvail(p)] = 1; left--; } });
        return sel;
    }

    function applyStart() {
        const t = offer.trigger, r = offer.reward;
        const start = t.type === 'fixed' ? 'fixed' : prefs.start;
        tSel = t.type === 'fixed' ? fixedSel(buys) : start === 'empty' ? zeros(buys) : autoFill(start === 'unlocked');
        rSel = r.type === 'fixed' ? fixedSel(gets, true) : start === 'unlocked' ? pickGifts() : zeros(gets);
    }

    /* =====================================================================
       MODEL — tính toàn bộ từ selection
       ===================================================================== */
    function build() {
        const t = offer.trigger, r = offer.reward;
        const units = sum(tSel.map(sum));
        const amount = sum(buys.map((p, i) => p.price * sum(tSel[i])));

        let qualified, remaining;
        if (t.type === 'fixed') { qualified = true; remaining = 0; }
        else if (t.type === 'mixMatch') { qualified = units >= t.minQty; remaining = Math.max(0, t.minQty - units); }
        else { qualified = amount >= t.minAmount; remaining = Math.max(0, t.minAmount - amount); }

        // Chưa đủ điều kiện → quà mixMatch đã chọn bị bỏ
        if (r.type === 'mixMatch' && !qualified) rSel = zeros(gets);

        const rUnits = sum(rSel.map(sum));
        const giftValue = sum(gets.map((p, i) => p.price * sum(rSel[i])));
        const availableGifts = gets.filter((p) => !isSoldOut(p)).length;
        const potential = r.type === 'fixed'
            ? sum(gets.map((p) => (isSoldOut(p) ? 0 : p.price * p.fixedQty)))
            : sum(gets.filter((p) => !isSoldOut(p)).map((p) => p.price).sort((a, b) => b - a).slice(0, r.chooseQty));
        const giftsNeeded = r.type === 'mixMatch' && qualified ? Math.max(0, Math.min(r.chooseQty, availableGifts) - rUnits) : 0;
        const blocked = t.type === 'fixed' && buys.some(isSoldOut);
        const lockable = t.type !== 'fixed';
        const canCheckout = qualified && !blocked && giftsNeeded === 0;
        // Tổng giá gốc (giá so sánh của Buys + giá trị quà khi đã mở khoá) để hiện gạch ngang cạnh tổng
        const compareTotal = sum(buys.map((p, i) => (p.compare || p.price) * sum(tSel[i]))) + (qualified ? giftValue : 0);
        const empty = t.type !== 'fixed' && units === 0;

        return { t, r, units, amount, qualified, remaining, rUnits, giftValue, potential, giftsNeeded, blocked, lockable, canCheckout, compareTotal, empty };
    }

    /* =====================================================================
       RENDER
       ===================================================================== */
    const giftWord = () => {
        const r = offer.reward;
        const many = r.type === 'fixed' ? gets.length > 1 : r.chooseQty > 1;
        return many ? 'free gifts' : 'free gift';
    };

    function renderProgress(m) {
        const { t } = m;
        if (t.type === 'fixed') {
            // Fixed: không có điều kiện → không có progress; chỉ cảnh báo khi có item hết hàng
            if (!m.blocked) return '';
            const n = buys.filter(isSoldOut).length;
            return `<p class="bxgy-included is-blocked">${icon('x')} ${plural(n, 'item')} in this bundle ${n === 1 ? 'is' : 'are'} sold out</p>`;
        }
        const target = t.type === 'mixMatch' ? t.minQty : t.minAmount;
        const now = t.type === 'mixMatch' ? m.units : m.amount;
        const track = t.type === 'mixMatch' && t.minQty <= 10
            ? Array.from({ length: t.minQty }, (_, i) => `<span class="bxgy-slot${i < m.units ? ' is-filled' : ''}"></span>`).join('')
            : `<span class="bxgy-bar"><span style="width:${Math.min(100, (now / target) * 100)}%"></span></span>`;
        const gift = `<span class="bxgy-progress-gift${m.qualified ? ' is-unlocked' : ''}">${icon('gift')}</span>`;

        let text;
        if (!m.qualified) {
            text = t.type === 'mixMatch'
                ? `Add <strong>${plural(m.remaining, `more ${offer.noun}`)}</strong> to unlock your ${giftWord()}`
                : `Spend <strong>${money2(m.remaining)} more</strong> to unlock your ${giftWord()}`;
        } else if (m.r.type === 'fixed') {
            text = `<span class="bxgy-done">Unlocked!</span> Your ${giftWord()} ${gets.length > 1 ? 'are' : 'is'} included.`;
        } else {
            text = m.giftsNeeded
                ? `<span class="bxgy-done">Unlocked!</span> Now choose ${plural(m.giftsNeeded, 'free gift')} below.`
                : `<span class="bxgy-done">Unlocked!</span> Your ${giftWord()} ${m.rUnits > 1 ? 'are' : 'is'} picked.`;
        }
        return `
            <div class="bxgy-progress${m.qualified ? ' is-done' : ''}" role="progressbar" aria-valuemin="0"
                 aria-valuemax="${target}" aria-valuenow="${Math.min(now, target)}" aria-label="Bundle progress">${track}${gift}</div>
            <p class="bxgy-progress-text" aria-live="polite">${text}</p>`;
    }

    function renderTile(m, group, p, i) {
        const type = group === 'buys' ? m.t.type : m.r.type;
        const fixed = type === 'fixed';
        const qtys = (group === 'buys' ? tSel : rSel)[i];
        const count = sum(qtys);
        const soldOut = isSoldOut(p);
        const locked = group === 'gets' && m.lockable && !m.qualified;
        const max = group === 'buys' ? p.max : offer.reward.chooseQty;
        const state = soldOut ? 'soldout' : locked ? 'locked' : fixed ? 'included'
            : count === 0 ? 'idle' : count >= max ? 'maxed' : 'selected';

        const sale = !soldOut && group === 'buys' && p.compare
            ? `<span class="bxgy-sale">-${Math.round((1 - p.price / p.compare) * 100)}%</span>` : '';
        const badge = soldOut ? '<span class="bxgy-soldout">Sold out</span>'
            : fixed ? `<span class="bxgy-count" aria-label="Quantity ${p.fixedQty}">×${p.fixedQty}</span>`
            : count ? `<span class="bxgy-count" aria-label="${count} selected">${count}</span>` : '';

        const price = group === 'gets'
            ? `<span class="bxgy-free">Free</span> <s>${money(p.price)}</s>`
            : `<span>${money(p.price)}</span>${p.compare ? ` <s>${money(p.compare)}</s>` : ''}`;
        const meta = !fixed && group === 'buys' ? `<p class="bxgy-tile-limit">Up to ${p.max}</p>` : '';
        // Product 1 variant: số lượng đã có trên badge → không lặp lại dòng variant
        const picked = !fixed && count && !isSingle(p)
            ? `<p class="bxgy-tile-variants">${p.variants.map((v, vi) => (qtys[vi]
                ? (isSingle(p) ? `×${qtys[vi]}` : `${esc(v.title)}${qtys[vi] > 1 ? ` ×${qtys[vi]}` : ''}`) : null)).filter(Boolean).join(', ')}</p>`
            : '';

        let control;
        if (soldOut) control = `<button type="button" class="bxgy-tile-btn" disabled>Sold out</button>`;
        else if (fixed) {
            const cur = p.variants[qtys.findIndex((q) => q > 0)] || p.variants[firstAvail(p)];
            control = isSingle(p)
                ? `<p class="bxgy-tile-static">One size</p>`
                : `<button type="button" class="bxgy-tile-select" aria-label="Change variant of ${esc(p.title)}"
                           data-bxgy-open-sheet${locked ? ' disabled' : ''}>${esc(cur.title)}</button>`;
        } else if (locked) control = `<button type="button" class="bxgy-tile-btn" disabled>${icon('lock')} Locked</button>`;
        // Product 1 variant: thêm thẳng, không cần mở sheet
        else if (isSingle(p) && !count) control = `<button type="button" class="bxgy-tile-btn" data-bxgy-quick-add>${icon('plus')} Add</button>`;
        else control = `<button type="button" class="bxgy-tile-btn" data-bxgy-open-sheet>${count ? 'Edit' : `${icon('plus')} Choose`}</button>`;

        return `
            <li class="bxgy-tile" data-bxgy-item data-group="${group}" data-index="${i}" data-state="${state}">
                <div class="bxgy-thumb" style="background:${p.bg};color:${p.fg}">${media(p)}${sale}${badge}</div>
                <div class="bxgy-tile-body">
                    <h4 class="bxgy-tile-title" title="${esc(p.title)}">${esc(p.title)}</h4>
                    <p class="bxgy-tile-price">${price}</p>
                    ${meta}${picked}
                </div>
                ${control}
            </li>`;
    }

    function renderBuys(m) {
        const { t } = m;
        const [title, meta] = t.type === 'fixed' ? ['In this bundle', plural(m.units, 'item')]
            : t.type === 'mixMatch' ? [`Choose any ${t.minQty}`, `${Math.min(m.units, t.minQty)} of ${t.minQty}`]
            : ['Choose your items', `${money(m.amount)} of ${money(t.minAmount)}`];
        return `
            <div data-bxgy-group="buys">
                <div class="bxgy-group-head"><h3>${title}</h3><span>${meta}</span></div>
                <ul class="bxgy-grid" data-bxgy-list="buys" data-collapsed>${buys.map((p, i) => renderTile(m, 'buys', p, i)).join('')}</ul>
                <button type="button" class="bxgy-more" data-bxgy-more="buys" data-label="${offer.noun}s" hidden></button>
            </div>`;
    }

    function renderGets(m) {
        const { r } = m;
        const pill = !m.lockable ? ''
            : m.qualified ? `<span class="bxgy-locked-pill is-unlocked">${icon('check')} Unlocked</span>`
            : `<span class="bxgy-locked-pill">${icon('lock')} Locked</span>`;
        const sub = r.type === 'fixed'
            ? (!m.lockable || m.qualified ? 'Included free with this bundle' : 'Included free once you unlock')
            : `Choose ${r.chooseQty} of ${gets.length}${m.qualified ? ` · ${m.rUnits} chosen` : ''}`;
        return `
            <div class="bxgy-gift${m.lockable && m.qualified ? ' is-unlocked' : ''}" data-bxgy-group="gets">
                <div class="bxgy-group-head">
                    <h3 class="bxgy-gift-title">${icon('gift')} Your ${giftWord()}</h3>${pill}
                </div>
                <p class="bxgy-gift-sub">${sub}</p>
                <ul class="bxgy-grid" data-bxgy-list="gets" data-collapsed>${gets.map((p, i) => renderTile(m, 'gets', p, i)).join('')}</ul>
                <button type="button" class="bxgy-more" data-bxgy-more="gets" data-label="gifts" hidden></button>
            </div>`;
    }

    function renderSummary(m) {
        const items = m.units + (m.qualified ? m.rUnits : 0);
        const save = m.blocked ? 'This bundle is currently unavailable'
            : m.qualified && m.giftValue ? `You save ${money2(m.giftValue)}`
            : `Unlock to save up to ${money2(m.potential)}`;

        let label;
        if (m.blocked) label = 'Sold out';
        else if (!m.qualified) label = m.t.type === 'mixMatch'
            ? `Add ${plural(m.remaining, `more ${offer.noun}`)} to continue`
            : `Spend ${money2(m.remaining)} more to continue`;
        else if (m.giftsNeeded) label = `Choose ${plural(m.giftsNeeded, 'free gift')} to continue`;
        else label = `Add to cart · ${money2(m.amount)}`;

        return `
            <footer class="bxgy-summary" data-bxgy-summary>
                <div>
                    ${m.empty
                        ? `<p class="bxgy-summary-label">Total</p>
                           <p class="bxgy-summary-empty">No items selected yet</p>`
                        : `<p class="bxgy-summary-label">Total · ${plural(items, 'item')}</p>
                           <p class="bxgy-summary-total">${m.compareTotal > m.amount ? `<s class="bxgy-summary-compare">${money2(m.compareTotal)}</s> ` : ''}${money2(m.amount)}</p>`}
                    <p class="bxgy-summary-save">${save}</p>
                </div>
                <button type="button" class="bxgy-cta" data-bxgy-cta${m.canCheckout ? '' : ' disabled'}>${label}</button>
            </footer>`;
    }

    /* =====================================================================
       VIEW "ecomposer" — layout theo Figma EC_App 2026, card gom action về sheet
       Card layout: merchant chọn (auto | horizontal | vertical). Auto: ≤ 4 item → horizontal.
       ===================================================================== */
    const VIEW = widget.dataset.bxgyView || 'prototype';
    const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

    function cardLayoutFor(list) {
        if (VIEW !== 'ecomposer') return 'vertical';
        const mode = prefs.cardLayout || 'auto';
        return mode === 'auto' ? (list.length <= 4 ? 'horizontal' : 'vertical') : mode;
    }

    function ctaLabel(m) {
        if (m.blocked) return 'Sold out';
        if (!m.qualified) return m.t.type === 'mixMatch'
            ? `Add ${plural(m.remaining, `more ${offer.noun}`)} to continue`
            : `Spend ${money2(m.remaining)} more to continue`;
        if (m.giftsNeeded) return `Choose ${plural(m.giftsNeeded, 'free gift')} to continue`;
        return `Add bundle to cart · ${money2(m.amount)}`;
    }

    function renderHeaderEC(m) {
        const { t } = m;
        let progress = '';
        if (t.type === 'fixed') {
            if (m.blocked) {
                const n = buys.filter(isSoldOut).length;
                progress = `<p class="bxgy-included is-blocked">${icon('x')} ${plural(n, 'item')} in this bundle ${n === 1 ? 'is' : 'are'} sold out</p>`;
            }
        } else {
            const mix = t.type === 'mixMatch';
            const target = mix ? t.minQty : t.minAmount;
            const now = mix ? m.units : m.amount;
            const p = Math.min(100, pct(now, target));
            const count = mix
                ? `${Math.min(m.units, t.minQty)}/${t.minQty} ${offer.noun}s added (${p}%)`
                : `${money(Math.min(m.amount, t.minAmount))} / ${money(t.minAmount)} spent (${p}%)`;
            let hint;
            if (!m.qualified) hint = mix
                ? `Add <strong>${plural(m.remaining, `more ${offer.noun}`)}</strong> to unlock your ${giftWord()}`
                : `Spend <strong>${money2(m.remaining)} more</strong> to unlock your ${giftWord()}`;
            else if (m.r.type === 'fixed') hint = `<span class="bxgy-done">Unlocked!</span> Your ${giftWord()} ${gets.length > 1 ? 'are' : 'is'} included.`;
            else hint = m.giftsNeeded
                ? `<span class="bxgy-done">Unlocked!</span> Now choose ${plural(m.giftsNeeded, 'free gift')} below.`
                : `<span class="bxgy-done">Unlocked!</span> Your ${giftWord()} ${m.rUnits > 1 ? 'are' : 'is'} picked.`;
            progress = `
                <div class="ec-progress">
                    <div class="ec-progress-row"><span>Your progress</span><span class="ec-progress-count">${count}</span></div>
                    <div class="bxgy-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${target}" aria-valuenow="${Math.min(now, target)}" aria-label="Bundle progress"><span style="width:${p}%"></span></div>
                    <p class="ec-progress-hint" aria-live="polite">${hint}</p>
                </div>`;
        }
        return `
            <header class="ec-header">
                <h2 id="bxgy-title" class="bxgy-title">${esc(offer.title)}</h2>
                ${offer.subtitle ? `<p class="ec-subtitle">${esc(offer.subtitle)}</p>` : ''}
                ${progress}
            </header>`;
    }

    // Card ngang (Figma): ảnh trái, info phải, 1 action duy nhất
    function renderTileH(m, group, p, i) {
        const fixed = (group === 'buys' ? m.t.type : m.r.type) === 'fixed';
        const qtys = (group === 'buys' ? tSel : rSel)[i];
        const count = sum(qtys);
        const soldOut = isSoldOut(p);
        const locked = group === 'gets' && m.lockable && !m.qualified;
        const max = group === 'buys' ? p.max : offer.reward.chooseQty;
        const state = soldOut ? 'soldout' : locked ? 'locked' : fixed ? 'included'
            : count === 0 ? 'idle' : count >= max ? 'maxed' : 'selected';

        const badge = soldOut ? '<span class="bxgy-soldout">Sold out</span>'
            : fixed ? `<span class="bxgy-count" aria-label="Quantity ${p.fixedQty}">×${p.fixedQty}</span>`
            : group === 'buys' ? `<span class="bxgy-count" aria-label="${count} of ${max} selected">${count}/${max}</span>`
            : count ? `<span class="bxgy-count" aria-label="Selected">${icon('check')}</span>` : '';

        const price = group === 'gets'
            ? `<s>${money2(p.price)}</s> <strong>Free</strong>`
            : `${p.compare ? `<s>${money2(p.compare)}</s> ` : ''}<strong>${money2(p.price)}</strong>`;
        // Dòng meta luôn có (card đều nhau, không trống):
        //  đã chọn → liệt kê variant; chưa chọn → tóm tắt option ("2 colors · 3 sizes" / "One size")
        const optionSummary = isSingle(p) ? 'One size'
            : p.options.map((o) => `${o.values.length} ${o.name.toLowerCase()}${o.values.length > 1 ? (/s$/i.test(o.name) ? 'es' : 's') : ''}`).join(' · ');
        const picked = fixed ? ''
            : count && !isSingle(p)
            ? `<p class="bxgy-tile-variants">${p.variants.map((v, vi) => (qtys[vi] ? `${esc(v.title)}${qtys[vi] > 1 ? ` ×${qtys[vi]}` : ''}` : null)).filter(Boolean).join(', ')}</p>`
            : `<p class="bxgy-tile-variants">${optionSummary}</p>`;

        let control;
        if (soldOut) control = `<button type="button" class="bxgy-tile-btn" disabled>Sold out</button>`;
        else if (locked) control = `<button type="button" class="bxgy-tile-btn" disabled>${icon('lock')} Locked</button>`;
        else if (fixed) {
            const cur = p.variants[qtys.findIndex((q) => q > 0)] || p.variants[firstAvail(p)];
            control = isSingle(p) ? `<p class="bxgy-tile-static">One size</p>`
                : `<button type="button" class="bxgy-tile-select" aria-label="Change variant of ${esc(p.title)}" data-bxgy-open-sheet>${esc(cur.title)}</button>`;
        } else if (isSingle(p)) {
            // 1 variant: stepper ngay trên card (không cần sheet)
            const canInc = group === 'buys' ? count < p.max : count < max;
            control = `
                <div class="bxgy-stepper ec-card-stepper" role="group" aria-label="Quantity of ${esc(p.title)}">
                    <button type="button" aria-label="Remove one" data-bxgy-step="-1"${count ? '' : ' disabled'}>${icon('minus')}</button>
                    <output>${count}</output>
                    <button type="button" aria-label="Add one" data-bxgy-step="1"${canInc ? '' : ' disabled'}>${icon('plus')}</button>
                </div>`;
        } else {
            control = `<button type="button" class="bxgy-tile-btn" data-bxgy-open-sheet>${count ? `Edit (${count})` : `${icon('plus')} Choose options`}</button>`;
        }

        return `
            <li class="bxgy-tile ec-card" data-bxgy-item data-group="${group}" data-index="${i}" data-state="${state}">
                <div class="bxgy-thumb ec-card-media" style="background:${p.bg};color:${p.fg}">${media(p)}${badge}</div>
                <div class="ec-card-body">
                    ${group === 'gets' ? '<span class="ec-gift-tag">Gift</span>' : ''}
                    <h4 class="bxgy-tile-title" title="${esc(p.title)}">${esc(p.title)}</h4>
                    <p class="ec-card-price">${price}</p>
                    ${picked}
                    <div class="ec-card-action">${control}</div>
                </div>
            </li>`;
    }

    function renderListEC(m, group) {
        const list = group === 'buys' ? buys : gets;
        const layout = cardLayoutFor(list);
        const tile = layout === 'horizontal' ? renderTileH : renderTile;
        return `
            <ul class="bxgy-grid${layout === 'horizontal' ? ' ec-grid-h' : ''}" data-bxgy-list="${group}" data-layout="${layout}" data-collapsed>
                ${list.map((p, i) => tile(m, group, p, i)).join('')}
            </ul>
            <button type="button" class="bxgy-more" data-bxgy-more="${group}" data-label="${group === 'buys' ? `${offer.noun}s` : 'gifts'}" hidden></button>`;
    }

    function renderGetsEC(m) {
        const { r } = m;
        const pill = !m.lockable ? ''
            : m.qualified ? `<span class="bxgy-locked-pill is-unlocked">${icon('check')} Unlocked</span>`
            : `<span class="bxgy-locked-pill">${icon('lock')} Locked</span>`;
        const sub = r.type === 'fixed'
            ? (!m.lockable || m.qualified ? 'Included free with this bundle' : 'Included free once you unlock')
            : `Choose ${r.chooseQty} of ${gets.length}${m.qualified ? ` · ${m.rUnits} chosen` : ''}`;
        return `
            <section class="ec-reward" data-bxgy-group="gets" aria-label="Free rewards">
                <div class="ec-divider"><h3 class="ec-divider-title">Your free reward${(r.type === 'fixed' ? gets.length : r.chooseQty) > 1 ? 's' : ''}</h3>${pill}</div>
                <p class="ec-reward-sub">${sub}</p>
                <div class="bxgy-gift ec-reward-panel${m.lockable && m.qualified ? ' is-unlocked' : ''}">${renderListEC(m, 'gets')}</div>
            </section>`;
    }

    function renderSummaryEC(m) {
        const items = m.units + (m.qualified ? m.rUnits : 0);
        const save = Math.max(0, m.compareTotal - m.amount);
        const total = m.empty
            ? `<p class="ec-total ec-total--empty">No items selected yet</p>`
            : `<p class="ec-total">Total ${plural(items, 'item')} in this bundle :
                   ${m.compareTotal > m.amount ? `<s>${money2(m.compareTotal)}</s>` : ''}<strong>${money2(m.amount)}</strong></p>`;
        const saveLine = m.blocked ? 'This bundle is currently unavailable'
            : m.qualified && save ? `You save <b>${money2(save)} (${pct(save, m.compareTotal)}%)</b>`
            : `Unlock to save up to <b>${money2(m.potential)}</b>`;
        return `
            <footer class="ec-summary" data-bxgy-summary>
                ${total}
                <p class="ec-save">${saveLine}</p>
                <button type="button" class="bxgy-cta" data-bxgy-cta${m.canCheckout ? '' : ' disabled'}>${ctaLabel(m)}</button>
            </footer>`;
    }

    function drawEC() {
        root.innerHTML = `
            ${renderHeaderEC(model)}
            <div data-bxgy-group="buys" class="ec-buys">${renderListEC(model, 'buys')}</div>
            ${renderGetsEC(model)}
            ${renderSummaryEC(model)}
            <div class="bxgy-toast" role="status" aria-live="polite" data-bxgy-toast hidden></div>`;
    }

    // Stepper trên card (product 1 variant)
    function stepItem(tile, d) {
        if (d > 0) return quickAdd(tile);
        const group = tile.dataset.group, i = Number(tile.dataset.index);
        const row = (group === 'buys' ? tSel : rSel)[i];
        const k = row.findIndex((q) => q > 0);
        if (k >= 0) row[k]--;
        draw();
    }

    function draw() {
        model = build();
        widget.dataset.trigger = offer.trigger.type;
        widget.dataset.reward = offer.reward.type;
        // giữ trạng thái "Show all" khi vẽ lại
        const expanded = [...widget.querySelectorAll('[data-bxgy-list]:not([data-collapsed])')].map((l) => l.dataset.bxgyList);
        if (VIEW === 'ecomposer') drawEC(); else root.innerHTML = `
            <header>
                <p class="bxgy-eyebrow">Bundle &amp; save</p>
                <h2 id="bxgy-title" class="bxgy-title">${esc(offer.title)}</h2>
                ${renderProgress(model)}
            </header>
            ${renderBuys(model)}
            <aside class="bxgy-rail">${renderGets(model)}${renderSummary(model)}</aside>
            <div class="bxgy-toast" role="status" aria-live="polite" data-bxgy-toast hidden></div>`;
        expanded.forEach((k) => widget.querySelector(`[data-bxgy-list="${k}"]`)?.removeAttribute('data-collapsed'));
        refreshMore();
    }

    /* =====================================================================
       VARIANT SHEET — chọn theo option bằng dropdown
       ===================================================================== */
    let ss = null; // { group, i, fixed, picked[], qty }

    const variantFor = (p, vals) => p.variants.find((v) => v.options.every((x, k) => x === vals[k]));
    function valueState(p, picked, k, val) {
        const vals = [...picked]; vals[k] = val;
        const v = variantFor(p, vals);
        return !v ? 'none' : v.available ? 'ok' : 'soldout';
    }
    const sheetProduct = () => (ss.group === 'buys' ? buys : gets)[ss.i];
    const sheetRow = () => (ss.group === 'buys' ? tSel : rSel)[ss.i];

    function openSheet(group, i) {
        const p = (group === 'buys' ? buys : gets)[i];
        const row = (group === 'buys' ? tSel : rSel)[i];
        const fixed = (group === 'buys' ? offer.trigger.type : offer.reward.type) === 'fixed';
        const cur = row.findIndex((q) => q > 0);
        const fresh = p.variants.findIndex((v, k) => v.available && !row[k]);
        const start = fixed ? (cur >= 0 ? cur : firstAvail(p)) : (fresh >= 0 ? fresh : cur >= 0 ? cur : firstAvail(p));
        ss = { group, i, fixed, picked: [...p.variants[start].options], qty: 1 };
        drawSheet();
        sheet.showModal();
    }

    // Giới hạn của product đang mở (reward mixMatch: chooseQty chia chung cho mọi quà)
    function sheetLimit() {
        if (ss.group === 'buys') return sheetProduct().max;
        const others = sum(rSel.filter((_, j) => j !== ss.i).map(sum));
        return Math.max(0, offer.reward.chooseQty - others);
    }

    function drawSheet() {
        const p = sheetProduct();
        const row = sheetRow();
        const count = sum(row);
        const max = ss.fixed ? count : sheetLimit();
        const left = Math.max(0, max - count);
        const v = variantFor(p, ss.picked);
        const vi = v ? p.variants.indexOf(v) : -1;
        const ok = !!(v && v.available);
        ss.qty = Math.max(1, Math.min(ss.qty, left || 1));

        const price = ss.group === 'gets'
            ? `<span class="bxgy-free">Free</span> <s>${money(p.price)}</s>`
            : `<strong>${money(p.price)}</strong>${p.compare ? ` <s>${money(p.compare)}</s>` : ''}`;

        const picks = p.variants.map((vv, k) => [vv, row[k], k]).filter(([, q]) => q);
        const picksHtml = ss.fixed ? '' : `
            <div class="bxgy-sheet-section">
                <div class="bxgy-sheet-label">
                    <span>Your picks</span>
                    <span class="${left ? '' : 'bxgy-free'}">${count} / ${max}${left ? '' : ' · limit reached'}</span>
                </div>
                ${picks.length ? `<ul class="bxgy-picks">${picks.map(([vv, q, k]) => `
                    <li class="bxgy-pick">
                        <span class="bxgy-pick-name">${isSingle(p) ? 'One size' : esc(vv.title)}</span>
                        <div class="bxgy-stepper bxgy-stepper--sm">
                            <button type="button" aria-label="Remove one" data-bxgy-pick-dec="${k}">${icon('minus')}</button>
                            <output>${q}</output>
                            <button type="button" aria-label="Add one" data-bxgy-pick-inc="${k}"${left ? '' : ' disabled'}>${icon('plus')}</button>
                        </div>
                        <button type="button" class="bxgy-pick-remove" aria-label="Remove ${esc(vv.title)}" data-bxgy-pick-remove="${k}">${icon('x')}</button>
                    </li>`).join('')}</ul>`
                : `<p class="bxgy-picks-empty">Nothing picked yet — choose options below.</p>`}
            </div>`;

        const optionsHtml = p.options.length ? `
            <div class="bxgy-options">
                ${p.options.map((o, k) => `
                    <div class="bxgy-option">
                        <label class="bxgy-option-label" for="bxgy-opt-${k}">${esc(o.name)}</label>
                        <select id="bxgy-opt-${k}" class="bxgy-option-select" data-bxgy-opt-select="${k}">${o.values.map((val) => {
                            const st = valueState(p, ss.picked, k, val);
                            return `<option value="${esc(val)}"${val === ss.picked[k] ? ' selected' : ''}>${esc(val)}${st === 'soldout' ? ' — Sold out' : st === 'none' ? ' — Unavailable' : ''}</option>`;
                        }).join('')}</select>
                    </div>`).join('')}
            </div>` : '';

        const status = !v ? 'Unavailable' : !v.available ? 'Sold out' : '';
        const name = v ? (isSingle(p) ? 'One size' : esc(v.title)) : '—';
        const foot = ss.fixed
            ? `<div class="bxgy-sheet-foot">
                   <div class="bxgy-foot-variant"><span>${name}</span><small>${status || `Qty ${count} · included`}</small></div>
                   <button type="button" class="bxgy-cta bxgy-cta--sm" data-bxgy-sheet-apply${ok ? '' : ' disabled'}>Select</button>
               </div>`
            : `<div class="bxgy-sheet-foot">
                   <div class="bxgy-foot-variant"><span>${name}</span><small>${status || (left ? `${plural(left, 'more')} allowed` : 'Limit reached')}</small></div>
                   <div class="bxgy-stepper">
                       <button type="button" aria-label="Decrease quantity" data-bxgy-qty="-1"${ss.qty > 1 ? '' : ' disabled'}>${icon('minus')}</button>
                       <output>${ss.qty}</output>
                       <button type="button" aria-label="Increase quantity" data-bxgy-qty="1"${ss.qty < left ? '' : ' disabled'}>${icon('plus')}</button>
                   </div>
                   <button type="button" class="bxgy-cta bxgy-cta--sm" data-bxgy-sheet-add="${vi}"${ok && left ? '' : ' disabled'}>Add</button>
               </div>`;

        sheetBody.innerHTML = `
            <div class="bxgy-sheet-head">
                <div class="bxgy-thumb bxgy-thumb--sm" style="background:${p.bg};color:${p.fg}">${media(p)}</div>
                <div class="min-w-0 flex-1">
                    <h3 id="bxgy-sheet-title" class="bxgy-sheet-title">${esc(p.title)}</h3>
                    <p class="bxgy-sheet-price">${price}${ss.fixed ? ` · qty ${count}` : ` · up to ${max}`}</p>
                </div>
                <button type="button" class="bxgy-icon-btn" aria-label="Close" data-bxgy-sheet-close>${icon('x')}</button>
            </div>
            <div class="bxgy-sheet-scroll">${picksHtml}${optionsHtml}</div>
            ${foot}`;
    }

    // Sửa selection của product đang mở → vẽ lại widget + sheet
    function commit(mutate) {
        mutate(sheetRow());
        draw();
        if (sheet.open) drawSheet();
    }

    /* =====================================================================
       QUICK ADD — product 1 variant: +1 ngay trên card
       Quà mixMatch đã đủ số lượng chọn → đổi quà (bỏ quà chọn trước, chọn quà này)
       ===================================================================== */
    function quickAdd(tile) {
        const group = tile.dataset.group;
        const i = Number(tile.dataset.index);
        const p = (group === 'buys' ? buys : gets)[i];
        const k = firstAvail(p);
        if (group === 'buys') {
            if (sum(tSel[i]) < p.max) tSel[i][k]++;
        } else {
            const others = rSel.map((row, j) => (j === i ? 0 : sum(row)));
            if (sum(others) >= offer.reward.chooseQty) {
                const j = others.findIndex((n) => n > 0);
                rSel[j] = rSel[j].map(() => 0);
            }
            rSel[i][k] = 1;
        }
        draw();
    }

    /* =====================================================================
       ADD TO CART (mock) — chỉ hiển thị kết quả, chưa gọi /cart/add.js
       ===================================================================== */
    function cartLines() {
        const lines = [];
        const push = (products, sel, free) => products.forEach((p, i) => p.variants.forEach((v, k) => {
            if (sel[i][k]) lines.push({ product: p.title, variant: isSingle(p) ? null : v.title, quantity: sel[i][k], price: free ? 0 : p.price });
        }));
        push(buys, tSel, false);
        if (model.qualified) push(gets, rSel, true);
        return lines;
    }
    function addToCart() {
        const lines = cartLines();
        console.table(lines); // payload mẫu để đối chiếu khi làm thật
        const toast = widget.querySelector('[data-bxgy-toast]');
        toast.innerHTML = `${icon('check')} Added ${plural(sum(lines.map((l) => l.quantity)), 'item')} to cart <small>(prototype)</small>`;
        toast.hidden = false;
        clearTimeout(addToCart.t);
        addToCart.t = setTimeout(() => (toast.hidden = true), 2600);
    }

    /* =====================================================================
       COLLAPSE (Show all / Show less)
       ===================================================================== */
    function refreshMore() {
        widget.querySelectorAll('[data-bxgy-more]').forEach((btn) => {
            const list = widget.querySelector(`[data-bxgy-list="${btn.dataset.bxgyMore}"]`);
            if (!list) return;
            const items = [...list.children];
            const expanded = !list.hasAttribute('data-collapsed');
            if (expanded) list.setAttribute('data-collapsed', '');
            const hidden = items.filter((li) => getComputedStyle(li).display === 'none').length;
            if (expanded) list.removeAttribute('data-collapsed');
            btn.hidden = hidden === 0;
            btn.setAttribute('aria-expanded', String(expanded));
            btn.textContent = expanded ? 'Show less' : `Show all ${items.length} ${btn.dataset.label}`;
        });
    }
    new ResizeObserver(refreshMore).observe(widget);

    /* =====================================================================
       EVENTS
       ===================================================================== */
    widget.addEventListener('click', (e) => {
        const t = e.target;
        if (t === sheet || t.closest('[data-bxgy-sheet-close]')) return sheet.close();

        const step = t.closest('[data-bxgy-step]');
        if (step) return stepItem(step.closest('[data-bxgy-item]'), Number(step.dataset.bxgyStep));

        const quick = t.closest('[data-bxgy-quick-add]');
        if (quick) return quickAdd(quick.closest('[data-bxgy-item]'));

        const opener = t.closest('[data-bxgy-open-sheet]');
        if (opener) {
            const tile = opener.closest('[data-bxgy-item]');
            return openSheet(tile.dataset.group, Number(tile.dataset.index));
        }
        const more = t.closest('[data-bxgy-more]');
        if (more) {
            widget.querySelector(`[data-bxgy-list="${more.dataset.bxgyMore}"]`).toggleAttribute('data-collapsed');
            return refreshMore();
        }
        if (t.closest('[data-bxgy-cta]:not(:disabled)')) return addToCart();

        // --- trong sheet ---
        const q = t.closest('[data-bxgy-qty]');
        if (q) { ss.qty += Number(q.dataset.bxgyQty); return drawSheet(); }

        const add = t.closest('[data-bxgy-sheet-add]');
        if (add) {
            const k = Number(add.dataset.bxgySheetAdd);
            return commit((row) => { row[k] += ss.qty; ss.qty = 1; });
        }
        const apply = t.closest('[data-bxgy-sheet-apply]');
        if (apply) {
            const p = sheetProduct();
            const k = p.variants.indexOf(variantFor(p, ss.picked));
            commit((row) => { const n = sum(row); row.fill(0); row[k] = n; });
            return sheet.close();
        }
        const inc = t.closest('[data-bxgy-pick-inc]');
        if (inc) return commit((row) => { row[Number(inc.dataset.bxgyPickInc)]++; });
        const dec = t.closest('[data-bxgy-pick-dec]');
        if (dec) return commit((row) => { row[Number(dec.dataset.bxgyPickDec)]--; });
        const rm = t.closest('[data-bxgy-pick-remove]');
        if (rm) return commit((row) => { row[Number(rm.dataset.bxgyPickRemove)] = 0; });
    });

    sheet.addEventListener('change', (e) => {
        const sel = e.target.closest('[data-bxgy-opt-select]');
        if (sel) { ss.picked[Number(sel.dataset.bxgyOptSelect)] = sel.value; drawSheet(); }
    });

    /* =====================================================================
       PUBLIC API (dev preview bar gọi vào)
       ===================================================================== */
    const DEFAULTS = { offerId: 'mix-mix', start: 'almost', soldOut: 'off', cardLayout: 'auto' };
    function load(p) {
        prefs = { ...DEFAULTS, ...p };
        offer = M.offers.find((o) => o.id === prefs.offerId) || M.offers[0];
        if (sheet.open) sheet.close();
        resolveProducts();
        applyStart();
        draw();
    }
    window.BXGY = { load, offers: M.offers, DEFAULTS, getState: () => ({ offer, tSel: clone(tSel), rSel: clone(rSel), model }) };
    load(DEFAULTS);
})();
