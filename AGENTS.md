# AGENTS.md

Mini-workspace s bookmarkletom pre firemný Project Web App (PWA, SharePoint/Project Server na `http://pwa`).
Komunikácia s používateľom aj UI texty sú po slovensky.

## Súbory

- [pwa-filter/pwa-task-filter.js](pwa-filter/pwa-task-filter.js) — čitateľný zdroj bookmarkletu s komentármi a návodom na inštaláciu. Pridáva vyhľadávanie, auto-rozbalenie stromu, zväčšenie okna a uložiteľné množiny checkboxov do PWA dialógu „Add an Existing Task" (Timesheet → Add Row → Select From Existing Assignments).
- [pwa-filter/pwa-task-filter.min.txt](pwa-filter/pwa-task-filter.min.txt) — jednoriadková minifikovaná verzia.
- [pwa-filter/make-install-html.ps1](pwa-filter/make-install-html.ps1) → generuje pwa-task-filter.install.html; **primárna inštalácia**: záložka sa inštaluje potiahnutím odkazu z tejto stránky, aktualizácia = starú záložku zmazať a potiahnuť nanovo (dialóg obľúbených má limit dĺžky URL, drag & drop nie; používateľ nechce sťahovať skripty zo siete).

Do koreňa môžu pribúdať generované HTML reporty (globálny príkaz `/tfs-tasky`) — nie sú to zdrojáky, nemeniť.

## Železné pravidlá

1. **Každá zmena logiky sa robí v `pwa-task-filter.js` a MUSÍ sa ručne premietnuť do `pwa-task-filter.min.txt`** (minifikácia je manuálna, pozri mapu premenných nižšie). Obe verzie musia byť funkčne identické.
2. Po zmene min verzie spusti `pwa-filter/make-install-html.ps1` a na konci odpovede pripomeň používateľovi, že má starú záložku zmazať a **znova pretiahnuť z pwa-task-filter.install.html** (a môže commitnúť/pushnúť).
3. **Nedá sa testovať lokálne** — cieľ je intranetová stránka. Overenie robí používateľ v prehliadači; pri neistote o DOM si vyžiadaj outerHTML alebo screenshot.
4. Bookmarklet musí ostať vanilla ES5-kompatibilný JS (žiadne moduly, žiadne async/await), celý v jednom IIFE s prefixom `javascript:`.
5. **Zmeny musia byť spätne kompatibilné.** Hlavne formát množín v `localStorage` (kľúč `tsFilterPresets`) sa nesmie meniť tak, aby existujúce uložené dáta prestali fungovať — pri zmene formátu treba staré dáta čítať ďalej (migrácia pri načítaní, nie zahodenie). To isté platí pre názvy kľúčov a `dataset` príznaky, na ktorých závisí správanie pri opakovanom spustení bookmarkletu.

## Mapa premenných (čitateľná → min)

`NORM→N, IGKEY→IK, igList→il, setIgnored→si, isIgnored→ii, igWrap→iw, igBox→ib, applyIgnored→ia, igBtn→bI, findDoc→F, picker→p, tree→t, uiPanel→ui, box→b, nvWrap→nw, nvLab→nl, nvBox→nv, hitInfo→hi, hits→ht, highlight→hl, toExpand→tx, filterItem→fi, apply→ap, status→st, rowOf→ro, rowIcon→ri, idle→idl, timer→tm, startPump→pp, PKEY→PK, store→ls, loadPresets→lp, savePresets→sv, pathOf→po, checkboxByPath→cbm, psWrap→pw, psSel→se, mkBtn→mkb, btnUse→bU, btnSave→bS, btnDel→bD, psInfo→inf, refreshPresets→rs, dispPathOf→dp, btnShow→bV, modal→md, modalList→ml, modalItems→mi, modalInfo→mf, modalSel→ms2, renderModal→rm, openModal→om, applyPreset→aps, countBar→cb3, updateCount→uc, queueCount→du, DW/DH (rozmery) rovnaké; vo fi: hasCb→hc, childUseful→cu, loadedKids→lk, pending→pe, useful→u`

Pozn.: `filterItem`/`fi` vracia bitmask — 1 = zhoda s filtrom, 2 = má čo zaškrtnúť (enabled checkbox v podstrome); uzly bez bitu 2 sa skrývajú, ale uzly s nenačítanými deťmi (`aria-expanded=false` a prázdny kontajner) sa držia viditeľné, kým ich pump nerozbalí. `checkboxByPath`/`cbm` vracia mapu normalizovaná cesta → `{cb, disp}` (v min `{cb, d}`).

## DOM kontrakt PWA dialógu (overené z reálneho HTML)

- Dialóg beží v **iframe** SharePoint modálu — bookmarklet hľadá dokument s `#idDivTreePicker` rekurzívne cez `window.top.frames`.
- Strom: `#idDivTreePicker .tree-results`; uzol = `div[role=treeitem][aria-expanded]`, jeho prvý child div = riadok (expand ikona `.ms-commentexpand-icon` + `input[type=checkbox]` + `span.entry-text`), deti v `.outer-children-container > .inner-children-container`.
- Pozor: kontajnery detí majú **tiež** `role=treeitem` — uzly rozlišuj cez `classList`, nie cez role.
- Deti sa **lazy-loadujú AJAXom** až po kliknutí na expand ikonu; checkboxy projektov sú `disabled`, zaškrtávateľné sú len úlohy (listy).
- Programové zaškrtnutie robiť cez `.click()`, nie `.checked = true` — inak to widget nezaregistruje.
- SP modál má inline px rozmery na rodičoch iframe (zväčšovanie okna upravuje len hodnoty končiace na `px`).

## Doménové konvencie

- Porovnávanie textov vždy cez `NORM` (lowercase + odstránená diakritika cez NFD).
- Top-level projekty sa ignorujú podľa prefixov konfigurovateľných v UI (pole "ignorovať prefixy", čiarkou oddelené, default `xo,swd`); uložené v `localStorage` kľúč `tsFilterIgnored`, porovnáva sa začiatok normalizovaného názvu. Ignorované sa ani nerozbaľujú — po zmene zoznamu sa musí znova spustiť `startPump()`, aby sa predtým ignorované donačítali.
- Uzly obsahujúce „nevykazovat" sú default skryté; checkbox „zahrnúť aj položky Nevykazovat" ich zobrazí.
- Množiny checkboxov: `localStorage` na origine `http://pwa`, kľúč `tsFilterPresets`, formát `{ "názov": ["projekt|cesta|úloha", …] }` — cesty z normalizovaných názvov spojené `|`.
