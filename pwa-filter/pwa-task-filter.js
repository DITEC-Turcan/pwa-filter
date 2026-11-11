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
// Ignorované prefixy projektov (skryté, nerozbaľujú sa) si používateľ definuje v poli "ignorovať prefixy"
// (čiarkou oddelené, default xo,swd; uložené v localStorage pod kľúčom tsFilterIgnored).
// Uzly obsahujúce "Nevykazovat" sú defaultne skryté; checkbox vedľa vyhľadávania ich zahrnie.
// Množiny: aktuálne zaškrtnuté úlohy sa dajú uložiť pod názvom (localStorage PWA), neskôr vyvolať
// (zaškrtne týždne existujúce úlohy klikom, takže ich widget zaregistruje) alebo zmazať.

javascript: (function () {
    var NORM = function (s) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); };
    var igList = [];
    var setIgnored = function (s) {
        igList = [];
        s.split(',').forEach(function (x) { x = NORM(x.trim()); if (x) igList.push(x); });
    };
    var isIgnored = function (label) {
        for (var i = 0; i < igList.length; i++) if (label.indexOf(igList[i]) === 0) return true;
        return false;
    };

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

    // spoločný podfarbený panel pre všetky naše prvky
    var uiPanel = doc.createElement('div');
    uiPanel.style.cssText = 'background:#eef6fc;border:1px solid #d0e4f5;border-radius:6px;padding:6px 8px;margin:0 0 6px';
    picker.insertBefore(uiPanel, picker.firstChild);

    var box = doc.createElement('input');
    box.id = 'tsFilterBox';
    box.type = 'text';
    box.placeholder = 'Hľadať projekt/úlohu… (Esc = zrušiť filter)';
    box.style.cssText = 'display:block;width:100%;box-sizing:border-box;margin:0 0 4px;padding:4px 6px;border:1px solid #0072c6;font:12px Segoe UI,sans-serif;outline:none';
    uiPanel.appendChild(box);

    var nvWrap = doc.createElement('div');
    nvWrap.style.cssText = 'display:block;margin:0 0 4px;font:11px Segoe UI,sans-serif;color:#444';
    var nvLab = doc.createElement('label');
    nvLab.style.cssText = 'cursor:pointer';
    var nvBox = doc.createElement('input');
    nvBox.type = 'checkbox';
    nvBox.style.cssText = 'vertical-align:middle;margin:0 4px 0 0';
    nvLab.appendChild(nvBox);
    nvLab.appendChild(doc.createTextNode('zahrnúť aj položky "Nevykazovat"'));
    nvWrap.appendChild(nvLab);
    var hitInfo = doc.createElement('span');
    hitInfo.style.cssText = 'margin-left:10px;color:#0072c6';
    nvWrap.appendChild(hitInfo);
    uiPanel.appendChild(nvWrap);

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
    var dispPathOf = function (item) {
        var parts = [], el = item;
        while (el && el !== tree) {
            if (el.getAttribute && el.getAttribute('role') === 'treeitem'
                && !(el.classList.contains('outer-children-container') || el.classList.contains('inner-children-container'))) {
                var r = rowOf(el);
                if (r) parts.unshift((r.textContent || '').trim());
            }
            el = el.parentElement;
        }
        return parts.join(' → ');
    };
    var checkboxByPath = function () {
        var map = {};
        tree.querySelectorAll('input[type=checkbox]').forEach(function (cb) {
            if (!cb.disabled) {
                var it = cb.closest('[role="treeitem"]');
                if (it) map[pathOf(it)] = { cb: cb, disp: dispPathOf(it) };
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
    var btnUse = mkBtn('Použiť'), btnSave = mkBtn('Uložiť'), btnDel = mkBtn('Zmazať'), btnShow = mkBtn('Prehľad');
    var psInfo = doc.createElement('span');
    psInfo.style.cssText = 'margin-left:6px;color:#666';
    psWrap.appendChild(psInfo);

    // --- modálny prehľad množín: vľavo zoznam, vpravo obsah vybranej ---
    var modal = null, modalList = null, modalItems = null, modalInfo = null, modalSel = '';
    var applyPreset = function (name) {
        var want = loadPresets()[name] || [];
        var map = checkboxByPath();
        var found = 0;
        want.forEach(function (pt) {
            var e = map[pt];
            if (e) { found++; if (!e.cb.checked) e.cb.click(); }
        });
        updateCount();
        return 'Nastavené ' + found + '/' + want.length + (found < want.length ? ' (zvyšok v strome nie je)' : '');
    };
    var renderModal = function () {
        var ps = loadPresets();
        var names = Object.keys(ps).sort();
        modalList.innerHTML = '';
        if (!names.length) modalList.textContent = '(žiadne množiny)';
        names.forEach(function (k) {
            var row = doc.createElement('div');
            row.textContent = k;
            row.style.cssText = 'padding:3px 8px;cursor:pointer' + (k === modalSel ? ';background:#cde6f7;font-weight:bold' : '');
            row.addEventListener('click', function () { modalSel = k; renderModal(); });
            modalList.appendChild(row);
        });
        modalItems.innerHTML = '';
        if (!modalSel || !ps[modalSel]) { modalItems.textContent = 'Vyber množinu vľavo.'; return; }
        var map = checkboxByPath();
        ps[modalSel].forEach(function (pt) {
            var e = map[pt], line = doc.createElement('div');
            // hlavný text = názov úlohy, cesta k nej menším sivo (nekončí mimo okna)
            var parts = e ? e.disp.split(' → ') : pt.split('|');
            var task = parts.pop();
            line.style.cssText = 'margin:1px 0';
            if (e) {
                line.textContent = (e.cb.checked ? '☑ ' : '☐ ') + task;
            } else {
                line.textContent = '✗ ' + task;
                line.style.color = '#a00';
                line.title = 'Už nie je v strome';
            }
            if (parts.length) {
                var path = doc.createElement('span');
                path.style.cssText = 'color:#888;font-size:10px';
                path.textContent = '  (' + parts.join(' → ') + ')';
                line.appendChild(path);
            }
            modalItems.appendChild(line);
        });
    };
    var openModal = function (name) {
        if (!modal) {
            modal = doc.createElement('div');
            modal.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:2000;background:rgba(0,0,0,.25)';
            var panel = doc.createElement('div');
            panel.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:96%;height:78%;background:#fff;border:1px solid #0072c6;box-shadow:3px 3px 10px rgba(0,0,0,.4);display:flex;flex-direction:column;font:12px Segoe UI,sans-serif;color:#333';
            var head = doc.createElement('div');
            head.style.cssText = 'padding:5px 10px;background:#0072c6;color:#fff;font-weight:bold';
            head.textContent = 'Uložené množiny';
            var close = doc.createElement('span');
            close.textContent = '✕';
            close.style.cssText = 'float:right;cursor:pointer;padding:0 4px';
            close.addEventListener('click', function () { modal.style.display = 'none'; });
            head.insertBefore(close, head.firstChild);
            var body = doc.createElement('div');
            body.style.cssText = 'flex:1;display:flex;overflow:hidden';
            modalList = doc.createElement('div');
            modalList.style.cssText = 'width:34%;border-right:1px solid #ddd;overflow:auto';
            modalItems = doc.createElement('div');
            modalItems.style.cssText = 'flex:1;overflow:auto;padding:4px 8px';
            body.appendChild(modalList);
            body.appendChild(modalItems);
            var foot = doc.createElement('div');
            foot.style.cssText = 'padding:6px 10px;border-top:1px solid #ddd;text-align:right';
            modalInfo = doc.createElement('span');
            modalInfo.style.cssText = 'float:left;color:#666';
            var bApply = doc.createElement('button');
            bApply.type = 'button';
            bApply.textContent = 'Použiť';
            bApply.style.cssText = 'font:12px Segoe UI,sans-serif;padding:2px 10px;cursor:pointer';
            bApply.addEventListener('click', function () {
                if (!modalSel) return;
                modalInfo.textContent = applyPreset(modalSel);
                psSel.value = modalSel;
                renderModal();
            });
            var bClose = doc.createElement('button');
            bClose.type = 'button';
            bClose.textContent = 'Zavrieť';
            bClose.style.cssText = 'font:12px Segoe UI,sans-serif;padding:2px 10px;cursor:pointer;margin-left:6px';
            bClose.addEventListener('click', function () { modal.style.display = 'none'; });
            foot.appendChild(modalInfo);
            foot.appendChild(bApply);
            foot.appendChild(bClose);
            panel.appendChild(head);
            panel.appendChild(body);
            panel.appendChild(foot);
            modal.appendChild(panel);
            modal.addEventListener('click', function (e) { if (e.target === modal) modal.style.display = 'none'; });
            doc.body.appendChild(modal);
        }
        modalSel = name || modalSel;
        modalInfo.textContent = '';
        modal.style.display = '';
        renderModal();
    };
    btnShow.addEventListener('click', function () { openModal(psSel.value); });
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
    uiPanel.appendChild(psWrap);

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
        openModal(name);
    });
    btnUse.addEventListener('click', function () {
        var name = psSel.value;
        if (!name) return;
        psInfo.textContent = applyPreset(name);
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

    // --- konfigurovateľné ignorované prefixy projektov ---
    var IGKEY = 'tsFilterIgnored', DEFAULT_IGNORED = 'xo,swd';
    var igWrap = doc.createElement('div');
    igWrap.style.cssText = 'margin:0 0 4px;font:11px Segoe UI,sans-serif;color:#444';
    igWrap.appendChild(doc.createTextNode('ignorovať prefixy: '));
    var igBox = doc.createElement('input');
    igBox.type = 'text';
    igBox.value = store.getItem(IGKEY) || DEFAULT_IGNORED;
    igBox.style.cssText = 'font:11px Segoe UI,sans-serif;width:160px;padding:1px 4px';
    igBox.title = 'Čiarkou oddelené prefixy projektov, ktoré sa skryjú a nenačítavajú';
    igWrap.appendChild(igBox);
    var applyIgnored = function () {
        setIgnored(igBox.value);
        store.setItem(IGKEY, igBox.value);
        apply();
        startPump();   // dodatočne rozbalí predtým ignorované (nenačítané) projekty
    };
    var igBtn = doc.createElement('button');
    igBtn.type = 'button';
    igBtn.textContent = 'Použiť';
    igBtn.style.cssText = 'font:11px Segoe UI,sans-serif;margin-left:4px;padding:1px 6px;cursor:pointer';
    igWrap.appendChild(igBtn);
    uiPanel.appendChild(igWrap);
    setIgnored(igBox.value);
    igBtn.addEventListener('click', applyIgnored);
    igBox.addEventListener('keydown', function (e) { if (e.key === 'Enter') { applyIgnored(); e.preventDefault(); } });
    igBox.addEventListener('change', applyIgnored);

    // uzol = <div role=treeitem>: prvý div = riadok s textom, .outer-children-container = deti
    var toExpand = [], hits = 0;

    // zvýrazni zhodu v názve; indexy sedia, lebo NORM zachováva počet znakov
    var highlight = function (row, q) {
        var sp = row && row.querySelector('.entry-text');
        if (!sp) return;
        if (sp.dataset.orig == null) sp.dataset.orig = sp.textContent;
        var orig = sp.dataset.orig;
        var idx = q ? NORM(orig).indexOf(q) : -1;
        if (idx < 0) { if (sp.firstElementChild) sp.textContent = orig; return; }
        sp.textContent = '';
        sp.appendChild(doc.createTextNode(orig.slice(0, idx)));
        var mk = doc.createElement('span');
        mk.style.cssText = 'background:#ffe08a;border-radius:2px';
        mk.textContent = orig.slice(idx, idx + q.length);
        sp.appendChild(mk);
        sp.appendChild(doc.createTextNode(orig.slice(idx + q.length)));
    };

    // vracia bitmask: 1 = zhoda s filtrom, 2 = má čo zaškrtnúť (enabled checkbox v podstrome)
    var filterItem = function (item, q, anc) {
        var row = null, cont = null, c;
        for (c = item.firstElementChild; c; c = c.nextElementSibling) {
            if (c.classList && c.classList.contains('outer-children-container')) cont = c;
            else if (!row) row = c;
        }
        var label = row ? NORM(row.textContent || '') : '';
        if (item.parentElement === tree && isIgnored(label)) { item.style.display = 'none'; return 0; }
        if (!nvBox.checked && label.indexOf('nevykazovat') > -1) { item.style.display = 'none'; return 0; }
        var selfMatch = !!q && label.indexOf(q) > -1;
        var cb = row && row.querySelector('input[type=checkbox]');
        var hasCb = !!(cb && !cb.disabled);
        var childMatch = false, childUseful = false, loadedKids = false;
        if (cont && cont.firstElementChild) {
            for (c = cont.firstElementChild.firstElementChild; c; c = c.nextElementSibling) {
                loadedKids = true;
                var rr = filterItem(c, q, anc || selfMatch);
                if (rr & 1) childMatch = true;
                if (rr & 2) childUseful = true;
            }
        }
        // kým deti nie sú načítané (lazy load ešte beží), uzol nechaj viditeľný
        var pending = !loadedKids && item.getAttribute('aria-expanded') === 'false';
        var useful = hasCb || childUseful || pending;
        var vis = useful && (!q || anc || selfMatch || childMatch);
        item.style.display = vis ? '' : 'none';
        highlight(row, selfMatch && vis ? q : '');
        if (q && vis && hasCb) hits++;
        // kandidát na auto-rozbalenie (lazy load detí) — raz na uzol, nehádame sa s ručným zbalením
        if ((selfMatch || childMatch) && item.getAttribute('aria-expanded') === 'false' && !item.dataset.axp) {
            toExpand.push(item);
        }
        return (selfMatch || childMatch ? 1 : 0) | (useful ? 2 : 0);
    };

    var apply = function () {
        var q = NORM(box.value.trim());
        toExpand = []; hits = 0;
        for (var c = tree.firstElementChild; c; c = c.nextElementSibling) filterItem(c, q, false);
        hitInfo.textContent = q ? 'nájdených úloh: ' + hits : '';
        if (q.length >= 2 && toExpand.length <= 10) {
            toExpand.forEach(function (item) {
                item.dataset.axp = '1';
                var icon = item.querySelector('.ms-commentexpand-icon');
                if (icon) icon.click();
            });
        }
        updateCount();
    };

    box.addEventListener('input', apply);
    nvBox.addEventListener('change', apply);
    box.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { box.value = ''; apply(); e.preventDefault(); e.stopPropagation(); }
    });

    // lazy-loadnuté deti po rozbalení projektu prefiltruj tiež; mutácie z vlastného zvýrazňovania (.entry-text) ignoruj, inak vznikne slučka
    new doc.defaultView.MutationObserver(function (ms) {
        for (var i = 0; i < ms.length; i++) {
            var el = ms[i].target.nodeType === 1 ? ms[i].target : ms[i].target.parentElement;
            if (!el || !el.closest('.entry-text')) { apply(); return; }
        }
    }).observe(tree, { childList: true, subtree: true });

    // --- počítadlo zaškrtnutých úloh (v riadku pri "Nevykazovat", aby nezaberalo ďalší riadok) ---
    var countBar = doc.createElement('span');
    countBar.style.cssText = 'margin-left:10px;color:#444;font-weight:bold';
    nvWrap.appendChild(countBar);
    var updateCount = function () {
        countBar.textContent = 'Zaškrtnutých úloh: ' + tree.querySelectorAll('input[type=checkbox]:checked:not([disabled])').length;
    };
    // capture fáza — widget pri kliku na checkbox zastavuje bublanie; setTimeout — stav checkboxu je finálny až po dobehnutí eventu
    var queueCount = function () { doc.defaultView.setTimeout(updateCount, 0); };
    tree.addEventListener('click', queueCount, true);
    tree.addEventListener('change', queueCount, true);
    updateCount();

    // --- auto-rozbalenie celého stromu, aby filter videl aj nenačítané úlohy ---
    var status = doc.createElement('span');
    status.style.cssText = 'display:block;margin:0 0 4px;font:11px Segoe UI,sans-serif;color:#666';
    status.textContent = 'Načítavam celý strom úloh…';
    uiPanel.appendChild(status);

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
    var idle = 0, timer = null;
    var startPump = function () {
        if (timer) return;
        idle = 0;
        status.style.display = '';
        timer = doc.defaultView.setInterval(function () {
            var nodes = tree.querySelectorAll('div[aria-expanded="false"]');
            var n = 0;
            for (var i = 0; i < nodes.length; i++) {
                var it = nodes[i];
                if (it.dataset.xall) continue;
                if (it.parentElement === tree) {
                    var r = rowOf(it);
                    // ignorované bez príznaku — po zmene zoznamu ich ďalší beh pumpu rozbalí
                    if (r && isIgnored(NORM(r.textContent || ''))) continue;
                }
                it.dataset.xall = '1';
                var ic = rowIcon(it);
                if (ic) { ic.click(); n++; }
            }
            if (n === 0) {
                if (++idle >= 5) {
                    doc.defaultView.clearInterval(timer);
                    timer = null;
                    status.style.display = 'none';
                    apply();
                }
            } else { idle = 0; }
        }, 150);
    };
    startPump();

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
    // zväčši aj kontajnery stromu (inline px), −110/−10 px rezerva na naše prvky a tlačidlá
    ['.outer-container', '.results-padder', '.general-results'].forEach(function (sel) {
        var el = picker.querySelector(sel);
        if (el) {
            if (/px$/.test(el.style.height)) el.style.height = (parseInt(el.style.height) + DH - 110) + 'px';
            if (/px$/.test(el.style.width)) el.style.width = (parseInt(el.style.width) + DW - 10) + 'px';
        }
    });

    box.focus();
})();
