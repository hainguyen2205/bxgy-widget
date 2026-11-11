// Mock data cho prototype BXGY widget.
// Cấu trúc gần với Shopify: product → options [{name, values}] → variants [{title, options[], available}]
window.BXGY_MOCK = (function () {
    // [nền, màu icon] cho thumbnail placeholder
    const PALETTE = [
        ['#efe8dc', '#d9cbb1'], ['#e4eadf', '#aebda4'], ['#f2e3da', '#d8ab95'], ['#e3e7f0', '#7d8bab'],
        ['#ece4ef', '#b49cc0'], ['#e0ecec', '#8fb5b5'], ['#f3ecd6', '#d4bc78'], ['#ebe6e1', '#a8998a'],
    ];

    // Tích Descartes các option → toàn bộ variant
    const cartesian = (options) => options.reduce((acc, o) => acc.flatMap((a) => o.values.map((v) => [...a, v])), [[]]);
    function makeVariants(options, seed) {
        if (!options.length) return [{ title: 'Default', options: [], available: true }];
        return cartesian(options).map((vals, idx) => ({
            title: vals.join(' / '),
            options: vals,
            available: (seed * 3 + idx * 5) % 11 !== 4, // rải vài variant hết hàng
        }));
    }

    const SIZES = ['S', 'M', 'L'];

    // Product lớn: 3 option, 12 × 6 × 3 = 216 variant (đại diện case nhiều variant)
    const BIG_OPTIONS = [
        { name: 'Color', values: ['White', 'Black', 'Navy', 'Sage', 'Clay', 'Cream', 'Oat', 'Charcoal', 'Sand', 'Moss', 'Rust', 'Pink'] },
        { name: 'Size', values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
        { name: 'Fit', values: ['Regular', 'Slim', 'Relaxed'] },
    ];

    // [title, price, compareAt, max per bundle, colors | null = dùng BIG_OPTIONS]
    const TEES = [
        ['Classic Cotton Tee', 25, 32, 2, null],
        ['Oversized Graphic Tee', 32, null, 3, ['Sage']],
        ['Heavyweight Pocket Tee', 28, 35, 3, ['Clay', 'Cream']],
        ['Boxy Crew Tee', 30, 38, 2, ['Navy']],
        ['Ribbed Tank Top', 22, null, 3, ['White', 'Black']],
        ['Long Sleeve Waffle Tee', 36, 45, 2, ['Oat']],
        ['Vintage Wash Tee', 34, null, 3, ['Charcoal']],
        ['Relaxed Linen Tee', 38, 48, 2, ['Sand']],
        ['Striped Breton Tee', 33, null, 3, ['Navy / White']],
        ['Raglan Baseball Tee', 29, 36, 3, ['Grey']],
        ['Organic Slub Tee', 27, null, 3, ['Moss']],
        ['Henley Button Tee', 35, 42, 2, ['Ecru']],
        ['Cropped Box Tee', 26, null, 3, ['Pink']],
        ['Mock Neck Tee', 31, 39, 2, ['Black']],
        ['Garment Dyed Tee', 30, null, 3, ['Rust']],
    ];

    // [title, price, icon, colors | null = 1 variant]
    const GIFTS = [
        ['Logo Baseball Cap', 18, 'cap', ['Navy', 'Black']],
        ['Canvas Tote Bag', 15, 'gift', null],
        ['Crew Socks 2-Pack', 12, 'gift', ['S / M', 'L / XL']],
        ['Knit Beanie', 20, 'cap', ['Oat', 'Charcoal']],
        ['Enamel Pin Set', 9, 'gift', null],
        ['Bucket Hat', 22, 'cap', ['Khaki', 'Black']],
        ['Bandana', 10, 'gift', ['Red', 'Navy']],
        ['Sticker Pack', 6, 'gift', null],
        ['Woven Keychain', 8, 'gift', null],
        ['Sport Headband', 11, 'gift', ['White', 'Black']],
    ];

    const buys = TEES.map(([title, price, compare, max, colors], i) => {
        const options = colors
            ? [{ name: 'Color', values: colors }, { name: 'Size', values: SIZES }]
            : BIG_OPTIONS;
        return {
            id: `b${i + 1}`,
            title, price, compare, max,
            icon: 'tee',
            bg: PALETTE[i % PALETTE.length][0],
            fg: PALETTE[i % PALETTE.length][1],
            options,
            variants: makeVariants(options, i),
        };
    });

    const gets = GIFTS.map(([title, price, icon, colors], i) => {
        const options = colors ? [{ name: colors[0].includes('/') ? 'Size' : 'Color', values: colors }] : [];
        return {
            id: `g${i + 1}`,
            title, price, compare: price, max: 1,
            icon,
            bg: PALETTE[(i + 3) % PALETTE.length][0],
            fg: PALETTE[(i + 3) % PALETTE.length][1],
            options,
            variants: makeVariants(options, i + 20),
        };
    });

    // Catalog tra theo id
    const products = Object.fromEntries([...buys, ...gets].map((p) => [p.id, p]));

    /* =====================================================================
       OFFERS — mỗi offer là 1 case preview (trigger type × reward type)
       trigger.items: [{ id, qty }]  qty = số lượng cố định (fixed) | max mỗi product (mixMatch/spend, mặc định product.max)
       reward.items:  [{ id, qty }]  qty = số lượng tặng (fixed)
       noun: danh từ dùng trong câu chữ progress / CTA
       ===================================================================== */
    const T = (ids, qtys = []) => ids.map((id, i) => ({ id, qty: qtys[i] }));
    const offers = [
        {
            id: 'fixed-fixed', label: 'Fixed → Fixed',
            title: 'Get the Starter Set + a free cap',
            noun: 'item',
            trigger: { type: 'fixed', items: T(['b1', 'b2', 'b3'], [1, 2, 1]) },
            reward:  { type: 'fixed', items: T(['g1'], [1]) },
        },
        {
            id: 'fixed-mix', label: 'Fixed → Mix & match',
            title: 'Buy the Starter Set, pick a free gift',
            noun: 'item',
            trigger: { type: 'fixed', items: T(['b1', 'b2', 'b3'], [1, 2, 1]) },
            reward:  { type: 'mixMatch', chooseQty: 1, items: T(['g1', 'g2', 'g3']) },
        },
        {
            id: 'mix-fixed', label: 'Mix & match → Fixed',
            title: 'Buy any 4 tees, get free socks',
            noun: 'tee',
            trigger: { type: 'mixMatch', minQty: 4, items: T(['b1', 'b2', 'b3']) },
            reward:  { type: 'fixed', items: T(['g3'], [1]) },
        },
        {
            id: 'mix-mix', label: 'Mix & match → Mix & match',
            title: 'Buy any 3 tees, choose a free gift',
            noun: 'tee',
            trigger: { type: 'mixMatch', minQty: 3, items: T(['b1', 'b2', 'b3']) },
            reward:  { type: 'mixMatch', chooseQty: 1, items: T(['g1', 'g2']) },
        },
        {
            id: 'spend-fixed', label: 'Spend → Fixed',
            title: 'Spend $100, get a free tote',
            noun: 'item',
            trigger: { type: 'spend', minAmount: 100, items: T(['b4', 'b5', 'b6']) },
            reward:  { type: 'fixed', items: T(['g2'], [1]) },
        },
        {
            id: 'spend-mix', label: 'Spend → Mix & match',
            title: 'Spend $120, choose 2 free gifts',
            noun: 'item',
            trigger: { type: 'spend', minAmount: 120, items: T(['b1', 'b2', 'b3']) },
            reward:  { type: 'mixMatch', chooseQty: 2, items: T(['g1', 'g4', 'g6']) },
        },
        {
            id: 'stress', label: 'Stress: 15 buys / 10 gifts',
            title: 'Buy any 5 tees, choose a free gift',
            noun: 'tee',
            trigger: { type: 'mixMatch', minQty: 5, items: T(buys.map((p) => p.id)) },
            reward:  { type: 'mixMatch', chooseQty: 1, items: T(gets.map((p) => p.id)) },
        },
    ];

    return { currency: '$', products, offers };
})();
