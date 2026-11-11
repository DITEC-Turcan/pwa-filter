// Bookmarklet: vyhľadávanie v PWA dialógu "Add an Existing Task" (Timesheet → Add Row → Select From Existing Assignments)
//
// Inštalácia (Edge/Chrome):
//   1. Zobraz panel obľúbených (Ctrl+Shift+B).
//   2. Pravý klik na panel → Pridať obľúbenú položku / Add favorite.
//   3. Názov: "PWA filter", URL: celý jednoriadkový kód zo súboru pwa-task-filter.min.txt.
//
// Použitie: otvor timesheet → Add Row → Select From Existing Assignments → klikni na záložku "PWA filter".
// V dialógu sa nad stromom objaví políčko. Bookmarklet hneď po spustení postupne rozbalí celý strom
// (PWA doťahuje úlohy lazy až pri rozbalení — bez toho by filter nenačítané úlohy nevidel).
// Píš — strom sa filtruje (bez ohľadu na diakritiku a veľkosť písmen); keď match-ne názov projektu,
// zobrazia sa všetky jeho úlohy. Esc vymaže filter.
// Projekty začínajúce na "xo" alebo "SWD" sú ignorované (skryté, nerozbaľujú sa) — pozri IGNORED.
// Uzly obsahujúce "Nevykazovat" sú defaultne skryté; checkbox vedľa vyhľadávania ich zahrnie.
// Množiny: aktuálne zaškrtnuté úlohy sa dajú uložiť pod názvom (localStorage PWA), neskôr vyvolať
// (zaškrtne týždne existujúce úlohy klikom, takže ich widget zaregistruje) alebo zmazať.

