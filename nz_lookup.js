/* MagicNZ press-and-hold word lookup.
   Include on any content page with: <script src="nz_lookup.js" defer></script>
   Words come from nz_dictionary.json (generated from magic_nz_te_reo_clean.csv) — one list for the whole app.
   Matching words are wrapped silently (no visible link styling); press and hold one to see its meaning. */
(function () {
  if (window.__nzLookup) return; window.__nzLookup = true;
  var SKIP_TAGS = /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|INPUT|SELECT|OPTION|BUTTON|A|SVG|CODE|PRE)$/;
  var EXCLUDE = { o: 1, te: 1 };                // too short/common to match on their own
  var HOLD_MS = 450, dict = {}, re = null, observer = null;

  var css = document.createElement('style');
  css.textContent =
    '.nz-lookup{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;cursor:help;border-radius:3px;transition:background .15s}' +
    '.nz-lookup.held{background:rgba(32,184,184,.25)}' +
    '#nzLookupPop{position:fixed;left:16px;right:16px;bottom:24px;max-width:560px;margin:0 auto;background:#010707;color:#fff;' +
    'border-radius:12px;padding:16px 18px 14px;font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
    'box-shadow:0 8px 30px rgba(0,0,0,.35);z-index:100000;opacity:0;transform:translateY(12px);pointer-events:none;transition:opacity .18s,transform .18s}' +
    '#nzLookupPop.open{opacity:1;transform:none;pointer-events:auto}' +
    '#nzLookupPop b{display:block;color:#20b8b8;font-size:17px;margin:0 0 4px}' +
    '#nzLookupPop .more{display:inline-block;margin-top:10px;color:#20b8b8;font-weight:700;font-size:13px;text-decoration:none;background:none;border:0;padding:0;font-family:inherit;cursor:pointer}';
  document.head.appendChild(css);

  var pop = document.createElement('div'); pop.id = 'nzLookupPop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-live', 'polite');
  document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(pop); });
  if (document.body) document.body.appendChild(pop);

  function strip(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’‘`]/g, "'"); }
  function vowelClass(ch) {
    var map = { a: '[aāáAĀÁ]', e: '[eēéEĒÉ]', i: '[iīíIĪÍ]', o: '[oōóOŌÓ]', u: '[uūúUŪÚ]' };
    return map[ch] || (/[a-z]/.test(ch) ? '[' + ch + ch.toUpperCase() + ']' : ch === "'" ? "['’‘]" : ch === ' ' ? '\\s+' : ch.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&'));
  }
  function matchForms(term) {
    var base = term.replace(/\s*\(.*\)\s*/g, ' ').trim();          // "Ka kite (anō)" -> "Ka kite"
    if (/^sweet or sweet as$/i.test(base)) return ['sweet as'];
    return [base];
  }
  function build(list) {
    var pats = [];
    list.forEach(function (w) {
      matchForms(w.t).forEach(function (f) {
        var k = strip(f); if (!k || EXCLUDE[k]) return;
        dict[k] = w; pats.push({ k: k, p: k.split('').map(vowelClass).join('') });
      });
    });
    pats.sort(function (a, b) { return b.k.length - a.k.length; });   // longest first ("whare tupuna" before "whare")
    re = new RegExp('(^|[^A-Za-zĀ-ſÀ-ɏ\'’-])(' + pats.map(function (x) { return x.p; }).join('|') + ')(?![A-Za-zĀ-ſÀ-ɏ\'’-])', 'g');
  }

  function wrapIn(root) {
    if (!re || !root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || n.nodeValue.length < 2) return NodeFilter.FILTER_REJECT;
        for (var p = n.parentNode; p && p !== document; p = p.parentNode) {
          if (p.nodeType === 1 && (SKIP_TAGS.test(p.tagName) || p.classList.contains('nz-lookup') || p.classList.contains('lookup') ||
              p.id === 'nzLookupPop' || p.hasAttribute('data-no-lookup') || p.isContentEditable)) return NodeFilter.FILTER_REJECT;
        }
        re.lastIndex = 0; return re.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var text = node.nodeValue, frag = document.createDocumentFragment(), last = 0, m;
      re.lastIndex = 0;
      while ((m = re.exec(text))) {
        var start = m.index + m[1].length, word = m[2], entry = dict[strip(word).replace(/\s+/g, ' ')];
        if (!entry) continue;
        if (start > last) frag.appendChild(document.createTextNode(text.slice(last, start)));
        var s = document.createElement('span'); s.className = 'nz-lookup'; s.dataset.slug = entry.s; s.textContent = word;
        frag.appendChild(s); last = start + word.length;
      }
      if (!last) return;
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(frag, node);
    });
  }

  function bySlug(slug) { for (var k in dict) if (dict[k].s === slug) return dict[k]; return null; }
  var inApp = window.parent !== window;
  function show(slug) {
    var w = bySlug(slug); if (!w) return;
    var esc = function (t) { return t.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    pop.innerHTML = '<b>' + esc(w.t) + '</b>' + esc(w.d) +
      (inApp ? '<br><button type="button" class="more">Open in NZ Dictionary ›</button>'
             : '<br><a class="more" href="nz_dictionary.html?word=' + encodeURIComponent(w.s) + '">Open in NZ Dictionary ›</a>');
    var more = pop.querySelector('button.more');
    if (more) more.addEventListener('click', function (e) {
      e.stopPropagation(); hide();
      window.parent.postMessage({ magicnz: 'open', page: 'nz_dictionary.html?word=' + w.s, title: 'NZ Dictionary' }, '*');
    });
    pop.classList.add('open');
    setTimeout(function () { document.querySelectorAll('.nz-lookup.held').forEach(function (x) { x.classList.remove('held'); }); }, 250);
  }
  function hide() { pop.classList.remove('open'); }

  var timer = null, held = null, sx = 0, sy = 0;
  function start(e) {
    var el = e.target.closest && e.target.closest('.nz-lookup');
    if (!e.target.closest || !e.target.closest('#nzLookupPop')) hide();
    if (!el) return;
    var pt = e.touches ? e.touches[0] : e; sx = pt.clientX; sy = pt.clientY;
    held = el; el.classList.add('held');
    timer = setTimeout(function () { timer = null; show(el.dataset.slug); if (navigator.vibrate) navigator.vibrate(10); }, HOLD_MS);
  }
  function cancel() { if (timer) { clearTimeout(timer); timer = null; } if (held) { held.classList.remove('held'); held = null; } }
  function move(e) { var pt = e.touches ? e.touches[0] : e; if (Math.abs(pt.clientX - sx) > 10 || Math.abs(pt.clientY - sy) > 10) cancel(); }
  document.addEventListener('touchstart', start, { passive: true });
  document.addEventListener('mousedown', start);
  document.addEventListener('touchmove', move, { passive: true });
  ['touchend', 'touchcancel', 'mouseup'].forEach(function (ev) { document.addEventListener(ev, cancel, { passive: true }); });
  document.addEventListener('contextmenu', function (e) { if (e.target.closest && e.target.closest('.nz-lookup')) e.preventDefault(); });
  window.addEventListener('scroll', hide, { passive: true });

  // App back arrow closes the popup first
  window.addEventListener('message', function (e) {
    if (e.data && e.data.magicnz === 'back' && pop.classList.contains('open')) {
      hide(); e.stopImmediatePropagation(); e.source && e.source.postMessage({ magicnz: 'handled' }, '*');
    }
  }, true);

  fetch('nz_dictionary.json').then(function (r) { return r.json(); }).then(function (list) {
    build(list);
    var go = function () {
      wrapIn(document.body);
      observer = new MutationObserver(function (muts) {
        observer.disconnect();
        muts.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1 && !n.classList.contains('nz-lookup')) wrapIn(n); }); });
        observer.observe(document.body, { childList: true, subtree: true });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  }).catch(function () {});
})();
