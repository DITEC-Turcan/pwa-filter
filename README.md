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
- **Ignorovanie balastu** — projekty začínajúce na zadané prefixy sa skryjú a nenačítavajú.
  Prefixy si nastavíš priamo v dialógu (pole *ignorovať prefixy*, čiarkou oddelené,
  default `xo,swd`); nastavenie sa pamätá. Uzly obsahujúce „Nevykazovat“ sú tiež skryté;
  checkbox *zahrnúť aj položky „Nevykazovat“* ich v prípade potreby zobrazí.
  Vetvy, v ktorých nie je nič na zaškrtnutie, sa nezobrazujú.
- **Väčšie okno** — modálny dialóg aj strom sa zväčšia, takže vidno viac riadkov
  aj tlačidlá OK/Cancel.
- **Množiny úloh** — aktuálne zaškrtnuté úlohy si uložíš pod názvom (tlačidlo *Uložiť*),
  neskôr ich jedným klikom zaškrtneš znova (*Použiť*) alebo množinu zmažeš (*Zmazať*).
  Množín môže byť ľubovoľne veľa; ukladajú sa do `localStorage` prehliadača na origine
  `http://pwa`, takže prežijú zatvorenie prehliadača. Ak niektorá úloha už v strome nie je,
  preskočí sa a zobrazí sa počet nastavených (napr. „Nastavené 4/5").
- **Prehľad množín** — tlačidlo *Prehľad* otvorí okno: vľavo zoznam uložených množín,
  vpravo obsah vybranej — názov úlohy a za ním sivou cesta k nej, so stavmi
  ☑ (zaškrtnutá v strome), ☐ (v strome, nezaškrtnutá) a ✗ (už v strome nie je).
  Tlačidlo *Použiť* priamo v okne množinu rovno zaškrtne a stavy hneď prekreslí.
  Okno sa otvorí aj automaticky po *Uložiť*, takže vidíš, čo sa uložilo.
  Zatvoríš ho krížikom, tlačidlom *Zavrieť* alebo klikom mimo okna.
- **Množina z timesheetu** — klik na záložku bez otvoreného dialógu: ak je na stránke
  timesheet tabuľka, bookmarklet ponúkne uloženie jej úloh (Project Name + Task Name)
  ako množiny. Tú potom v dialógu jedným „Použiť“ zaškrtneš — páruje sa podľa projektu
  a názvu úlohy.
- **Počítadlo** — pri checkboxe „Nevykazovat" sa priebežne ukazuje počet zaškrtnutých
  úloh v celom strome (aj tých práve skrytých filtrom) a pri hľadaní počet nájdených.

## Inštalácia

1. Otvor inštalačnú stránku **<https://ditec-turcan.github.io/pwa-filter/>**
   (alebo lokálne [`pwa-filter/pwa-task-filter.install.html`](pwa-filter/pwa-task-filter.install.html) — je to tá istá stránka).
2. Zobraz si panel obľúbených (`Ctrl+Shift+B`).
3. **Potiahni modré tlačidlo „PWA filter" myšou na panel obľúbených.**

Celý skript je vložený priamo v záložke — pri používaní sa nič nesťahuje zo siete.
**Aktualizácia na novšiu verziu:** starú záložku zmazať a potiahnuť nanovo.

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
| [`pwa-filter/pwa-task-filter.min.txt`](pwa-filter/pwa-task-filter.min.txt) | Minifikovaná jednoriadková verzia — musí byť funkčne zhodná so zdrojom. |
| [`pwa-filter/make-install-html.ps1`](pwa-filter/make-install-html.ps1) | Vygeneruje inštalačnú stránku z min verzie. |
| [`pwa-filter/pwa-task-filter.install.html`](pwa-filter/pwa-task-filter.install.html) | Generovaná inštalačná stránka — záložka sa inštaluje potiahnutím odkazu. |
| [`index.html`](index.html) | Kópia inštalačnej stránky pre GitHub Pages (<https://ditec-turcan.github.io/pwa-filter/>). |

## Konfigurácia

- Ignorované prefixy projektov: pole *ignorovať prefixy* priamo v dialógu (čiarkou oddelené,
  default `xo,swd`; ukladá sa do `localStorage` pod kľúčom `tsFilterIgnored`).
- Rozmerové konštanty zväčšenia okna (v kóde): `DW`, `DH`.
- Kľúč množín v `localStorage`: `tsFilterPresets`.

Po každej zmene kódu treba úpravu premietnuť do `.min.txt`, spustiť `make-install-html.ps1`
a záložku preinstalovať (starú zmazať, novú pretiahnuť z inštalačnej stránky).
