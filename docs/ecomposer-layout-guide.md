# BXGY Widget — Hướng dẫn cải thiện layout EComposer

> **Đối tượng đọc:** AI agent (hoặc dev) được giao nâng cấp **layout BXGY widget hiện có của EComposer** (bản theo Figma *EC_App 2026 › EXT for app*, node `687-44`) lên phiên bản đã được cải thiện trong repo này.
>
> **Bản tham chiếu (source of truth):** `ecomposer.html` + `ecomposer.css` + `bxgy-ec2026.css` + `script.js` (view `ecomposer`). Chạy bằng Live Server → `http://127.0.0.1:5500/ecomposer.html`, dùng preview bar để đổi offer / state / card layout / width.

---

## 0. Cách dùng tài liệu này

1. Đọc **§1 Nguyên tắc** — đây là ràng buộc cứng, không được vi phạm.
2. Đọc **§2 Tóm tắt thay đổi** để biết bản cũ khác bản mới ở đâu.
3. Đối chiếu code cũ với từng mục **§3 → §9**, sửa theo spec. Mỗi mục có giá trị đo cụ thể.
4. Chạy **§11 Checklist nghiệm thu** — tất cả phải đạt trước khi coi là xong.
5. Không tự quyết các mục trong **§12 Câu hỏi mở** — hỏi lại người phụ trách.

---

## 1. Nguyên tắc (bắt buộc)

- **Giữ layout tổng thể của designer**: header căn giữa → danh sách trigger → khối reward → summary căn giữa → CTA full width. Chỉ cải thiện **cách tổ chức product card** và **responsive**.
- **Không tạo design language mới.** Mọi màu / viền / radius / font / spacing phải lấy từ token ở §3. Không dùng giá trị tùy tiện.
- **Không shadow** (design system EC_App 2026 là flat).
- **Một design system cho mọi extension** — dùng chung token, không hard-code lại trong từng component.
- **Container query, không media query** cho layout widget (widget nằm trong section có width bất kỳ). Media query chỉ dùng cho sheet/dialog (bám viewport).
- **Không đổi business logic** khi chỉ sửa layout. Logic tham chiếu nằm ở §8.

---

## 2. Tóm tắt thay đổi so với layout cũ (Figma)

| Vấn đề ở layout cũ | Cải thiện |
|---|---|
| Product card nhồi ảnh + badge + title + giá + **select variant + stepper + "Add items"** trong ~260px → chật, variant bị cắt, không scale khi product có 3 option / tới 2048 variant | **Gom mọi option vào 1 action** → mở **variant sheet** (chọn theo option bằng dropdown). Card chỉ còn hiển thị + 1 nút |
| Chỉ có card ngang | **2 layout card: Horizontal / Vertical**, merchant chọn, mặc định **Auto** (≤ 4 item → horizontal, > 4 → vertical) |
| Danh sách dài làm widget rất dài | Grid nhiều cột + **thu gọn "Show all"** theo số hàng |
| Ảnh kích thước cố định | Ảnh **vuông, co giãn theo card** (36% width, 84–120px), content **căn giữa dọc** khi ảnh cao hơn |
| Title xuống 2 dòng, card to nhỏ không đều | **Title 1 dòng** (ellipsis + tooltip), **mọi card trong 1 grid cao bằng nhau** |
| Card chưa chọn bị trống | **Dòng meta luôn có**: variant đã chọn **hoặc** tóm tắt option ("2 colors · 3 sizes" / "One size") |
| Product 1 variant vẫn phải qua select + Add | **Stepper ngay trên card**, không mở sheet |
| Width lớn tách 2 cột (trigger \| reward) | **Luôn 1 cột**, width lớn → **nhiều card / hàng** hơn |
| Tổng chỉ có 1 con số | `Total N items in this bundle : ~~$198.00~~ **$146.00**` + `You save $52.00 (26%)` |
| "$0.00" khi chưa chọn | Empty state: "No items selected yet" |

