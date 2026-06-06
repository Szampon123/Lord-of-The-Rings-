const CURRENCY = { US: '$', UK: '£', CA: 'C$', DE: '€' };
const PRIMARY = 'US';

const state = {
  data: null,
  tab: 'new',
  search: '',
  theme: '',
  sort: 'year',
};

const $ = (sel) => document.querySelector(sel);
const content = $('#content');

function money(amount, symbol = '$') {
  if (amount == null) return null;
  return `${symbol}${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function retailPrice(set) {
  const r = set.retail || {};
  const country = r[PRIMARY] != null ? PRIMARY : Object.keys(r)[0];
  if (!country) return null;
  return { value: r[country], symbol: CURRENCY[country] || '$', country };
}

async function load() {
  try {
    const res = await fetch('/api/sets');
    if (res.status === 503) {
      $('#status').textContent = 'Archive empty — press Refresh to gather prices.';
      content.innerHTML = '<div class="empty">No data yet.</div>';
      return;
    }
    state.data = await res.json();
    hydrateControls();
    render();
    const when = new Date(state.data.meta.generatedAt);
    $('#status').textContent = `${state.data.meta.setCount} sets · updated ${when.toLocaleString()}`;
    $('#generated').textContent = `Last gathered: ${when.toLocaleString()}`;
  } catch (err) {
    $('#status').textContent = 'Could not reach the archive.';
    content.innerHTML = `<div class="empty">${err.message}</div>`;
  }
}

function hydrateControls() {
  const themes = [...new Set(state.data.sets.map((s) => s.subtheme || s.theme).filter(Boolean))].sort();
  const sel = $('#theme');
  sel.length = 1; // keep "All realms"
  for (const t of themes) {
    const o = document.createElement('option');
    o.value = t;
    o.textContent = t;
    sel.appendChild(o);
  }
}

function visibleSets() {
  let sets = state.data.sets.slice();
  if (state.theme) sets = sets.filter((s) => (s.subtheme || s.theme) === state.theme);
  if (state.search) {
    const q = state.search.toLowerCase();
    sets = sets.filter(
      (s) => s.name.toLowerCase().includes(q) || s.number.toLowerCase().includes(q)
    );
  }
  const priceOf = (s) => {
    if (state.tab === 'used') return s.resale?.usedPrice ?? -1;
    return retailPrice(s)?.value ?? -1;
  };
  switch (state.sort) {
    case 'price-desc': sets.sort((a, b) => priceOf(b) - priceOf(a)); break;
    case 'price-asc': sets.sort((a, b) => priceOf(a) - priceOf(b)); break;
    case 'name': sets.sort((a, b) => a.name.localeCompare(b.name)); break;
    case 'pieces': sets.sort((a, b) => (b.pieces || 0) - (a.pieces || 0)); break;
    default: sets.sort((a, b) => (b.year || 0) - (a.year || 0));
  }
  return sets;
}

function cardHead(set) {
  const img = set.image
    ? `<img src="${set.image}" alt="${set.name}" loading="lazy" />`
    : '<span class="noimg">No image</span>';
  return `
    <a class="thumb" href="${set.bricksetURL}" target="_blank" rel="noopener">${img}</a>
    <div class="card-body">
      <span class="set-num">${set.number}</span>
      <span class="set-name">${set.name}</span>
      <span class="set-meta">${set.year || '—'} · ${set.pieces ? set.pieces.toLocaleString() + ' pcs' : '—'} · ${set.minifigCount} minifigs</span>
      <span class="badge ${set.status}">${set.status}</span>
  `;
}

function renderNew(sets) {
  return sets.map((set) => {
    const rp = retailPrice(set);
    const priceHtml = rp
      ? `<span class="price">${money(rp.value, rp.symbol)}</span>`
      : '<span class="price muted">no RRP</span>';
    return `<article class="card">${cardHead(set)}
        <div class="price-row">
          <span class="price-label">Retail (new)</span>
          ${priceHtml}
        </div>
      </div></article>`;
  }).join('');
}

function renderUsed(sets) {
  return sets.map((set) => {
    const used = set.resale?.usedPrice;
    const symbol = set.resale?.currency || '$';
    const priceHtml = used != null
      ? `<span class="price">${money(used, symbol)}</span>`
      : '<span class="price muted">unavailable</span>';
    const src = set.resale?.source ? `<span class="price-label">${set.resale.source}</span>` : '<span class="price-label">Used</span>';
    return `<article class="card">${cardHead(set)}
        <div class="price-row">${src}${priceHtml}</div>
      </div></article>`;
  }).join('');
}

function renderMinifigs(sets) {
  const withFigs = sets.filter((s) => s.minifigCount > 0);
  return withFigs.map((set) => {
    const rows = (set.minifigs || []).length
      ? `<div class="fig-rows">
          <div class="fig-row fig-head"><span>Figure</span><span>New</span><span>Used</span></div>
          ${set.minifigs.map((f) => `
            <div class="fig-row">
              <span class="fname">${f.name || f.number}</span>
              <span class="fnew">${money(f.valueNew, f.currency || '$') || '—'}</span>
              <span class="fused">${money(f.valueUsed, f.currency || '$') || '—'}</span>
            </div>`).join('')}
        </div>`
      : '<div class="set-meta" style="margin-top:8px;font-style:italic">Minifig values not gathered (enable the page reader).</div>';
    return `<article class="card" style="grid-column:span 1">${cardHead(set)}${rows}
      </div></article>`;
  }).join('');
}

function complianceNotice() {
  const m = state.data.meta;
  if (state.tab === 'used' && m.setValueProvider === 'null') {
    return `<div class="notice"><strong>Used values are not configured.</strong>
      Brickset serves set-level resale figures only from robots-disallowed endpoints,
      so this build leaves the Used provider empty by default. Register an authorised
      <code>PriceProvider</code> (or enable a Brickset reader once you have production
      permission) to populate this tab. See the README.</div>`;
  }
  if (state.tab === 'minifigs' && !m.pageReaderEnabled) {
    return `<div class="notice"><strong>The minifigure page reader is off.</strong>
      Set <code>ENABLE_PAGE_READER=true</code> to gather per-figure new/used values
      from Brickset's public minifig pages (read politely and only where robots.txt
      permits).</div>`;
  }
  return '';
}

function render() {
  const sets = visibleSets();
  if (!sets.length) {
    content.innerHTML = `${complianceNotice()}<div class="empty">No sets match.</div>`;
    return;
  }
  let body;
  if (state.tab === 'used') body = renderUsed(sets);
  else if (state.tab === 'minifigs') body = renderMinifigs(sets);
  else body = renderNew(sets);
  content.innerHTML = `${complianceNotice()}<div class="grid">${body}</div>`;
}

// ── Events ──────────────────────────────────────────────
$('#tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  state.tab = btn.dataset.tab;
  [...$('#tabs').children].forEach((b) => b.classList.toggle('active', b === btn));
  render();
});
$('#search').addEventListener('input', (e) => { state.search = e.target.value; render(); });
$('#theme').addEventListener('change', (e) => { state.theme = e.target.value; render(); });
$('#sort').addEventListener('change', (e) => { state.sort = e.target.value; render(); });

$('#refresh').addEventListener('click', async () => {
  const btn = $('#refresh');
  btn.disabled = true;
  $('#status').textContent = 'Re-reading the archive…';
  try {
    await fetch('/api/refresh', { method: 'POST' });
    await load();
  } catch (err) {
    $('#status').textContent = `Refresh failed: ${err.message}`;
  } finally {
    btn.disabled = false;
  }
});

load();
