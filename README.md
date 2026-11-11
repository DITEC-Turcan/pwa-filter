# PWA filter — vyhľadávanie v dialógu „Add an Existing Task"

Bookmarklet pre Project Web App (SharePoint/Project Server na `http://pwa`), ktorý vylepšuje
dialóg **Timesheet → Add Row → Select From Existing Assignments**. Štandardný dialóg ponúka len
malý strom projektov bez vyhľadávania — s týmto bookmarkletom dostaneš:

- **Vyhľadávanie** — políčko nad stromom filtruje projekty aj úlohy priebežne pri písaní,
  bez ohľadu na diakritiku a veľkosť písmen („elektronicke" nájde „Elektronické").
  Keď vyhovuje názov projektu, zobrazia sa všetky jeho úlohy. `Esc` filter vymaže.
- **Auto-načítanie celého stromu** — PWA doťahuje úlohy zo servera až pri rozbalení uzla,
  takže by ich vyhľadávanie inak nevidelo. Bookmarklet po spustení celý strom sám rozbalí
  (trvá to ~1–2 s, stav ukazuje hláška „Načítavam celý strom úloh…").
- **Ignorovanie balastu** — projekty začínajúce na `xo`/`SWD` sa skryjú a nenačítavajú.
  Uzly obsahujúce „Nevykazovat" sú tiež skryté; checkbox *zahrnúť aj položky „Nevykazovat"*
  ich v prípade potreby zobrazí.
- **Väčšie okno** — modálny dialóg aj strom sa zväčšia, takže vidno viac riadkov
  aj tlačidlá OK/Cancel.
- **Množiny úloh** — aktuálne zaškrtnuté úlohy si uložíš pod názvom (tlačidlo *Uložiť*),
  neskôr ich jedným klikom zaškrtneš znova (*Použiť*) alebo množinu zmažeš (*Zmazať*).
  Množín môže byť ľubovoľne veľa; ukladajú sa do `localStorage` prehliadača na origine
  `http://pwa`, takže prežijú zatvorenie prehliadača. Ak niektorá úloha už v strome nie je,
  preskočí sa a zobrazí sa počet nastavených (napr. „Nastavené 4/5").

## Inštalácia

1. V Edge/Chrome si zobraz panel obľúbených položiek (`Ctrl+Shift+B`).
2. Pravý klik na panel → **Pridať obľúbenú položku** (Add favorite).
3. Názov: napr. `PWA filter`.
4. Do poľa **URL** vlož celý obsah súboru [`pwa-filter/pwa-task-filter.min.txt`](pwa-filter/pwa-task-filter.min.txt)
   (jeden riadok začínajúci `javascript:`).

> Pozor: pri vkladaní priamo do adresného riadku prehliadač prefix `javascript:` odstráni —
> do dialógu obľúbených položiek sa ale vkladá v poriadku.

## Použitie

1. Otvor timesheet (`http://pwa/Timesheet.aspx`).
2. **Add Row → Select From Existing Assignments** — otvorí sa dialóg so stromom.
3. Klikni na záložku **PWA filter**.
4. Počkaj ~2 s na načítanie stromu a hľadaj/zaškrtávaj; na záver klasicky **OK**.

Opakovaný klik na záložku nič nepokazí — len znova zaostrí vyhľadávacie políčko.

## Súbory

| Súbor | Popis |
|---|---|
| [`pwa-filter/pwa-task-filter.js`](pwa-filter/pwa-task-filter.js) | Čitateľný zdrojový kód s komentármi — tu sa robia úpravy. |
| [`pwa-filter/pwa-task-filter.min.txt`](pwa-filter/pwa-task-filter.min.txt) | Minifikovaná jednoriadková verzia pre záložku — musí byť funkčne zhodná so zdrojom. |

## Konfigurácia (v kóde)

- Ignorované prefixy projektov: regex `IGNORED = /^(xo|swd)/`.
- Rozmerové konštanty zväčšenia okna: `DW`, `DH`.
- Kľúč množín v `localStorage`: `tsFilterPresets`.

Po každej zmene kódu treba úpravu premietnuť do `.min.txt` a vymeniť URL v záložke.