---

## 3. Design tokens (EC_App 2026) — đo trực tiếp từ Figma

Khai báo một lần trên root widget (`.bxgy-widget`), mọi component tham chiếu biến. File tham chiếu: `bxgy-ec2026.css` §1.

### Màu
| Token | Giá trị | Dùng cho |
|---|---|---|
| `--ec-ink` | `#000000` | text, nút primary, viền active |
| `--ec-ink-60` | `rgb(0 0 0 / .60)` | text phụ, giá so sánh |
| `--ec-ink-20` | `rgb(0 0 0 / .20)` | viền mặc định, CTA disabled, icon disabled |
| `--ec-ink-10` | `rgb(0 0 0 / .10)` | viền nhạt (reward card) |
| `--ec-ink-08` | `rgb(0 0 0 / .08)` | track progress |
| `--ec-ink-04` | `rgb(0 0 0 / .04)` | nền phụ (reward panel, disabled btn) |
| `--ec-tag` | `rgb(17 0 0 / .08)` | tag trung tính (LOCKED) |
| `--ec-surface` | `#FFFFFF` | nền |
| `--ec-success` | `#1C9622` | progress fill, progress count, badge maxed |
| `--ec-lime` | `#D9FA74` | tag GIFT, pill UNLOCKED, gift icon unlocked |
| `--ec-danger` | `#AE1310` | số tiền tiết kiệm |

### Radius · Size · Spacing
| Token | Giá trị | | Token | Giá trị |
|---|---|---|---|---|
| `--ec-r-badge` | 2px | | `--ec-control-h` | 28px (select, nút nhỏ, stepper) |
| `--ec-r-control` | 4px | | `--ec-cta-h` | 52px |
| `--ec-r-card` | 8px | | `--ec-tag-h` | 20px |
| `--ec-r-container` | 10px | | `--ec-progress-h` | 7px |
| `--ec-r-panel` | 12px | | spacing | 4 · 6 · 10 · 16px (`--ec-space-1..4`) |
| `--ec-r-pill` | 100px | | | |

### Typography (Inter)
| Vai trò | Size / weight | Ghi chú |
|---|---|---|
| Title widget | 20 / 600 | uppercase, center |
| Subtitle | 14 / 500 | center |
| Section title (reward) | 14 / 600 | uppercase |
| Product title | 14 / 500 | **1 dòng** |
| Giá | 14 / 600 | |
| Giá so sánh | 14 / 400 | `--ec-ink-60`, gạch ngang |
| Label nhỏ ("Your progress", option label) | 12 / 600 | |
| Meta / input text | 12 / 400 | |
| Tag / badge | 10 / 600 | uppercase |
| Total | 20 / 600 | |
| CTA | 18 / 600 | trắng |

---

## 4. Cấu trúc widget (luôn 1 cột)

```
section.bxgy-widget[data-bxgy-view="ecomposer"]      viền 2px --ec-ink-20, radius 10, padding 16 (≥896px: 24), max-width 1200 căn giữa
 └ .bxgy-layout (grid 1 cột, gap 20–24)
    ├ header.ec-header            title · subtitle · progress (§5)
    ├ .ec-buys                    ul.bxgy-grid[data-bxgy-list="buys"][data-layout] + nút Show all
    ├ section.ec-reward           divider title + pill · sub · panel(ul.bxgy-grid[data-bxgy-list="gets"]) (§7)
    └ footer.ec-summary           total · save · CTA (§7)
 └ dialog.bxgy-sheet              variant sheet (§6)
```

**Lưu ý kỹ thuật:** `.bxgy-widget` có viền 2px → container query đo *content-box*. Các mốc phải trừ 4px: 560px → `34.75rem`, 768 → `47.75rem`, 896 → `55.75rem`, 992 → `61.75rem`, 1152 → `71.75rem`.

---

## 5. Header + progress