javascript: (function () {
    var NORM = function (s) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); };
    var IGNORED = /^(xo|swd)/;   // top-level projekty, ktoré sa majú preskakovať (porovnáva sa normalizovaný názov)

    // dialóg beží v iframe SharePoint modálu — nájdi dokument s pickerom
    var findDoc = function (w) {
        try { if (w.document && w.document.getElementById('idDivTreePicker')) return w.document; } catch (e) { }
        for (var i = 0; i < w.frames.length; i++) { var d = findDoc(w.frames[i]); if (d) return d; }
        return null;
    };

    var doc = findDoc(window.top);
    if (!doc) { alert('Najprv otvor dialóg "Add an Existing Task".'); return; }

    var picker = doc.getElementById('idDivTreePicker');
    var tree = picker.querySelector('.tree-results');
    var old = doc.getElementById('tsFilterBox');
    if (old) { old.focus(); old.select(); return; }

    var box = doc.createElement('input');
    box.id = 'tsFilterBox';
    box.type = 'text';
    box.placeholder = 'Hľadať projekt/úlohu… (Esc = zrušiť filter)';
    box.style.cssText = 'display:block;width:95%;margin:0 0 4px;padding:4px 6px;border:1px solid #0072c6;font:12px Segoe UI,sans-serif;outline:none';
    picker.insertBefore(box, picker.firstChild);

    var nvWrap = doc.createElement('label');
    nvWrap.style.cssText = 'display:block;margin:0 0 4px;font:11px Segoe UI,sans-serif;color:#444;cursor:pointer';
    var nvBox = doc.createElement('input');
    nvBox.type = 'checkbox';
    nvBox.style.cssText = 'vertical-align:middle;margin:0 4px 0 0';
    nvWrap.appendChild(nvBox);
    nvWrap.appendChild(doc.createTextNode('zahrnúť aj položky "Nevykazovat"'));
    picker.insertBefore(nvWrap, box.nextSibling);

    // --- uložené množiny zaškrtnutých úloh (localStorage origin-u PWA) ---
    var PKEY = 'tsFilterPresets';
    var store = doc.defaultView.localStorage;
    var loadPresets = function () { try { return JSON.parse(store.getItem(PKEY)) || {}; } catch (e) { return {}; } };
    var savePresets = function (ps) { store.setItem(PKEY, JSON.stringify(ps)); };

    // úlohu identifikuje cesta normalizovaných názvov od projektu po úlohu
    var pathOf = function (item) {
        var parts = [], el = item;
        while (el && el !== tree) {
            if (el.getAttribute && el.getAttribute('role') === 'treeitem'
                && !(el.classList.contains('outer-children-container') || el.classList.contains('inner-children-container'))) {
                var r = rowOf(el);
                if (r) parts.unshift(NORM(r.textContent || ''));
            }
            el = el.parentElement;
        }
        return parts.join('|');
    };
    var checkboxByPath = function () {
        var map = {};
        tree.querySelectorAll('input[type=checkbox]').forEach(function (cb) {
            if (!cb.disabled) {
                var it = cb.closest('[role="treeitem"]');
                if (it) map[pathOf(it)] = cb;
            }
        });
        return map;
    };

    var psWrap = doc.createElement('div');
    psWrap.style.cssText = 'margin:0 0 4px;font:11px Segoe UI,sans-serif;color:#444';
    var psSel = doc.createElement('select');
    psSel.style.cssText = 'font:11px Segoe UI,sans-serif;min-width:140px';
    psWrap.appendChild(psSel);
    var mkBtn = function (txt) {
        var btn = doc.createElement('button');
        btn.type = 'button';
        btn.textContent = txt;
        btn.style.cssText = 'font:11px Segoe UI,sans-serif;margin-left:4px;padding:1px 6px;cursor:pointer';
        psWrap.appendChild(btn);
        return btn;
    };
    var btnUse = mkBtn('Použiť'), btnSave = mkBtn('Uložiť'), btnDel = mkBtn('Zmazať');
    var psInfo = doc.createElement('span');
    psInfo.style.cssText = 'margin-left:6px;color:#666';
    psWrap.appendChild(psInfo);
    var refreshPresets = function () {
        var ps = loadPresets();
        psSel.innerHTML = '';
        var o0 = doc.createElement('option');
        o0.value = ''; o0.textContent = '— množiny —';
        psSel.appendChild(o0);
        Object.keys(ps).sort().forEach(function (k) {
            var op = doc.createElement('option');
            op.value = k; op.textContent = k;
            psSel.appendChild(op);
        });
    };
    refreshPresets();
    picker.insertBefore(psWrap, nvWrap.nextSibling);

    btnSave.addEventListener('click', function () {
        var name = doc.defaultView.prompt('Názov množiny:');
        if (!name) return;
        var sel = [];
        tree.querySelectorAll('input[type=checkbox]').forEach(function (cb) {
            if (cb.checked && !cb.disabled) {
                var it = cb.closest('[role="treeitem"]');
                if (it) sel.push(pathOf(it));
            }
        });
        if (!sel.length) { psInfo.textContent = 'Nič nie je zaškrtnuté.'; return; }
        var ps = loadPresets();
        ps[name] = sel;
        savePresets(ps);
        refreshPresets();
        psSel.value = name;
        psInfo.textContent = 'Uložené (' + sel.length + ').';
    });
    btnUse.addEventListener('click', function () {
        var name = psSel.value;
        if (!name) return;
        var want = loadPresets()[name] || [];
        var map = checkboxByPath();
        var found = 0;
        want.forEach(function (pt) {
            var cb = map[pt];
            if (cb) { found++; if (!cb.checked) cb.click(); }
        });
        psInfo.textContent = 'Nastavené ' + found + '/' + want.length + (found < want.length ? ' (zvyšok v strome nie je)' : '');
    });
    btnDel.addEventListener('click', function () {
        var name = psSel.value;
        if (!name) return;
        if (!doc.defaultView.confirm('Zmazať množinu "' + name + '"?')) return;
        var ps = loadPresets();
        delete ps[name];
        savePresets(ps);
        refreshPresets();
        psInfo.textContent = 'Zmazané.';
    });

    // uzol = <div role=treeitem>: prvý div = riadok s textom, .outer-children-container = deti
    var toExpand = [];
    var filterItem = function (item, q, anc) {
        var row = null, cont = null, c;
        for (c = item.firstElementChild; c; c = c.nextElementSibling) {
            if (c.classList && c.classList.contains('outer-children-container')) cont = c;
            else if (!row) row = c;
        }
        var label = row ? NORM(row.textContent || '') : '';
        if (item.parentElement === tree && IGNORED.test(label)) { item.style.display = 'none'; return false; }
        if (!nvBox.checked && label.indexOf('nevykazovat') > -1) { item.style.display = 'none'; return false; }
        var selfMatch = !!q && label.indexOf(q) > -1;
        var childMatch = false;
        if (cont && cont.firstElementChild) {
            for (c = cont.firstElementChild.firstElementChild; c; c = c.nextElementSibling) {
                if (filterItem(c, q, anc || selfMatch)) childMatch = true;
            }
        }
        var vis = !q || anc || selfMatch || childMatch;
        item.style.display = vis ? '' : 'none';
        // kandidát na auto-rozbalenie (lazy load detí) — raz na uzol, nehádame sa s ručným zbalením
        if ((selfMatch || childMatch) && item.getAttribute('aria-expanded') === 'false' && !item.dataset.axp) {
            toExpand.push(item);
        }
        return selfMatch || childMatch;
    };

    var apply = function () {
        var q = NORM(box.value.trim());
        toExpand = [];
        for (var c = tree.firstElementChild; c; c = c.nextElementSibling) filterItem(c, q, false);
        if (q.length >= 2 && toExpand.length <= 10) {
            toExpand.forEach(function (item) {
                item.dataset.axp = '1';
                var icon = item.querySelector('.ms-commentexpand-icon');
                if (icon) icon.click();
            });
        }
    };

    box.addEventListener('input', apply);
    nvBox.addEventListener('change', apply);
    box.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { box.value = ''; apply(); e.preventDefault(); e.stopPropagation(); }
    });

    // lazy-loadnuté deti po rozbalení projektu prefiltruj tiež
    new doc.defaultView.MutationObserver(apply).observe(tree, { childList: true, subtree: true });

    // --- auto-rozbalenie celého stromu, aby filter videl aj nenačítané úlohy ---
    var status = doc.createElement('span');
    status.style.cssText = 'display:block;margin:0 0 4px;font:11px Segoe UI,sans-serif;color:#666';
    status.textContent = 'Načítavam celý strom úloh…';
    picker.insertBefore(status, box.nextSibling);

    var rowOf = function (item) {
        for (var c = item.firstElementChild; c; c = c.nextElementSibling) {
            if (!(c.classList && c.classList.contains('outer-children-container'))) return c;
        }
        return null;
    };
    var rowIcon = function (item) {
        var r = rowOf(item);
        return r ? r.querySelector('.ms-commentexpand-icon') : null;
    };

    // každých 150 ms rozklikne všetky zbalené uzly naraz (AJAXy si prehliadač zoradí sám); koniec = 5 tickov bez práce
    var idle = 0;
    var timer = doc.defaultView.setInterval(function () {
        var nodes = tree.querySelectorAll('div[aria-expanded="false"]');
        var n = 0;
        for (var i = 0; i < nodes.length; i++) {
            var it = nodes[i];
            if (it.dataset.xall) continue;
            if (it.parentElement === tree) {
                var r = rowOf(it);
                if (r && IGNORED.test(NORM(r.textContent || ''))) { it.dataset.xall = '1'; continue; }
            }
            it.dataset.xall = '1';
            var ic = rowIcon(it);
            if (ic) { ic.click(); n++; }
        }
        if (n === 0) {
            if (++idle >= 5) {
                doc.defaultView.clearInterval(timer);
                status.style.display = 'none';
                apply();
            }
        } else { idle = 0; }
    }, 150);

    // --- zväčšenie modálneho okna (náš vložený UI vytláčal OK/Cancel mimo obraz) ---
    var DW = 160, DH = 200;
    try {
        var topDoc = window.top.document;
        var ifr = null, frames = topDoc.querySelectorAll('iframe');
        for (var i = 0; i < frames.length; i++) {
            try { if (frames[i].contentDocument === doc) { ifr = frames[i]; break; } } catch (e) { }
        }
        if (ifr && !ifr.dataset.tsGrown) {
            ifr.dataset.tsGrown = '1';
            ifr.style.height = (ifr.offsetHeight + DH) + 'px';
            ifr.style.width = (ifr.offsetWidth + DW) + 'px';
            // SP modál má inline px rozmery na rodičoch (.ms-dlgContent a spol.) — zväčši a vycentruj
            var el = ifr.parentNode;
            while (el && el.style) {
                var s = el.style;
                if (/px$/.test(s.height)) s.height = (parseInt(s.height) + DH) + 'px';
                if (/px$/.test(s.width)) s.width = (parseInt(s.width) + DW) + 'px';
                if (/px$/.test(s.top)) s.top = Math.max(10, parseInt(s.top) - DH / 2) + 'px';
                if (/px$/.test(s.left)) s.left = Math.max(10, parseInt(s.left) - DW / 2) + 'px';
                el = el.parentNode;
            }
        }
    } catch (e) { }
    // zväčši aj kontajnery stromu (inline px), −60/−10 px rezerva na naše prvky a tlačidlá
    ['.outer-container', '.results-padder', '.general-results'].forEach(function (sel) {
        var el = picker.querySelector(sel);
        if (el) {
            if (/px$/.test(el.style.height)) el.style.height = (parseInt(el.style.height) + DH - 60) + 'px';
            if (/px$/.test(el.style.width)) el.style.width = (parseInt(el.style.width) + DW - 10) + 'px';
        }
    });

    box.focus();
})();
