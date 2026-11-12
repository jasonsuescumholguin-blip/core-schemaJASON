/* PTFI Core Metadata Reference — rendering, search/filter, CSV export */
(function () {
  "use strict";
  const FACETS = window.PTFI_FACETS;
  const TERMS = window.PTFI_TERMS;
  const VER = window.PTFI_VERSION;
  const $ = (s, r = document) => r.querySelector(s);
  const slug = (s) => s.toLowerCase().replace(/[()]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const REQ_LABEL = { required: "Required", conditional: "Conditional", optional: "Optional", curator: "Curator-assigned" };
  const ICON = {
    ext: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg>',
    check: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    link: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>',
  };
  const facetVars = (f) => `--fc-fill:var(--${f}-fill);--fc-acc:var(--${f}-acc);--fc-ink:var(--${f}-ink)`;

  /* ---------- Schema map (rebuilt Figure 1) ---------- */
  function renderSchema() {
    const grid = $("#facetGrid");
    grid.innerHTML = FACETS.map((f) => {
      const terms = TERMS.filter((t) => t.facet === f.id);
      const shown = terms.slice(0, 7);
      const extra = terms.length - shown.length;
      return `<a class="facet-card" href="#facet-${f.id}" style="${facetVars(f.id)}">
        <div class="fc-head" style="background:var(--${f.id}-fill)">
          <div class="fc-n">Category ${FACETS.indexOf(f) + 1}</div>
          <div class="fc-name">${esc(f.name)}</div>
          <div class="fc-count">${terms.length} elements</div>
        </div>
        <ul>${shown.map((t) => `<li>${esc(t.name)}</li>`).join("")}${extra > 0 ? `<li class="fc-more">+ ${extra} more</li>` : ""}</ul>
      </a>`;
    }).join("");

    // role grouping labels (Figure 1 gray bands)
    const roleSpec = [...new Set(FACETS.map((f) => f.role))].map((label) => ({ label }));
    $("#roles").innerHTML = roleSpec.map((r) => `<div class="role"><i></i>${esc(r.label)}</div>`).join("");
  }

  /* ---------- Sidebar ---------- */
  function renderSidebar() {
    $("#sbNav").innerHTML = FACETS.map((f) => {
      const terms = TERMS.filter((t) => t.facet === f.id);
      return `<li class="sb-group" data-facet="${f.id}">
        <a class="sb-facet" href="#facet-${f.id}"><i style="background:var(--${f.id}-acc)"></i>${esc(f.name)}</a>
        <ul>${terms.map((t) => `<li><a href="#${slug(t.name)}" data-term>${esc(t.name)}</a></li>`).join("")}</ul>
      </li>`;
    }).join("");

    // filter chips
    $("#filterChips").innerHTML = FACETS.map((f) =>
      `<button class="fchip" role="switch" aria-pressed="true" data-facet="${f.id}">
        <i style="background:var(--${f.id}-acc)"></i>${esc(f.name)}</button>`
    ).join("");
  }

  /* ---------- Term card ---------- */
  function termCard(t) {
    const f = FACETS.find((x) => x.id === t.facet);
    const rows = [];
    rows.push(`<tr><th>Category</th><td>${esc(f.name)}</td></tr>`);
    rows.push(`<tr><th>Requirement</th><td>${esc(REQ_LABEL[t.required])}</td></tr>`);
    rows.push(`<tr><th>Data type</th><td>${esc(t.type)}</td></tr>`);
    if (t.format) rows.push(`<tr><th>Format</th><td><span class="mono">${esc(t.format)}</span></td></tr>`);
    if (t.values && t.values.length)
      rows.push(`<tr><th>Allowed values</th><td><div class="vals">${t.values.map((v) => `<span class="v">${esc(v)}</span>`).join("")}</div></td></tr>`);
    if (t.mapsTo && t.mapsTo.length)
      rows.push(`<tr><th>Maps to</th><td><div class="maps">${t.mapsTo.map((m) => `<a href="${esc(m.href)}" target="_blank" rel="noopener">${esc(m.label)} ${ICON.ext}</a>`).join("")}</div></td></tr>`);
    rows.push(`<tr><th>Interoperability</th><td>${t.standard
      ? `<div class="maps"><a href="${esc(t.standard.href)}" target="_blank" rel="noopener">${esc(t.standard.term)} ${ICON.ext}</a><span class="match m-${t.standard.match}">${t.standard.match === "exact" ? "exact match" : "close match"}</span></div>`
      : `<span class="orig-note">Original PTFI term — no external equivalent</span>`}</td></tr>`);
    if (t.examples && t.examples.length)
      rows.push(`<tr><th>Examples</th><td><div class="ex">${t.examples.map((e) => `<span class="e">${esc(e)}</span>`).join("")}</div></td></tr>`);

    const id = slug(t.name);
    return `<article class="term" id="${id}" data-term-card data-name="${esc(t.name.toLowerCase())}" data-facet="${t.facet}" data-req="${t.required}" data-search="${esc((t.name + " " + t.definition + " " + (t.values || []).join(" ") + " " + (t.curation || "")).toLowerCase())}" style="${facetVars(t.facet)}">
      <div class="term-head">
        <div class="th-main">
          <h3>${esc(t.name)}<a class="anchor-ico" href="#${id}" aria-label="Link to ${esc(t.name)}">#</a></h3>
          ${t.key ? `<code class="term-key">${esc(t.key)}</code>` : ""}
        </div>
        <div class="badges">
          <span class="badge b-facet">${esc(f.name)}</span>
          <span class="badge b-req" data-r="${t.required}">${esc(REQ_LABEL[t.required])}</span>
        </div>
      </div>
      <p class="def">${esc(t.definition)}</p>
      <table class="attrs"><tbody>${rows.join("")}</tbody></table>
      ${t.curation ? `<div class="curation"><span class="clab">${ICON.check} Curation note</span><span>${esc(t.curation)}</span></div>` : ""}
    </article>`;
  }

  /* ---------- Facet sections ---------- */
  function renderContent() {
    $("#content").innerHTML =
      `<div class="intro-note"><b>How to read this page.</b> The PTFI Core Metadata Schema comprises <b>${TERMS.length} elements</b> across ${FACETS.length} categories that follow the food-sampling workflow — from study and field collection to laboratory processing. Each element below lists its definition, requirement level, format, controlled values, the external standard it maps to (FoodOn, NCBI Taxonomy, ISO), worked examples, and a curation note drawn from the PTFI SOPs.</div>` +
      FACETS.map((f) => {
        const terms = TERMS.filter((t) => t.facet === f.id);
        return `<section class="facet-sec" id="facet-${f.id}" data-facet-sec="${f.id}" style="${facetVars(f.id)}">
          <div class="facet-banner">
            <div class="fb-top">
              <h2>${esc(f.name)}</h2>
              <span class="fb-tag">Category ${FACETS.indexOf(f) + 1} · ${terms.length} elements</span>
              <span class="fb-role">${esc(f.role)}</span>
            </div>
            <p>${esc(f.blurb)}</p>
          </div>
          <nav class="term-index">${terms.map((t) => `<a href="#${slug(t.name)}">${esc(t.name)}</a>`).join("")}</nav>
          ${terms.map(termCard).join("")}
        </section>`;
      }).join("") +
      `<div class="noresults" id="noResults"><b>No metadata elements match your search.</b><div>Try a different term or clear the filters.</div></div>`;
  }

  /* ---------- Search + filter ---------- */
  const state = { q: "", facets: new Set(FACETS.map((f) => f.id)) };
  function applyFilter() {
    const q = state.q.trim().toLowerCase();
    let visible = 0;
    document.querySelectorAll("[data-facet-sec]").forEach((sec) => {
      const fid = sec.getAttribute("data-facet-sec");
      let secVisible = 0;
      sec.querySelectorAll("[data-term-card]").forEach((card) => {
        const matchFacet = state.facets.has(fid);
        const matchQ = !q || card.getAttribute("data-search").includes(q);
        const show = matchFacet && matchQ;
        card.classList.toggle("hidden", !show);
        if (show) secVisible++;
      });
      sec.classList.toggle("hidden", secVisible === 0);
      visible += secVisible;
    });
    $("#noResults").classList.toggle("show", visible === 0);
  }

  /* ---------- Scrollspy ---------- */
  function initScrollspy() {
    const links = Array.from(document.querySelectorAll(".sb-group ul a[data-term]"));
    const map = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          links.forEach((l) => l.classList.remove("active"));
          const a = map.get(en.target.id);
          if (a) {
            a.classList.add("active");
            const ul = a.closest("ul");
            if (ul && ul.scrollHeight > 0) a.scrollIntoView({ block: "nearest" });
          }
        }
      });
    }, { rootMargin: "-90px 0px -72% 0px", threshold: 0 });
    document.querySelectorAll("[data-term-card]").forEach((c) => obs.observe(c));
  }

  /* ---------- CSV export ---------- */
  function toCSV() {
    const cols = ["Element ID", "Element", "Facet", "Requirement", "Data type", "Format", "Definition", "Allowed values", "Maps to", "Interoperability", "Examples", "Curation note"];
    const q = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
    const lines = [cols.map(q).join(",")];
    TERMS.forEach((t) => {
      const f = FACETS.find((x) => x.id === t.facet);
      lines.push([
        t.key || "", t.name, f.name, REQ_LABEL[t.required], t.type, t.format || "",
        t.definition, (t.values || []).join("; "),
        (t.mapsTo || []).map((m) => m.label + " <" + m.href + ">").join("; "),
        t.standard ? (t.standard.term + " (" + t.standard.match + " match)") : "PTFI original",
        (t.examples || []).join("; "), t.curation || "",
      ].map(q).join(","));
    });
    return lines.join("\r\n");
  }
  function downloadCSV() {
    const blob = new Blob(["\ufeff" + toCSV()], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `PTFI_Core_Metadata_Schema_v${VER.schema}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /* ---------- Boot ---------- */
  function init() {
    renderSchema();
    renderSidebar();
    renderContent();
    initScrollspy();

    $("#search").addEventListener("input", (e) => { state.q = e.target.value; applyFilter(); });
    $("#filterChips").addEventListener("click", (e) => {
      const btn = e.target.closest(".fchip"); if (!btn) return;
      const fid = btn.getAttribute("data-facet");
      const on = btn.getAttribute("aria-pressed") === "true";
      btn.setAttribute("aria-pressed", String(!on));
      if (on) state.facets.delete(fid); else state.facets.add(fid);
      applyFilter();
    });
    document.querySelectorAll("[data-csv]").forEach((b) => b.addEventListener("click", downloadCSV));

    // Counts follow the generated CSV data, not a fixed schema revision.
    $("#statGroups").textContent = FACETS.length;
    $("#schemaVersion").textContent = `v${VER.schema}`;
    $("#buildDate").textContent = VER.revised;
    $("#categorySequence").textContent = FACETS.map(f => f.name.replace(/ metadata$/i, "")).join(" → ");
    document.querySelector('meta[name="description"]').content =
      `Reference documentation for the PTFI Core Metadata Schema — ${TERMS.length} elements across ${FACETS.length} categories.`;
    // stat counts
    $("#statTotal").textContent = TERMS.length;
    $("#statReq").textContent = TERMS.filter((t) => t.required === "required").length;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