- Title, subtitle căn giữa (token §3).
- **Progress chỉ có khi trigger tự chọn** (`mixMatch` / `spend`). Trigger `fixed` **không có progress** — chỉ hiện cảnh báo đỏ khi có item hết hàng: `✕ 1 item in this bundle is sold out`.
- Khối progress `max-width: 460px`, căn giữa:
  - Hàng trên: `Your progress` (12/600, trái) — `2/3 tees added (67%)` hoặc `$114 / $120 spent (95%)` (12/600, `--ec-success`, phải).
  - Bar liền: cao 7px, radius 100, track `--ec-ink-08`, fill `--ec-success`.
  - Hint (14/500, center): chưa đạt → `Add **1 more tee** to unlock your free gift` / `Spend **$6.00 more** …`; đạt → `**Unlocked!** …` (chữ "Unlocked!" màu success).

---

## 6. Product card (trọng tâm cải thiện)

### 6.1 Chọn layout card
- Setting merchant: `cardLayout = auto | horizontal | vertical` (mặc định `auto`).
- `auto`: **mỗi group xét riêng** — group có ≤ 4 item → horizontal, > 4 → vertical.

### 6.2 Horizontal card
```
li.bxgy-tile.ec-card   grid: [ảnh clamp(84px, 36%, 120px)] [nội dung 1fr], gap 10, padding 10,
                       viền 1px --ec-ink-20 (inset), radius 8, align-items: center
 ├ .ec-card-media      VUÔNG (aspect-ratio 1), ảnh object-fit: cover, radius 4
 │                     badge góc trên phải (§6.5)
 └ .ec-card-body       flex column, gap 6, align-self: stretch, justify-content: CENTER
    ├ [tag GIFT]       chỉ reward
    ├ title            1 dòng
    ├ price            <s>compare</s> <strong>price</strong>
    ├ meta             1 dòng (§6.4)
    └ action           1 control duy nhất, full width (§6.6)
```
- % trong `grid-template-columns` tính theo chính card → cột ảnh luôn khớp card. **Không** dùng `cqi` khai báo trên chính card (cqi trên container tự tham chiếu container cha → lệch cột).
- Khi ảnh cao hơn nội dung (card rộng) → **căn giữa nội dung theo chiều dọc**, **không** thu nhỏ ảnh, **không** kéo ảnh thành hình chữ nhật đứng.

Giá trị đo (card trigger):
| Widget | Card | Ảnh |
|---|---|---|
| 375 | 339 × 135 | 115 × 115 |
| 560 | 257 × 117 | 85 × 85 |
| 705 | 330 × 131 | 111 × 111 |

### 6.3 Vertical card
Ảnh vuông trên cùng (badge sale trái / count phải) → title 1 dòng → giá → `Up to N` → meta → action ở đáy.

### 6.4 Quy tắc chung mọi card
- **Title 1 dòng**: `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;` + thuộc tính `title="<tên đầy đủ>"`.
- **Card đều nhau**: grid có `grid-auto-rows: 1fr` → mọi card trong cùng grid cao bằng nhau.
- **Dòng meta luôn có** (12/400, `--ec-ink-60`, 1 dòng ellipsis), trừ card `fixed`:
  - đã chọn variant → `White / XS / Regular, White / XS / Slim`
  - chưa chọn → tóm tắt option: `2 colors · 3 sizes`, `12 colors · 6 sizes · 3 fits`
  - product 1 variant → `One size`

### 6.5 Badge trên ảnh
| Trường hợp | Badge | Style |
|---|---|---|
| Trigger chọn tự do | `count/max` (vd `0/3`, `2/2`) | nền `#000`, radius 2, 10/600 trắng, cao 20; **maxed → nền `--ec-success`** |
| Fixed | `×qty` | như trên |
| Reward đã chọn | icon ✓ | như trên |
| Hết hàng | `SOLD OUT` | giữa đáy ảnh, uppercase |

### 6.6 Action — đúng 1 control / card
| Trường hợp | Control |
|---|---|
| Chọn tự do, nhiều variant | nút 28px viền `--ec-ink-20`: `+ Choose options` → khi có chọn: `Edit (n)` → mở sheet |
| Chọn tự do, **1 variant** | **stepper inline** `− n +` (không mở sheet). Reward đã đủ số quà → bấm `+` ở quà khác sẽ **đổi quà** |
| Fixed, nhiều variant | nút dạng select hiện variant hiện tại (`Sage / S ▾`) → mở sheet mode Select |
| Fixed, 1 variant | ô tĩnh `One size` (nền `--ec-ink-04`) |
| Reward bị khoá | nút disabled `🔒 Locked` |
| Hết hàng | nút disabled `Sold out` |

Hover nút/select: viền `--ec-ink-20` → `--ec-ink`. Disabled: nền `--ec-ink-04`, chữ `--ec-ink-60`, không viền.

### 6.7 Trạng thái card (`data-state`)
| State | Hiển thị |
|---|---|
| `idle` | viền 1px `--ec-ink-20` |
| `selected` / `maxed` | viền **2px `--ec-ink`** (inset, không lệch layout) |
| `included` (fixed) | viền 1px `--ec-ink-20` |
| `locked` (reward) | ảnh + nội dung (trừ action) `opacity: .4` |
| `soldout` | nền `--ec-ink-04`, viền `--ec-ink-10`, ảnh xám + `opacity .4`, text `--ec-ink-60` |

### 6.8 Grid & thu gọn (widget luôn 1 cột)
| Width widget | Horizontal | Vertical |
|---|---|---|
| < 560 | 1 cột | 2 cột |
| ≥ 560 | 2 cột | 3 cột |
| ≥ 768 | 2 cột | 4 cột |
| ≥ 896 | **3 cột** | 4 cột |
| ≥ 992 | 3 cột | 5 cột |
| ≥ 1152 | 3 cột | 6 cột |

Thu gọn (nút `Show all N tees` / `Show less`, 28px, full width): **Buys hiện 2 hàng**; **Reward hiện 1 hàng (vertical) / tối đa 2 hàng (horizontal)** để không ẩn quà đã chọn. Nút chỉ hiện khi thật sự có item bị ẩn.

> Bẫy CSS đã gặp: rule "reset hiển thị" (`li:nth-child(n){display:…}`) và rule ẩn (`li:nth-child(n+K){display:none}`) ở các mốc khác nhau phải có **cùng specificity** (cùng bộ attribute `[data-bxgy-list][data-layout][data-collapsed]`) để rule viết sau thắng.

---

## 7. Reward block & Summary

### Reward
- **Divider title**: `── YOUR FREE REWARD(S) [pill] ──` — line 1px `--ec-ink-20`, title 14/600 uppercase.
- **Pill lock chỉ có khi trigger tự chọn** (`mixMatch`/`spend`): `🔒 LOCKED` (nền `--ec-tag`) / `✓ UNLOCKED` (nền `--ec-lime`); cao 22, radius 4, 10/600. Trigger `fixed` → **không có pill, không bao giờ khoá**.
- Sub (12/400, `--ec-ink-60`, center): `Choose 2 of 3 · 2 chosen` / `Included free with this bundle`.
- Panel: nền `--ec-ink-04`, viền **2px** (`--ec-ink-20` khi khoá; `--ec-ink` khi mở khoá **hoặc** trigger fixed), radius 12, padding 10.
- Reward card: viền 1px `--ec-ink-10`; tag `GIFT` (lime, 20px, 10/600); giá `<s>$18.00</s> Free`.

### Summary (căn giữa)
- `Total 7 items in this bundle :  ~~$200.00~~  $146.00` — label 14/500, giá gốc 14/500 `--ec-ink-60` gạch ngang, total 20/600.
  - Giá gốc = Σ(compare_at ‖ price) × qty của trigger + giá trị quà (khi đã mở khoá).
- Dòng save (12/400): `You save **$52.00 (26%)**` (số tiền 600, `--ec-danger`); chưa đạt: `Unlock to save up to **$18.00**`.
- Empty state (chưa chọn gì): `No items selected yet` thay cho `$0.00`.
- CTA full width, 52px, radius 8, nền `#000` / disabled nền `--ec-ink-20`, 18/600 trắng. Label:
  | Tình huống | Label |
  |---|---|
  | mixMatch chưa đạt | `Add 1 more tee to continue` |
  | spend chưa đạt | `Spend $6.00 more to continue` |
  | đạt nhưng chưa chọn quà | `Choose 1 free gift to continue` (disabled) |
  | fixed có item hết hàng | `Sold out` (disabled) |
  | sẵn sàng | `Add bundle to cart · $146.00` |

---

## 8. Variant sheet (thay cho select/stepper trên card)

- `<dialog>`: bottom sheet (viewport < 640px, radius 10 trên) / modal giữa màn hình (≥ 640px, rộng 26rem, viền 2px `--ec-ink-20`, radius 10). Backdrop `rgb(0 0 0 / .6)`. Không shadow.
- **Head**: thumb vuông 56px · title 14/600 · `$25 ~~$32~~ · up to 2` · nút đóng 28px (viền `--ec-ink-20`).
- **Your picks** (mode chọn tự do): label 12/600 + `2 / 2 · limit reached` (success). Mỗi dòng: tên variant 14/500 · stepper 28px · nút ✕ (hover chữ `--ec-danger`). Rỗng → `Nothing picked yet — choose options below.`
- **Options**: **mọi option dùng dropdown** (đồng nhất, scale tới 2048 variant) — **không** dùng pill/swatch. Label 12/600 trên, select 28px viền `--ec-ink-20`, xếp grid `repeat(auto-fit, minmax(6.5rem, 1fr))` (3 option nằm 1 hàng). Giá trị tạo tổ hợp hết hàng/không tồn tại: ghi `— Sold out` / `— Unavailable` (vẫn chọn được).
- **Mặc định khi mở**: tổ hợp **còn hàng và chưa có trong Your picks** (fixed: variant đang chọn).
- **Footer**: tên variant + trạng thái (`1 more allowed` / `Limit reached` / `Sold out`) · stepper · nút `Add` (CTA). Fixed mode: chỉ nút `Select` (đổi variant cho qty cố định).
- Dữ liệu: dùng `product.options_with_values` + availability theo option; khi > 250 variant, `product.variants` trong Liquid không đủ → resolve variant theo tổ hợp option (vd Storefront API `variantBySelectedOptions`). *(Cần xác minh lại với tài liệu Shopify hiện hành trước khi implement.)*

---

## 9. Logic tham chiếu (không đổi khi làm layout)

| Trigger | Điều kiện | Progress | Reward lock |
|---|---|---|---|
| `fixed` | luôn đạt (qty cố định / product, đổi được variant) | không có | **không có khoá** |
| `mixMatch` | tổng quantity ≥ `minQty` | slot/bar theo quantity | khoá khi chưa đạt |
| `spend` | tổng tiền ≥ `minAmount` | bar theo tiền | khoá khi chưa đạt |

| Reward | Hành vi |
|---|---|
| `fixed` | tặng cố định (qty cố định, đổi được variant). Quà hết hàng → bỏ khỏi danh sách tặng & savings |
| `mixMatch` | chọn `chooseQty` quà. Rơi xuống dưới điều kiện → **tự bỏ quà đã chọn**. Đã đủ số quà → chọn quà khác = đổi quà |

- `max` mỗi product (vd "Up to 2") giới hạn tổng qty mọi variant của product đó.
- Trigger `fixed` có item hết hàng → bundle **blocked** (CTA `Sold out`).

---

## 10. Accessibility
- Focus: `:focus-visible { outline: 2px solid var(--ec-ink); outline-offset: 2px }` — bỏ outline mặc định browser.
- Progress: `role="progressbar"` + `aria-valuemin/max/now`; hint `aria-live="polite"`.
- Select/option có `<label for>`; nút icon có `aria-label`; badge số lượng có `aria-label`.
- Ảnh product trong card: `alt=""` (title đã có cạnh bên), `loading="lazy"`.
- **Đã biết chưa đạt** (chờ quyết định design, xem §12): `--ec-success` trên trắng 3.86:1 (< 4.5 AA cho text nhỏ); chữ CTA disabled 1.61:1; vùng chạm 28px < 44px khuyến nghị mobile.

---

## 11. Checklist nghiệm thu

Chạy `ecomposer.html`, đối chiếu từng mục ở các width **375 / 560 / 705 / 900 / 1200** và các offer trong preview bar:

- [ ] Không có màu / radius / font-size nằm ngoài token §3 (grep CSS mới).
- [ ] Không có `box-shadow` trên component widget.
- [ ] Widget luôn **1 cột** ở mọi width (reward nằm dưới list, summary dưới reward).
- [ ] Số cột grid đúng bảng §6.8; không có ô trống do sai mốc.
- [ ] Mọi card trong cùng grid **cao bằng nhau**; **không title nào xuống 2 dòng**.
- [ ] Ảnh card horizontal **luôn vuông**, đúng bảng §6.2; nội dung căn giữa dọc (khoảng trống trên = dưới).
- [ ] Mỗi card **chỉ 1 action**; product 1 variant dùng stepper inline.
- [ ] Card chưa chọn có dòng tóm tắt option; đã chọn liệt kê variant.
- [ ] Trigger fixed: không progress, không pill lock, reward panel viền đen.
- [ ] Sheet: mọi option là dropdown; mở ra mặc định variant chưa chọn; Add/Select hoạt động; ✕ bỏ chọn.
- [ ] Thu gọn: Buys 2 hàng, quà đã chọn không bị ẩn; nút Show all chỉ hiện khi có item ẩn.
- [ ] Summary: giá gốc gạch ngang, `You save $X (Y%)`, empty state, CTA label đúng bảng §7.
- [ ] Sold out / locked hiển thị đúng §6.7; không lỗi console; không tràn ngang ở 375px.

---

## 12. Câu hỏi mở (không tự quyết)
1. Badge `0/3` trên ảnh có thể bị hiểu là "phải mua 3" → ẩn khi 0 hay đổi thành "Max 3"?
2. Quà khoá đang mờ 40% (khó đọc) — giữ theo Figma hay chỉ dùng pill lock?
3. Sau khi mở khoá có **tự chọn sẵn quà** không (hiện phải tự chọn mới bật CTA)?
4. `--ec-success` chưa đạt contrast AA — thêm màu xanh đậm cho text hay chuyển text sang đen?
5. Chữ CTA disabled khó đọc — đổi sang `--ec-ink-60`?
6. Vùng chạm 28px trên mobile — có tăng lên 44px ở widget < 560px không?
7. Số card lẻ ở hàng cuối (vd 3 card / 2 cột) — giữ hay cho card cuối full width?

---

## 13. File tham chiếu trong repo
| File | Vai trò |
|---|---|
| `bxgy-ec2026.css` | Token + component chung (card, button, select, stepper, tag, sheet) |
| `ecomposer.css` | Layout riêng view EComposer (header, card horizontal, reward divider, summary, grid/collapse khổ rộng) |
| `ecomposer.html` | Trang preview (`data-bxgy-view="ecomposer"`) + preview bar |
| `script.js` | Render + logic: `renderHeaderEC`, `renderTileH`, `renderListEC`, `renderGetsEC`, `renderSummaryEC`, `openSheet`/`drawSheet`, `quickAdd`, `stepItem` |
| `mock-data.js` | Cấu trúc data mẫu: product → options → variants, offers theo case |
| `style.css` | Bản prototype cũ (backup, không dùng cho EComposer) |
