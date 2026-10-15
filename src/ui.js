(function () {
  'use strict';
  const H = window.HB;
  const KEY = 'hbm-save-v1';
  let G = null;
  const U = { tab: 'ville', view: 'pre', m: null, side: 0, timer: null, speed: 1, paused: false, tPanel: false, post: null, sort: { k: 'pos', dir: 1 }, confirmReset: false, newClub: H.CLUBS.some((c) => c.id === 'CES') ? 'CES' : H.CLUBS[0].id, ctlSig: '' };

  // ---------- Utilitaires ----------
  function save() { try { localStorage.setItem(KEY, JSON.stringify(G)); } catch (e) { /* stockage indisponible */ } }
  function load() {
    try { const s = localStorage.getItem(KEY); if (s) { const g = JSON.parse(s); if (g && g.v === 1 && g.teams) { if (!g.training) g.training = { focus: 'equilibre', intensity: 'normale' }; H.migrate(g); return g; } } } catch (e) { /* ignore */ }
    return null;
  }
  function clearSave() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } }
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const T = (id) => H.team(G, id);
  const me = () => T(G.userId);
  const badge = (t, sm) => `<span class="badge${sm ? ' sm' : ''}" style="background:${t.color}" aria-hidden="true">${t.id}</span>`;
  const stars = (n) => `<span class="stars" aria-label="Réputation ${n} sur 5">${'★'.repeat(n)}<span class="off">${'★'.repeat(5 - n)}</span></span>`;
  // Caractéristiques fixes des clubs (supporters, centre de formation) : pastilles de 1 à 5, effet au survol
  const pips = (n, tip, lbl) => `<span class="pips" title="${esc(tip)}" role="img" aria-label="${esc(lbl || '')} ${n} sur 5">${[1, 2, 3, 4, 5].map((k) => `<i${k <= n ? ' class="on"' : ''}></i>`).join('')}</span>`;
  const pctTxt = (v) => (Math.round(v * 1000) / 10).toString().replace('.', ',') + ' %';
  const signed = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + String(Math.abs(v)).replace('.', ',');
  const fanTips = (t) => ({
    h: `Ferveur à domicile : +${pctTxt(H.homeShot(t))} de réussite au tir quand ils reçoivent.`,
    a: `Supporters en déplacement : à l'extérieur, le handicap du visiteur (pertes de balle, exclusions, fatigue du trajet) est réduit de ${Math.round(H.awayCut(t) * 100)} %.`,
    f: `Centre de formation : jeunes du centre et moins de 23 ans à ${signed(H.academyOff(t))} en niveau et en potentiel ; environ une vraie pépite sur ${Math.round(100 / (6 + (H.academyOf(t) - 1) * 3.5))} jeunes.`
  });
  function traitsHtml(t, opts) {
    const f = H.fansOf(t), tip = fanTips(t);
    const rows = [['Domicile', pips(f.h, tip.h, 'Ferveur à domicile')], ['Déplacement', pips(f.a, tip.a, 'Supporters en déplacement')]];
    if (!(opts && opts.noAcademy)) rows.push(['Formation', pips(H.academyOf(t), tip.f, 'Centre de formation')]);
    if (opts && opts.coach) rows.push(['Coach', pips(H.coachOf(t), 'Lecture tactique du coach : plus elle est haute, plus ses choix collent à l\'affiche. Même un bon coach se trompe parfois.', 'Coach')]);
    return `<div class="traits">${opts && opts.noName ? '' : `<span class="fansname">${esc(f.name)}</span>`}${rows.map(([l, v]) => `<span class="trait"><span class="muted">${l}</span>${v}</span>`).join('')}</div>`;
  }
  // Étoiles des joueurs : relatives au niveau de ton club, demi-étoiles, jamais la note chiffrée
  const sref = () => H.starRef(me());
  const sfmt = (s) => (s >= 1 ? String(Math.floor(s)) : '') + (s % 1 ? '½' : '') + ' ★';
  const STR = '★★★★★';
  function sbar(cur, o = {}) {
    const w = (v) => (v / 5) * 100;
    const lay = (cls, v) => v > 0 ? `<span class="${cls}" style="width:${w(v)}%">${STR}</span>` : '';
    return `<span class="pstars${o.sm ? ' sm' : ''}" title="${esc(o.title || '')}" aria-label="${esc(o.title || sfmt(cur))}"><span class="s0">${STR}</span>${o.hi ? lay('sph', o.hi) : ''}${o.lo ? lay('spl', o.lo) : ''}${lay(o.red ? 'scr' : 'sc', cur)}</span>`;
  }
  const potTxt = (r) => r.lo === r.hi ? sfmt(r.lo) : `${sfmt(r.lo).replace(' ★', '')} à ${sfmt(r.hi)}, estimation du staff`;
  // Niveau + potentiel (étoiles pleines, puis contours ; zone pâle = incertitude du staff)
  // Niveau actuel seul, et potentiel seul (pleines jusqu'au bas de la fourchette, pâles jusqu'au haut)
  function lstars(p, o = {}) { const s = H.stars(p.ovr, sref()); return sbar(s, { sm: o.sm, title: `Niveau : ${H.starLabel(s).toLowerCase()} (${sfmt(s)})` }); }
  function potbar(r, o = {}) { return sbar(r.lo, { hi: r.hi > r.lo ? r.hi : 0, sm: o.sm, title: `Potentiel : ${H.potLabel(r.hi).toLowerCase()} (${potTxt(r)})` }); }
  function pot(p, o = {}) { return potbar(H.potRange(p, sref()), o); }
  // Niveau seul, pour une valeur sur 20 (note à un poste, note diminuée par la fatigue)
  function vstars(v, o = {}) { const s = H.stars(v, sref()); return sbar(s, { sm: o.sm, red: o.red, title: o.title || `${H.starLabel(s)} (${sfmt(s)})` }); }
  // Nom du championnat : clin d'œil à l'ancienne « Lidl Starligue »
  const LEAGUE = 'SparLigue';
  // Petite couronne du MVP
  const CROWN = '<svg class="crown" viewBox="0 0 24 18" aria-hidden="true"><path d="M2 15 L3.5 4.5 L8.5 9.5 L12 2 L15.5 9.5 L20.5 4.5 L22 15 Z" fill="currentColor"/><rect x="2" y="15.5" width="20" height="2.2" rx="1" fill="currentColor"/></svg>';
  const short = (name) => { const p = name.split(' '); return p[0][0] + '. ' + p.slice(1).join(' '); };
  const DEF_TXT = {
    '6-0': ['Protège la zone, limite les tirs de près', 'Laisse tirer de loin'],
    '5-1': ['Gêne la circulation et les tirs de 9 m', 'Ouvre des espaces au pivot et aux changements de secteur'],
    '4-2': ['Provoque des pertes de balle', 'Ouvre les espaces à 6 m, fatigue accrue']
  };
  const DSTYLE_TXT = {
    zone: ['Aide défensive permanente : solide contre les duels et les percées', 'Fragile face à de bons ailiers'],
    homme: ['Pression sur chaque porteur, ailes étouffées, plus de ballons récupérés', 'Fragile face à des arrières forts en duel, fatigue accrue']
  };
  const JEU_TXT = {
    collectif: 'Circulation, vision de jeu et tirs répartis. Les joueurs perso (esprit collectif de 7 ou moins) perdent plus de ballons. Match après match, l\'esprit collectif des joueurs qui jouent monte doucement.',
    equilibre: 'Ni bonus ni malus : chacun joue selon son profil, et l\'esprit collectif ne bouge pas.',
    individuel: 'Duels et un-contre-un : les meilleurs tireurs prennent leurs responsabilités et tentent plus de gestes. Match après match, l\'esprit collectif des joueurs qui jouent baisse doucement.'
  };
  const rulesLine = (r) => {
    const out = [];
    if (r.sup.on) out.push(`${r.sup.sys} en supériorité`);
    if (r.mene.on) out.push(`${r.mene.sys} si mené de ${r.mene.ecart} après la ${r.mene.min}e`);
    if (r.tireur.on) out.push(`${r.tireur.sys} contre un tireur à 16+`);
    return out.length ? 'Base 6-0 · ' + out.join(' · ') : 'Toujours en 6-0';
  };
  const ATT_TXT = {
    place: ['Jeu placé', 'Moins de pertes de balle, possessions plus longues, peu de contre-attaques'],
    rapide: ['Jeu rapide', 'Contre-attaques et engagements rapides, plus de pertes de balle, fatigue accrue']
  };
  const CONS = Object.fromEntries(H.CONSIGNES);
  // Consignes : une au plus par type ; le détail s'affiche au survol et sous la consigne choisie
  const CONS_TXT = {
    pivot: 'Le jeu passe plus souvent par le pivot.',
    ailes: 'Le jeu s\'écarte plus souvent vers les ailiers.',
    tirloin: 'Tes arrières tirent beaucoup plus à 9 m, avec moins de jeu au pivot.',
    intervalles: 'Plus de percées et de duels : on cherche les 7 m et les exclusions, au risque des passages en force. Tes arrières fatiguent plus vite.',
    longues: 'On fait tourner le ballon : moins de possessions pour les deux équipes, des tirs mieux préparés, mais un risque de jeu passif.',
    maillon: 'Le jeu va vers le vis-à-vis le plus faible de la défense adverse. La défense finit par s\'adapter.',
    agressive: 'Plus de contacts pour récupérer le ballon, au risque des exclusions, de la fatigue et des blessures.',
    prise: 'Le meilleur buteur adverse est pris en individuel. Ses partenaires ont plus d\'espace, et ton défenseur désigné fatigue plus vite.',
    axe: 'La défense resserre le centre (pivot, percées) et laisse plus d\'espace sur les ailes.',
    fermeailes: 'La défense ferme les ailes et laisse plus d\'espace au centre (pivot, percées).',
    interception: 'La défense anticipe les passes pour voler des ballons et partir en contre-attaque ; une interception manquée laisse un décalage.',
    disciplinee: 'Moins d\'exclusions et de 7 m concédés, mais moins de ballons récupérés.',
    rotations: 'Les titulaires jouent environ 32 minutes au lieu de 40 : plus de temps de jeu pour le banc.',
    repli: 'Tout le monde se replie vite : moins de contre-attaques encaissées, mais moins de contre-attaques pour toi.',
    gk7m: 'Sur chaque 7 m adverse, ton gardien remplaçant entre s\'il est meilleur sur ce geste.',
    tourner: 'Au-delà de +6, les remplaçants et les jeunes jouent davantage, jusqu\'à ce que l\'écart retombe sous +3.'
  };
  // Les trois types de consignes, en version compacte (feuille de match, avant-match, pause)
  function consBlock(tac, act, opp) { return ['att', 'def', 'ges'].map((c) => consRow(tac, c, act, opp, true)).join(''); }
  // Lignes de consignes pour un type (att, def, ges) ; opp : adversaire, pour nommer la cible de la prise individuelle
  function consRow(tac, cat, act, opp, full) {
    const list = H.CONSIGNES.filter((c) => c[2] === cat), cur = tac.cons.find((k) => H.consCat(k) === cat);
    const tgt = cur === 'prise' && opp ? H.priseTarget(opp) : null;
    return `<div class="opt"><span class="label">Consigne${full ? ' · ' + H.CONS_CAT[cat].toLowerCase() : ''}</span><div class="row" style="gap:8px">${list.map(([k, l]) => `<button class="chip" data-act="${act}" data-id="${k}" aria-pressed="${cur === k}" title="${esc(CONS_TXT[k])}">${l}</button>`).join('')}</div>${full ? '' : `<p>${cur ? CONS_TXT[cur] + (tgt ? ` Cible : <b style="color:var(--fg)">${esc(tgt.name)}</b>.` : '') : 'Aucune consigne. Une seule possible ; un clic sur la consigne choisie la retire.'}</p>`}</div>`;
  }
  const SLOT = {
    GB: 'left:50%;top:max(30px,10%)', AiG: 'left:max(84px,15%);top:24%', AiD: 'left:min(calc(100% - 84px),85%);top:24%',
    Piv: 'left:50%;top:46%', ArG: 'left:22%;top:65%', ArD: 'left:78%;top:65%', DC: 'left:50%;top:85%'
  };
  const ovrAt = (p, pos) => H.ovrAt(p, pos);
  function nextFixture() {
    if (!G || G.round >= G.sched.length) return null;
    const g = G.sched[G.round].find(([h, a]) => h === G.userId || a === G.userId);
    return g ? { h: g[0], a: g[1] } : { rest: true };
  }
  function rank(id) {
    const s = H.standings(G);
    return s.findIndex((r) => r.id === (id || G.userId)) + 1;
  }
  const ord = (n) => n + (n === 1 ? 'er' : 'e');
  function modChip(key, withDesc) {
    const m = H.modInfo(key);
    if (!m) return '';
    return `<span class="modchip ${m.bonus ? 'plus' : 'minus'}" title="${esc(m.desc)}"><b>${m.bonus ? '+' : '−'}</b> ${esc(m.name)}</span>${withDesc ? `<span class="moddesc">${esc(m.desc)}</span>` : ''}`;
  }
  function ensureDraft() {
    if (U.draft) return U.draft;
    const d = Object.keys(H.MODS);
    for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
    U.draft = { bonus: d.slice(0, 3), malus: d.slice(3, 6), b: null, m: null };
    return U.draft;
  }

  // ---------- Fiche joueur ----------
  function findPlayer(id) {
    for (const t of G.teams) { const p = t.players.find((x) => x.id === id); if (p) return { p, t }; }
    if (G.youth && G.youth.p.id === id) return { p: G.youth.p, t: me() };
    const f = (G.free || []).find((x) => x.id === id);
    if (f) return { p: f, t: FREE_T };
    return null;
  }
  const FREE_T = { id: 'LIB', name: 'Joueur libre', color: '#6f747a' };
  // Jeune libéré par un centre pour faire place à une recrue : où il est aujourd'hui (retrouvé par les mouvements de la journée)
  function releasedTxt(l) {
    const m = (G.moves || []).find((x) => x.round === l.round && x.from === l.team && x.name === l.out);
    const f = m && findPlayer(m.id), who = f ? plink(f.p) : esc(l.out);
    const fate = !m ? '' : !f ? `<span title="Resté sans club 6 semaines : il a quitté la ${LEAGUE}">, parti hors ${LEAGUE}</span>`
      : f.t === FREE_T ? '<span title="Toujours sur le marché : à voir au siège, onglet Joueurs libres">, toujours libre</span>'
      : `, signe à ${badge(f.t, true)} ${esc(f.t.name)}`;
    return `Recruté · ${who} libéré${fate}`;
  }
  function matchNote(p, h) {
    const [, , min, g, sh, sv, fa, to, ex] = h;
    return H.noteOf(p.pos, min, g, sh, sv, fa, to, ex);
  }
  const noteCls = (n) => n === null ? 'muted' : n >= 7.5 ? 'nt5' : n >= 6.5 ? 'nt4' : n >= 5.5 ? 'nt3' : 'nt1';
  function sheetChart(p) {
    const hs = p.hist || [];
    const W = 900, Hh = 128, L = 34, R = 12, T = 12, B = 22;
    const ref = sref(), st = (v) => H.stars(v, ref), pr = H.potRange(p, ref);
    const pts = [[0, st(p.ovr0 ?? p.ovr)]].concat(hs.map((h) => [h[0], st(h[1])]));
    const nR = Math.max(G.sched.length, 1);
    const lo = 0.5, hi = 5;
    const X = (r) => L + (r / nR) * (W - L - R), Y = (v) => T + (1 - (v - lo) / (hi - lo)) * (Hh - T - B);
    const grid = [];
    for (let v = 1; v <= 5; v++) grid.push(`<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="cg"/><text x="${L - 6}" y="${Y(v) + 3.5}" class="ct" text-anchor="end">${v} ★</text>`);
    const xt = [];
    for (let r = 0; r <= nR; r += nR > 12 ? 4 : 2) xt.push(`<text x="${X(r)}" y="${Hh - 6}" class="ct" text-anchor="middle">${r === 0 ? 'Début' : 'J' + r}</text>`);
    const line = pts.map((x, k) => `${k ? 'L' : 'M'}${X(x[0]).toFixed(1)},${Y(x[1]).toFixed(1)}`).join('');
    const potBand = pr.hi > pr.lo
      ? `<rect x="${L}" width="${W - L - R}" y="${Y(pr.hi).toFixed(1)}" height="${(Y(pr.lo) - Y(pr.hi)).toFixed(1)}" class="cpotb"><title>Potentiel estimé : ${potTxt(pr)}</title></rect><text x="${W - R}" y="${Y(pr.hi) < 24 ? Y(pr.hi) + 11 : Y(pr.hi) - 4}" class="ct" text-anchor="end">Potentiel estimé</text>`
      : `<line x1="${L}" x2="${W - R}" y1="${Y(pr.lo)}" y2="${Y(pr.lo)}" class="cpot"/><text x="${W - R}" y="${Y(pr.lo) < 24 ? Y(pr.lo) + 12 : Y(pr.lo) - 4}" class="ct" text-anchor="end">Potentiel</text>`;
    const mins = hs.map((h) => { const bh = (h[2] / 60) * 34; return `<rect x="${(X(h[0]) - 5).toFixed(1)}" y="${(Hh + 40 - bh).toFixed(1)}" width="10" height="${bh.toFixed(1)}" rx="1.5" class="${h[2] > 0 ? 'cb' : 'cb0'}"><title>J${h[0]} : ${h[2]} min</title></rect>${(p.pos === 'GB' ? h[5] : h[3]) ? `<text x="${X(h[0]).toFixed(1)}" y="${(Hh + 40 - bh - 3).toFixed(1)}" class="ct cv" text-anchor="middle">${p.pos === 'GB' ? h[5] : h[3]}</text>` : ''}`; }).join('');
    return `<svg viewBox="0 0 ${W} ${Hh + 46}" class="schart" role="img" aria-label="Évolution du niveau en étoiles et minutes jouées par journée">
      ${potBand}${grid.join('')}${xt.join('')}
      <path d="${line}" class="cl"/>${pts.map((x) => `<circle cx="${X(x[0]).toFixed(1)}" cy="${Y(x[1]).toFixed(1)}" r="2.6" class="cpt"><title>${x[0] ? 'Après J' + x[0] : 'Début de saison'} : ${sfmt(x[1])}</title></circle>`).join('')}
      <line x1="${L}" x2="${W - R}" y1="${Hh + 40}" y2="${Hh + 40}" class="cg"/><text x="${L - 6}" y="${Hh + 30}" class="ct" text-anchor="end">Min</text>${mins}</svg>`;
  }
  function sheetHtml(p, t) {
    const hs = p.hist || [];
    const gk = p.pos === 'GB';
    const sum = (k) => hs.reduce((a, h) => a + h[k], 0);
    const played = hs.filter((h) => h[2] >= 1);
    const notes = hs.map((h) => matchNote(p, h)).filter((n) => n !== null);
    const avgN = notes.length ? notes.reduce((a, n) => a + n, 0) / notes.length : null;
    const pct = (a, b) => b ? Math.round((a / b) * 100) + ' %' : '–';
    const d = p.ovr - (p.ovr0 ?? p.ovr);
    const tile = (l, v, sub) => `<div class="stile"><span class="label">${l}</span><b class="num">${v}</b>${sub ? `<span class="muted">${sub}</span>` : ''}</div>`;
    const tiles = [tile('Matchs joués', played.length || p.apps || 0, `${hs.length} journée${hs.length > 1 ? 's' : ''}`), tile('Min / match', played.length ? Math.round(sum(2) / played.length) : '–', `${Math.round(sum(2))} min au total`)]
      .concat(gk ? [tile('Arrêts', sum(5), pct(sum(5), sum(6)) + ' des tirs'), tile('Tirs subis', sum(6))] : [tile('Buts', sum(3), `${sum(4)} tirs · ${pct(sum(3), sum(4))}`), tile('Pertes de balle', sum(7)), tile('Exclusions', sum(8))])
      .concat([tile('Note moyenne des matchs', avgN === null ? '–' : avgN.toFixed(1).replace('.', ','), 'sur 10'), tile('Réserve', p.resApps || 0, p.resFocus ? `pas de match cette semaine (moins de 7) : séance ${H.TRAIN[p.resFocus].label.toLowerCase()}` : p.resApps ? `match${p.resApps > 1 ? 's' : ''} · ${p.resMins} min` : 'aucun match'), tile('MVP du match', p.mvp || 0, p.mvpBoost === G.round ? 'en confiance pour ce match' : (p.mvp ? 'cette saison' : '–'))]);
    const keys = H.POS_ATTRS[p.pos], traits = gk ? [] : H.TRAITS.map((x) => x[0]);
    const a0 = p.a0 || p.a;
    const attr = (k) => { const v = p.a[k], g = v - (a0[k] ?? v); return `<div class="sattr${keys.includes(k) ? ' key' : ''}"${k === 'robustesse' ? ` title="Résistance aux blessures : ${robTxt(v)}"` : ''}><span>${esc(ATTR_LABEL[k])}</span><span class="sbar"><span style="width:${v * 5}%" class="${heat(v)}"></span></span><b class="num">${v}</b><span class="num ${g > 0 ? 'dlt' : g < 0 ? 'dlt neg' : 'muted'}">${g > 0 ? '+' + g : g < 0 ? g : ''}</span></div>`; };
    const allK = (gk ? H.GKA.map((x) => x[0]) : H.FIELD.map((x) => x[0])).concat('robustesse');
    const gained = allK.concat(traits).reduce((a, k) => a + Math.max(0, p.a[k] - (a0[k] ?? p.a[k])), 0);
    const teamName = (id) => { const x = G.teams.find((tt) => tt.id === id); return x ? x.id : id; };
    const rows = hs.slice().reverse().map((h) => { const n = matchNote(p, h); return `<tr><td>J${h[0]}</td><td>${esc(teamName(h[9]))}</td><td><span class="res ${h[10] > 0 ? 'w' : h[10] < 0 ? 'l' : 'd'}">${h[10] > 0 ? 'V' : h[10] < 0 ? 'D' : 'N'}</span></td><td class="r num">${h[2] || '–'}</td><td class="r num">${h[2] < 1 ? '' : gk ? `${h[5]}/${h[6]}` : `${h[3]}/${h[4]}`}</td>${gk ? '' : `<td class="r num">${h[2] < 1 ? '' : h[7]}</td><td class="r num">${h[8] || ''}</td>`}<td class="r"><span class="mnote ${noteCls(n)}">${n === null ? '–' : n.toFixed(1).replace('.', ',')}</span></td></tr>`; }).join('');
    const mine = t.id === G.userId;
    return `<div class="modal sheet" role="dialog" aria-modal="true" aria-labelledby="pstitle">
      <div class="shead"><div><div class="row" style="gap:8px"><span class="pos${gk ? ' gb' : ''}">${p.pos}</span><span class="muted">${esc(H.POS_LABEL[p.pos])}</span>${p.age < 23 ? '<span title="Moins de 23 ans">🌱</span>' : ''}${p.youth ? '<span class="yt" title="Formé au club">J</span>' : ''}</div>
        <h2 id="pstitle">${esc(p.name)}</h2>${H.hurt(p) ? `<p class="injline"><span class="inj">✚</span> ${esc(p.inj.type)} · ${absTxt(p.inj.n)}${t.id === G.userId ? ` · retour prévu à la journée ${G.round + p.inj.n + 1}` : ''}</p>` : p.frag > 0 ? `<p class="injline"><span class="inj frag">✚</span> Revenu plus tôt de blessure · fragile encore ${p.frag} semaine${p.frag > 1 ? 's' : ''}</p>` : ''}
        <div class="row" style="gap:10px">${badge(t, true)}<span>${esc(t.name)}</span><span class="muted">${p.age} ans · ${p.hand === 'G' ? 'gaucher' : 'droitier'}${H.SECONDARY[p.pos].length ? ' · dépanne en ' + H.SECONDARY[p.pos].join(', ') : ''}${H.BACK_POS.includes(p.pos) ? ' · jeu ' + H.BACK_STYLES[H.backStyle(p)].toLowerCase() : ''}</span></div></div>
        <div class="sovr"><span class="label">Niveau</span>${lstars(p)}<span class="label" style="margin-top:6px">Potentiel</span>${pot(p)}<span class="${d >= 0.05 ? 'dlt' : d <= -0.05 ? 'dlt neg' : 'muted'}">${d >= 0.05 ? '▲ en progrès' : d <= -0.05 ? '▼ en baisse' : 'stable'} cette saison</span></div>
        <button class="btn sclose" data-act="psclose" aria-label="Fermer la fiche">✕</button></div>
      <div class="stiles">${tiles.join('')}</div>
      <h3 class="sub3">Évolution du niveau</h3>
      ${hs.length ? sheetChart(p) : '<p class="muted">Pas encore de match joué cette saison.</p>'}
      <p class="legend" style="margin:4px 0 0">Courbe : niveau en étoiles après chaque journée (entraînement compris), par rapport à ton club. Barres : minutes jouées${gk ? ', chiffre : arrêts' : ', chiffre : buts'}.</p>
      <div class="grid2" style="margin-top:14px">
        <div style="min-width:0"><h3 class="sub3" style="margin-top:0">Attributs <span class="muted" style="font-weight:400">· ${gained ? `+${gained} point${gained > 1 ? 's' : ''} gagné${gained > 1 ? 's' : ''} cette saison` : 'aucun gain cette saison'}</span></h3>
          <div class="sattrs">${allK.map(attr).join('')}</div>
          ${traits.length ? `<h3 class="sub3">Profil</h3><div class="sattrs">${traits.map(attr).join('')}</div>` : ''}
          <p class="legend">Encadrés : attributs du poste, les seuls travaillés à l'entraînement. Chiffre coloré : évolution depuis le début de saison.${mine ? ` Multiplicateur d'expérience actuel ×${H.matchXP(p).toFixed(1).replace('.', ',')}.` : ''}</p></div>
        <div style="min-width:0"><h3 class="sub3" style="margin-top:0">Match par match</h3>
          ${hs.length ? `<div class="scroll"><table class="pt"><thead><tr><th>J.</th><th>Adv.</th><th>Rés.</th><th class="r">Min</th><th class="r">${gk ? 'Arr./tirs' : 'Buts/tirs'}</th>${gk ? '' : '<th class="r">Pertes</th><th class="r">2 min</th>'}<th class="r" title="Note du match sur 10">Note</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="muted">Rien à afficher pour l\'instant.</p>'}
          <p class="legend">Note : performance du match sur 10 (buts, tirs manqués, pertes, exclusions ; arrêts pour un gardien).</p></div>
      </div></div>`;
  }
  function openSheet(id) {
    const f = findPlayer(id);
    if (!f) return;
    closeSheet();
    const o = document.createElement('div');
    o.className = 'overlay';
    o.id = 'psheet';
    o.innerHTML = sheetHtml(f.p, f.t);
    o.addEventListener('click', (ev) => { if (ev.target === o) closeSheet(); });
    U.sheetFrom = document.activeElement;
    document.body.appendChild(o);
    const c = o.querySelector('.sclose');
    if (c) c.focus();
    tutoSync();
  }
  function closeSheet() {
    const o = document.getElementById('psheet');
    if (o) { o.remove(); tutoSync(); if (U.sheetFrom && document.body.contains(U.sheetFrom)) U.sheetFrom.focus(); }
  }
  const plink = (p, label) => `<button class="plink" data-act="player" data-id="${p.id}" title="Voir la fiche">${esc(label || p.name)}</button>${H.flagOf(p) ? ` <span class="flag" title="Joueur étranger">${H.flagOf(p)}</span>` : ''}${injTag(p)}`;
  // Blessures : petite croix, le détail au survol
  const absTxt = (n) => n > 1 ? `absent encore ${n} matchs` : 'absent pour le prochain match';
  const injTag = (p) => H.hurt(p) ? ` <span class="inj" title="Blessé : ${esc(p.inj.type.toLowerCase())}, ${absTxt(p.inj.n)}" aria-label="Blessé">✚</span>`
    : p.frag > 0 ? ` <span class="inj frag" title="Revenu plus tôt de blessure : risque de rechute pendant encore ${p.frag} semaine${p.frag > 1 ? 's' : ''}" aria-label="Fragile">✚</span>` : '';

  // ---------- Thème du club ----------
  // Accueil neutre ; une fois le club choisi, sa couleur (adoucie) devient la base et sa couleur de contraste les touches
  function hexToHsl(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    let h = 0, s = 0;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }
  const hsl = (h, s, l) => `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
  const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
  function clubTheme(t) {
    const base = H.clubOf(t).color ? H.clubOf(t) : t;
    const [h, s0, l0] = hexToHsl(t.color);
    const [h2, s2] = hexToHsl(base.color2 || '#c8a24a');
    // Couleurs du club volontairement atténuées : la base reste sobre, le contraste n'est qu'une touche
    const grey = s0 < 0.1, s = Math.min(s0, 0.38);
    const sc = Math.min(Math.max(s2, 0.25), 0.45);
    const tint = grey ? 0.01 : 0.04;
    const light = {
      bg: hsl(h, tint, 0.962), sunk: hsl(h, tint, 0.918), line: hsl(h, tint, 0.85), muted: hsl(h, 0.05, 0.42), fg: hsl(h, grey ? 0.04 : 0.12, 0.12),
      accent: hsl(h, s, clampN(l0, 0.26, 0.36)), 'accent-soft': hsl(h, grey ? 0.03 : 0.16, 0.935),
      court: hsl(h, Math.min(s, 0.3), grey ? 0.22 : 0.27), 'court-soft': hsl(h, grey ? 0.03 : 0.14, 0.915),
      board: hsl(h, grey ? 0.04 : 0.16, 0.11), 'board-dim': hsl(h, 0.06, 0.64),
      digit: hsl(h2, sc, 0.7), gold: hsl(h2, sc, 0.42), zone: hsl(h2, sc * 0.7, 0.58), 'on-accent': '#ffffff'
    };
    const dark = {
      bg: hsl(h, grey ? 0.02 : 0.1, 0.065), surface: hsl(h, grey ? 0.02 : 0.08, 0.095), sunk: hsl(h, grey ? 0.02 : 0.1, 0.075), line: hsl(h, grey ? 0.03 : 0.08, 0.18),
      fg: hsl(h, 0.06, 0.92), muted: hsl(h, 0.05, 0.63),
      accent: hsl(h, grey ? 0 : Math.max(s, 0.28), grey ? 0.84 : 0.68), 'accent-soft': hsl(h, grey ? 0.02 : 0.16, 0.16),
      court: hsl(h, Math.min(s, 0.28), grey ? 0.27 : 0.33), 'court-soft': hsl(h, grey ? 0.02 : 0.14, 0.13),
      board: hsl(h, grey ? 0.03 : 0.14, 0.055), 'board-dim': hsl(h, 0.06, 0.58),
      digit: hsl(h2, sc, 0.7), gold: hsl(h2, sc, 0.66), zone: hsl(h2, sc * 0.7, 0.5), 'on-accent': hsl(h, 0.2, 0.08), 'pos-fg': hsl(h, grey ? 0 : 0.3, 0.76)
    };
    const css = (o) => Object.entries(o).map(([k, v]) => `--${k}: ${v};`).join(' ');
    return `html:root { ${css(light)} }
@media (prefers-color-scheme: dark) { html:root:not([data-theme="light"]) { ${css(dark)} } }
html:root[data-theme="dark"] { ${css(dark)} }`;
  }
  function applyTheme() {
    let el = document.getElementById('clubtheme');
    const key = G ? me().id : '';
    if (el && el.dataset.k === key) return;
    if (!el) { el = document.createElement('style'); el.id = 'clubtheme'; document.head.appendChild(el); }
    el.dataset.k = key;
    el.textContent = G ? clubTheme(me()) : '';
  }

  // ---------- Rendu principal ----------
  // Écran de téléphone : le jeu est pensé pour ordinateur et tablette (alerte une fois par session, on peut continuer)
  function isPhone() {
    const mm = (q) => window.matchMedia && window.matchMedia(q).matches;
    return mm('(max-width: 700px)') || (mm('(pointer: coarse)') && Math.min(screen.width, screen.height) < 600);
  }
  function devDismissed() { if (U.devOk === undefined) { try { U.devOk = sessionStorage.getItem('hbm-dev-ok') === '1'; } catch (e) { U.devOk = false; } } return U.devOk; }
  function deviceModal() {
    if (devDismissed() || !isPhone()) return '';
    return `<div class="overlay" id="devov" role="dialog" aria-modal="true" aria-labelledby="devtitle"><div class="modal" style="max-width:420px">
      <h2 id="devtitle" style="margin:0 0 8px">Plutôt sur grand écran</h2>
      <p style="margin:0 0 10px">B9M Manager se joue sur <b>ordinateur ou tablette</b>. Sur un téléphone, les tableaux, le terrain et le match en direct sont trop serrés pour être confortables.</p>
      <p class="muted" style="margin:0 0 16px">Sur tablette, le mode paysage est le plus agréable.</p>
      <div class="row"><button class="btn primary" data-act="devok">Continuer quand même</button></div></div></div>`;
  }
  function render() {
    const app = document.getElementById('app');
    applyTheme();
    if (!G) { app.innerHTML = renderHome() + deviceModal(); return; }
    const views = { libres: renderFree, clubhouse: renderClubhouse, ville: renderCity, match: renderMatch, effectif: renderSquad, entrainement: renderTraining, formation: renderFormation, infirmerie: renderInfirmerie, feuille: renderFeuille, tactique: renderTactics, championnat: renderLeague };
    if (!views[U.tab]) U.tab = 'ville';
    const om = document.querySelector('#bsov .modal'), oscroll = om ? om.scrollTop : 0;
    const pm = document.querySelector('#preov .modal'), pscroll = pm && Number(pm.dataset.step) === U.preStep ? pm.scrollTop : 0;
    app.innerHTML = renderTop() + '<main>' + views[U.tab]() + '</main>' + renderFooter() + (U.youthModal && G.youth ? `<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="ytitle"><div class="modal ymodal${U.yStage === 'alert' ? ' yalert' : ''}${U.yAnim && !U.yBatch ? ' yreveal' : ''}${H.potRange(G.youth.p, sref()).lo >= 4 ? ' gem' : ''}${U.yBatch || U.yCmp ? ' wide' : ''}" data-club="${esc(me().name.toUpperCase())}" style="--club:${me().color}">${U.yStage === 'alert' ? `<div class="yback"><span class="yback-k">Centre de formation · ${esc(me().name)}</span><b class="yback-t">Un nouveau talent à ${esc(me().city)} !</b><span class="yback-s">Un jeune sort du centre après la journée ${G.youth.round}.</span><button class="btn primary big" data-act="yflip">Découvrir le joueur</button></div><div inert>${youthCard(true)}</div>` : youthCard(true)}</div></div>` : '') + (U.modsModal ? `<div class="overlay" id="modsov" role="dialog" aria-modal="true" aria-labelledby="modstitle"><div class="modal" style="max-width:560px">${modsHtml()}</div></div>` : '') + preModal() + inboxModal() + (U.bsModal && (U.tab === 'tactique' || U.preStep === 2) && !(U.youthModal && G.youth) ? `<div class="overlay" id="bsov" role="dialog" aria-modal="true" aria-labelledby="bstitle"><div class="modal">${backStyleHtml(me())}</div></div>` : '') + deviceModal();
    if (U.youthModal && G.youth) { if (U.yStage !== 'alert') U.yAnim = false; const f = document.querySelector('.modal button'); if (f) f.focus({ preventScroll: true }); }
    const nm = document.querySelector('#bsov .modal');
    if (nm && oscroll) nm.scrollTop = oscroll;
    const np = document.querySelector('#preov .modal');
    if (np && pscroll) np.scrollTop = pscroll;
    const ib = document.querySelector('#inboxov .wamsgs');
    if (ib) ib.scrollTop = ib.scrollHeight;
    U.ctlSig = ctlSig();
    U.lastTab = U.tab;
    tutoSync();
  }

  function modsPicker() {
    const d = ensureDraft();
    const card = (dom, sign, act, cur) => {
      const m = H.modInfo(dom + sign);
      return `<button class="modcard ${sign === '+' ? 'plus' : 'minus'}" data-act="${act}" data-id="${dom}" aria-pressed="${cur === dom}"><span class="label">${esc(m.label)}</span><b>${esc(m.name)}</b><span>${esc(m.desc)}</span></button>`;
    };
    const ready = d.b && d.m;
    const club = H.CLUBS.find((c) => c.id === U.newClub);
    return `<section class="panel"><div class="row" style="justify-content:space-between;margin-bottom:14px"><div class="row">${badge(club)}<div><b style="font-family:var(--f-display);font-size:1.25rem">${esc(club.name)}</b><br><span class="muted">${esc(club.city)} · ${stars(club.rep)}</span></div>${traitsHtml(club)}</div><button class="btn" data-act="step1">← Changer de club</button></div>
      <h3>Bonus et malus du club</h3>
      <p class="muted" style="margin:0 0 14px">Le hasard t'en propose trois de chaque : choisis un bonus et un malus. Ils durent toute la saison. Les clubs adverses reçoivent chacun un bonus et un malus au hasard. Supporters et centre de formation, eux, sont propres au club.</p>
      <div class="modgrid"><div class="modcol"><span class="label good">Ton bonus</span>${d.bonus.map((k) => card(k, '+', 'pickb', d.b)).join('')}</div>
        <div class="modcol"><span class="label bad">Ton malus</span>${d.malus.map((k) => card(k, '-', 'pickm', d.m)).join('')}</div></div>
      <label class="tutoopt"><input type="checkbox" data-tutoopt${U.tutoOpt !== false ? ' checked' : ''}><span><b>Être accompagné par l'adjoint pendant la première journée</b><span class="muted">Un conseil court à chaque écran, le temps de prendre ses marques. Décoche si tu connais déjà le jeu.</span></span></label>
      <div class="row" style="margin-top:18px"><button class="btn primary big" data-act="start" ${ready ? '' : 'disabled'}>Lancer la saison</button><span class="muted">${ready ? `${esc(H.CLUBS.find((c) => c.id === U.newClub).name)} · ${esc(H.modInfo(d.b + '+').name)} · ${esc(H.modInfo(d.m + '-').name)}` : 'Choisis un bonus et un malus pour lancer la saison.'}</span></div></section>`;
  }
  function renderHome() {
    return `<section class="hero"><span class="label">Prototype · ${LEAGUE} 2026-2027</span><h1>B9M<br><span>Manager</span></h1>
      <p>Prends en main un club de la saison ${H.DATA ? H.DATA.season : ""}, choisis tes 7, ton système défensif et tes consignes, puis vis la ${LEAGUE}, un championnat de 16 clubs en aller-retour (30 journées) simulé possession par possession.</p>
      <p class="devnote">À jouer sur ordinateur ou tablette (de préférence en paysage) : l'interface n'est pas faite pour les téléphones.</p></section>
      <ol class="steps" aria-label="Étapes"><li aria-current="${U.homeStep !== 2 ? 'step' : 'false'}"><b>1</b> Ton club</li><li aria-current="${U.homeStep === 2 ? 'step' : 'false'}"><b>2</b> Bonus et malus</li><li><b>3</b> Coup d'envoi</li></ol>
      ${U.homeStep === 2 ? modsPicker() : `<section class="panel"><h3>Choisis ton club</h3><div class="clubs">${H.CLUBS.slice().sort((a, b) => b.rep - a.rep || a.name.localeCompare(b.name, 'fr')).map((c) => `<button class="club" data-act="pick" data-id="${c.id}" aria-pressed="${U.newClub === c.id}" title="${esc(`${c.fans.name} · domicile ${c.fans.h}/5 · déplacement ${c.fans.a}/5 · centre de formation ${c.academy}/5`)}">${badge(c)}<span><span class="n">${esc(c.name)}</span><br><span class="c">${esc(c.city)} · ${stars(c.rep)}</span></span></button>`).join('')}</div>
      <div class="row" style="margin-top:18px"><button class="btn primary big" data-act="step2">Continuer avec ${esc(H.CLUBS.find((c) => c.id === U.newClub).name)} →</button><span class="muted">La réputation fixe le niveau moyen de l'effectif généré.</span></div></section>`}`;
  }

  function renderTop() {
    const t = me();
    const nf = nextFixture();
    let next = '<b>Saison terminée</b>';
    if (nf && nf.rest) next = `Journée ${G.round + 1}<br><b>Repos</b>`;
    else if (nf) {
      const home = nf.h === t.id;
      const o = T(home ? nf.a : nf.h);
      next = `Prochain match<br><b>${home ? 'contre' : 'à'} ${esc(o.name)}</b>${G.results.length ? ` (${ord(rank(o.id))})` : ''}`;
    }
    const live = U.view === 'live' && U.m;
    const btn = live ? `<button class="btn primary nextbtn" data-act="tab" data-id="match">Match en cours →</button>`
      : G.trainPending ? (U.tab === 'entrainement' ? `<button class="btn primary nextbtn" data-act="dotrain">Lancer la semaine →</button>` : trainBtn('nextbtn'))
      : U.post && U.view === 'post' && U.tab === 'match' ? `<button class="btn primary nextbtn" data-act="tab" data-id="championnat">Résultats et classement →</button>`
      : nf ? `<button class="btn primary nextbtn" data-act="gonext">${nf.rest ? 'Journée de repos →' : 'Préparer le match →'}</button>`
      : `<button class="btn nextbtn" data-act="gonext">Voir le bilan →</button>`;
    const pos = G.results.length ? `${ord(rank())} de la ${LEAGUE}` : 'Avant la 1re journée';
    const tabs = [['match', 'Match'], ['effectif', 'Effectif'], ['entrainement', 'Entraînement'], ['formation', 'Centre de formation'], ['libres', 'Joueurs libres'], ['infirmerie', 'Infirmerie'], ['feuille', 'Feuille de match'], ['tactique', 'Tactique'], ['championnat', 'Championnat']];
    const homeIco = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 10v10h4.5v-6h4v6h4.5V10" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
    return `<header class="top"><div class="clubbar"><button class="homebtn" data-act="tab" data-id="ville" aria-label="Ville (accueil)" title="Ville (accueil)" aria-current="${U.tab === 'ville' ? 'page' : 'false'}">${homeIco}</button>${badge(t)}<div><div class="name">${esc(t.name)}${(t.mods || []).length ? ` <button class="modsbtn" data-act="modsopen" aria-label="Voir les bonus et malus du club" title="Bonus et malus du club"><span class="mp">+</span><span class="mm">−</span></button>` : ''}</div><div class="sub">Journée ${Math.min(G.round + 1, G.sched.length)} sur ${G.sched.length} · ${pos}</div></div><span class="spacer"></span><div class="nextwrap"><div class="next">${next}</div>${btn}</div>${live ? '' : phoneBtn()}</div>
      <nav class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" data-act="tab" data-id="${k}" aria-selected="${U.tab === k}">${l}</button>`).join('')}${tutoScreen().length ? '<button class="tutobtn" data-act="tutohelp" aria-label="Conseils de l\'adjoint pour cet écran" title="Conseils de l\'adjoint">?</button>' : ''}</nav></header>`;
  }

  function renderFooter() {
    const reset = U.confirmReset
      ? `<span>Effacer la sauvegarde et revenir au choix du club ? <button class="btn" data-act="resetYes">Oui, recommencer</button> <button class="btn" data-act="resetNo">Annuler</button></span>`
      : `<button class="linkbtn" data-act="reset">Recommencer une partie</button>`;
    return `<footer class="footer"><span>Sauvegarde automatique dans ce navigateur après chaque journée.</span>${reset}</footer>`;
  }

  // ---------- Match ----------
  function boardTeams(h, a, hs, as, cls) {
    const c = cls || ['', ''];
    return `<div class="teams"><div class="team">${badge(h)}<span class="tn">${esc(h.name)}</span></div><div class="score"><span class="${c[0]}">${hs}</span><span class="sep">:</span><span class="${c[1]}">${as}</span></div><div class="team away"><span class="tn">${esc(a.name)}</span>${badge(a)}</div></div>`;
  }
  function tacLine(t) {
    return `${ATT_TXT[t.att][0]} · jeu ${H.JEU[t.jeu].toLowerCase()} · ${H.DSTYLE[t.dstyle].toLowerCase()}${t.cons.length ? ' · ' + t.cons.map((c) => CONS[c].toLowerCase()).join(', ') : ''}`;
  }
  function fitInfo(t) {
    const id = H.identity(t);
    const j = t.tactic.jeu;
    const f = j === 'collectif' ? id.v - 11 : j === 'individuel' ? 11 - id.v : 0;
    const txt = j === 'equilibre' ? 'neutre' : f >= 1 ? 'bonus' : f <= -1 ? 'malus' : 'effet faible';
    return { id, f, txt, cls: j === 'equilibre' ? 'muted' : f >= 1 ? 'good' : f <= -1 ? 'bad' : 'muted' };
  }
  function meter(v, max, col) { return `<span class="meter"><span style="width:${Math.round((v / max) * 100)}%;background:${col}"></span></span>`; }
  function teamProfile(t) {
    const fi = fitInfo(t), exp = H.experience(t), coh = t.cohesion || 50;
    return `<div class="tprof">
      <div class="tp"><span class="label">Identité de jeu</span><b>${fi.id.label} <span class="num muted">${fi.id.v.toFixed(1)}/20</span></b>${meter(fi.id.v, 20, 'var(--court)')}<span class="legend">Moyenne de l'esprit collectif des 6 joueurs de champ titulaires. Elle évolue avec le style joué : le jeu collectif la fait monter, le jeu individuel baisser. Style choisi : ${H.JEU[t.tactic.jeu].toLowerCase()}, <span class="${fi.cls}">${fi.txt}</span>.</span></div>
      <div class="tp"><span class="label">Cohésion</span><b class="num">${coh}/100</b>${meter(coh, 100, 'var(--iso-gym)')}<span class="legend">Monte quand les mêmes titulaires enchaînent les matchs, baisse quand tu changes beaucoup. Joue sur les passes et la réussite.</span></div>
      <div class="tp"><span class="label">Particularités du club</span>${(t.mods || []).length ? t.mods.map((k) => `<div class="modline">${modChip(k, true)}</div>`).join('') : '<span class="legend">Aucune (partie commencée avant les bonus et malus).</span>'}</div>
      <div class="tp"><span class="label">Supporters et formation</span>${traitsHtml(t)}<span class="legend">Propres au club, les mêmes à chaque partie. Détail au survol des pastilles.</span></div>
      <div class="tp"><span class="label">Expérience</span><b class="num">${exp}/100</b>${meter(exp, 100, 'var(--iso-office)')}<span class="legend">Âge et matchs joués des titulaires. Aide dans les fins de match serrées et limite les exclusions.</span></div>
    </div>`;
  }
  function staffAdvice(t, where) {
    const tac = t.tactic, tr = G.training, out = [];
    const add = (mod, st, text, w) => { if (H.hasMod(t, mod) && (where === 'match' || w.includes(where))) out.push({ mod, st, text }); };
    const aggr = tac.cons.includes('agressive'), homme = tac.dstyle === 'homme';
    add('video+', homme ? 'good' : 'info', homme ? "En homme à homme, chaque défenseur est seul : l'analyse vidéo pèse encore plus dans ses face-à-face." : "Tes défenseurs connaissent les tireurs adverses (+1 dans les face-à-face) ; ton gardien aussi sur les 7 m.", ['tactique']);
    add('video-', homme ? 'bad' : 'info', homme ? "En homme à homme, tes défenseurs découvrent seuls leur vis-à-vis (−1) : la défense collective limite la casse." : "Sans vidéo, tes défenseurs partent à −1 dans les face-à-face : la défense collective les fait s'entraider.", ['tactique']);
    add('deplacements+', 'info', "À l'extérieur, ton car te met dans les meilleures conditions : pas de fatigue du trajet, et moitié moins de handicap.", ['tactique']);
    add('deplacements-', tr.intensity === 'intense' ? 'bad' : 'info', tr.intensity === 'intense' ? "Semaine intense après un retour en TER : tes joueurs vont arriver cuits. Pense à l'intensité normale ou légère." : "Après un déplacement, tes joueurs récupèrent moins : fais tourner, surtout le match suivant.", ['training', 'tactique']);
    add('capitanat+', aggr ? 'good' : 'info', aggr ? 'Ton capitaine parle aux arbitres : la défense agressive te coûte moins d\'exclusions.' : 'Garde tes temps morts pour casser les séries : avec ton capitaine, ils durent plus longtemps.', ['tactique']);
    add('capitanat-', aggr ? 'bad' : 'info', aggr ? 'Personne ne calme le jeu : défense agressive et brassard tournant, ça fait beaucoup d\'exclusions.' : 'Tes temps morts portent peu : ne compte pas dessus pour renverser un match.', ['tactique']);
    add('staff+', tr.focus !== 'equilibre' ? 'good' : 'info', tr.focus !== 'equilibre' ? 'Ton staff bac+12 est encore meilleur sur un focus ciblé (×1,1 en plus).' : 'Choisis un focus ciblé : ton staff y est encore meilleur (×1,1 en plus).', ['training']);
    add('staff-', 'info', 'Avec un staff qui joue à Fortnite, les jeunes sous leur potentiel restent ta meilleure source de progrès.', ['training']);
    add('vestiaire+', tac.jeu === 'collectif' ? 'good' : 'info', tac.jeu === 'collectif' ? 'Groupe soudé + jeu collectif : +1 % au tir.' : 'Ton groupe soudé gagne +1 % au tir en jeu collectif.', ['tactique']);
    add('vestiaire-', tac.jeu === 'collectif' ? 'bad' : 'info', tac.jeu === 'collectif' ? 'Deux groupes WhatsApp et jeu collectif : −1 % au tir. Garde un 7 stable pour remonter la cohésion.' : 'Évite le jeu collectif (−1 % au tir) et garde un 7 stable pour remonter la cohésion.', ['tactique']);
    add('soins+', tr.intensity === 'intense' ? 'good' : 'info', tr.intensity === 'intense' ? 'Ton kiné encaisse la semaine intense : fatigue supplémentaire divisée par deux.' : 'Tu peux te permettre l\'intensité intense : ton kiné divise la fatigue en plus par deux.', ['training']);
    add('soins-', tr.intensity === 'intense' ? 'bad' : 'info', tr.intensity === 'intense' ? 'Semaine intense sans kiné : 18 points de fatigue en plus au prochain match.' : 'Évite l\'intensité intense : sans kiné, elle coûte 18 points de fatigue.', ['training']);
    add('cage+', homme ? 'info' : 'good', homme ? 'Ton gardien brille derrière une défense collective (−1,5 % de réussite adverse).' : 'Défense collective + gardien en forme : −1,5 % de réussite adverse.', ['tactique']);
    add('cage-', homme ? 'bad' : 'info', homme ? 'En homme à homme, ton gardien est exposé : +2 % de réussite adverse.' : 'Reste en défense collective pour protéger ton gardien.', ['tactique']);
    add('discipline+', aggr ? 'good' : 'info', aggr ? 'Défense agressive sans risque : tes enfants de chœur ne prennent pas d\'exclusions en plus.' : 'Tu peux activer la défense agressive : elle ne te coûtera pas d\'exclusions en plus.', ['tactique']);
    add('discipline-', aggr || homme ? 'bad' : 'info', aggr || homme ? 'Sang chaud + ' + (aggr ? 'défense agressive' : 'homme à homme') + ' : encore plus d\'exclusions.' : 'Évite la défense agressive et l\'homme à homme : chacun ajoute des exclusions.', ['tactique']);
    add('spectacle+', tac.jeu === 'individuel' ? 'good' : 'info', tac.jeu === 'individuel' ? 'Jeu individuel : tes artistes tentent encore plus de gestes, mieux exécutés.' : 'Passe en jeu individuel pour libérer tes artistes (plus de gestes).', ['tactique']);
    add('spectacle-', tac.jeu === 'collectif' ? 'good' : 'bad', tac.jeu === 'collectif' ? 'Le jeu collectif compense ton jeu prévisible : plus de malus au tir.' : 'Ton attaque placée est prévisible (−1,5 %) : le jeu collectif annule ce malus.', ['tactique']);
    add('mental+', 'info', 'Tes joueurs gèrent bien les fins serrées : le 7 contre 6 est une vraie arme.', ['tactique']);
    add('mental-', 'info', 'Tes joueurs tremblent dans les fins serrées : cherche à creuser l\'écart tôt et évite le 7 contre 6.', ['tactique']);
    add('physique+', tac.att === 'rapide' ? 'good' : 'info', tac.att === 'rapide' ? 'Jeu rapide : +5 % de contre-attaques et presque pas de fatigue en plus.' : 'Passe en jeu rapide : tes joueurs encaissent la fatigue et contre-attaquent plus.', ['tactique']);
    add('physique-', tac.att === 'rapide' ? 'bad' : 'info', tac.att === 'rapide' ? 'Jeu rapide après la raclette : fatigue ×1,25.' : 'Évite le jeu rapide, il épuise ton équipe (fatigue ×1,25).', ['tactique', 'training']);
    add('arbitrage+', tac.jeu === 'individuel' ? 'good' : 'info', tac.jeu === 'individuel' ? 'Jeu individuel : les duels provoquent encore plus de 7 m (×1,9).' : 'Le jeu individuel provoque encore plus de 7 m avec ces arbitres (×1,9 au lieu de ×1,6).', ['tactique']);
    add('arbitrage-', aggr || homme ? 'bad' : 'info', aggr || homme ? 'L\'arbitre a l\'œil sur ta défense ' + (aggr ? 'agressive' : 'en homme à homme') + ' : exclusions en plus.' : 'Évite la défense agressive et l\'homme à homme : l\'arbitre les sanctionne plus.', ['tactique']);
    add('calendrier+', 'info', 'Début de saison facile : profites-en pour faire tourner et lancer les jeunes.', ['tactique', 'training']);
    add('calendrier-', 'info', 'Début de saison difficile : garde un 7 stable pour faire monter la cohésion.', ['tactique', 'training']);
    return out;
  }
  function adviceHtml(t, where) {
    const a = staffAdvice(t, where);
    if (!a.length) return '';
    return `<div class="advice"><span class="label">Conseils du staff</span>${a.map((x) => `<div class="adv ${x.st}"><span class="advmod">${esc(H.modInfo(x.mod).name)}</span><span>${esc(x.text)}</span></div>`).join('')}</div>`;
  }
  function perfBlock(team, side, title) {
    const rows = team.players.filter((p) => ((side.mins || {})[p.id] || 0) > 0.5).map((p) => ({ p, s: (side.ps || {})[p.id] || { sh: 0, g: 0, to: 0, ex: 0, sv: 0, fa: 0 }, m: side.mins[p.id] }));
    const field = rows.filter((r) => r.p.pos !== 'GB').sort((a, b) => b.s.g - a.s.g || b.s.sh - a.s.sh || b.m - a.m);
    const gks = rows.filter((r) => r.p.pos === 'GB');
    const pct = (a, b) => b ? Math.round((a / b) * 100) + ' %' : '–';
    const tag = (r) => r.s.g >= 4 && r.s.g / r.s.sh >= 0.7 ? '<span class="ptag hot">En feu</span>' : r.s.sh >= 4 && r.s.g / r.s.sh <= 0.34 ? '<span class="ptag cold">Maladroit</span>' : r.s.to >= 3 ? '<span class="ptag cold">Perd des ballons</span>' : '';
    const gtag = (r) => r.s.fa >= 8 && r.s.sv / r.s.fa >= 0.4 ? '<span class="ptag hot">Un mur</span>' : r.s.fa >= 8 && r.s.sv / r.s.fa <= 0.2 ? '<span class="ptag cold">En difficulté</span>' : '';
    const sector = (list) => { const x = field.filter((r) => list.includes(r.p.pos)); const g = x.reduce((a, r) => a + r.s.g, 0), sh = x.reduce((a, r) => a + r.s.sh, 0); return `${g}/${sh} (${pct(g, sh)})`; };
    return `<div class="perf" style="min-width:0"><div class="row" style="gap:8px;margin-bottom:6px">${badge(team, true)}<b>${esc(title || team.name)}</b></div>
      <div class="sectors"><span>Ailes <b>${sector(['AiG', 'AiD'])}</b></span><span>Arrières et DC <b>${sector(['ArG', 'ArD', 'DC'])}</b></span><span>Pivot <b>${sector(['Piv'])}</b></span></div>
      <div class="scroll"><table class="pt"><thead><tr><th>Joueur</th><th class="r">Min</th><th class="r">Buts / tirs</th><th class="r">%</th><th class="r">Pertes</th><th class="r">2 min</th><th></th></tr></thead><tbody>
      ${field.map((r) => `<tr><td><span class="pos">${r.p.pos}</span> ${plink(r.p, short(r.p.name))}</td><td class="r">${Math.round(r.m)}</td><td class="r"><b>${r.s.g}</b>/${r.s.sh}</td><td class="r">${pct(r.s.g, r.s.sh)}</td><td class="r">${r.s.to}</td><td class="r">${r.s.ex || ''}</td><td>${tag(r)}</td></tr>`).join('')}
      ${gks.map((r) => `<tr class="gkrow"><td><span class="pos gb">GB</span> ${plink(r.p, short(r.p.name))}</td><td class="r">${Math.round(r.m)}</td><td class="r" colspan="2"><b>${r.s.sv}</b> arrêts / ${r.s.fa} (${pct(r.s.sv, r.s.fa)})</td><td></td><td></td><td>${gtag(r)}</td></tr>`).join('')}
      </tbody></table></div></div>`;
  }
  function perfSection(h, a, hs, as) {
    return `<section class="panel"><h3>Performances individuelles</h3><div class="grid2">${perfBlock(h, hs)}${perfBlock(a, as)}</div>
      <p class="legend">Tirs cadrés ou non, gestes compris. Par secteur : buts sur tirs. Repère qui est en feu chez l'adversaire pour adapter ta défense (style, bascules), et quel secteur de ton attaque fonctionne pour orienter tes consignes.</p></section>`;
  }
  function renderMatch() {
    if (U.view === 'live' && U.m) return renderLive();
    if (U.view === 'post' && U.post) return renderPost();
    if (G.ended) return renderEnd();
    if (G.trainPending) return renderTrainPending();
    const nf = nextFixture();
    if (nf.rest) return renderRest();
    const h = T(nf.h), a = T(nf.a), t = me();
    const home = nf.h === t.id;
    const opp = home ? a : h;
    const best = opp.players.slice().sort((x, y) => y.ovr - x.ovr).slice(0, 3);
    const starters = Object.values(t.lineup).map((id) => t.players.find((p) => p.id === id));
    const tired = starters.filter((p) => p.fatigue > 28);
    const tac = t.tactic;
    return `<section class="board">${boardTeams(h, a, '–', '–')}<div class="meta"><span>Journée ${G.round + 1} · ${home ? 'à domicile' : "à l'extérieur"}</span><span>Salle de ${esc(h.city)}</span></div></section>
      <div class="grid3">
        <section class="panel"><h3>Ton plan de match</h3>
          <div style="display:grid;gap:12px">
            <div class="opt"><span class="label">Attaque · ${ATT_TXT[tac.att][0]} · jeu ${H.JEU[tac.jeu].toLowerCase()}</span><p>${ATT_TXT[tac.att][1]}. Identité de l'équipe : ${fitInfo(t).id.label.toLowerCase()} (${fitInfo(t).txt}).</p></div>
            <div class="opt"><span class="label">Défense · ${H.DSTYLE[tac.dstyle]}</span><p>${rulesLine(tac.rules)}.</p></div>
            ${consBlock(tac, 'cons', opp)}
            <div class="opt"><span class="label">${home ? 'À domicile' : "À l'extérieur"}</span><p>${home ? `${esc(H.fansOf(t).name)} te portent : +${pctTxt(H.homeShot(t))} de réussite au tir. ${esc(opp.name)} perd plus de ballons et prend plus d'exclusions${H.awayCut(opp) ? `, un peu moins grâce à ses supporters en déplacement (−${Math.round(H.awayCut(opp) * 100)} %)` : ''}.` : `Chez ${esc(H.fansOf(opp).name)}, l'adversaire tire mieux (+${pctTxt(H.homeShot(opp))}) et l'arbitre siffle plus sévèrement ta défense : évite la défense agressive. ${H.awayCut(t) ? `Tes supporters en déplacement réduisent ce handicap de ${Math.round(H.awayCut(t) * 100)} %.` : 'Tes supporters ne se déplacent pas : tu pars avec tout le handicap.'}`}</p></div>
            ${adviceHtml(t, 'match')}
            ${tired.length ? `<div class="callout"><span><b>${tired.length} titulaire${tired.length > 1 ? 's' : ''} fatigué${tired.length > 1 ? 's' : ''}</b> : ${tired.map((p) => esc(short(p.name))).join(', ')}. Pense à vérifier ta composition.</span></div>` : ''}
            <div class="row"><button class="btn primary big" data-act="kickoff">Préparer le match</button></div>
          </div>
        </section>
        <section class="panel"><h3>L'adversaire</h3>
          <div style="display:grid;gap:12px">
            <div class="row">${badge(opp)}<div><b>${esc(opp.name)}</b><br>${stars(opp.rep)}</div></div>
            ${oppForm(opp)}
            <div class="opt"><span class="label">Tactique observée</span><p>${tacLine(opp.seen || opp.tactic)}<br>${rulesLine(opp.tactic.rules)}</p></div>
            <div class="opt"><span class="label">Profil</span><p>Identité ${H.identity(opp).label.toLowerCase()} · cohésion ${opp.cohesion || 50} · expérience ${H.experience(opp)}</p>${traitsHtml(opp, { coach: true })}${(opp.mods || []).map((k) => `<div class="modline">${modChip(k, true)}</div>`).join('')}</div>
            ${(() => { const mv = opp.players.filter((p) => p.mvp).sort((x, y) => y.mvp - x.mvp); return mv.length ? `<div class="opt"><span class="label">MVP dans leur effectif</span>${mv.slice(0, 3).map((p) => `<div class="row" style="gap:8px"><span class="mvpmini">${CROWN}</span><span class="pos${p.pos === 'GB' ? ' gb' : ''}">${p.pos}</span><span>${plink(p)}</span><span class="muted">${p.mvp} fois MVP${p.mvpBoost === G.round ? ' · en confiance' : ''}</span></div>`).join('')}</div>` : ''; })()}
            <div class="opt"><span class="label">Joueurs à surveiller</span>
              ${best.map((p) => `<div class="row" style="gap:8px"><span class="pos${p.pos === 'GB' ? ' gb' : ''}">${p.pos}</span><span>${plink(p)}</span>${vstars(p.ovr, { sm: true })}</div>`).join('')}
            </div>
          </div>
        </section>
        <aside class="side">${betCard(h, a)}${tvCard(h, a)}</aside>
      </div>
      <section class="panel"><h3>Effectif adverse · ${esc(opp.name)}</h3>
        <p class="legend" style="margin:0 0 8px">Les notes de tous leurs joueurs, pour préparer ton plan : repère leurs meilleurs tireurs, leurs ailiers et leurs duellistes. Clique sur un en-tête pour trier.</p>
        ${squadTable(opp, opp.players.filter((p) => p.pos !== 'GB'), FIELD_COLS, false)}
        <h3 class="sub3">Gardiens</h3>${squadTable(opp, opp.players.filter((p) => p.pos === 'GB'), GK_COLS, true)}</section>`;
  }

  function menHtml(s, i) {
    const n = 7 - U.m.short(s, i);
    let out = '';
    for (let k = 0; k < 7; k++) out += `<i class="${k < n ? '' : 'out'}"></i>`;
    return `<span class="men" aria-label="${n} joueurs sur le terrain">${out}</span>`;
  }
  const ipill = (s) => { const v = s.tac.int || 0; return `<span class="ipill i${v < 0 ? 'm' : ''}${Math.abs(v)}" title="Intensité">${H.INTENSITY_LV[v]}</span>`; };
  function boardInner() {
    const m = U.m;
    const i = Math.min(m.i, m.N - 1);
    const min = m.done ? 60 : m.minute(i);
    const pct = Math.round((m.i / m.N) * 100);
    // Le chiffre qui vient de changer « tombe » comme sur un panneau d'affichage
    const sc = [m.h.score, m.a.score], pv = U.prevSc || sc;
    U.prevSc = sc;
    return `${boardTeams(m.h.team, m.a.team, m.h.score, m.a.score, sc.map((v, k) => (v !== pv[k] ? 'drop' : '')))}
      ${momSvg(momSeries(m.ev, m.done ? 60 : (m.i / m.N) * 60), m.h.team, m.a.team)}
      <div class="meta"><span>${menHtml(m.h, i)}</span><span class="clock">${min}'</span><span>${menHtml(m.a, i)}</span></div>
      <div class="bar"><span style="width:${pct}%"></span></div>
      <div class="meta"><span>Défense ${m.h.curDef} ${ipill(m.h)}</span><span>${ipill(m.a)} Défense ${m.a.curDef}</span></div>
      <div class="meta"><span>${m.halfDone ? '2e mi-temps' : '1re mi-temps'}${m.halfDone ? ` · mi-temps ${m.h.half}–${m.a.half}` : ''}</span><span>${U.paused ? 'En pause' : 'Vitesse ×' + U.speed}</span></div>`;
  }
  // Courbe de momentum : chaque action pèse pour son équipe puis s'estompe en 2 à 3 minutes.
  // Buts, arrêts, tirs contrés pour ; pertes de balle, tirs manqués, exclusions contre. Au-dessus : domicile.
  const MOM_W = { but: 1, arret: 0.6, contre: 0.4, to: -0.5, rate: -0.3, excl: -0.6, rouge: -0.8 };
  const MOM_STEP = 0.5;
  function momSeries(ev, now) {
    const pts = ev.filter((e) => MOM_W[e.type] && (e.side === 0 || e.side === 1)).map((e) => [e.m + 0.5, MOM_W[e.type] * (e.side === 0 ? 1 : -1)]);
    const out = [];
    for (let t = 0; t <= now + 1e-9; t += MOM_STEP) {
      let v = 0;
      for (const [m, w] of pts) { const d = t - m; if (d > 0 && d < 8) v += w * (d / 1.2) * Math.exp(1 - d / 1.2); }
      out.push(Math.round(Math.tanh(v / 1.7) * 100) / 100);
    }
    return out;
  }
  function momSvg(series, h, a) {
    const W = 600, M = 32, A = 28, x = (k) => (k * MOM_STEP / 60 * W).toFixed(1);
    const line = series.map((v, k) => `${x(k)},${(M - v * A).toFixed(1)}`).join(' ');
    const area = series.length > 1 ? `M0,${M} L${line} L${x(series.length - 1)},${M} Z` : '';
    return `<div class="momc" title="Dynamique du match : buts, arrêts et tirs contrés pour une équipe, pertes de balle, tirs manqués et exclusions contre elle, sur les dernières minutes. En haut ${esc(h.name)}, en bas ${esc(a.name)}.">
      <span class="momt"><span style="color:${momColor(h)}">${h.id}</span><span style="color:${momColor(a)}">${a.id}</span></span>
      <span class="momg"><svg viewBox="0 0 ${W} ${2 * M}" preserveAspectRatio="none" aria-hidden="true"><defs><clipPath id="momUp"><rect x="0" y="0" width="${W}" height="${M}"/></clipPath><clipPath id="momDn"><rect x="0" y="${M}" width="${W}" height="${M}"/></clipPath></defs>
        <line x1="${W / 2}" y1="2" x2="${W / 2}" y2="${2 * M - 2}" class="momht"/>
        ${area ? `<path d="${area}" clip-path="url(#momUp)" fill="${momColor(h)}"/><path d="${area}" clip-path="url(#momDn)" fill="${momColor(a)}"/>` : ''}
        <line x1="0" y1="${M}" x2="${W}" y2="${M}" class="mom0"/></svg><span class="momx">${[0, 15, 30, 45, 60].map((m) => `<span>${m}'</span>`).join('')}</span></span></div>`;
  }
  // Couleur du club éclaircie, davantage pour les couleurs très sombres (lisibles sur le tableau noir)
  const momColor = (t) => { const c = (t.color || '#888').replace('#', ''), n = parseInt(c.length === 3 ? c.replace(/./g, '$&$&') : c, 16); const l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; return `color-mix(in srgb, ${t.color} ${l < 0.25 ? 40 : 70}%, #fff)`; };
  function evHtml(e, teams) {
    const cls = e.side === -1 ? 'neutral' : e.side === U.side ? 'mine' : 'them';
    const tm = teams && e.side >= 0 ? teams[e.side] : null;
    const tag = e.type === 'excl' ? '<span class="tag excl">2 min</span>' : e.type === 'rouge' ? '<span class="tag rouge">Rouge</span>' : e.type === 'tm' ? '<span class="tag tm">TM</span>' : e.type === 'sys' ? '<span class="tag sys">Déf.</span>' : e.type === 'contre' ? '<span class="tag sys">Contre</span>' : e.type === 'coach' || (e.type === 'tm' && e.ai && e.side !== U.side) ? '<span class="tag coach">Coach</span>' : e.geste ? '<span class="tag geste">Geste</span>' : '';
    const sc = e.type === 'but' ? `${e.sc[0]}–${e.sc[1]}` : '';
    return `<div class="ev ${cls}${e.key ? ' key' : ''}"${tm ? ` style="--tc:${tm.color}"` : ''}><span class="m">${e.m}'</span><span class="t">${tm ? `<span class="evteam" style="background:${tm.color}">${tm.id}</span>` : ''}${tag}${esc(e.text)}</span><span class="s">${sc}</span></div>`;
  }
  function statsHtml(a, b) {
    const pct = (s) => s.shots ? Math.round((s.goals / s.shots) * 100) + ' %' : '–';
    const rows = [
      ['Buts', a.goals, b.goals], ['Tirs', a.shots, b.shots], ['Efficacité', pct(a), pct(b)], ['Arrêts du gardien', a.saves, b.saves],
      ['Exclusions 2 min', a.excl, b.excl], ['7 m marqués / obtenus', `${a.sevenG}/${a.seven}`, `${b.sevenG}/${b.seven}`],
      ['Pertes de balle', a.to, b.to], ['Tirs contrés en défense', a.blocks || 0, b.blocks || 0], ['Contre-attaques', a.ca, b.ca], ['Gestes réussis / tentés', `${a.gestOk || 0}/${a.gest || 0}`, `${b.gestOk || 0}/${b.gest || 0}`]
    ];
    return `<div class="statcmp">${rows.map(([l, x, y]) => `<div class="sr"><span class="l">${x}</span><span class="c">${l}</span><span class="rr">${y}</span></div>`).join('')}</div>`;
  }
  function ctlSig() {
    const m = U.m;
    if (!m || U.view !== 'live') return '';
    const s = m.S[U.side];
    return JSON.stringify([U.tPanel, U.paused, U.speed, s.to, m.half(), s.empty, s.tac, s.forceDef, s.lineup.GB.id]);
  }
  function ctlHtml() {
    const m = U.m, s = m.S[U.side], h = m.half();
    if (U.tPanel) {
      const ht = U.tPanel === 'mt', adv = U.tPanel === 'adv';
      return `<h3>${ht ? 'Mi-temps' : adv ? 'Temps mort adverse' : 'Temps mort'}</h3><div style="display:grid;gap:12px">
        <p class="muted" style="margin:0">${ht ? `Pause à la mi-temps : ${m.h.score}–${m.a.score}. Regarde les performances individuelles plus bas et ajuste ton plan pour la 2e période.` : adv ? `${esc(m.S[1 - U.side].team.name)} demande un temps mort. Profites-en pour ajuster toi aussi, sans utiliser le tien.` : 'Le match est arrêté. Ajuste ta tactique pour la suite de la rencontre.'}</p>
        <div class="opt"><span class="label">Système défensif</span><div class="seg"><button data-act="mdef" data-id="auto" aria-pressed="${!s.forceDef}">Auto (règles)</button>${H.TACTIC_DEFS.map((d) => `<button data-act="mdef" data-id="${d}" aria-pressed="${s.forceDef === d}">${d} forcé</button>`).join('')}</div></div>
        <div class="opt"><span class="label">Style défensif</span><div class="seg">${Object.entries(H.DSTYLE).map(([k, l]) => `<button data-act="mds" data-id="${k}" aria-pressed="${s.tac.dstyle === k}">${l}</button>`).join('')}</div></div>
        <div class="opt"><span class="label">Attaque</span><div class="seg">${['place', 'rapide'].map((x) => `<button data-act="matt" data-id="${x}" aria-pressed="${s.tac.att === x}">${ATT_TXT[x][0]}</button>`).join('')}</div></div>
        ${intensityHtml(s)}
        <div class="opt"><span class="label">Jeu</span><div class="seg">${Object.entries(H.JEU).map(([k, l]) => `<button data-act="mjeu" data-id="${k}" aria-pressed="${s.tac.jeu === k}">${l}</button>`).join('')}</div></div>
        ${consBlock(s.tac, 'mcons', m.S[1 - U.side].team)}
        <div><button class="btn primary" data-act="resume">${ht ? 'Lancer la 2e mi-temps' : 'Reprendre le match'}</button></div></div>`;
    }
    return `<h3>Banc de touche</h3><div style="display:grid;gap:12px">
      <div class="row"><button class="btn" data-act="pause">${U.paused ? 'Reprendre' : 'Pause'}</button>
        <div class="seg" role="group" aria-label="Vitesse">${[1, 2, 4].map((v) => `<button data-act="speed" data-id="${v}" aria-pressed="${U.speed === v}">×${v}</button>`).join('')}</div>
        <button class="btn" data-act="finish">Aller au coup de sifflet final</button></div>
      <div class="row">${(() => { const left = 3 - s.to[0] - s.to[1], ok = U.m.canTO(U.side); return `<button class="btn primary" data-act="timeout" ${ok ? '' : 'disabled'} title="3 temps morts par match, 2 au plus par mi-temps">${ok ? `Temps mort · ${left} restant${left > 1 ? 's' : ''}` : left ? 'Plus de temps mort cette mi-temps' : 'Temps morts épuisés'}</button>`; })()}
        <button class="btn" data-act="empty" aria-pressed="${s.empty}">${s.empty ? 'Arrêter le 7 contre 6' : 'Passer à 7 contre 6'}</button></div>
      <p class="legend" style="margin:0">Pause automatique à la mi-temps pour tes ajustements. Trois temps morts par match, deux au plus par mi-temps. Le 7 contre 6 (gardien remplacé par un joueur de champ) s'active à tout moment : bonus en attaque, mais cage vide en cas de perte.</p>
      <p class="legend" style="margin:0">${tacLine(s.tac)}${s.tac.int ? ` · intensité ${H.INTENSITY_LV[s.tac.int].toLowerCase()}` : ''}<br>${s.forceDef ? 'Défense ' + s.forceDef + ' forcée' : rulesLine(s.tac.rules)}</p></div>`;
  }
  const INT_TXT = {
    '-2': 'On gère : beaucoup moins de fatigue et d\'exclusions, mais moins de ballons récupérés et de contre-attaques. Idéal pour préserver l\'effectif avec une avance confortable.',
    '-1': 'Un peu moins d\'engagement : on souffle et on évite les fautes.',
    0: 'Engagement normal.',
    1: 'Plus de pression défensive et de contre-attaques, un peu plus de fatigue et de 2 minutes.',
    2: 'Tout pour revenir ou tuer le match : pression maximale, plus de ballons récupérés, de contre-attaques et de réussite, mais la fatigue grimpe vite et les exclusions pleuvent. À doser sur quelques minutes.'
  };
  function intensityHtml(s) {
    const v = s.tac.int || 0;
    return `<div class="opt"><span class="label">Intensité · <b style="color:var(--fg)">${H.INTENSITY_LV[v]}</b></span>
      <input type="range" class="intrange" min="-2" max="2" step="1" value="${v}" data-int aria-label="Intensité" aria-valuetext="${H.INTENSITY_LV[v]}">
      <div class="intlabels"><span>Gestion</span><span>Calme</span><span>Normale</span><span>Engagée</span><span>Tout donner</span></div>
      <p style="margin:4px 0 0">${INT_TXT[v]}</p></div>`;
  }
  function courtPanel() {
    const m = U.m, s = m.S[U.side], i = Math.min(m.i, m.N - 1);
    const paused = U.paused, sel = paused ? U.subSel : null;
    const exc = new Set(s.excl.filter((e) => e.until > i).map((e) => e.id));
    const fatCol = (f) => f < 28 ? 'var(--good)' : f < 55 ? 'var(--warn)' : 'var(--bad)';
    const info = (p) => { const f = Math.round(s.fat[p.id] || 0), st = s.ps[p.id] || { g: 0, sh: 0, sv: 0, fa: 0 };
      return `<span class="cfat"><span style="width:${Math.min(100, f)}%;background:${fatCol(f)}"></span></span><span class="cline"><span class="lat ${p.hand === 'G' ? 'g' : 'd'}">${p.hand}</span><span class="num">${p.pos === 'GB' ? `${st.sv}/${st.fa} arr.` : `${st.g}/${st.sh} buts`}</span><span class="num muted">${f}</span></span>`; };
    const effNote = (p, pos) => { const n = ovrAt(p, pos), f = s.fat[p.id] || 0; const k = f > H.FAT.thr ? Math.max(0.55, 1 - (f - H.FAT.thr) * H.FAT.k) : 1; return { n, e: n * k, tired: k < 0.995 }; };
    // Fatigue : pas de niveau chiffré ni d'étoiles, juste une courbe qui plonge, de l'orange au rouge selon la baisse
    const dropCurve = (drop) => {
      const t = Math.max(0, Math.min(1, drop / 0.3)), y = (4 + t * 9).toFixed(1), c = `color-mix(in srgb, var(--bad) ${Math.round(t * 100)}%, var(--warn))`;
      const lvl = t < 0.35 ? 'légère' : t < 0.7 ? 'nette' : 'forte';
      return `<svg class="cdrop" viewBox="0 0 30 16" width="30" height="16" role="img" aria-label="Baisse ${lvl} due à la fatigue"><title>Baisse de niveau ${lvl} due à la fatigue</title><path d="M1 3 L9 3 C 16 3, 20 ${y}, 29 ${y}" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"/><path d="M26 ${(+y - 2.5).toFixed(1)} L29 ${y} L26 ${(+y + 2.5).toFixed(1)}" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    };
    const noteLine = (p, pos, lab) => { const x = effNote(p, pos), sn = H.stars(x.n, sref()); return `<span class="cnote">${lab}${vstars(x.n, { sm: true, title: `${lab}${sfmt(sn)}` })}${x.tired ? dropCurve(1 - x.e / Math.max(0.1, x.n)) : ''}</span>`; };
    const MATCH_ORDER = ['GB', 'AiG', 'ArG', 'DC', 'Piv', 'ArD', 'AiD'];
    const onCards = MATCH_ORDER.map((pos) => {
      const p = s.lineup[pos];
      if (!p) return '';
      const out = exc.has(p.id) || s.red.has(p.id) || s.hurt.has(p.id);
      const dis = !paused || out;
      return `<button class="ccard${sel === pos ? ' sel' : ''}${out ? ' out' : ''}" data-act="subpick" data-id="${pos}" ${dis ? 'disabled' : ''} aria-pressed="${sel === pos}">
        <span class="chead"><span class="pos${pos === 'GB' ? ' gb' : ''}">${pos}</span>${p.age < 23 ? `<span class="cyouth" title="${p.youth ? 'Formé au centre de formation, ' : ''}${p.age} ans : progresse plus vite, surtout avec du temps de jeu">🌱</span>` : ''}${pos in s.manual ? `<span class="ctag" title="Le staff reprend ce poste dans ${Math.max(1, Math.ceil(H.MANUAL_MIN - (i - s.manual[pos]) * 60 / m.N))} min">Coach · ${Math.max(1, Math.ceil(H.MANUAL_MIN - (i - s.manual[pos]) * 60 / m.N))}'</span>` : ''}${out ? '<span class="tag excl">2 min</span>' : ''}</span>
        <b>${esc(short(p.name))}</b>${info(p)}${noteLine(p, pos, '')}</button>`;
    }).join('');
    const bench = s.bench.filter((b) => !s.red.has(b.id) && !s.hurt.has(b.id)).sort((a, b) => MATCH_ORDER.indexOf(a.pos) - MATCH_ORDER.indexOf(b.pos));
    const benchCards = bench.map((p) => {
      let cls = '', ok = false, note = '';
      if (sel) {
        ok = (sel === 'GB') === (p.pos === 'GB');
        cls = !ok ? ' dim' : p.pos === sel ? ' match' : H.SECONDARY[p.pos].includes(sel) ? ' sec' : ' other';
        if (ok) note = noteLine(p, sel, 'À ce poste ');
      } else note = noteLine(p, p.pos, '');
      return `<button class="ccard bench${cls}" data-act="subin" data-id="${p.id}" ${paused && sel && ok ? '' : 'disabled'}>
        <span class="chead"><span class="pos${p.pos === 'GB' ? ' gb' : ''}">${p.pos}</span>${p.age < 23 ? `<span class="cyouth" title="${p.youth ? 'Formé au centre de formation, ' : ''}${p.age} ans : progresse plus vite, surtout avec du temps de jeu">🌱</span>` : ''}</span><b>${esc(short(p.name))}</b>${info(p)}${note}</button>`;
    }).join('');
    const manual = Object.keys(s.manual);
    return `<section class="panel"><div class="row" style="justify-content:space-between;margin-bottom:10px"><h3 style="margin:0">Terrain et banc</h3>
        <span class="legend">${paused ? (sel ? `Choisis qui entre au poste ${H.POS_LABEL[sel].toLowerCase()} : vert même poste, bleu poste secondaire.` : 'Clique sur un joueur du terrain pour le remplacer.') : 'Mets le match en pause pour faire un changement.'}</span></div>
      <span class="label">Sur le terrain</span><div class="cgrid">${onCards}</div>
      <span class="label" style="display:block;margin-top:12px">Banc</span><div class="cgrid">${benchCards || '<span class="muted">Personne sur le banc.</span>'}</div>
      ${manual.length ? `<div class="row" style="gap:8px;margin-top:12px"><span class="legend">Postes gérés par toi (le staff reprend la main au bout de ${H.MANUAL_MIN} minutes de jeu) :</span>${manual.map((pos) => `<button class="chip" data-act="subauto" data-id="${pos}" ${paused ? '' : 'disabled'}>${pos} · rendre au staff</button>`).join('')}</div>` : ''}
      <p class="legend" style="margin:8px 0 0">Jauge de fatigue : verte sous 28, orange jusqu'à 55, rouge au-delà ; dès 28, les attributs baissent. Les rotations restent automatiques. Dès que tu changes un joueur, le staff ne touche plus à ce poste pendant ${H.MANUAL_MIN} minutes de jeu, puis reprend les rotations (ou plus tôt si tu le lui rends). Un joueur exclu ne peut pas être remplacé pendant ses 2 minutes.</p></section>`;
  }
  function liveBar() {
    const m = U.m, i = Math.min(m.i, m.N - 1);
    return `<span class="lbscore"><b>${m.h.team.id}</b> <span class="num">${m.h.score}–${m.a.score}</span> <b>${m.a.team.id}</b> · <span class="num">${m.done ? 60 : m.minute(i)}'</span></span>
      <button class="btn primary lbpause" data-act="${U.tPanel ? 'resume' : 'pause'}" aria-keyshortcuts="Space">${U.tPanel ? (U.tPanel === 'mt' ? '▶ 2e mi-temps' : '▶ Reprendre') : U.paused ? '▶ Reprendre' : '❚❚ Pause'}</button>
      <span class="seg lbspeed" role="group" aria-label="Vitesse">${[1, 2, 4].map((v) => `<button data-act="speed" data-id="${v}" aria-pressed="${U.speed === v}">×${v}</button>`).join('')}</span>
      <span class="legend lbhint">Espace : pause</span>`;
  }
  function renderLive() {
    const m = U.m;
    const sm = m.S[U.side], so = m.S[1 - U.side];
    return `<section class="board" id="board" aria-live="off">${boardInner()}</section>
      <div id="court">${courtPanel()}</div>
      <div class="grid2">
        <section class="panel"><div class="row" style="justify-content:space-between;margin-bottom:10px"><h3 style="margin:0">Fil du match</h3><span class="legend">Le plus récent en haut</span></div><div class="feed" id="feed">${m.ev.slice().reverse().map((e) => evHtml(e, [m.h.team, m.a.team])).join('')}</div></section>
        <div style="display:grid;gap:20px;min-width:0">
          <section class="panel" id="ctl">${ctlHtml()}</section>
          <section class="panel"><h3>Statistiques</h3><div class="row" style="justify-content:space-between;margin-bottom:8px"><span class="label">${esc(m.h.team.id)}</span><span class="label">${esc(m.a.team.id)}</span></div><div id="stats">${statsHtml(m.h.st, m.a.st)}</div></section>
        </div>
      </div>
      <div id="perf">${perfSection(m.h.team, m.a.team, m.h, m.a)}</div>
      <div class="livebar" id="livebar">${liveBar()}</div>`;
  }
  function liveUpdate(evs) {
    const m = U.m;
    if (U.tab !== 'match' || U.view !== 'live' || !m) return;
    const b = document.getElementById('board');
    if (!b) return;
    b.innerHTML = boardInner();
    const f = document.getElementById('feed');
    if (f && evs && evs.length) f.insertAdjacentHTML('afterbegin', evs.slice().reverse().map((e) => evHtml(e, [m.h.team, m.a.team])).join(''));
    const st = document.getElementById('stats');
    if (st) st.innerHTML = statsHtml(m.h.st, m.a.st);
    const ct = document.getElementById('court');
    if (ct) ct.innerHTML = courtPanel();
    const lb = document.getElementById('livebar');
    if (lb) lb.innerHTML = liveBar();
    const pf = document.getElementById('perf');
    if (pf && (U.paused || m.i % 4 === 0)) pf.innerHTML = perfSection(m.h.team, m.a.team, m.h, m.a);
    const sig = ctlSig();
    if (sig !== U.ctlSig) {
      U.ctlSig = sig;
      const c = document.getElementById('ctl');
      if (c) c.innerHTML = ctlHtml();
    }
    tutoHl();
  }
  // Face-à-face de tes arrières et de ton pivot contre leur vis-à-vis (stat élargie en défense collective)
  function faceVal(opp, attPos, k) {
    const at = (pos) => opp.players.find((p) => p.id === opp.lineup[pos]);
    const fpos = H.FACING[attPos], idx = H.DLINE.indexOf(fpos);
    const val = (pos) => { const pl = at(pos); if (!pl) return null; const v = pl.a[k]; return pos.startsWith('Ai') ? 12 + (v - 12) * 0.5 : v; };
    const own = val(fpos), nb = [H.DLINE[idx - 1], H.DLINE[idx + 1]].filter(Boolean);
    let ws = 0, sum = 0;
    for (const pos of nb) { const v = val(pos); if (v === null) continue; const w = pos.startsWith('Ai') ? 0.5 : 1; sum += v * w; ws += w; }
    const v = opp.tactic.dstyle === 'homme' ? own : own * (1 - (k === 'contre' ? 0.5 : 0.35)) + (sum / ws) * (k === 'contre' ? 0.5 : 0.35);
    return { v, who: at(fpos) };
  }
  function faceHtml(t, opp) {
    const homme = opp.tactic.dstyle === 'homme';
    const rows = ['ArG', 'DC', 'ArD'].map((pos) => {
      const me1 = t.players.find((p) => p.id === t.lineup[pos]);
      if (!me1) return '';
      const d = faceVal(opp, pos, 'duelDef'), c = faceVal(opp, pos, 'contre');
      const gD = me1.a.duel - d.v, gL = me1.a.tirLoin - c.v;
      const adv = gD >= 2 && gD >= gL ? ['ok', 'Percer'] : gL >= 2 && gL > gD ? ['far', 'Tirer de loin'] : gD <= -2 && gL <= -2 ? ['bad', 'Duel difficile'] : ['mid', 'Au choix'];
      const bar = (a, b) => { const w = Math.max(-6, Math.min(6, a - b)); return `<span class="fbar"><span class="${w >= 0 ? 'pos' : 'neg'}" style="width:${Math.abs(w) / 6 * 50}%;${w >= 0 ? 'left:50%' : 'right:50%'}"></span></span>`; };
      return `<div class="frow">
        <div class="fwho"><span class="pos">${pos}</span> ${plink(me1, short(me1.name))}<span class="muted"> face à </span>${d.who ? plink(d.who, short(d.who.name)) : '–'}</div>
        <div class="fduel"><span class="fl">Percée</span>${bar(me1.a.duel, d.v)}<span class="num muted">${me1.a.duel} / ${d.v.toFixed(0)}</span></div>
        <div class="fduel"><span class="fl">Tir de loin</span>${bar(me1.a.tirLoin, c.v)}<span class="num muted">${me1.a.tirLoin} / ${c.v.toFixed(0)}</span></div>
        <span class="fadv ${adv[0]}">${adv[1]}</span>
        <div class="fpick"><span class="fl">Pour ce match</span><span class="seg sm">${[['', 'Habituel'], ['loin', 'De loin'], ['equilibre', 'Équilibré'], ['contact', 'Au contact']].map(([k, l]) => `<button data-act="mstyle" data-id="${me1.id}|${k}" aria-pressed="${(me1.matchStyle || '') === k}" title="${k ? '' : 'Réglage de la tactique : ' + H.BACK_STYLES[me1.style || 'equilibre']}">${l}</button>`).join('')}</span></div></div>`;
    }).join('');
    return `<div class="opt"><span class="label">Face-à-face en attaque</span>
      <div class="frows">${rows}</div>
      <p style="margin:6px 0 0">Barre vers la droite : ton joueur prend le dessus (son duel contre le duel défensif adverse, son tir de loin contre le contre adverse). ${homme ? "En homme à homme, chaque défenseur est seul : vise le plus faible." : "En défense collective, chaque défenseur est aidé par ses voisins (notes élargies)."} Un défenseur exclu laisse un trou.</p></div>`;
  }
  function renderTrainPending() {
    const tr = G.training;
    return `<section class="board"><div class="teams"><div class="team">${badge(me())}<span class="tn">${esc(me().name)}</span></div><div class="score"><span style="font-size:0.55em">Gymnase</span></div><div class="team away"><span class="tn">Après la journée ${G.round}</span></div></div><div class="meta"><span>Semaine d'entraînement à lancer</span><span>${esc(H.TRAIN[tr.focus].label)} · intensité ${esc(H.INTENSITY[tr.intensity].label.toLowerCase())}</span></div>
      <div class="row" style="justify-content:center">${trainBtn()}</div></section>`;
  }
  function renderRest() {
    const games = G.sched[G.round];
    return `<section class="board"><div class="teams"><div class="team">${badge(me())}<span class="tn">${esc(me().name)}</span></div><div class="score"><span style="font-size:0.55em">Repos</span></div><div class="team away"><span class="tn">Journée ${G.round + 1}</span></div></div><div class="meta"><span>Pas de match pour toi cette semaine</span><span>${games.length} matchs au programme</span></div></section>
      <div class="grid2"><section class="panel"><h3>Semaine de repos</h3><div style="display:grid;gap:12px">
        <p style="margin:0">Avec un nombre impair de clubs, chaque équipe est au repos une journée par phase. Tes joueurs récupèrent 20 points de fatigue en plus, et l'entraînement de la semaine a lieu normalement, sans pénalité de temps de jeu.</p>
        <div class="row"><button class="btn primary big" data-act="rest">Passer la journée</button><button class="btn" data-act="tab" data-id="entrainement">Régler l'entraînement</button></div></div></section>
        <section class="panel"><h3>Au programme</h3><div class="scroll"><table><tbody>${games.map(([h, a]) => `<tr><td>${badge(T(h), true)} ${esc(T(h).name)}</td><td class="r">${badge(T(a), true)} ${esc(T(a).name)}</td></tr>`).join('')}</tbody></table></div></section></div>`;
  }
  // Fin de journée : matchs des autres, récupération, entraînement, centre de formation
  function playRound(r) {
    G.lastStyle = { round: G.round + 1, log: r ? H.applyResult(G, r).filter((x) => x.team === G.userId) : [] };
    const rd = r ? [{ h: r.h.id, a: r.a.id, hs: r.h.score, as: r.a.score, mvp: r.mvp ? r.mvp.id : null }] : [];
    const playing = new Set();
    for (const [h, a] of G.sched[G.round]) {
      playing.add(h); playing.add(a);
      if (r && h === r.h.id && a === r.a.id) continue;
      const rr = new H.Match(T(h), T(a)).run();
      H.applyResult(G, rr);
      rd.push({ h, a, hs: rr.h.score, as: rr.a.score, mvp: rr.mvp ? rr.mvp.id : null });
    }
    G.results.push(rd);
    // Réserve : les jeunes du centre hors de la feuille de match prennent des minutes avec la réserve
    H.reserveRound(G, playing);
    if (r && G.pre) { restoreSheet(me(), G.pre); G.pre = null; }
    for (const p of me().players) delete p.matchStyle;
    G.round++;
    // Infirmerie : une semaine de soins pour les blessés d'avant, puis les blessés du jour
    const back = H.heal(G).filter((b) => b.team === G.userId);
    H.recover(G);
    for (const t of G.teams) if (!playing.has(t.id)) for (const p of t.players) { p.fatigue = Math.max(0, p.fatigue - 20); p.lastMins = undefined; }
    for (const t of G.teams) if (t.id !== G.userId) { H.train(t, 'equilibre', 'normale'); H.trainInjuries(G, t, 'normale'); }
    G.lastInj = { round: G.round, inj: r ? (r.inj || []).filter((x) => x.team === G.userId) : [], back, fixed: lineupFix() };
    if (G.round >= G.sched.length) G.ended = true;
    // Ton entraînement attend le clic « Lancer l'entraînement » (sauf après la dernière journée)
    if (G.ended) runTraining(); else G.trainPending = true;
    if (G.youth) { G.youthLog.unshift({ round: G.youth.round, name: G.youth.p.name, pos: G.youth.p.pos, ovr: G.youth.p.ovr, pot: G.youth.p.pot, age: G.youth.p.age, id: G.youth.p.id, decision: 'Parti sans réponse' }); msg('centre', `${G.youth.p.name} n'a pas eu de réponse : il est parti signer ailleurs.`); G.youth = null; }
    H.youthRound(G);
    const fr = H.freeRound(G);
    if (G.round % 5 === 0 && G.round < G.sched.length) { G.youth = { p: H.makeYouth(me(), G), round: G.round }; U.youthModal = true; U.yRelease = null; U.yStage = 'alert'; U.yAnim = false; U.yBatch = false; }
    roundMessages(fr);
  }
  function runTraining() {
    G.lastTraining = { round: G.round, focus: G.training.focus, intensity: G.training.intensity, log: H.train(me(), G.training.focus, G.training.intensity) };
    G.lastTraining.inj = G.ended ? [] : H.trainInjuries(G, me(), G.training.intensity);
    G.lastTraining.fixed = G.lastTraining.inj.length ? lineupFix() : [];
    if (G.lastTraining.inj.length) msg('kine', `Mauvaise semaine à l'entraînement. ${G.lastTraining.inj.map(injTxt).join(' ')}`);
    G.trainPending = false;
  }
  // Titulaires blessés remplacés dans le 7 de départ : [{ pos, from, to }] pour l'affichage
  function lineupFix() { const fx = H.fixLineup(me()); H.ensureSheet(me()); return fx; }
  function injLines(inj, fixed) {
    const t = me(), nm = (id) => { const q = t.players.find((x) => x.id === id); return q ? esc(q.name) : ''; };
    return inj.map((x) => { const f = (fixed || []).find((y) => y.from === x.id);
      return `<div class="injrow"><span class="inj">✚</span><span class="pos${x.pos === 'GB' ? ' gb' : ''}">${x.pos}</span><span><b>${esc(x.name)}</b> · ${esc(x.type.toLowerCase())}, ${x.n > 1 ? `absent ${x.n} matchs` : 'absent un match'}${f ? `<br><span class="muted">${nm(f.to)} le remplace dans le 7 de départ.</span>` : ''}</span></div>`; }).join('');
  }
  // Clic « Lancer la semaine » au gymnase : semaine simulée, résultat affiché sur place
  function doTraining() {
    if (!G.trainPending) return;
    runTraining();
    U.post = null; U.view = 'pre'; U.trainAnim = true;
    save();
    render();
    const ti = G.lastTraining.inj || [];
    if (ti.length) notify(`<span class="nbadge nbinj">✚</span><span><b>Blessure à l'entraînement</b><br>${ti.map((x) => `${esc(x.name)} : ${esc(x.type.toLowerCase())}, ${x.n > 1 ? `absent ${x.n} matchs` : 'absent un match'}.`).join('<br>')}</span>`, false);
    const el = document.getElementById('trainres');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }
  function trainBtn(cls) { return `<button class="btn primary${cls ? ' ' + cls : ''}" data-act="tab" data-id="entrainement">Lancer l'entraînement →</button>`; }
  function restRound() {
    const nf = nextFixture();
    if (!nf || !nf.rest) return;
    playRound(null);
    U.post = null;
    U.view = 'pre';
    save();
    render();
    window.scrollTo(0, 0);
  }
  // Avant le match : feuille de match puis tactique, réglées pour ce match seulement.
  // G.pre garde la feuille, la tactique et les styles de match habituels pour les remettre ensuite.
  function openPre() {
    const nf = nextFixture();
    if (!nf || nf.rest || G.trainPending) return;
    const t = me();
    H.ensureSheet(t);
    if (!G.pre) G.pre = { tac: JSON.parse(JSON.stringify(t.tactic)), lineup: { ...t.lineup }, out: (t.out || []).slice(), ms: Object.fromEntries(t.players.filter((p) => p.matchStyle).map((p) => [p.id, p.matchStyle])), keep: false };
    U.preStep = 1;
    save();
    render();
    const b = document.querySelector('#preov [data-act=prenext]');
    if (b) b.focus({ preventScroll: true });
  }
  function restoreSheet(t, s) {
    for (const pos of H.POS) if (t.players.some((p) => p.id === s.lineup[pos])) t.lineup[pos] = s.lineup[pos];
    t.out = s.out.filter((id) => t.players.some((p) => p.id === id));
  }
  // Annuler (ou partie rechargée avant la fin du match) : tout redevient comme avant
  function dropPre() {
    const t = me(), s = G.pre;
    if (!s) return;
    if (s.tac) t.tactic = s.tac;
    restoreSheet(t, s);
    H.ensureSheet(t);
    if (s.ms) for (const p of t.players) { if (s.ms[p.id]) p.matchStyle = s.ms[p.id]; else delete p.matchStyle; }
    G.pre = null;
  }
  function cancelPre() {
    dropPre();
    U.preStep = null; U.bsModal = false; U.pick = null;
    save();
    render();
    const b = document.querySelector('[data-act=kickoff]');
    if (b) b.focus({ preventScroll: true });
  }
  function preModal() {
    const nf = nextFixture();
    if (!U.preStep || !G.pre || !nf || nf.rest) return '';
    const t = me(), s = U.preStep, home = nf.h === t.id, opp = T(home ? nf.a : nf.h);
    const steps = `<ol class="steps prestep" aria-label="Étapes"><li aria-current="${s === 1 ? 'step' : 'false'}"><b>1</b> Feuille de match</li><li aria-current="${s === 2 ? 'step' : 'false'}"><b>2</b> Tactique</li><li><b>3</b> Coup d'envoi</li></ol>`;
    const head = `<div class="prehead"><div><span class="label">Journée ${G.round + 1} · ${home ? 'contre' : 'à'} ${esc(opp.name)}</span><h2 id="pretitle" style="margin:2px 0 0">${s === 1 ? 'Feuille de match' : 'Tactique du match'}</h2></div>${steps}<button class="btn" data-act="precancel" aria-label="Annuler">✕</button></div>`;
    const keep = `<div><label class="prekeep"><input type="checkbox" data-prekeep${G.pre.keep ? ' checked' : ''}> Garder cette feuille pour les prochains matchs</label><span class="muted" style="display:block;font-size:0.85rem">Sinon, tes changements ne valent que pour ce match.</span></div>`;
    const body = s === 1 ? renderFeuille(keep) : `<p class="muted" style="margin:0 0 12px">Ces réglages ne valent que pour ce match : ta tactique habituelle (onglet Tactique) revient au match suivant.</p>${renderTactics()}<section class="panel" data-tuto="face" style="margin-top:20px">${faceHtml(t, opp)}</section>`;
    const foot = s === 1 ? '<button class="btn" data-act="precancel">Annuler</button><button class="btn primary big" data-act="prenext">Suivant : la tactique →</button>'
      : '<button class="btn" data-act="preback">← Feuille de match</button><button class="btn primary big" data-act="prego">Coup d\'envoi</button>';
    return `<div class="overlay" id="preov" role="dialog" aria-modal="true" aria-labelledby="pretitle"><div class="modal pre" data-step="${s}">${head}${body}<div class="prefoot">${foot}</div></div></div>`;
  }
  function startMatch() {
    const nf = nextFixture();
    if (!nf || nf.rest || G.trainPending) return;
    for (const t of G.teams) if (t.id !== G.userId) H.aiPrepare(t);
    H.ensureSheet(me());
    G.lastSheet = { lineup: { ...me().lineup }, out: (me().out || []).slice() };
    U.m = new H.Match(T(nf.h), T(nf.a), { user: G.userId });
    if (G.pre) { me().tactic = G.pre.tac; G.pre = G.pre.keep ? null : { lineup: G.pre.lineup, out: G.pre.out }; }
    U.preStep = null; U.bsModal = false;
    save();
    U.prevSc = null;
    U.side = nf.h === G.userId ? 0 : 1;
    U.view = 'live'; U.paused = false; U.tPanel = false; U.speed = 1; U.htDone = false; U.injSeen = 0;
    if (G.tuto && G.tuto.on && !G.tuto.seen.includes('live')) { U.paused = true; U.tutoHold = true; }
    render();
    schedule();
  }
  function schedule() {
    clearTimeout(U.timer);
    if (U.paused || !U.m || U.m.done) return;
    U.timer = setTimeout(tick, U.speed === 1 ? 560 : U.speed === 2 ? 260 : 90);
  }
  function tick() {
    const m = U.m;
    if (!m) return;
    const evs = m.step();
    if (m.done) { finishMatch(); return; }
    if (m.halfDone && !U.htDone) { U.htDone = true; U.paused = true; U.tPanel = 'mt'; clearTimeout(U.timer); liveUpdate(evs); return; }
    // Décisions du coach adverse : notification courte
    const dec = evs.filter((e) => e.side === 1 - U.side && (e.type === 'coach' || (e.type === 'sys' && /consigne du coach/.test(e.text))));
    if (dec.length && !U.notifSticky) {
      const opp = m.S[1 - U.side].team;
      notify(`<span class="nbadge" style="background:${opp.color}">${esc(opp.id)}</span><span><b>Coach adverse · ${dec[0].m}'</b><br>${dec.map((e) => esc(e.text.replace(opp.name + ' ', '').replace(/^./, (c) => c.toUpperCase()))).join('<br>')}</span>`, false);
    }
    // Blessure d'un de tes joueurs : il sort tout seul, notification courte (rien dans le fil du match)
    const hz = (m.inj || []).slice(U.injSeen || 0).filter((x) => x.si === U.side);
    U.injSeen = (m.inj || []).length;
    if (hz.length && !U.notifSticky) {
      const nm = (id) => { const q = m.S[U.side].team.players.find((x) => x.id === id); return q ? esc(short(q.name)) : ''; };
      notify(`<span class="nbadge nbinj">✚</span><span><b>Blessure · ${hz[0].m}'</b><br>${hz.map((x) => `${esc(x.name)} sort${x.rep ? `, ${nm(x.rep)} le remplace` : ''}.`).join('<br>')} Le staff médical fera le point après le match.</span>`, false);
    }
    const atm = evs.find((e) => e.type === 'tm' && e.side !== U.side);
    if (atm) {
      U.paused = true; U.tPanel = 'adv'; clearTimeout(U.timer); liveUpdate(evs);
      const why = (atm.text.match(/\(([^)]+)\)/) || [])[1];
      const opp = m.S[1 - U.side].team;
      notify(`<span class="nbadge" style="background:${opp.color}">${esc(opp.id)}</span><span><b>Temps mort adverse · ${atm.m}'</b><br>${esc(opp.name)}${why ? ' : ' + esc(why) : ''}. Le match est en pause, profites-en pour ajuster ta tactique.</span>`, true);
      return;
    }
    liveUpdate(evs);
    schedule();
  }
  // Notification en haut de l'écran (temps mort adverse)
  function notify(html, sticky) {
    let el = document.getElementById('notif');
    if (!el) { el = document.createElement('div'); el.id = 'notif'; el.setAttribute('role', 'alert'); document.body.appendChild(el); }
    el.innerHTML = html + '<button class="nclose" data-act="nclose" aria-label="Fermer la notification">✕</button>';
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(U.notifT);
    U.notifSticky = !!sticky;
    el.classList.toggle('short', !sticky);
    if (!sticky) U.notifT = setTimeout(hideNotify, 4500);
  }

  function hideNotify() { U.notifSticky = false; const el = document.getElementById('notif'); if (el) el.classList.remove('show'); }
  function finishMatch() {
    hideNotify();
    clearTimeout(U.timer);
    const m = U.m;
    while (!m.done) m.step();
    const r = m.result();
    playRound(r);
    const pack = (s) => ({ id: s.id, score: s.score, half: s.half, st: s.st, goals: s.goals, saves: s.saves, ps: s.ps, mins: s.mins });
    G.last = { h: pack(r.h), a: pack(r.a), ev: r.ev.filter((e) => e.key), side: U.side, round: G.round, mvp: r.mvp || null, mom: momSeries(r.ev, 60) };
    U.post = G.last;
    U.m = null;
    U.view = 'post';
    save();
    render();
    window.scrollTo(0, 0);
  }
  function renderPost() {
    const p = U.post;
    const h = T(p.h.id), a = T(p.a.id);
    const mine = p.side === 0 ? p.h : p.a, opp = p.side === 0 ? p.a : p.h;
    const res = mine.score > opp.score ? 'Victoire' : mine.score < opp.score ? 'Défaite' : 'Match nul';
    const t = me();
    const sc = Object.entries(mine.goals).sort((x, y) => y[1] - x[1]).map(([id, n]) => ({ p: t.players.find((x) => x.id === id), n })).filter((x) => x.p);
    const gk = Object.entries(mine.saves).map(([id, n]) => ({ p: t.players.find((x) => x.id === id), n })).filter((x) => x.p);
    const old = p.side === undefined ? '' : '';
    U.side = p.side;
    return `<section class="board">${boardTeams(h, a, p.h.score, p.a.score)}${p.mom ? momSvg(p.mom, h, a) : ''}<div class="meta"><span>Journée ${p.round} · ${res} ${mine.score}–${opp.score}</span><span>Mi-temps ${p.h.half}–${p.a.half}</span></div>
      <div class="row" style="justify-content:center">${G.trainPending ? trainBtn() : '<button class="btn primary" data-act="tab" data-id="championnat">Passer à la suite : résultats et classement →</button>'}</div></section>${old}
      <div class="grid2">
        <section class="panel"><h3>Temps forts</h3><div class="feed">${p.ev.map((e) => evHtml(e, [h, a])).join('')}</div></section>
        <div style="display:grid;gap:20px;min-width:0">
          ${p.mvp ? mvpCard(p.mvp) : ''}
          ${(() => { const li = G.lastInj; if (!li || li.round !== p.round || !(li.inj.length || li.back.length)) return '';
            return `<section class="panel"><div class="row" style="justify-content:space-between;margin-bottom:8px"><h3 style="margin:0">Infirmerie</h3><button class="btn" data-act="tab" data-id="infirmerie">Voir l'infirmerie</button></div>${injLines(li.inj, li.fixed)}${li.back.length ? `<p class="muted" style="margin:8px 0 0">De retour de blessure : ${li.back.map((b) => esc(b.name)).join(', ')}.</p>` : ''}</section>`; })()}
          <section class="panel"><h3>Tes buteurs</h3>${sc.length ? sc.map((x) => `<div class="row" style="gap:8px;padding-block:3px"><span class="pos">${x.p.pos}</span><span>${esc(x.p.name)}</span><span class="spacer" style="flex:1"></span><b class="num">${x.n}</b></div>`).join('') : '<p class="muted">Aucun but.</p>'}
            ${gk.map((x) => `<div class="row" style="gap:8px;padding-block:3px"><span class="pos gb">GB</span><span>${esc(x.p.name)}</span><span style="flex:1"></span><span class="num muted">${x.n} arrêt${x.n > 1 ? 's' : ''}</span></div>`).join('')}</section>
          <section class="panel"><h3>Statistiques</h3><div class="row" style="justify-content:space-between;margin-bottom:8px"><span class="label">${h.id}</span><span class="label">${a.id}</span></div>${statsHtml(p.h.st, p.a.st)}</section>
          <div class="row">${G.trainPending ? trainBtn() : `<button class="btn primary" data-act="next">${G.ended ? 'Voir le bilan de la saison' : 'Retour en ville'}</button><button class="btn" data-act="tab" data-id="entrainement">Progrès à l'entraînement</button>`}<button class="btn" data-act="tab" data-id="championnat">Résultats de la journée</button></div>
        </div>
      </div>
      ${p.h.ps ? perfSection(h, a, p.h, p.a) : ''}`;
  }
  function mvpCard(m) {
    const f = findPlayer(m.id), t = T(m.team), mine = m.team === G.userId;
    const line = m.pos === 'GB' ? `${m.sv} arrêt${m.sv > 1 ? 's' : ''} sur ${m.fa} tirs (${m.fa ? Math.round((m.sv / m.fa) * 100) : 0} %)` : `${m.g}/${m.sh} au tir${m.to ? ` · ${m.to} perte${m.to > 1 ? 's' : ''}` : ' · aucune perte'}${m.ex ? ` · ${m.ex} exclusion${m.ex > 1 ? 's' : ''}` : ''}`;
    return `<section class="panel mvpcard${mine ? ' mine' : ''}"><div class="mvphead">${CROWN}<span class="label">MVP du match</span><span class="spacer"></span><span class="mnote nt5" title="Note du match sur 10">${String(m.note).replace('.', ',')}</span></div>
      <div class="mvpname">${f ? plink(f.p) : esc(m.name)}</div>
      <div class="row" style="gap:8px"><span class="pos${m.pos === 'GB' ? ' gb' : ''}">${m.pos}</span>${badge(t, true)}<span class="muted">${esc(t.name)}</span></div>
      <p style="margin:8px 0 0">${line} · ${m.min} min</p>
      <p class="legend" style="margin:6px 0 0">${m.n > 1 ? `${m.n}e titre de MVP cette saison. ` : 'Premier titre de MVP cette saison. '}Confiance de MVP au prochain match : +1 de forme et un peu plus de récupération.</p></section>`;
  }
  function renderEnd() {
    const s = H.standings(G);
    const r = s.find((x) => x.id === G.userId);
    const pos = s.indexOf(r) + 1;
    const t = me();
    const top = t.players.slice().sort((x, y) => y.goals - x.goals)[0];
    const champ = T(s[0].id);
    const verdict = pos === 1 ? 'Champion de France ! Le titre est pour toi.' : pos <= 3 ? 'Sur le podium : une saison réussie.' : pos <= 6 ? 'Une place dans la première moitié du tableau.' : pos <= 9 ? 'Une saison difficile, le maintien est assuré.' : 'Saison galère : il faudra tout reconstruire.';
    return `<section class="board"><div class="teams"><div class="team">${badge(t)}<span class="tn">${esc(t.name)}</span></div><div class="score"><span>${ord(pos)}</span></div><div class="team away"><span class="tn">${r.pts} pts</span></div></div><div class="meta"><span>Fin de saison · ${r.g} victoire${r.g > 1 ? 's' : ''}, ${r.n} nul${r.n > 1 ? 's' : ''}, ${r.p} défaite${r.p > 1 ? 's' : ''}</span><span>Champion de ${LEAGUE} : ${esc(champ.name)}</span></div></section>
      <section class="panel"><h3>Bilan</h3><div style="display:grid;gap:12px"><p style="margin:0">${verdict}</p>
        <p class="muted" style="margin:0">${r.bp} buts marqués, ${r.bc} encaissés. Meilleur buteur du club : ${esc(top.name)} (${top.goals} buts).</p>
        ${(() => { const m = H.mvps(G, 1)[0]; return m ? `<p class="row" style="margin:0;gap:8px"><span class="mvpmini">${CROWN}</span>MVP de la saison : <b>${esc(m.p.name)}</b> (${esc(m.t.name)}), ${m.p.mvp} fois MVP du match.</p>` : ''; })()}
        <div class="row"><button class="btn primary" data-act="replay">Rejouer une saison avec ce club</button><button class="btn" data-act="resetYes">Changer de club</button></div></div></section>`;
  }

  // ---------- Effectif ----------
  const FIELD_COLS = [
    ['Tir', [['tirLoin', '9 m'], ['tirPres', '6 m'], ['tirAile', 'Aile'], ['penalty', '7 m']]],
    ['Jeu', [['passes', 'Pas.'], ['vision', 'Vis.'], ['position', 'Pos.']]],
    ['Physique', [['duel', 'Duel'], ['vitesse', 'Vit.'], ['endurance', 'End.'], ['robustesse', 'Rob.']]],
    ['Défense', [['contre', 'Ctr.'], ['duelDef', 'Duel D'], ['discipline', 'Disc.']]],
    ['Mental', [['sangfroid', 'S-F']]],
    ['Profil', [['excentricite', 'Exc.'], ['collectif', 'Coll.']]]
  ];
  const TRAIT_KEYS = ['excentricite', 'collectif'];
  const GK_COLS = [['Gardien', [['reflexes', 'Réfl.'], ['placement', 'Plac.'], ['gk7m', '7 m'], ['relance', 'Rel.'], ['endurance', 'End.'], ['robustesse', 'Rob.']]]];
  const ATTR_LABEL = Object.fromEntries(H.FIELD.concat(H.GKA, H.TRAITS, [H.ROBUST]));
  // Infobulle de la robustesse : le risque de blessure, en mots
  const robTxt = (v) => v >= 16 ? 'très solide, se blesse rarement' : v >= 13 ? 'solide' : v >= 9 ? 'dans la moyenne' : v >= 6 ? 'fragile, se blesse plus souvent' : 'très fragile, souvent blessé';
  const heat = (v) => v >= 16 ? 'h5' : v >= 13 ? 'h4' : v >= 10 ? 'h3' : v >= 7 ? 'h2' : 'h1';
  // Colonnes visibles de l'effectif (choix mémorisé dans ce navigateur)
  function hiddenCols() { if (!U.hidden) { try { U.hidden = JSON.parse(localStorage.getItem('hbm-cols') || '[]'); } catch (e) { U.hidden = []; } } return U.hidden; }
  function colPicker() {
    const h = hiddenCols();
    return `<div class="colpick"><span class="label">Colonnes</span>${['Suivi'].concat(FIELD_COLS.map(([g]) => g)).map((g) => `<button class="chip" data-act="colt" data-id="${g}" aria-pressed="${!h.includes(g)}">${g === 'Suivi' ? 'Forme, fatigue, minutes' : g}</button>`).join('')}</div>`;
  }
  function squadTable(t, players, groupsAll, gk) {
    const hid = hiddenCols(), suivi = !hid.includes('Suivi');
    const groups = gk ? groupsAll : groupsAll.filter(([g]) => !hid.includes(g));
    const starters = new Set(Object.values(t.lineup));
    const s = U.sort;
    const ref = sref(), stv = (p) => H.stars(p.ovr, ref), ptv = (p) => { const r = H.potRange(p, ref); return (r.lo + r.hi) / 2; };
    const dsign = (p) => { const d = p.ovr - (p.ovr0 ?? p.ovr); return d >= 0.05 ? 1 : d <= -0.05 ? -1 : 0; };
    const val = (p, k) => k === 'tit' ? (starters.has(p.id) ? 2 : (t.out || []).includes(p.id) ? 0 : 1) : k === 'pos' ? H.POS.indexOf(p.pos) * 100 - stv(p) : k === 'ovr' ? stv(p) : k === 'pot' ? ptv(p) : k === 'name' ? p.name : k === 'goals' ? (gk ? p.saves : p.goals) : k === 'mpg' ? (p.apps ? p.mins / p.apps : 0) : k === 'dlt' ? dsign(p) : k === 'xp' ? H.matchXP(p) : k in p.a ? p.a[k] : p[k];
    const sty = new Map(t.id === G.userId && G.lastStyle && G.lastStyle.round === G.round ? G.lastStyle.log.map((e) => [e.id, e.d]) : []);
    const wk = new Set(t.id === G.userId && G.lastTraining && G.lastTraining.round === G.round ? G.lastTraining.log.map((e) => e.id + ':' + e.k) : []);
    const sorted = players.slice().sort((x, y) => {
      const a = val(x, s.k), b = val(y, s.k);
      if (a === undefined || b === undefined) return H.POS.indexOf(x.pos) - H.POS.indexOf(y.pos) || stv(y) - stv(x);
      const c = typeof a === 'string' ? a.localeCompare(b) : a - b || (s.k === 'tit' ? (H.POS.indexOf(y.pos) - H.POS.indexOf(x.pos)) * s.dir : 0) || x.name.localeCompare(y.name);
      return (s.k === 'pos' || s.k === 'name' ? c : -c) * s.dir;
    });
    const sh = (k, l, cls, title) => `<th class="${cls || ''}${s.k === k ? ' sorted' : ''}"${title ? ` title="${esc(title)}"` : ''}><button class="sortbtn" data-act="sort" data-id="${k}">${l}${s.k === k ? (s.dir === 1 ? ' ▾' : ' ▴') : ''}</button></th>`;
    const fatCol = (f) => f < 28 ? 'var(--good)' : f < 55 ? 'var(--warn)' : 'var(--bad)';
    const formTxt = (f) => f > 0 ? `<span class="form" style="color:var(--good)">+${f}</span>` : f < 0 ? `<span class="form" style="color:var(--bad)">${f}</span>` : '<span class="form muted">=</span>';
    const head1 = `<tr class="grp"><th class="stick" colspan="1"></th><th colspan="${suivi ? 9 : 5}"></th>${groups.map(([g, cols]) => `<th colspan="${cols.length}" class="gh">${g}</th>`).join('')}<th></th></tr>`;
    const head2 = `<tr><th class="stick${s.k === 'pos' || s.k === 'tit' ? ' sorted' : ''}"><button class="sortbtn" data-act="sort" data-id="pos">Joueur${s.k === 'pos' ? (s.dir === 1 ? ' ▾' : ' ▴') : ''}</button> · <button class="sortbtn" data-act="sort" data-id="tit" title="Titulaires d'abord, puis remplaçants, puis joueurs en tribune">Titulaires${s.k === 'tit' ? (s.dir === 1 ? ' ▾' : ' ▴') : ''}</button></th>${sh('age', 'Âge', 'r')}${sh('hand', 'Main', '', 'D : droitier · G : gaucher')}${sh('ovr', 'Niveau', '', 'Niveau actuel, par rapport à ton club')}${sh('pot', 'Potentiel', '', 'Niveau que le joueur peut atteindre selon le staff ; partie pâle : incertitude (moins de 24 ans)')}${sh('dlt', 'Δ', 'r', 'Progression depuis le début de saison')}${suivi ? sh('form', 'Forme', 'r') + sh('fatigue', 'Fatigue') + sh('mpg', 'Min', 'r', 'Temps de jeu moyen par match') + sh('xp', 'Exp.', 'r', 'Multiplicateur de progression selon les minutes jouées au dernier match') : ''}${groups.map(([, cols], gi) => cols.map(([k, l], ci) => sh(k, l, 'ac' + (ci === 0 ? ' gs' : ''), ATTR_LABEL[k])).join('')).join('')}${sh('goals', gk ? 'Arr.' : 'Buts', 'r gs')}</tr>`;
    const rows = sorted.map((p) => {
      const keys = H.POS_ATTRS[p.pos];
      const st = starters.has(p.id);
      return `<tr><td class="stick"><span class="pos${p.pos === 'GB' ? ' gb' : ''}">${p.pos}</span> <span class="pname">${plink(p)}</span>${st ? ' <span class="tit" title="Titulaire">T</span>' : H.hurt(p) ? '' : (t.out || []).includes(p.id) ? ` <span class="hand" title="${offTitle(p)}">${offLabel(p)}</span>` : ' <span class="hand" title="Sur le banc">B</span>'}${p.youth ? ` <span class="yt" title="${p.cf ? 'Joueur du centre de formation' : 'Formé au club'}">J</span>` : ''}</td>
        <td class="r">${p.age}</td><td><span class="lat ${p.hand === 'G' ? 'g' : 'd'}" title="${p.hand === 'G' ? 'Gaucher' : 'Droitier'}">${p.hand}</span></td><td class="nw">${lstars(p, { sm: true })}</td><td class="nw">${pot(p, { sm: true })}</td><td class="r">${(() => { const d = dsign(p); return d > 0 ? '<span class="dlt" title="En progrès depuis le début de saison">▲</span>' : d < 0 ? '<span class="dlt neg" title="En baisse depuis le début de saison">▼</span>' : '<span class="muted">·</span>'; })()}</td>${suivi ? `<td class="r nw">${p.mvpBoost === G.round ? `<span class="mvpmini" title="Confiance de MVP : +1 de forme pour ce match">${CROWN}</span> ` : ''}${formTxt(p.form)}</td>
        <td><span class="fatbar" title="${p.fatigue}/100"><span style="width:${p.fatigue}%;background:${fatCol(p.fatigue)}"></span></span> <span class="num muted" style="font-size:0.78rem">${p.fatigue}</span></td><td class="r num">${p.apps ? Math.round(p.mins / p.apps) : '–'}</td><td class="r num">${(() => { const x = H.matchXP(p); return `<span class="${x > 1.02 ? 'dlt' : x < 0.98 ? 'dlt neg' : 'muted'}" title="${Math.round(p.lastMins || 0)} min au dernier match${p.lastRes ? `, ${p.lastRes} min avec la réserve` : p.resFocus ? `, pas de match de réserve (moins de 7 joueurs) : séance ${H.TRAIN[p.resFocus].label.toLowerCase()}` : ''}">×${x.toFixed(1).replace('.', ',')}</span>`; })()}</td>` : ''}
        ${groups.map(([, cols]) => cols.map(([k], ci) => `<td class="ac ${TRAIT_KEYS.includes(k) ? 'tr' + Math.min(5, Math.ceil((p.a[k] || 1) / 4)) : heat(p.a[k])}${keys.includes(k) ? ' key' : ''}${ci === 0 ? ' gs' : ''}${wk.has(p.id + ':' + k) || (k === 'collectif' && sty.get(p.id) > 0) ? ' upw' : ''}${k === 'collectif' && sty.get(p.id) < 0 ? ' dnw' : ''}" title="${esc(ATTR_LABEL[k])} : ${p.a[k]}${wk.has(p.id + ':' + k) ? ' (+1 à l\'entraînement cette semaine)' : ''}${k === 'collectif' ? (p.a[k] <= 7 ? ' (joueur perso)' : p.a[k] >= 15 ? ' (joueur très collectif)' : '') : ''}${k === 'robustesse' ? ` (${robTxt(p.a[k])})` : ''}"><span class="v">${p.a[k]}</span></td>`).join('')).join('')}
        <td class="r gs">${gk ? p.saves : p.goals}</td></tr>`;
    }).join('');
    return `<div class="scroll"><table class="sq"><thead>${head1}${head2}</thead><tbody>${rows}</tbody></table></div>`;
  }
  // Filtres rapides de l'effectif
  const SQUAD_FILTERS = [['tous', 'Tous'], ['feuille', 'Feuille de match'], ['reserve', 'Réserve'], ['tribune', 'Tribune'], ['centre', 'Centre de formation'], ['inf', 'Infirmerie']];
  function squadKeep(t, p, k) {
    const s = statusOf(t, p);
    return k === 'feuille' ? s === 'T' || s === 'B' : k === 'reserve' ? s === 'R' && H.inReserve(p) : k === 'tribune' ? s === 'R' && !H.inReserve(p) : k === 'centre' ? !!p.cf : k === 'inf' ? s === 'I' : true;
  }
  function renderSquad() {
    H.ensureSheet(me());
    const t = me();
    const starters = Object.values(t.lineup).map((id) => t.players.find((p) => p.id === id));
    const avg = starters.reduce((a, p) => a + p.ovr, 0) / 7, ref = sref();
    const field = t.players.filter((p) => p.pos !== 'GB'), gks = t.players.filter((p) => p.pos === 'GB');
    const best = field.slice().sort((x, y) => H.stars(y.ovr, ref) - H.stars(x.ovr, ref) || (H.potRange(y, ref).hi - H.potRange(x, ref).hi))[0];
    const tired = starters.filter((p) => p.fatigue > 28).length;
    const fieldF = field.filter((p) => squadKeep(t, p, U.sqf || 'tous')), gksF = gks.filter((p) => squadKeep(t, p, U.sqf || 'tous'));
    return `<section class="panel"><div class="row" style="justify-content:space-between;margin-bottom:6px"><h3 style="margin:0">Vestiaire · effectif de ${t.players.length}</h3>
        <span class="row" style="gap:16px"><span class="muted row" style="gap:6px">Niveau moyen des titulaires ${vstars(avg, { sm: true })}</span><span class="muted row" style="gap:6px">Meilleur joueur <b style="color:var(--fg)">${esc(short(best.name))}</b> ${vstars(best.ovr, { sm: true })}</span><span class="muted">Titulaires fatigués <b class="num" style="color:var(--fg)">${tired}</b></span></span></div>
        <p class="legend" style="margin:0 0 12px">Niveau et potentiel : étoiles par rapport au niveau de ton club (3½ ★ pour un titulaire type). Potentiel : estimation du staff ; la partie pâle est sa marge d'incertitude chez les moins de 24 ans. Tant qu'un joueur est sous son potentiel, il progresse vite, ensuite presque plus. Attributs sur 20. Δ : progression depuis le début de saison. Min : temps de jeu moyen par match. Exp. : multiplicateur de progression à l'entraînement selon les minutes du dernier match (de ×0,7 sans jouer à ×1,3 pour 45 minutes et plus, effet doublé avant 23 ans). Les cases encadrées sont les attributs de son poste, les seuls qui progressent à l'entraînement. Clique sur un en-tête pour trier.</p>
        <div class="heatkey"><span class="h5">16 et +</span><span class="h4">13 à 15</span><span class="h3">10 à 12</span><span class="h2">7 à 9</span><span class="h1">6 et −</span><span class="up upkey">▲ +1 cette semaine</span><span class="muted">Main : D droitier, G gaucher · T titulaire · B banc · R réserve (jeunes du centre et moins de 23 ans hors de la feuille) · Tr tribune (pros de 23 ans et plus hors de la feuille, sans match) · J centre de formation ou formé au club</span></div>
        <h3 class="sub3">Profil de l'équipe</h3>${teamProfile(t)}
        ${G.lastTraining && G.lastTraining.round === G.round && G.lastTraining.log.length ? `<div class="advice" style="margin-top:12px"><span class="label">Progrès à l'entraînement après la journée ${G.lastTraining.round}</span><div class="row" style="gap:6px">${Object.values(G.lastTraining.log.reduce((acc, e) => { (acc[e.id] = acc[e.id] || { name: e.name, n: 0 }).n++; return acc; }, {})).map((x) => `<span class="up">${esc(short(x.name))} +${x.n}</span>`).join('')}</div></div>` : ''}
        ${G.lastStyle && G.lastStyle.round === G.round && G.lastStyle.log.length ? `<div class="advice" style="margin-top:12px"><span class="label">Esprit collectif après la journée ${G.lastStyle.round}</span><div class="row" style="gap:6px">${G.lastStyle.log.map((e) => `<span class="${e.d > 0 ? 'up' : 'up down'}">${esc(short(e.name))} ${e.d > 0 ? '+1' : '−1'} → ${e.v}</span>`).join('')}</div></div>` : ''}
        <div class="row" style="gap:8px;margin-top:16px"><span class="label" style="margin:0">Afficher</span>${SQUAD_FILTERS.map(([k, l]) => `<button class="chip" data-act="sqf" data-id="${k}" aria-pressed="${(U.sqf || 'tous') === k}">${l} · ${t.players.filter((p) => squadKeep(t, p, k)).length}</button>`).join('')}</div>
        <div class="row" style="justify-content:space-between;align-items:flex-end;gap:10px"><h3 class="sub3">Joueurs de champ</h3>${colPicker()}</div>${fieldF.length ? squadTable(t, fieldF, FIELD_COLS, false) : '<p class="muted">Aucun joueur de champ.</p>'}
        <h3 class="sub3">Gardiens</h3>${gksF.length ? squadTable(t, gksF, GK_COLS, true) : '<p class="muted">Aucun gardien.</p>'}
        <p class="legend">9 m : tir de loin · 6 m : tir de près · 7 m : pénalty · Pas. : passes · Vis. : vision de jeu · Pos. : prise de position · Vit. : vitesse · End. : endurance · Déf. : défense · Disc. : discipline · S-F : sang-froid · Réfl. : réflexes · Plac. : placement · Rel. : relance. Exc. : excentricité, la propension à tenter des gestes spectaculaires (roucoulette, kung-fu, chabala) : réussis, ils trompent le gardien et lancent l'équipe ; ratés, c'est un ballon perdu. Coll. : esprit collectif, de joueur perso (bas) à joueur collectif (haut), qui évolue avec le temps de jeu dans un style collectif (▲) ou individuel (▼) ; ces deux colonnes décrivent un profil, pas un niveau, d'où leur couleur bleue. Dès 28 de fatigue, les attributs baissent : environ −10 % à 40, −25 % à 55, −45 % au maximum. La jauge monte d'environ 1,7 point par minute sur le terrain et redescend lentement sur le banc ; entre deux journées, chacun récupère 35 points.</p></section>`;
  }

  // ---------- Entraînement ----------
  // Récap de fatigue au gymnase : état après le match, et projection au coup d'envoi selon l'intensité
  function fatigueRecap(t) {
    const fatCol = (f) => f < 28 ? 'var(--good)' : f < 55 ? 'var(--warn)' : 'var(--bad)';
    const rec = (k) => k === 'intense' ? (H.hasMod(t, 'soins+') ? -6 : H.hasMod(t, 'soins-') ? -18 : H.INTENSITY[k].rec) : H.INTENSITY[k].rec;
    const proj = (f, k) => Math.max(0, Math.min(100, f - rec(k)));
    const starters = Object.values(t.lineup).map((id) => t.players.find((p) => p.id === id)).filter(Boolean);
    const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    const now = starters.map((p) => p.fatigue), tiredNow = now.filter((f) => f >= 28).length;
    const pending = G.trainPending, cur = G.training.intensity;
    const head = `<p class="muted" style="margin:0 0 10px">${pending ? 'Après le match et la récupération' : 'Avant le prochain match'} · titulaires : moyenne <b style="color:var(--fg)">${avg(now)}</b> · <b style="color:var(--fg)">${tiredNow}</b> fatigué${tiredNow > 1 ? 's' : ''} sur ${starters.length}</p>`;
    const table = pending ? `<table class="fatproj"><thead><tr><th>Au coup d'envoi</th><th class="r">Titulaires fatigués</th><th class="r">Moyenne</th></tr></thead><tbody>${Object.entries(H.INTENSITY).map(([k, I]) => {
      const v = starters.map((p) => proj(p.fatigue, k)), n = v.filter((f) => f >= 28).length;
      return `<tr class="${k === cur ? 'me' : ''}"><td>${I.label}${k === cur ? ' <span class="muted">· choisie</span>' : ''}</td><td class="r"><b style="color:${n ? fatCol(Math.max(...v)) : 'var(--good)'}">${n}</b> / ${starters.length}</td><td class="r num">${avg(v)}</td></tr>`;
    }).join('')}</tbody></table>` : '';
    const top = t.players.map((p) => ({ p, f: pending ? proj(p.fatigue, cur) : p.fatigue, st: starters.includes(p) })).filter((x) => x.f >= 20).sort((a, b) => b.f - a.f).slice(0, 6);
    const list = top.length ? `<div class="fatlist"><span class="label">Les plus entamés${pending ? ` · intensité ${H.INTENSITY[cur].label.toLowerCase()}` : ''}</span>${top.map((x) => `<div class="fatrow"><span class="pos${x.p.pos === 'GB' ? ' gb' : ''}">${x.p.pos}</span><span>${esc(short(x.p.name))}${x.st ? '' : ' <span class="muted">· banc</span>'}</span><span class="fatbar" title="${x.f}/100"><span style="width:${x.f}%;background:${fatCol(x.f)}"></span></span><span class="num muted">${x.f}</span></div>`).join('')}</div>` : '<p class="muted" style="margin:0">Tout le monde est frais.</p>';
    return `<section class="panel"><h3>Fatigue de l'effectif</h3>${head}${table}${list}<p class="legend" style="margin:10px 0 0">Dès 28 de fatigue, les attributs baissent : environ −10 % à 40, −25 % à 55. Légère : 10 points de fatigue en moins au coup d'envoi ; intense : ${-rec('intense')} en plus.</p></section>`;
  }
  function renderTraining() {
    const tr = G.training;
    const lt = G.lastTraining;
    const t = me();
    // Juste après « Lancer la semaine » : les hausses apparaissent une par une
    const reveal = U.trainAnim; U.trainAnim = false;
    let ri = 0;
    let prog = '<p class="muted" style="margin:0">Les progrès de la semaine apparaissent ici une fois la semaine lancée, après chaque journée.</p>';
    // Semaine déjà faite après cette journée : réglages verrouillés jusqu'au prochain match
    const fresh = lt && !G.trainPending && lt.round === G.round && !G.ended;
    const launch = G.trainPending ? `<div class="row" style="gap:12px"><button class="btn primary big" data-act="dotrain">Lancer la semaine d'entraînement</button><span class="muted">Après la journée ${G.round} : choisis le focus et l'intensité, puis lance la semaine.</span></div>`
      : fresh ? `<div class="trained${reveal ? ' reveal' : ''}" role="status"><span class="tick" aria-hidden="true">✓</span><span><b>Semaine d'entraînement faite</b> après la journée ${lt.round} · ${esc(H.TRAIN[lt.focus].label.toLowerCase())}, intensité ${esc(H.INTENSITY[lt.intensity].label.toLowerCase())}<br><span class="muted">Le programme se règle à nouveau après le prochain match.</span></span></div>` : '';
    const lock = fresh ? ' disabled' : '';
    if (lt && lt.log.length) {
      const byP = {};
      for (const e of lt.log) (byP[e.id] = byP[e.id] || { name: e.name, pos: e.pos, items: [] }).items.push(e);
      prog = `<p class="muted" style="margin:0 0 8px">Après la journée ${lt.round} · focus ${H.TRAIN[lt.focus].label.toLowerCase()}, intensité ${H.INTENSITY[lt.intensity].label.toLowerCase()} · ${lt.log.length} attribut${lt.log.length > 1 ? 's' : ''} en hausse</p>
        <div class="proglist">${Object.values(byP).map((x) => `<div class="prog"><span class="pos${x.pos === 'GB' ? ' gb' : ''}">${x.pos}</span><span>${esc(x.name)}</span><span class="pitems">${x.items.map((e) => `<span class="up" style="--i:${ri++}">${esc(ATTR_LABEL[e.k])} ${e.v - 1} → <b>${e.v}</b></span>`).join('')}</span></div>`).join('')}</div>`;
    } else if (lt) prog = `<p class="muted" style="margin:0">Aucun progrès après la journée ${lt.round}. Ça arrive, surtout avec un effectif expérimenté ou une semaine légère.</p>`;
    const young = t.players.filter((p) => p.age < 23).length, old = t.players.filter((p) => p.age > 31).length;
    return `<div class="grid2">
      <section class="panel"><h3>Gymnase · programme de la semaine</h3><div style="display:grid;gap:18px">
        <div class="opt"><span class="label">Focus</span><div class="focusgrid">${Object.entries(H.TRAIN).map(([k, f]) => `<button class="focus" data-act="tfocus" data-id="${k}" aria-pressed="${tr.focus === k}"${lock}><b>${f.label}</b><span>${k === 'equilibre' ? 'Tous les attributs du poste, plus endurance et discipline, progression lente' : [['Ailiers', 'AiG'], ['Arrières', 'ArG'], ['DC', 'DC'], ['Pivots', 'Piv']].map(([lab, pos]) => { const at = f.attrs.filter((x) => H.POS_ATTRS[pos].includes(x)); return at.length ? `${lab} : ${at.map((x) => ATTR_LABEL[x].toLowerCase()).join(', ')}` : ''; }).filter(Boolean).join(' · ')}</span></button>`).join('')}</div></div>
        <div class="opt"><span class="label">Intensité</span><div class="seg">${Object.entries(H.INTENSITY).map(([k, x]) => `<button data-act="tint" data-id="${k}" aria-pressed="${tr.intensity === k}"${lock}>${x.label}</button>`).join('')}</div>
          <p>${tr.intensity === 'legere' ? 'Progression réduite de moitié, 10 points de fatigue récupérés en plus avant le match, deux fois moins de blessures à l\'entraînement.' : tr.intensity === 'intense' ? 'Progression ×1,6, mais 12 points de fatigue en plus pour le prochain match et presque deux fois plus de blessures à l\'entraînement.' : 'Progression normale, récupération normale.'}</p></div>
        ${launch}
        <p class="legend" style="margin:0">Le programme s'applique après chaque journée, quand tu lances l'entraînement. Les moins de 23 ans progressent plus vite (${young} dans ton effectif), les plus de 31 ans rarement (${old}). Chaque joueur ne travaille que les attributs de son poste. Le temps de jeu compte aussi : de ×0,7 pour un joueur qui n'a pas joué à ×1,3 pour 45 minutes et plus (×0,4 à ×1,6 avant 23 ans). Les gardiens suivent toujours leur programme spécifique.${H.hasMod(t, 'staff+') ? ' Ton staff bac+12 multiplie les progrès par 1,8.' : H.hasMod(t, 'staff-') ? ' Ton staff joue à Fortnite : progrès ×0,4.' : ''}</p>
      </div></section>
      <div style="display:grid;gap:20px;min-width:0">${G.ended ? '' : fatigueRecap(t)}${adviceHtml(t, 'training') ? `<section class="panel">${adviceHtml(t, 'training')}</section>` : ''}<section class="panel${reveal ? ' reveal' : ''}" id="trainres"><h3>${fresh ? 'Résultat de la semaine' : 'Progrès de la dernière semaine'}</h3>${prog}${lt && (lt.inj || []).length ? `<div class="injbox"><span class="label">Blessé${lt.inj.length > 1 ? 's' : ''} à l'entraînement</span>${injLines(lt.inj, lt.fixed)}</div>` : ''}${fresh ? '<div class="row" style="margin-top:14px"><button class="btn primary" data-act="gonext">Préparer le match →</button></div>' : ''}</section></div></div>`;
  }

  // ---------- Centre de formation ----------
  function nextYouthRound() {
    for (let r = G.round + 1; r < G.sched.length; r++) if (r % 5 === 0) return r;
    return null;
  }
  // Promo : tous les jeunes sortis des centres de la ligue à cette journée, le tien en tête
  function youthBatch() {
    const y = G.youth.p, r0 = G.youth.round;
    const lst = [{ team: G.userId, id: y.id, name: y.name, pos: y.pos, age: y.age, ovr: y.ovr, pot: y.pot, mine: true }]
      .concat((G.leagueYouth || []).filter((l) => l.round === r0).map((l) => { const f = l.ok && l.id ? findPlayer(l.id) : null; return f ? { ...l, ovr: f.p.ovr, pot: f.p.pot, age: f.p.age, p: f.p } : l; }));
    const lo = (l) => H.potRange(l.p || { id: l.id, age: l.age, ovr: l.ovr, pot: l.pot }, sref()).lo;
    lst.sort((a, b) => (b.mine ? 1 : 0) - (a.mine ? 1 : 0) || lo(b) - lo(a) || H.stars(b.ovr, sref()) - H.stars(a.ovr, sref()));
    const rows = lst.map((l) => {
      const t = T(l.team), q = l.p || { id: l.id, age: l.age, ovr: l.ovr, pot: l.pot };
      const dec = l.mine ? '<b>À toi de décider</b>' : l.ok ? (l.out ? releasedTxt(l) : 'Recruté') : '<span class="tag refused">Refusé</span>';
      return `<tr class="${l.mine ? 'me' : ''}${!l.mine && !l.ok ? ' refused' : ''}"><td class="nw">${badge(t, true)} ${esc(t.name)}</td><td class="nw"><span class="pos${l.pos === 'GB' ? ' gb' : ''}">${l.pos}</span> ${l.p ? plink(l.p) : esc(l.name)}</td><td class="r">${q.age}</td><td class="nw">${vstars(q.ovr, { sm: true })}</td><td class="nw">${pot(q, { sm: true })}</td><td class="muted">${dec}</td></tr>`;
    }).join('');
    const kept = lst.filter((l) => !l.mine && l.ok).length;
    return `<div class="ybatch"><div class="row" style="justify-content:space-between;align-items:flex-start;gap:12px"><div><span class="label" style="color:var(--iso-youth)">Centres de formation · promo de la journée ${r0}</span>
        <h2 id="ytitle" style="margin-top:4px">${lst.length} jeunes dans la ${LEAGUE}</h2><p class="muted" style="margin:4px 0 0">${kept} gardé${kept > 1 ? 's' : ''} par les clubs adverses, ${lst.length - 1 - kept} refusé${lst.length - 1 - kept > 1 ? 's' : ''}. Classés par potentiel ; étoiles par rapport à ton club.</p></div>
        <button class="btn" data-act="ybatch">← Retour à ton jeune</button></div>
      <div class="scroll" style="max-height:min(60vh, 520px);overflow-y:auto;margin-top:12px"><table class="ly"><thead><tr><th>Club</th><th>Joueur</th><th class="r">Âge</th><th>Niveau</th><th>Potentiel</th><th>Décision</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }
  // Comparaison : le jeune face aux joueurs de l'effectif qui peuvent tenir son poste
  const ATTR_SHORT = Object.fromEntries(FIELD_COLS.concat(GK_COLS).flatMap(([, cols]) => cols));
  function youthCompare(y, t) {
    const ref = sref(), at = (p) => H.ovrAt(p, y.pos);
    const same = t.players.filter((p) => p.pos === y.pos).sort((a, b) => at(b) - at(a));
    const sec = t.players.filter((p) => p.pos !== y.pos && H.SECONDARY[p.pos].includes(y.pos)).sort((a, b) => at(b) - at(a));
    const cols = H.POS_ATTRS[y.pos].concat('robustesse'), keys = Object.keys(H.WEIGHTS[y.pos]);
    const row = (p, cls, tag) => `<tr class="${cls}"><td class="nw"><span class="pos${p.pos === 'GB' ? ' gb' : ''}"${p.pos !== y.pos ? ` title="${esc(H.POS_LABEL[p.pos])}, peut dépanner à ce poste"` : ''}>${p.pos}</span> ${cls === 'me' ? `<b>${esc(short(p.name))}</b>` : esc(short(p.name))}${tag}</td><td class="r">${p.age}</td>
      <td class="nw">${vstars(at(p), { sm: true, title: p.pos === y.pos ? undefined : `Au poste ${H.POS_LABEL[y.pos].toLowerCase()} : ${H.starLabel(H.stars(at(p), ref)).toLowerCase()}` })}</td><td class="nw">${pot(p, { sm: true })}</td>
      ${cols.map((k, i) => `<td class="ac ${heat(p.a[k])}${keys.includes(k) ? ' key' : ''}${i === 0 ? ' gs' : ''}" title="${esc(ATTR_LABEL[k])} : ${p.a[k]}"><span class="v">${p.a[k]}</span></td>`).join('')}</tr>`;
    const rows = row(y, 'me', ' <span class="yt" title="Le jeune du centre">J</span>') + same.concat(sec).map((p) => row(p, '', '')).join('');
    const none = !same.length && !sec.length ? `<tr><td colspan="${4 + cols.length}" class="muted">Personne à ce poste dans ton effectif.</td></tr>` : '';
    return `<div class="ycmp" style="margin-top:14px"><span class="label">Face à ton effectif · ${H.POS_LABEL[y.pos].toLowerCase()}</span>
      <div class="scroll"><table class="sq ly"><thead><tr><th>Joueur</th><th class="r">Âge</th><th title="Niveau à ce poste, par rapport à ton club">Niveau</th><th>Potentiel</th>${cols.map((k, i) => `<th class="ac${i === 0 ? ' gs' : ''}" title="${esc(ATTR_LABEL[k])}">${ATTR_SHORT[k]}</th>`).join('')}</tr></thead><tbody>${rows}${none}</tbody></table></div>
      <p class="legend" style="margin:6px 0 0">Attributs du poste, plus la robustesse (résistance aux blessures) ; encadrés : ceux qui comptent le plus.</p></div>`;
  }
  function youthCard(modal) {
    if (U.yBatch) return youthBatch();
    const y = G.youth.p, t = me();
    const nb = (G.leagueYouth || []).filter((l) => l.round === G.youth.round).length + 1;
    const attrs = (y.pos === 'GB' ? H.GKA : H.FIELD.concat(H.TRAITS)).concat([H.ROBUST]);
    const keys = Object.keys(H.WEIGHTS[y.pos]);
    return `<div class="ycard">
      <div class="row" style="justify-content:space-between;align-items:flex-start;gap:12px"><div><span class="label" style="color:var(--iso-youth)">Centre de formation · après la journée ${G.youth.round}</span>
        <h2 id="ytitle" style="margin-top:4px">${esc(y.name)}</h2>
        <p class="muted" style="margin:4px 0 0">${H.POS_LABEL[y.pos]} · ${y.age} ans · ${y.hand === 'G' ? 'gaucher' : 'droitier'}</p></div>
        <div class="ynotes">${(() => { const r = H.potRange(y, sref()); return `<div><span class="label">Niveau</span>${vstars(y.ovr)}</div><div><span class="label">Potentiel estimé</span>${potbar(r)}<span class="muted" style="font-size:0.8rem">${potTxt(r).replace(', estimation du staff', '')}</span></div>`; })()}</div></div>
      <p class="legend" style="margin:10px 0">Attributs tirés au hasard. Le potentiel est une estimation du staff : la fourchette se resserre à mesure qu'il grandit. Tant qu'il est sous son potentiel, il progresse bien plus vite à l'entraînement ; une fois le potentiel atteint, presque plus.</p>
      <div class="yattrs">${attrs.map(([k, l]) => `<div style="--i:${keys.includes(k) ? attrs.length + keys.indexOf(k) : attrs.findIndex((a) => a[0] === k)}" class="yattr ${['excentricite', 'collectif'].includes(k) ? 'tr' + Math.min(5, Math.ceil(y.a[k] / 4)) : heat(y.a[k])}${keys.includes(k) ? ' key' : ''}"><span>${esc(l)}</span><b class="num">${y.a[k]}</b></div>`).join('')}</div>
      ${U.yCmp ? youthCompare(y, t) : ''}
      <p class="muted" style="margin:14px 0 0">Il rejoint le centre de formation (${H.cfOf(t).length} jeunes aujourd'hui) sans que personne ne parte. Tu pourras le libérer plus tard depuis le centre.</p>
      <div class="row" style="margin-top:16px"><button class="btn primary" data-act="yaccept">L'intégrer au centre</button>
        <button class="btn" data-act="yrefuse">Le laisser partir</button>${modal ? '<button class="btn" data-act="ylater">Décider plus tard</button>' : ''}<span class="spacer" style="flex:1"></span><button class="btn" data-act="ycmp" aria-pressed="${!!U.yCmp}" title="Ses attributs face à ceux de tes joueurs au même poste">${U.yCmp ? 'Masquer la comparaison' : 'Comparer avec l\'effectif'}</button><button class="btn" data-act="ybatch" title="Tous les jeunes sortis des centres de la ligue à cette journée">Voir toute la promo (${nb})</button></div>
      <p class="legend" style="margin:8px 0 0">Sans réponse avant le prochain match, il signera ailleurs.</p></div>`;
  }
  function renderFormation() {
    const t = me(), nr = nextYouthRound();
    const left = nr ? nr - G.round : 0;
    return `<div class="grid2"><div style="display:grid;gap:20px;min-width:0;align-content:start">
      <section class="panel"><div class="row" style="justify-content:space-between;gap:8px;margin-bottom:10px"><h3 style="margin:0">Centre de formation</h3><span class="trait"><span class="muted">Niveau du centre</span>${pips(H.academyOf(t), fanTips(t).f, 'Centre de formation')}</span></div>
        ${G.youth ? youthCard(false) : `<p style="margin:0">${nr ? `Prochain jeune proposé après la <b>journée ${nr}</b>, dans ${left} match${left > 1 ? 's' : ''}.` : 'Plus de jeune à proposer cette saison.'}</p>
          <p class="muted">Un jeune sort du centre toutes les 5 journées, à un poste tiré au hasard. Pas de limite d'effectif : la feuille de match reste à 14, les jeunes du centre et les moins de 23 ans hors de la feuille jouent avec la réserve et prennent de l'expérience ; les pros de 23 ans et plus restent en tribune.</p>`}
      </section>
      ${cfPanel(t)}</div>
      <div style="display:grid;gap:20px;min-width:0;align-content:start">
        ${reservePanel(t)}
        <section class="panel"><h3>Historique</h3>${G.youthLog.length ? `<div class="scroll"><table><tbody>${G.youthLog.map((l) => `<tr><td class="r">J${l.round}</td><td><span class="pos${l.pos === 'GB' ? ' gb' : ''}">${l.pos}</span> ${esc(l.name)}</td><td class="nw">${(() => { const q = { id: l.id || l.name, age: l.age || 18, ovr: l.ovr, pot: l.pot }; const r = H.potRange(q, sref()); return `${vstars(q.ovr, { sm: true })}</td><td class="nw">${potbar(r, { sm: true })}`; })()}</td><td>${esc(l.decision)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted" style="margin:0">Aucun jeune proposé pour l\'instant.</p>'}</section>
      </div></div>${leagueYouthPanel()}`;
  }
  // Joueurs du centre de formation (moins de 23 ans) : réserve, libération définitive ; pros de moins de 23 ans à y envoyer
  function cfPanel(t) {
    const cf = H.cfOf(t).sort((a, b) => b.ovr - a.ovr || b.pot - a.pot);
    const u23 = t.players.filter(H.canJoinCF).sort((a, b) => a.age - b.age);
    const starters = new Set(Object.values(t.lineup)), out = new Set(t.out || []);
    const week = (p) => H.hurt(p) ? '<span class="muted">blessé</span>' : !out.has(p.id) ? `<span class="muted">${starters.has(p.id) ? 'titulaire' : 'avec les pros'}</span>` : p.lastRes ? `${p.lastRes} min` : p.resFocus ? `<span class="muted" title="Moins de 7 joueurs en réserve : pas de match">séance ${esc(H.TRAIN[p.resFocus].label.toLowerCase())}</span>` : '<span class="muted">–</span>';
    const rows = cf.map((p) => `<tr><td class="nw"><span class="pos${p.pos === 'GB' ? ' gb' : ''}">${p.pos}</span> ${plink(p, short(p.name))}</td><td class="r">${p.age}</td><td class="nw">${lstars(p, { sm: true })}</td><td class="nw">${pot(p, { sm: true })}</td><td class="nw" title="${p.resApps ? `Réserve cette saison : ${p.resApps} match${p.resApps > 1 ? 's' : ''}, ${p.resMins} min` : 'Pas encore de match avec la réserve'}">${week(p)}</td>
      <td class="r">${U.relAsk === p.id ? `<span class="nw"><button class="btn sm primary" data-act="relyes" data-id="${p.id}" title="Confirmer le départ définitif">Oui</button> <button class="btn sm" data-act="relask" data-id="${p.id}">Non</button></span>` : `<button class="btn sm" data-act="relask" data-id="${p.id}" title="Départ définitif : un autre club peut le récupérer">Libérer</button>`}</td></tr>`).join('');
    return `<section class="panel"><h3>Joueurs du centre · ${cf.length}</h3>
      ${cf.length ? `<div class="scroll"><table class="ly cft"><thead><tr><th>Joueur</th><th class="r">Âge</th><th>Niveau</th><th>Potentiel</th><th title="Dernière journée ; total de la saison au survol">Semaine</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="muted" style="margin:0">Personne au centre pour l\'instant.</p>'}
      ${U.relAsk ? '<p class="legend" style="margin:8px 0 0">Libérer un joueur est définitif : il quitte le club, et un autre club peut le récupérer.</p>' : ''}
      ${u23.length ? `<div class="opt" style="margin-top:12px"><span class="label">Moins de 23 ans chez les pros</span><div class="row" style="gap:6px">${u23.map((p) => `<span class="chip"><span class="pos${p.pos === 'GB' ? ' gb' : ''}">${p.pos}</span>${plink(p, short(p.name))} · ${p.age} ans <button class="btn sm" data-act="tocf" data-id="${p.id}" title="Il rejoint le centre de formation et n'en sortira qu'en fin de saison">Au centre</button></span>`).join('')}</div></div>` : ''}
      <p class="legend" style="margin:8px 0 0">Le centre accueille les moins de 23 ans. Ses éducateurs font progresser ses jeunes de ${H.academyOf(t) >= 3 ? '+' : '−'}${Math.abs((H.academyOf(t) - 3) * 10)} % (niveau ${H.academyOf(t)}). Un joueur du centre peut jouer avec les pros ; il ne passe pro qu'en fin de saison.</p></section>`;
  }
  // Réserve de la dernière journée : minutes de chacun, ou séance d'entraînement si moins de 7 joueurs
  function reservePanel(t) {
    const res = t.players.filter((p) => p.lastRes || p.resFocus).sort((a, b) => (b.lastRes || 0) - (a.lastRes || 0));
    const moves = (G.moves || []).filter((m) => m.from === t.id).slice().reverse();
    return `<section class="panel"><h3>Réserve · dernière journée</h3>${!res.length ? '<p class="muted" style="margin:0">Pas encore de match de réserve.</p>'
      : res[0].resFocus ? `<p style="margin:0">Moins de 7 joueurs disponibles : pas de match, séance d'entraînement à la place.</p><p class="muted" style="margin:6px 0 0">${res.map((p) => `${esc(short(p.name))} (${esc(H.TRAIN[p.resFocus].label.toLowerCase())})`).join(', ')}</p>`
      : `<div class="reslist">${res.map((p) => `<span class="chip"><span class="pos${p.pos === 'GB' ? ' gb' : ''}">${p.pos}</span>${plink(p, short(p.name))}${p.cf ? ' <span class="yt" title="Joueur du centre de formation">J</span>' : ''} <b class="num">${p.lastRes}'</b></span>`).join('')}</div>`}
      <p class="legend" style="margin:8px 0 0">Les jeunes du centre et les moins de 23 ans hors de la feuille de match jouent avec la réserve le jour du match : 60 minutes à 7, partagées entre eux ; les pros de 23 ans et plus restent en tribune. Une minute en réserve compte pour ${Math.round(H.RESERVE.xp * 100)} % d'une minute en ${LEAGUE} dans la progression. Ni fatigue ni blessure.</p>
      ${moves.length ? `<div class="opt" style="margin-top:12px"><span class="label">Joueurs libérés</span>${moves.map((m) => `<div class="row" style="gap:8px"><span class="muted num">J${m.round}</span><span class="pos${m.pos === 'GB' ? ' gb' : ''}">${m.pos}</span>${esc(m.name)}<span class="muted">${m.to ? `signe à ${esc(T(m.to).name)}` : 'sans club'}</span></div>`).join('')}</div>` : ''}</section>`;
  }
  // Recrues des centres de formation de toute la SparLigue (IA et joueur), de la plus récente à la plus ancienne
  // Forme de l'adversaire : ses 5 derniers matchs, du plus récent au plus ancien
  function oppForm(opp) {
    const games = [];
    (G.results || []).forEach((rd, k) => rd.forEach((g) => { if (g.h === opp.id || g.a === opp.id) games.push({ ...g, j: k + 1 }); }));
    const last = games.slice(-5).reverse();
    const pos = H.standings(G).findIndex((r) => r.id === opp.id) + 1;
    if (!last.length) return `<div class="opt"><span class="label">Derniers résultats</span><p class="muted" style="margin:0">Pas encore de match joué cette saison.</p></div>`;
    const cnt = { w: 0, d: 0, l: 0 };
    const rows = last.map((g) => {
      const home = g.h === opp.id, us = home ? g.hs : g.as, them = home ? g.as : g.hs, o = T(home ? g.a : g.h);
      const r = us > them ? 'w' : us < them ? 'l' : 'd'; cnt[r]++;
      return `<div class="fline"><span class="res ${r}">${{ w: 'V', d: 'N', l: 'D' }[r]}</span><span class="muted num">J${g.j}</span><span class="muted">${home ? 'dom.' : 'ext.'}</span><span class="nw">${badge(o, true)} ${esc(o.name)}${o.id === G.userId ? ' <span class="muted">(toi)</span>' : ''}</span><b class="num">${us}–${them}</b></div>`;
    }).join('');
    return `<div class="opt"><span class="label">Derniers résultats · ${ord(pos)} de la ${LEAGUE} · ${cnt.w} V, ${cnt.d} N, ${cnt.l} D sur ${last.length}</span><div class="flist">${rows}</div></div>`;
  }
  // Bet9M : bookmaker fictif (clin d'œil à Beyond9M). Cotes calculées une fois par journée, gardées dans la sauvegarde.
  function betCard(h, a) {
    const key = G.round + ':' + h.id + '-' + a.id;
    const o = G.odds && G.odds.key === key ? G.odds : null;
    if (!o && !U.oddsBusy) {
      U.oddsBusy = true;
      setTimeout(() => { if (U.view !== 'pre' || U.tab !== 'match') { U.oddsBusy = false; return; } const r = H.odds(h, a, 200, G.userId); G.odds = { key, ...r }; U.oddsBusy = false; save(); if (U.tab === 'match' && U.view === 'pre') render(); }, 60);
    }
    const share = o ? (() => { const v = [o.pw, o.pd, o.pl].map((p) => Math.pow(p, 2)), t = v.reduce((x, y) => x + y, 0); const r = v.map((x) => Math.round((x / t) * 100)); r[1] = 100 - r[0] - r[2]; return r; })() : [0, 0, 0];
    const fav = o ? [o.ow, o.od, o.ol].indexOf(Math.min(o.ow, o.ol)) : -1;
    const short3 = (t) => t.id;
    const cell = (k, lab, full, odd, pct) => `<div class="betcell${k === fav ? ' fav' : ''}" title="${esc(full)}${o ? ` · probabilité estimée ${Math.round([o.pw, o.pd, o.pl][k] * 100)} % · ${pct} % des parieurs` : ''}"><span class="bl">${esc(lab)}</span><b class="num">${o ? odd.toFixed(2).replace('.', ',') : '…'}</b></div>`;
    return `<section class="panel betcard" aria-label="Cotes Bet9M">
      <div class="bethead"><span class="betlogo" aria-hidden="true">9<i>M</i></span><b>Bet9M</b><span class="muted">J${G.round + 1}</span></div>
      <div class="betrow">${cell(0, short3(h), h.name, o && o.ow, share[0])}${cell(1, 'Nul', 'Match nul', o && o.od, share[1])}${cell(2, short3(a), a.name, o && o.ol, share[2])}</div>
      <p class="betnote">Cotes fictives. Ici, la seule mise qui compte, c'est la mise en place.</p></section>`;
  }
  // « HandXtra » sur MeIn Sport : une réplique d'avant-match chacun, contextuelle, par Tom Villetable (au micro)
  // et François-Tablier Houla (consultant). Tirée au sort mais stable pour une journée donnée.
  function tvCard(h, a) {
    let seed = 0;
    for (const c of `${G.seed}:${G.round}:${h.id}-${a.id}`) seed = (Math.imul(seed ^ c.charCodeAt(0), 2654435761) + 1) | 0;
    const R = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const pk = (arr) => arr[Math.floor(R() * arr.length)];
    const st = H.standings(G), rk = (t) => st.findIndex((r) => r.id === t.id) + 1, played = G.results.length > 0;
    const form = (t) => { const g = []; G.results.forEach((rd) => rd.forEach((x) => { if (x.h === t.id || x.a === t.id) { const us = x.h === t.id ? x.hs : x.as, th = x.h === t.id ? x.as : x.hs; g.push(us > th ? 'V' : us < th ? 'D' : 'N'); } })); return g; };
    const streak = (t) => { const f = form(t); let n = 0; const k = f[f.length - 1]; for (let i = f.length - 1; i >= 0 && f[i] === k; i--) n++; return { k, n }; };
        const last = (p) => p.name.split(' ').slice(-1)[0];
    const deN = (n) => /^Les /.test(n) ? 'des ' + n.slice(4) : /^Le /.test(n) ? 'du ' + n.slice(3) : 'de ' + n;
    const gap = rk(h) - rk(a), rgap = h.rep - a.rep;
    let aller = null;
    G.results.forEach((rd) => rd.forEach((x) => { if (x.h === a.id && x.a === h.id) aller = x; }));
    const o = G.odds && G.odds.key === G.round + ':' + h.id + '-' + a.id ? G.odds : null;
    // Tom Villetable : l'affiche, avec un angle tiré du contexte
    const tom = [];
    if (!played) tom.push(`Bonsoir à tous et bienvenue à ${h.city} pour l'ouverture de la ${LEAGUE} ! ${h.name} – ${a.name}, la saison commence, et je vous le dis : ça va sentir la résine !`);
    else {
      if (aller) tom.push(`Bonsoir et bienvenue à ${h.city} ! Au match aller, ${aller.hs === aller.as ? `match nul ${aller.hs}–${aller.as}, personne n'avait voulu gagner` : `victoire ${deN(aller.hs > aller.as ? a.name : h.name)} ${Math.max(aller.hs, aller.as)}–${Math.min(aller.hs, aller.as)}`}. Ce soir, c'est la revanche, et ça va secouer !`);
      if (rk(h) <= 3 && rk(a) <= 3) tom.push(`Mesdames et messieurs, le sommet de la J${G.round + 1} : ${rk(h)}e contre ${rk(a)}e ! ${h.name} reçoit ${a.name}, c'est l'Everest du handball ce soir, et on a oublié les crampons !`);
      if (Math.abs(gap) >= 8) tom.push(`${h.name}, ${rk(h)}e, contre ${a.name}, ${rk(a)}e : sur le papier, il n'y a pas match. Mais le papier, au handball, ça se déchire en sept secondes !`);
      if (rk(h) >= 14 || rk(a) >= 14) tom.push(`Soirée à haute tension à ${h.city} : ${rk(h) >= 14 ? h.name : a.name} est ${rk(h) >= 14 ? rk(h) : rk(a)}e, ça sent le bas de tableau, et le bas de tableau, ça mord !`);
      if (!tom.length || R() < 0.25) tom.push(pk([
        `Quelle affiche pour cette J${G.round + 1} de ${LEAGUE} ! ${h.name} contre ${a.name}, j'ai des frissons, et pourtant le chauffage marche à ${h.city} !`,
        `Bonsoir à tous ! ${h.name}, ${rk(h)}e, reçoit ${a.name}, ${rk(a)}e. Deux points en jeu, soixante minutes, et sûrement un bras cassé… de rire, rassurez-vous !`,
        `On est à ${h.city}, la résine colle aux doigts, les tribunes collent aux sièges : ${h.name} – ${a.name}, c'est parti pour une soirée de feu !`,
        `Bienvenue dans HandXtra ! Ce soir ${a.name} se déplace à ${h.city}, et quand ${a.name} se déplace, Tom Villetable se déplace aussi. Enfin, moi.`
      ]));
    }
    // François-Tablier Houla : l'analyse du consultant, sur l'élément le plus parlant
    const hasModC = (t, k) => (t.mods || []).includes(k);
    const fx = [], sa = streak(a), sh = streak(h), hot = sa.n >= sh.n ? [a, sa] : [h, sh];
    if (played && hot[1].n >= 3) fx.push(hot[1].k === 'V' ? `${hot[0].name} reste sur ${hot[1].n} victoires. Quand tu es en confiance comme ça, Tom, même le poteau rentre. La confiance, c'est 50 % du match, et l'autre moitié… c'est la confiance aussi.` : hot[1].k === 'D' ? `${hot[1].n} défaites de suite pour ${hot[0].name}. Il va falloir mettre de l'impact, Tom. Beaucoup d'impact. Je ne sais pas encore où, mais beaucoup.` : `${hot[1].n} nuls d'affilée pour ${hot[0].name} : ils ne perdent pas, ils ne gagnent pas, ils sont… là. Ce soir, il faut choisir son camp.`);
    const oppT = h.id === G.userId ? a : a.id === G.userId ? h : (R() < 0.5 ? a : h);
    const tops = oppT.players.filter((p) => p.pos !== 'GB').sort((x, y) => y.ovr - x.ovr).slice(0, 3), sp = tops[Math.floor(R() * tops.length)];
    if (sp) fx.push(pk([
      `Le joueur à surveiller côté ${oppT.city}, c'est ${sp.name}. ${H.POS_LABEL[sp.pos]}, gros volume, il peut faire basculer le match à lui tout seul. ${last(sp)} dans un bon soir, je ne donne pas cher de la défense en face.`,
      `Moi je regarde ${sp.name}. Quand ${last(sp)} prend le ballon, Tom, tu sens que quelque chose va se passer. Ou pas. Mais tu le sens.`,
      `La clé, c'est de museler ${sp.name}. Si tu lui laisses deux mètres, il te met un but ; si tu lui en laisses trois, il te met un but plus beau.`
    ]));
    if (o) { const fav = o.ow <= o.ol ? [h, o.ow] : [a, o.ol]; fx.push(`Bet9M donne ${fav[0].name} favori à ${fav[1].toFixed(2).replace('.', ',')}. Moi je ne parie jamais, Tom. Sauf sur une chose : ça va se jouer dans les dix dernières minutes.`); }
    if (Math.abs(rgap) >= 2) { const big = rgap > 0 ? h : a, small = rgap > 0 ? a : h; fx.unshift(`${big.name} a plus de banc, plus de talent, plus de tout. Mais attention : ${small.name} n'a rien à perdre, et une équipe qui n'a rien à perdre, ça peut tout gagner. Ou rien. On va voir.`); }
    if (H.fansOf(h).h >= 5) fx.push(`À ${h.city}, ${H.fansOf(h).name.replace(/^Les /, 'les ')} poussent fort, Tom. Ici, tu marques un but, la salle t'en donne un deuxième dans la tête.`);
    else if (H.fansOf(a).a >= 4 && R() < 0.5) fx.push(`Attention, Tom : ${H.fansOf(a).name.replace(/^Les /, 'les ')} ont fait le déplacement en nombre. À ${h.city}, ce soir, on ne sait plus trop qui reçoit.`);
    const leg = h.players.concat(a.players).find((p) => p.legend);
    if (leg && R() < 0.4) fx.unshift(`Et ce jeune ${leg.name}… ce nom me dit quelque chose, Tom. Non ? Bon. Ça me reviendra à la mi-temps.`);
    if (!fx.length || !played) fx.push(pk([`Début de saison, Tom : personne ne sait rien, donc tout le monde a un avis. Moi le premier.`, `Premier match, c'est toujours piège. Les jambes sont neuves, les gardiens aussi, et les arbitres… on verra.`]));
    const lines = [['tom', 'Tom Villetable', pk(tom)], ['fx', 'François-Tablier Houla', pk(fx.slice(0, 2))]];
    return `<section class="panel tvcard" aria-label="Avant-match HandXtra sur MeIn Sport">
      <div class="tvhead"><span class="tvlogo" aria-hidden="true"><b>MeIn</b>SPORT</span><span class="tvshow">HandXtra</span><span class="tvlive">Avant-match</span></div>
      <div class="tvlines">${lines.map(([k, who, txt]) => `<p><b class="${k}">${who}</b> ${esc(txt)}</p>`).join('')}</div>
</section>`;
  }
  function leagueYouthPanel() {
    // Toutes les propositions des centres de la ligue : recrutées et refusées (les tiennes comprises)
    const mine = (G.youthLog || []).map((l) => { const ok = /^(Recruté|Intégré)/.test(l.decision); return { round: l.round, team: G.userId, id: l.id, name: l.name, pos: l.pos, age: l.age, ovr: l.ovr, pot: l.pot, ok, dec: ok ? null : l.decision, out: (l.decision.match(/^Recruté, (.+) quitte le club$/) || [])[1] || null }; });
    const every = (G.leagueYouth || []).map((l) => ({ ...l, out: l.ok ? l.out : null })).concat(mine).sort((a, b) => b.round - a.round || (b.ok - a.ok) || a.team.localeCompare(b.team));
    const recruited = every.filter((l) => l.ok), nRef = every.length - recruited.length;
    // Filtres : clubs (menu déroulant à cases), niveau et potentiel minimum en étoiles, jeunes refusés
    const F = U.ly || (U.ly = { teams: [], lv: 0, pot: 0, open: false, ref: true });
    if (F.ref === undefined) F.ref = true;
    const base = F.ref ? every : recruited;
    const shown = base.filter((l) => {
      if (F.teams.length && !F.teams.includes(l.team)) return false;
      const f = l.ok && l.id ? findPlayer(l.id) : null, q = f ? f.p : { id: l.id || l.name, age: l.age || 18, ovr: l.ovr, pot: l.pot };
      if (F.lv && H.stars(q.ovr, sref()) < F.lv) return false;
      if (F.pot && H.potRange(q, sref()).lo < F.pot) return false; // partie pleine des étoiles : l'estimation sûre du staff
      return true;
    });
    const clubs = G.teams.slice().sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    const starOpts = (k, lab, tip) => `<label class="lyf" title="${tip}">${lab} <select data-lyf="${k}">${[[0, 'Tous'], [2, '2 ★ et +'], [3, '3 ★ et +'], [4, '4 ★ et +'], [4.5, '4½ ★ et +'], [5, '5 ★']].map(([v, l]) => `<option value="${v}"${F[k] === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>`;
    const active = F.teams.length || F.lv || F.pot;
    const filters = `<div class="row lyfilters">
        <details class="ddrop"${F.open ? ' open' : ''}><summary>Clubs : ${F.teams.length ? (F.teams.length === 1 ? esc(T(F.teams[0]).name) : F.teams.length + ' clubs') : 'tous'}</summary>
          <div class="ddmenu"><div class="row" style="gap:8px;margin-bottom:6px"><button class="btn sm" data-act="lyall">Tous</button><button class="btn sm" data-act="lyme">Seulement le mien</button></div>
          ${clubs.map((t) => `<label class="ddopt"><input type="checkbox" data-lyteam="${t.id}"${F.teams.includes(t.id) ? ' checked' : ''}> ${badge(t, true)} ${esc(t.name)}</label>`).join('')}</div></details>
        ${starOpts('lv', 'Niveau', 'Niveau actuel')}${starOpts('pot', 'Potentiel', 'Selon la partie pleine des étoiles de potentiel, hors marge d\'incertitude')}
        <label class="lyf"><input type="checkbox" data-lyref${F.ref ? ' checked' : ''}> Afficher les jeunes refusés</label>
        ${active ? `<span class="muted">${shown.length} sur ${base.length}</span><button class="btn sm" data-act="lyreset">Effacer les filtres</button>` : ''}</div>`;
    const rows = shown.map((l) => {
      const t = T(l.team), f = l.ok && l.id ? findPlayer(l.id) : null, p = f ? f.p : null;
      const q = p || { id: l.id || l.name, age: l.age || 18, ovr: l.ovr, pot: l.pot };
      const who = p ? plink(p) : `<span class="muted" title="${l.ok ? "N'est plus dans le championnat" : 'Pas gardé par le club'}">${esc(l.name)}</span>`;
      const dec = l.ok ? (l.out ? releasedTxt(l) : 'Recruté') : `<span class="tag refused">${esc(l.dec || 'Refusé')}</span>`;
      return `<tr class="${l.team === G.userId ? 'me' : ''}${l.ok ? '' : ' refused'}"><td class="r">J${l.round}</td><td class="nw">${badge(t, true)} ${esc(t.name)}</td><td class="nw"><span class="pos${l.pos === 'GB' ? ' gb' : ''}">${l.pos}</span> ${who}</td><td class="r">${q.age}</td><td class="nw">${vstars(q.ovr, { sm: true })}</td><td class="nw">${pot(q, { sm: true })}</td><td class="muted">${dec}</td></tr>`;
    }).join('');
    const byClub = recruited.reduce((a, l) => (a[l.team] = (a[l.team] || 0) + 1, a), {});
    const top = Object.entries(byClub).sort((a, b) => b[1] - a[1])[0];
    return `<section class="panel" style="margin-top:20px"><div class="row" style="justify-content:space-between;margin-bottom:6px"><h3 style="margin:0">Jeunes des centres de formation · ${LEAGUE}</h3>
        <span class="muted">${recruited.length} recruté${recruited.length > 1 ? 's' : ''}, ${nRef} refusé${nRef > 1 ? 's' : ''} cette saison${top ? ` · club le plus friand : <b style="color:var(--fg)">${esc(T(top[0]).name)}</b> (${top[1]})` : ''}</span></div>
      <p class="legend" style="margin:0 0 10px">Comme toi, chaque club voit sortir un jeune de son centre toutes les 5 journées ; il rejoint son centre de formation. Au-delà de ${H.CF.aiMax} jeunes, le staff libère le moins prometteur, qu'un autre club peut récupérer. Niveau et potentiel : étoiles par rapport à ton club ; valeurs actuelles pour les recrues, à la sortie du centre pour les refusés.</p>
      ${every.length ? filters : ''}${every.length && !shown.length ? '<p class="muted" style="margin:0">Aucun jeune ne correspond à ces filtres.</p>' : ''}${shown.length ? `<div class="scroll" style="max-height:460px;overflow-y:auto"><table class="ly"><thead><tr><th class="r">J.</th><th>Club</th><th>Joueur</th><th class="r">Âge</th><th>Niveau</th><th>Potentiel</th><th>Décision</th></tr></thead><tbody>${rows}</tbody></table></div>` : every.length ? '' : `<p class="muted" style="margin:0">Aucun jeune sorti des centres pour l'instant : les premiers arrivent après la journée 5.</p>`}</section>`;
  }

  // ---------- Ville ----------
  const IX = 430, IY = 128;
  const P = (x, y, z) => [IX + (x - y) * 32, IY + (x + y) * 16 - (z || 0)];
  const pts = (arr) => arr.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const EDGE = 'stroke="var(--iso-edge)" stroke-width="0.8" stroke-linejoin="round"';
  const poly = (arr, fill, extra) => `<polygon points="${pts(arr)}" fill="${fill}" ${extra || ''}/>`;
  function isoBox(b) {
    const { x, y, w, d, h } = b, z = b.z || 0, c = b.c;
    const top = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)];
    const left = [P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)];
    const right = [P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)];
    const [ex, ey0] = P(x + w, y + d, z), ey1 = P(x + w, y + d, z + h)[1];
    return poly(left, c, EDGE) + poly(left, 'url(#isoL)') + poly(right, c, EDGE) + poly(right, 'url(#isoR)')
      + (b.noTop ? '' : poly(top, c, EDGE) + poly(top, 'url(#isoT)'))
      + (h > 3 ? `<line x1="${ex.toFixed(1)}" y1="${ey0.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey1.toFixed(1)}" class="isoedge"/>` : '');
  }
  const hsh = (n) => { const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };
  function winFace(b, rows, cols, fill, op, side) {
    const { x, y, w, d, h } = b, z = b.z || 0;
    const len = side === 'L' ? w : d;
    const mu = Math.min(0.16, len / (cols * 4)), mv = Math.max(4, h / (rows * 5));
    const cw = (len - mu * (cols + 1)) / cols, rh = (h - mv * (rows + 1)) / rows;
    const pt = (u, v) => side === 'L' ? P(u, y + d, v) : P(x + w, u, v);
    const o0 = side === 'L' ? x : y;
    let s = '';
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const u = o0 + mu + c * (cw + mu), v = z + mv + r * (rh + mv);
      const lit = hsh(x * 7 + y * 13 + r * 3.1 + c * 1.7 + (side === 'L' ? 0 : 50));
      const o = (op || 0.85) * (0.45 + 0.55 * lit);
      s += poly([pt(u, v), pt(u + cw, v), pt(u + cw, v + rh), pt(u, v + rh)], fill, `fill-opacity="${o.toFixed(2)}" stroke="var(--iso-edge)" stroke-width="0.4"`);
      if (rh > 6) s += `<line x1="${pt(u + cw / 2, v)[0].toFixed(1)}" y1="${pt(u + cw / 2, v)[1].toFixed(1)}" x2="${pt(u + cw / 2, v + rh)[0].toFixed(1)}" y2="${pt(u + cw / 2, v + rh)[1].toFixed(1)}" stroke="var(--iso-edge)" stroke-width="0.35"/>`;
    }
    return s;
  }
  const winL = (b, rows, cols, fill, op) => winFace(b, rows, cols, fill, op, 'L');
  const winR = (b, rows, cols, fill, op) => winFace(b, rows, cols, fill, op ? op : 0.7, 'R');
  function parapet(b) {
    const { x, y, w, d, h } = b, z = (b.z || 0) + h, m = 0.07;
    return poly([P(x + m, y + m, z), P(x + w - m, y + m, z), P(x + w - m, y + d - m, z), P(x + m, y + d - m, z)], '#000', 'fill-opacity="0.1"')
      + poly([P(x + m, y + m, z), P(x + w - m, y + m, z), P(x + w - m, y + m, z - 1.5), P(x + m, y + m, z - 1.5)], '#000', 'fill-opacity="0.12"');
  }
  function unit(x, y, z, s) {
    s = s || 1;
    return isoBox({ x, y, w: 0.32 * s, d: 0.26 * s, h: 5 * s, z, c: 'var(--iso-unit)' }) + poly([P(x + 0.06 * s, y + 0.26 * s, z + 1.2), P(x + 0.26 * s, y + 0.26 * s, z + 1.2), P(x + 0.26 * s, y + 0.26 * s, z + 3.8 * s), P(x + 0.06 * s, y + 0.26 * s, z + 3.8 * s)], '#000', 'fill-opacity="0.18"');
  }
  function door(x0, x1, yf, h, fill) { return poly([P(x0, yf, 0), P(x1, yf, 0), P(x1, yf, h), P(x0, yf, h)], fill || 'var(--iso-door)', EDGE); }
  function shadowOf(b) {
    const { x, y, w, d, h } = b, a = Math.min(h / 36, 12.2 - x - w), c = Math.min(h / 110, 12.2 - y - d);
    return poly([P(x, y), P(x + w, y), P(x + w + a, y + c), P(x + w + a, y + d + c), P(x + a, y + d + c), P(x, y + d)], '#000');
  }
  function car(x, y, along, col) {
    const L = 0.46, W = 0.24;
    const b = along === 'x' ? { x, y, w: L, d: W } : { x, y, w: W, d: L };
    const cab = along === 'x' ? { x: x + 0.1, y: y + 0.02, w: 0.24, d: W - 0.04 } : { x: x + 0.02, y: y + 0.1, w: W - 0.04, d: 0.24 };
    return poly([P(b.x + 0.03, b.y + 0.03), P(b.x + b.w + 0.08, b.y + 0.03), P(b.x + b.w + 0.08, b.y + b.d + 0.03), P(b.x + 0.03, b.y + b.d + 0.03)], '#000', 'fill-opacity="0.15"')
      + isoBox(Object.assign({ h: 3.5, c: col }, b)) + isoBox(Object.assign({ h: 2.6, z: 3.5, c: 'var(--iso-glass)' }, cab));
  }
  function lamp(x, y) {
    const [gx, gy] = P(x, y, 0), [tx, ty] = P(x, y, 24);
    return `<line x1="${gx}" y1="${gy}" x2="${tx}" y2="${ty}" stroke="var(--iso-pole)" stroke-width="1.3"/><line x1="${tx}" y1="${ty}" x2="${tx + 5}" y2="${ty + 1}" stroke="var(--iso-pole)" stroke-width="1.3"/><circle cx="${tx + 5}" cy="${ty + 2}" r="1.8" fill="var(--iso-lamp)"/><circle class="glow" cx="${tx + 5}" cy="${ty + 2}" r="6" fill="var(--iso-lamp)" opacity="var(--iso-glow)" style="animation-duration:${(6 + ((x * 7 + y * 3) % 5)).toFixed(1)}s;animation-delay:${(-((x * 13 + y * 5) % 9)).toFixed(1)}s"/>`;
  }
  function bench(x, y) { return isoBox({ x, y, w: 0.34, d: 0.1, h: 2.5, c: 'var(--iso-trunk)' }) + isoBox({ x, y: y - 0.04, w: 0.34, d: 0.03, h: 5, c: 'var(--iso-trunk)' }); }
  function conifer(x, y, s) {
    s = s || 1;
    const [gx, gy] = P(x, y, 0);
    return `<ellipse cx="${gx}" cy="${gy}" rx="${8 * s}" ry="${4 * s}" fill="#000" fill-opacity="0.1"/><line x1="${gx}" y1="${gy}" x2="${gx}" y2="${gy - 6 * s}" stroke="var(--iso-trunk)" stroke-width="2"/>
      <polygon points="${gx - 8 * s},${gy - 5 * s} ${gx},${gy - 30 * s} ${gx + 8 * s},${gy - 5 * s}" fill="var(--iso-tree2)" ${EDGE}/><polygon points="${gx},${gy - 30 * s} ${gx + 8 * s},${gy - 5 * s} ${gx + 1},${gy - 5 * s}" fill="#000" fill-opacity="0.15"/>`;
  }
  function gable(b, rh, roof) {
    const { x, y, w, d, h } = b, z = (b.z || 0) + h, m = y + d / 2;
    return poly([P(x, y, z), P(x + w, y, z), P(x + w, m, z + rh), P(x, m, z + rh)], roof, EDGE) + poly([P(x, y, z), P(x + w, y, z), P(x + w, m, z + rh), P(x, m, z + rh)], '#fff', 'fill-opacity="0.12"')
      + poly([P(x + w, y, z), P(x + w, y + d, z), P(x + w, m, z + rh)], b.c, EDGE) + poly([P(x + w, y, z), P(x + w, y + d, z), P(x + w, m, z + rh)], '#000', 'fill-opacity="0.3"')
      + poly([P(x, y + d, z), P(x + w, y + d, z), P(x + w, m, z + rh), P(x, m, z + rh)], roof, EDGE) + poly([P(x, y + d, z), P(x + w, y + d, z), P(x + w, m, z + rh), P(x, m, z + rh)], '#000', 'fill-opacity="0.08"');
  }
  function tree(x, y, s) {
    s = s || 1;
    const [gx, gy] = P(x, y, 0);
    return `<ellipse cx="${gx + 3 * s}" cy="${gy}" rx="${10 * s}" ry="${4.5 * s}" fill="#000" fill-opacity="0.12"/><line x1="${gx}" y1="${gy}" x2="${gx}" y2="${gy - 12 * s}" stroke="var(--iso-trunk)" stroke-width="2.4"/>
      <circle cx="${gx + 2 * s}" cy="${gy - 15 * s}" r="${8.5 * s}" fill="var(--iso-tree2)" ${EDGE}/><circle cx="${gx - 2 * s}" cy="${gy - 20 * s}" r="${8 * s}" fill="var(--iso-tree)" ${EDGE}/><circle cx="${gx + 3 * s}" cy="${gy - 22 * s}" r="${5.5 * s}" fill="var(--iso-tree)"/><circle cx="${gx - 4 * s}" cy="${gy - 24 * s}" r="${3 * s}" fill="#fff" fill-opacity="0.18"/>`;
  }
  function bush(x, y) { const [gx, gy] = P(x, y, 0); return `<ellipse cx="${gx}" cy="${gy - 3}" rx="6" ry="4.5" fill="var(--iso-tree2)" ${EDGE}/><ellipse cx="${gx - 1.5}" cy="${gy - 4.5}" rx="3" ry="2" fill="#fff" fill-opacity="0.15"/>`; }
  function flat(x, y, w, d, fill, extra) { return poly([P(x, y), P(x + w, y), P(x + w, y + d), P(x, y + d)], fill, extra); }
  function skewText(x, y, z, txt, size, fill) {
    const [sx, sy] = P(x, y, z);
    return `<text transform="matrix(0.894 0.447 0 1 ${sx.toFixed(1)} ${sy.toFixed(1)})" font-size="${size}" font-weight="800" fill="${fill}" class="isotxt">${esc(txt)}</text>`;
  }
  // Nom sur la façade de la salle (bandeau de x 7,2 à 10,2, hauteur 12 à 29) : une ligne si ça tient, sinon deux,
  // coupées à une espace ou un trait d'union, taille réduite pour rester dans le cadre
  function arenaName(txt) {
    const room = 3 * 35.8 - 12, fit = (ls) => Math.min(13, room / (Math.max(...ls.map((l) => l.length)) * 0.74));
    let lines = [txt], fs = fit(lines);
    const cuts = [...txt.matchAll(/[ -]/g)].map((m) => m.index);
    for (const i of cuts) { const ls = [txt.slice(0, i + (txt[i] === '-' ? 1 : 0)), txt.slice(i + 1)], f = Math.min(7, fit(ls)); if (f > fs) { lines = ls; fs = f; } }
    const cap = fs * 0.72, gap = 2.5, z0 = 12 + (17 - lines.length * cap - (lines.length - 1) * gap) / 2;
    return lines.map((l, k) => { const w = l.length * fs * 0.74 / 35.8; return skewText(7.2 + (3 - w) / 2, 10.4, z0 + (lines.length - 1 - k) * (cap + gap), l, fs, '#fff'); }).join('');
  }
  // Étiquette du bâtiment : pastille sombre au-dessus du toit (au survol, ou toujours avec « Étiquettes »)
  function citySign(o, ghost) {
    const [sx, sy] = P(o.at[0], o.at[1], o.at[2]);
    const w = o.tag.length * 6.7 + 30, hh = 22, TOP = 106;
    let y0 = sy - 14 - (o.lift || 0) - hh, cx = sx + (o.dx || 0), lx = sx, ly = y0 + hh;
    // Bâtiment en haut du plan : l'étiquette sortirait du cadre, elle se place à côté du toit
    if (y0 < TOP) { y0 = TOP; cx = sx + w / 2 + 26; lx = cx - w / 2; ly = y0 + hh / 2; }
    const attrs = ghost ? `data-gsign="${o.key}"` : `data-psign="${o.key}"`;
    return `<g class="sign${ghost ? ' ghost' : ''}" ${attrs} style="--pc:${ghost ? 'var(--muted)' : o.c}"><line x1="${sx}" y1="${sy}" x2="${lx}" y2="${ly}" class="sline"/><circle cx="${sx}" cy="${sy}" r="2.2" class="sdot"/>
      <rect x="${(cx - w / 2).toFixed(1)}" y="${y0.toFixed(1)}" width="${w.toFixed(1)}" height="${hh}" rx="${hh / 2}" class="spill"/>
      <circle cx="${(cx - w / 2 + 12).toFixed(1)}" cy="${(y0 + hh / 2).toFixed(1)}" r="4" class="sdot"/>
      <text x="${(cx - w / 2 + 21).toFixed(1)}" y="${(y0 + 15).toFixed(1)}" class="sl1">${esc(o.tag)}</text></g>`;
  }
  // Matchs joués par un club, du plus récent au plus ancien
  function teamGames(id) {
    const out = [];
    (G.results || []).forEach((rd, k) => rd.forEach((g) => { if (g.h === id || g.a === id) { const home = g.h === id, us = home ? g.hs : g.as, them = home ? g.as : g.hs; out.push({ j: k + 1, home, us, them, o: T(home ? g.a : g.h), r: us > them ? 'w' : us < them ? 'l' : 'd' }); } }));
    return out.reverse();
  }
  const formPills = (games) => games.length ? `<span class="cform">${games.slice(0, 5).map((g) => `<span class="res ${g.r}" title="J${g.j} · ${g.home ? 'contre' : 'à'} ${esc(g.o.name)} · ${g.us}–${g.them}">${{ w: 'V', d: 'N', l: 'D' }[g.r]}</span>`).join('')}</span>` : '<span class="muted">aucun match joué</span>';
  function cityPlaces() {
    const t = me();
    const nf = nextFixture();
    const starters = Object.values(t.lineup).map((id) => t.players.find((p) => p.id === id)).filter(Boolean);
    const tired = starters.filter((p) => p.fatigue > 28).length;
    const fat = starters.length ? starters.reduce((a, p) => a + (p.fatigue || 0), 0) / starters.length : 0;
    const hurt = t.players.filter(H.hurt).sort((a, b) => a.inj.n - b.inj.n);
    const games = teamGames(t.id), lastG = games[0];
    const post = U.view === 'post' && U.post;
    const s = H.standings(G), row = s.find((r) => r.id === G.userId);
    const opp = nf && !nf.rest ? T(nf.h === t.id ? nf.a : nf.h) : null, home = nf && nf.h === t.id;
    let arenaSub = 'Saison terminée · bilan';
    if (post) arenaSub = 'Résumé du dernier match';
    else if (G.trainPending) arenaSub = 'Entraînement à lancer';
    else if (nf && nf.rest) arenaSub = `J${G.round + 1} · repos`;
    else if (opp) arenaSub = `J${G.round + 1} · ${home ? 'contre' : 'à'} ${opp.name}`;
    const lastTxt = lastG ? `${{ w: 'Victoire', d: 'Nul', l: 'Défaite' }[lastG.r]} ${lastG.us}–${lastG.them} ${lastG.home ? 'contre' : 'à'} ${esc(lastG.o.name)}` : 'Pas encore de match joué';
    const nYouth = nextYouthRound(), cf = H.cfOf(t).length, pros = t.players.filter((p) => !p.cf).length, nFree = (G.free || []).length;
    const tip = fanTips(t), f = H.fansOf(t), tc = t.tactic;
    const fresh = fat < 12 ? 'au top' : fat < 22 ? 'bonne' : fat < 32 ? 'correcte' : 'entamée';
    return [
      { key: 'salle', tab: G.trainPending && !post ? 'entrainement' : 'match', label: 'Salle · Match', tag: 'Salle', sub: arenaSub, c: 'var(--court)', at: [8.7, 9, 52], cta: post ? 'Voir le résumé' : G.trainPending ? "Lancer l'entraînement" : nf ? 'Jouer la journée' : 'Voir le bilan',
        card: { kind: 'Match', tags: G.ended ? [['Saison terminée']] : nf && nf.rest ? [[`J${G.round + 1}`], ['Repos']] : [[`J${G.round + 1} sur ${G.sched.length}`], [home ? 'À domicile' : "À l'extérieur", home ? 'good' : '']],
          alert: post ? 'Le résumé du dernier match t\'attend' : G.trainPending ? 'Entraînement à lancer avant le match' : null,
          rows: [opp ? ['Adversaire', `${badge(opp, true)} ${esc(opp.name)} <span class="muted">· ${ord(rank(opp.id))}</span>`] : null, ['Ta forme', formPills(games)], ['Dernier résultat', lastTxt]] } },
      { key: 'vestiaire', tab: 'effectif', label: 'Vestiaire · Effectif', tag: 'Vestiaire', sub: tired ? `${tired} titulaire${tired > 1 ? 's' : ''} fatigué${tired > 1 ? 's' : ''}` : 'Tout le monde est frais', c: 'var(--accent)', at: [11.2, 9.05, 24], lift: 0, cta: 'Voir les notes',
        card: { kind: 'Effectif', tags: [[`${pros} pros`], [`${cf} au centre`]], alert: tired ? `${tired} titulaire${tired > 1 ? 's' : ''} fatigué${tired > 1 ? 's' : ''}` : null,
          bars: [['Fraîcheur du 7', 1 - fat / 100, fresh, fat < 22 ? 'var(--good)' : fat < 32 ? 'var(--warn)' : 'var(--bad)'], ['Cohésion', (t.cohesion || 50) / 100, `${t.cohesion || 50}/100`, 'var(--iso-gym)'], ['Expérience', H.experience(t) / 100, `${H.experience(t)}/100`, 'var(--iso-office)']] } },
      { key: 'gymnase', tab: 'entrainement', label: 'Gymnase · Entraînement', tag: 'Gymnase', sub: `${H.TRAIN[G.training.focus].label} · intensité ${H.INTENSITY[G.training.intensity].label.toLowerCase()}`, c: 'var(--iso-gym)', at: [8.3, 2.2, 46], cta: 'Régler la semaine', beam: !!G.trainPending && !post,
        card: { kind: 'Entraînement', tags: [[H.INTENSITY[G.training.intensity].label]], alert: G.trainPending ? 'La semaine d\'entraînement est à lancer' : null,
          rows: [['Thème de la semaine', esc(H.TRAIN[G.training.focus].label)], ['Intensité', esc(H.INTENSITY[G.training.intensity].label)], ['Blessés', hurt.length ? `${hurt.length} en soins` : 'aucun']] } },
      { key: 'bureau', tab: 'tactique', label: 'Bureau du coach · Tactique', tag: 'Bureau du coach', sub: `${H.DSTYLE[tc.dstyle]} · jeu ${H.JEU[tc.jeu].toLowerCase()}`, c: 'var(--iso-office)', at: [10.95, 1.85, 62], lift: 66, dx: -46, cta: 'Régler le système',
        card: { kind: 'Tactique', tags: [[H.DSTYLE[tc.dstyle]], [ATT_TXT[tc.att][0]]],
          rows: [['Défense', esc(rulesLine(tc.rules))], ['Jeu', esc(H.JEU[tc.jeu])], ['Consignes', (tc.cons || []).length ? esc(tc.cons.map((c) => CONS[c]).join(' · ')) : '<span class="muted">aucune</span>']] } },
      { key: 'formation', tab: 'formation', label: 'Centre de formation', tag: 'Centre de formation', sub: G.youth ? 'Un jeune attend ta réponse !' : nYouth ? `Prochain jeune après la J${nYouth}` : 'Plus de jeune cette saison', c: 'var(--iso-youth)', at: [8.6, 4.95, 22], lift: 14, cta: G.youth ? 'Voir le jeune' : 'Voir les jeunes', beam: !!G.youth,
        card: { kind: 'Formation', tags: [[`${cf} jeune${cf > 1 ? 's' : ''} au centre`]], alert: G.youth ? 'Un jeune attend ta réponse !' : null,
          rows: [['Niveau du centre', pips(H.academyOf(t), tip.f, 'Centre de formation')], ['Prochain jeune', G.youth ? 'en attente de ta décision' : nYouth ? `après la J${nYouth}` : 'plus cette saison']] } },
      { key: 'infirmerie', tab: 'infirmerie', label: 'Infirmerie', tag: 'Infirmerie', sub: hurt.length ? `${hurt.length} blessé${hurt.length > 1 ? 's' : ''} en soins` : 'Tout le monde est valide', c: 'var(--iso-med)', at: [3.85, 10.25, 26], cta: 'Voir les soins', beam: hurt.length > 0,
        card: { kind: 'Soins', tags: [[hurt.length ? `${hurt.length} en soins` : 'Effectif valide', hurt.length ? 'bad' : 'good']], alert: null,
          rows: hurt.length ? hurt.slice(0, 3).map((x) => [esc(x.inj.type), `${esc(short(x.name))} <span class="muted">· retour J${G.round + x.inj.n + 1}</span>`]).concat(hurt.length > 3 ? [['', `<span class="muted">et ${hurt.length - 3} autre${hurt.length > 4 ? 's' : ''}</span>`]] : []) : [['Kiné', 'range ses strappings']] } },
      { key: 'clubhouse', tab: 'clubhouse', label: 'Club house', tag: 'Club house', sub: f.name, c: 'var(--iso-club)', at: [3.88, 8.05, 26], lift: 4, cta: 'Voir les supporters',
        card: { kind: 'Supporters', tags: [[f.name]], rows: [['À domicile', pips(f.h, tip.h, 'Ferveur à domicile')], ['En déplacement', pips(f.a, tip.a, 'Supporters en déplacement')], ['À la buvette', esc(BUVETTE[t.id] || H.clubOf(t).buvette || 'merguez-frites')]] } },
      { key: 'siege', tab: 'libres', label: 'Siège · Joueurs libres', tag: 'Siège', sub: nFree ? `${nFree} joueur${nFree > 1 ? 's' : ''} libre${nFree > 1 ? 's' : ''}` : 'Personne sur le marché', c: 'var(--iso-hq)', at: [1.8, 1.8, 64], cta: 'Voir les joueurs libres',
        card: { kind: 'Joueurs libres', tags: [[nFree ? `${nFree} sur le marché` : 'Marché calme']], bars: [['Effectif pro', pros / H.FREE.proMax, `${pros}/${H.FREE.proMax}`, 'var(--iso-hq)'], ['Centre de formation', cf / H.FREE.cfMax, `${cf}/${H.FREE.cfMax}`, 'var(--iso-youth)']] } },
      { key: 'kiosque', tab: 'championnat', label: 'Kiosque · Championnat', tag: 'Kiosque', sub: G.results.length ? `${ord(rank())} · ${row.pts} pts` : 'Calendrier et classement', c: 'var(--iso-press)', at: [2.15, 8.8, 28], cta: 'Lire le classement',
        card: { kind: LEAGUE, tags: G.results.length ? [[`${ord(rank())} · ${row.pts} pts`]] : [['Avant la 1re journée']],
          rows: [['Bilan', `${row.g} V · ${row.n} N · ${row.p} D`], ['Forme', formPills(games)], ['En tête', G.results.length ? `${badge(T(s[0].id), true)} ${esc(T(s[0].id).name)} <span class="muted">· ${s[0].pts} pts</span>` : '<span class="muted">tout le monde à zéro</span>']] } }
    ];
  }
  // Pop-up d'un bâtiment (HTML, posée au-dessus du plan au survol)
  // Majuscule au premier caractère de texte (hors balises)
  const capH = (v) => String(v).replace(/^((?:<[^>]*>|\s)*)([a-zà-ÿ])/, (m, a, b) => a + b.toUpperCase());
  function cityCardHtml(o) {
    const c = o.card || {};
    const tags = (c.tags || []).map(([txt, cls]) => `<span class="cpill${cls ? ' ' + cls : ''}">${capH(esc(txt))}</span>`).join('');
    const rows = (c.rows || []).filter(Boolean).map(([k, v]) => `<div class="crow"><span>${capH(k)}</span><b>${capH(v)}</b></div>`).join('');
    const bars = (c.bars || []).map(([k, fr, txt, col]) => `<div class="cbar"><span>${esc(k)}</span><i><i style="width:${Math.round(Math.max(0.03, Math.min(1, fr)) * 100)}%;background:${col}"></i></i><b>${capH(esc(txt))}</b></div>`).join('');
    return `<div class="ccard-in" style="--pc:${o.c || 'var(--muted)'}"><div class="ctags"><span class="cpill kind">${esc(c.kind || '')}</span>${tags}</div>
      <h4>${esc(o.tag || o.label)}</h4><p class="csub">${capH(esc(o.sub))}</p>
      ${c.alert ? `<div class="calert">${capH(esc(c.alert))}</div>` : ''}${bars ? `<div class="cbars">${bars}</div>` : ''}${rows ? `<div class="crows">${rows}</div>` : ''}
      <div class="cfoot">${o.cta ? `Clique pour entrer · ${esc(o.cta.toLowerCase())}` : esc(o.foot || '')}</div></div>`;
  }
  const GHOSTS = [
    { key: 'boutique', label: 'Boutique du club', tag: 'Boutique', sub: 'Supporters et recettes', at: [8, 11.4, 18], foot: 'Le chantier avance, ouverture prochaine', card: { kind: 'Bientôt', rows: [['Rayon maillots', 'en cours de pliage']] } }
  ];
  // Détails décoratifs de la ville (clins d'œil, purement visuels)
  const prop = (svg) => `<g class="deco">${svg}</g>`;

  function renderCityMap() {
    const t = me();
    const G1 = 'var(--iso-grey)', WIN = 'var(--iso-win)';
    const flatLayer = [], shadowLayer = [], glowLayer = [], moveLayer = [];
    const F = (x, y, w, d, fill, extra) => flatLayer.push(flat(x, y, w, d, fill, extra));
    // Socle et sol
    flatLayer.push(isoBox({ x: 0, y: 0, w: 12, d: 12, h: 12, z: -12, c: 'var(--iso-ground)', noTop: true }));
    flatLayer.push(poly([P(0, 0, -12), P(12, 0, -12), P(12, 12, -12), P(0, 12, -12)], 'none'));
    F(0, 0, 12, 12, 'var(--iso-ground)', EDGE);
    for (let k = 1; k < 12; k++) { if (k === 5 || k === 6 || k === 7) continue; flatLayer.push(`<line x1="${P(k, 0)[0]}" y1="${P(k, 0)[1]}" x2="${P(k, 12)[0]}" y2="${P(k, 12)[1]}" stroke="var(--iso-gridline)" stroke-width="0.5"/>`, `<line x1="${P(0, k)[0]}" y1="${P(0, k)[1]}" x2="${P(12, k)[0]}" y2="${P(12, k)[1]}" stroke="var(--iso-gridline)" stroke-width="0.5"/>`); }
    // Campus du club (dalles)
    F(6.2, 0.4, 5.6, 5.4, 'var(--iso-campus)'); F(6.2, 7.2, 5.6, 4.6, 'var(--iso-campus)');
    // Trottoirs, routes, marquages, passages piétons
    F(4.82, 0, 0.18, 12, 'var(--iso-side)'); F(6, 0, 0.18, 12, 'var(--iso-side)'); F(0, 5.82, 12, 0.18, 'var(--iso-side)'); F(0, 7, 12, 0.18, 'var(--iso-side)');
    F(5, 0, 1, 12, 'var(--iso-road)'); F(0, 6, 12, 1, 'var(--iso-road)');
    for (let k = 0.3; k < 12; k += 0.9) { if (k > 4.6 && k < 7.4) continue; F(5.47, k, 0.06, 0.45, 'var(--iso-mark)'); F(k, 6.47, 0.45, 0.06, 'var(--iso-mark)'); }
    for (let k = 0; k < 5; k++) { F(5.08 + k * 0.19, 5.5, 0.1, 0.3, 'var(--iso-mark)'); F(5.08 + k * 0.19, 7.2, 0.1, 0.3, 'var(--iso-mark)'); F(4.5, 6.08 + k * 0.19, 0.3, 0.1, 'var(--iso-mark)'); F(6.2, 6.08 + k * 0.19, 0.3, 0.1, 'var(--iso-mark)'); }
    // Terrain de quartier avec buts
    // Terrain de hand en plein air : 40 × 20 m, zones de 6 m, pointillés à 9 m, buts
    {
      const x0 = 0.5, x1 = 2.5, y0 = 10.05, y1 = 11.05, yc = (y0 + y1) / 2, m = (x1 - x0) / 40;
      F(0.38, 9.85, 2.24, 1.4, 'var(--iso-stone)', EDGE);
      F(x0, y0, x1 - x0, y1 - y0, 'var(--iso-pitch)');
      const dz = (gx, dir, r) => {
        const pts = [], post = 1.5 * m;
        for (let a = 0; a <= 90; a += 15) { const t = a * Math.PI / 180; pts.push([gx + dir * r * Math.sin(t), yc - post - r * Math.cos(t)]); }
        for (let a = 90; a >= 0; a -= 15) { const t = a * Math.PI / 180; pts.push([gx + dir * r * Math.sin(t), yc + post + r * Math.cos(t)]); }
        return pts.map(([x, y]) => [x, Math.max(y0, Math.min(y1, y))]);
      };
      for (const [gx, dir] of [[x0, 1], [x1, -1]]) {
        flatLayer.push(poly(dz(gx, dir, 6 * m).map(([x, y]) => P(x, y)), 'var(--iso-bed)'));
        flatLayer.push(poly(dz(gx, dir, 6 * m).map(([x, y]) => P(x, y)), 'none', 'stroke="var(--iso-mark)" stroke-width="0.9"'));
        const nine = dz(gx, dir, 9 * m).map(([x, y]) => P(x, y));
        flatLayer.push(`<polyline points="${nine.map((p) => p.join(',')).join(' ')}" fill="none" stroke="var(--iso-mark)" stroke-width="0.7" stroke-dasharray="2 2"/>`);
        const sev = gx + dir * 7 * m;
        flatLayer.push(`<line x1="${P(sev, yc - 0.5 * m)[0]}" y1="${P(sev, yc - 0.5 * m)[1]}" x2="${P(sev, yc + 0.5 * m)[0]}" y2="${P(sev, yc + 0.5 * m)[1]}" stroke="var(--iso-mark)" stroke-width="0.9"/>`);
      }
      F(x0, y0, x1 - x0, y1 - y0, 'none', 'stroke="var(--iso-mark)" stroke-width="1"');
      flatLayer.push(`<line x1="${P((x0 + x1) / 2, y0)[0]}" y1="${P((x0 + x1) / 2, y0)[1]}" x2="${P((x0 + x1) / 2, y1)[0]}" y2="${P((x0 + x1) / 2, y1)[1]}" stroke="var(--iso-mark)" stroke-width="0.9"/>`);
      U.courtGoals = [[x0, yc, -1], [x1, yc, 1]].map(([gx, gy, d]) => ({ gx, gy, d, w: 1.5 * m }));
    }
    // Mini-terrain du centre de formation
    F(10.35, 2.85, 1.45, 1.3, 'var(--iso-turf)', EDGE);
    F(10.45, 2.95, 1.25, 1.1, 'none', 'stroke="var(--iso-mark)" stroke-width="0.8"');
    flatLayer.push(`<line x1="${P(11.075, 2.95)[0]}" y1="${P(11.075, 2.95)[1]}" x2="${P(11.075, 4.05)[0]}" y2="${P(11.075, 4.05)[1]}" stroke="var(--iso-mark)" stroke-width="0.8"/>`);
    // Place et fontaine
    F(0.9, 5.05, 1.5, 0.7, 'var(--iso-side)', EDGE);
    const [fx, fy] = P(1.65, 5.4, 0);
    flatLayer.push(`<ellipse cx="${fx}" cy="${fy}" rx="17" ry="8.5" fill="var(--iso-stone)" ${EDGE}/><ellipse cx="${fx}" cy="${fy - 1}" rx="13" ry="6.5" fill="var(--iso-water)"/><ellipse class="ripple" cx="${fx}" cy="${fy - 1}" rx="12" ry="6"/><ellipse class="ripple" cx="${fx}" cy="${fy - 1}" rx="12" ry="6" style="animation-delay:-1.4s"/><g class="jet" style="transform-origin:${fx}px ${fy - 1}px"><line x1="${fx}" y1="${fy - 1}" x2="${fx}" y2="${fy - 9}" stroke="var(--iso-water)" stroke-width="2"/><circle cx="${fx}" cy="${fy - 10}" r="2.5" fill="var(--iso-water)" opacity="0.8"/></g>`);
    // Parking
    F(9.3, 10.8, 2.5, 1, 'var(--iso-road)');
    for (let k = 9.5; k < 11.8; k += 0.45) F(k, 10.85, 0.04, 0.5, 'var(--iso-mark)');
    // Parterres devant la salle
    F(6.9, 10.55, 0.8, 0.22, 'var(--iso-bed)'); F(9.5, 10.55, 0.8, 0.22, 'var(--iso-bed)');

    const objs = [];
    const add = (x, y, svg) => objs.push({ d: x + y, svg });
    const places = cityPlaces();
    const pl = Object.fromEntries(places.map((p) => [p.key, p]));
    const bwrap = (p, svg) => `<g class="bld" role="button" tabindex="0" data-act="tab" data-id="${p.tab}" data-place="${p.key}" aria-label="${esc(p.label)} : ${esc(p.sub)}" style="--pc:${p.c}"><g class="body">${svg}</g></g>`;
    const gwrap = (g, svg) => `<g class="gbld" data-ghost="${g.key}" data-place="${g.key}" tabindex="0" aria-label="${esc(g.label)}, ${esc(g.sub)}"><g class="body">${svg}</g></g>`;
    const shade = (b) => shadowLayer.push(shadowOf(b));
    // Empreinte lumineuse au sol (survol) et, si le lieu attend une action, anneau et faisceau
    const foot = (key, b, col, beam) => {
      const m = 0.22, [cx, cy] = P(b.x + b.w / 2, b.y + b.d / 2), r = (b.w + b.d) * 0.5 + 0.35;
      glowLayer.push(`<g class="foot" data-foot="${key}" style="--pc:${col}">${flat(b.x - m, b.y - m, b.w + 2 * m, b.d + 2 * m, col)}</g>`);
      if (!beam) return;
      glowLayer.push(`<g class="ring" style="--pc:${col}"><ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(r * 32).toFixed(1)}" ry="${(r * 16).toFixed(1)}"/><ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(r * 32).toFixed(1)}" ry="${(r * 16).toFixed(1)}" style="animation-delay:-1.3s"/></g>`);
      const bw = Math.max(34, (b.w + b.d) * 22), top = P(b.x + b.w / 2, b.y + b.d / 2, b.h)[1];
      const gid = 'beam-' + key;
      beams.push({ d: b.x + b.w / 2 + b.y + b.d / 2 + 0.05, svg: `<g class="beam"><linearGradient id="${gid}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${col}" stop-opacity="0.8"/><stop offset="0.4" stop-color="${col}" stop-opacity="0.3"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient><rect x="${(cx - bw / 2).toFixed(1)}" y="40" width="${bw.toFixed(1)}" height="${(top - 40 + 10).toFixed(1)}" fill="url(#${gid})"/><rect x="${(cx - bw / 6).toFixed(1)}" y="40" width="${(bw / 3).toFixed(1)}" height="${(top - 40 + 6).toFixed(1)}" fill="url(#${gid})" class="core"/></g>` });
    };
    const beams = [];

    // Salle
    const ar = { x: 7, y: 7.6, w: 3.4, d: 2.8, h: 40, c: 'var(--court)' };
    shade(ar);
    const roof = { x: 7.3, y: 7.9, w: 2.8, d: 2.2, h: 7, z: 40, c: 'var(--court)' };
    let arena = isoBox(ar)
      + poly([P(7, 10.4, 32), P(10.4, 10.4, 32), P(10.4, 10.4, 39), P(7, 10.4, 39)], 'var(--iso-glass)', 'fill-opacity="0.85"')
      + winR(ar, 2, 7, WIN, 0.55)
      + isoBox(roof) + parapet(roof)
      + [0.5, 1.1, 1.7, 2.3].map((k) => poly([P(7.55, 7.9 + k, 47.1), P(9.85, 7.9 + k, 47.1), P(9.85, 8.15 + k, 47.1), P(7.55, 8.15 + k, 47.1)], 'var(--iso-glass)', 'fill-opacity="0.8"')).join('')
      + unit(9.6, 8.1, 47) + unit(7.5, 8.2, 47, 0.8)
      + poly([P(7.2, 10.4, 12), P(10.2, 10.4, 12), P(10.2, 10.4, 29), P(7.2, 10.4, 29)], t.color, EDGE)
      + arenaName((t.city + ' HB').toUpperCase())
      + door(8.1, 9.1, 10.4, 10) + `<line x1="${P(8.6, 10.4, 0)[0]}" y1="${P(8.6, 10.4, 0)[1]}" x2="${P(8.6, 10.4, 10)[0]}" y2="${P(8.6, 10.4, 10)[1]}" stroke="var(--iso-glass)" stroke-width="0.8"/>`
      + isoBox({ x: 7.9, y: 10.4, w: 1.4, d: 0.42, h: 1.6, z: 10.5, c: 'var(--iso-stone)' });
    add(ar.x + ar.w / 2, ar.y + ar.d / 2, bwrap(pl.salle, arena)); foot('salle', ar, pl.salle.c, pl.salle.beam);
    for (const [n, [k, col]] of [[9.7, t.color], [10.0, 'var(--iso-mark)'], [10.3, t.color]].entries()) {
      const [bx, by] = P(6.6, k, 0), [tx, ty] = P(6.6, k, 30);
      add(6.6, k, `<g class="deco"><line x1="${bx}" y1="${by}" x2="${tx}" y2="${ty}" stroke="var(--iso-pole)" stroke-width="1.2"/><g class="flag" style="animation-delay:${-n * 0.7}s">${poly([P(6.6, k, 30), P(6.6, k - 0.3, 30), P(6.6, k - 0.3, 24), P(6.6, k, 24)], col, EDGE)}</g></g>`);
    }
    // Vestiaire
    const ve = { x: 10.55, y: 8.1, w: 1.3, d: 1.9, h: 22, c: 'var(--accent)' };
    shade(ve);
    foot('vestiaire', ve, pl.vestiaire.c, pl.vestiaire.beam);
    add(ve.x + ve.w / 2, ve.y + ve.d / 2, bwrap(pl.vestiaire, isoBox(ve) + parapet(ve) + winL(ve, 1, 2, WIN) + winR(ve, 1, 3, WIN, 0.6) + door(11.0, 11.4, 10, 9) + unit(11.2, 8.4, 22, 0.8)
      + isoBox({ x: 10.9, y: 10, w: 0.6, d: 0.25, h: 1.2, z: 9.5, c: 'var(--iso-stone)' })));
    // Gymnase
    const gy = { x: 7, y: 1, w: 2.8, d: 2.2, h: 30, c: 'var(--iso-gym)' };
    shade(gy);
    let gym = isoBox(gy) + winL(gy, 1, 5, WIN) + winR(gy, 1, 4, WIN, 0.6) + gable(gy, 12, 'var(--iso-gym)')
      + door(8.05, 8.75, 3.2, 10) + isoBox({ x: 7.95, y: 3.2, w: 0.9, d: 0.35, h: 1.4, z: 10.5, c: 'var(--iso-stone)' });
    for (const k of [0.4, 1.2, 2.0]) gym += poly([P(7 + k, 2.1 + 0.05, 30 + 11), P(7 + k + 0.5, 2.1 + 0.05, 30 + 11), P(7 + k + 0.5, 2.85, 30 + 3), P(7 + k, 2.85, 30 + 3)], 'var(--iso-glass)', 'fill-opacity="0.85"');
    add(gy.x + gy.w / 2, gy.y + gy.d / 2, bwrap(pl.gymnase, gym)); foot('gymnase', Object.assign({}, gy, { h: 42 }), pl.gymnase.c, pl.gymnase.beam);
    // Bureau du coach
    const bu = { x: 10.3, y: 1.2, w: 1.3, d: 1.3, h: 56, c: 'var(--iso-office)' };
    shade(bu);
    foot('bureau', bu, pl.bureau.c, pl.bureau.beam);
    add(bu.x + bu.w / 2, bu.y + bu.d / 2, bwrap(pl.bureau, isoBox(bu) + parapet(bu) + winL(bu, 6, 2, WIN) + winR(bu, 6, 2, WIN, 0.6) + door(10.75, 11.15, 2.5, 8) + unit(10.45, 1.35, 56) + unit(11.0, 1.8, 56, 0.7)
      + `<line x1="${P(11.25, 1.45, 56)[0]}" y1="${P(11.25, 1.45, 56)[1]}" x2="${P(11.25, 1.45, 72)[0]}" y2="${P(11.25, 1.45, 72)[1]}" stroke="var(--iso-pole)" stroke-width="1.2"/><circle cx="${P(11.25, 1.45, 72)[0]}" cy="${P(11.25, 1.45, 72)[1]}" r="1.6" fill="var(--bad)"/>`));
    // Kiosque
    const ki = { x: 1.6, y: 8.3, w: 1.1, d: 1.0, h: 15, c: 'var(--iso-press)' };
    shade(ki);
    let kio = isoBox(ki) + poly([P(1.75, 9.3, 4), P(2.55, 9.3, 4), P(2.55, 9.3, 11), P(1.75, 9.3, 11)], WIN, 'fill-opacity="0.9"') + gable(ki, 10, 'var(--iso-press)');
    for (let k = 0; k < 5; k++) { const x0 = 1.6 + k * 0.22; kio += poly([P(x0, 9.3, 12), P(x0 + 0.22, 9.3, 12), P(x0 + 0.22, 9.62, 8.5), P(x0, 9.62, 8.5)], k % 2 ? 'var(--iso-mark)' : 'var(--iso-press)', EDGE); }
    kio += isoBox({ x: 2.75, y: 8.95, w: 0.25, d: 0.32, h: 6, c: 'var(--iso-stone)' }) + poly([P(3, 8.98, 2), P(3, 9.24, 2), P(3, 9.24, 5), P(3, 8.98, 5)], WIN, 'fill-opacity="0.8"');
    add(ki.x + ki.w / 2, ki.y + ki.d / 2, bwrap(pl.kiosque, kio)); foot('kiosque', Object.assign({}, ki, { h: 25 }), pl.kiosque.c, pl.kiosque.beam);
    // Centre de formation
    const fo = { x: 7, y: 4.3, w: 3.2, d: 1.3, h: 18, c: 'var(--iso-youth)' };
    shade(fo);
    foot('formation', fo, pl.formation.c, pl.formation.beam);
    add(8.6, 4.95, bwrap(pl.formation, isoBox(fo) + parapet(fo) + winL(fo, 1, 6, WIN, 0.8) + winR(fo, 1, 2, WIN, 0.6) + door(8.4, 8.9, 5.6, 8) + unit(7.3, 4.5, 18) + unit(9.6, 4.6, 18, 0.8)));
    for (const [gx, gy2] of [[10.45, 3.35], [11.6, 3.35]]) add(gx, gy2, isoBox({ x: gx, y: gy2, w: 0.12, d: 0.3, h: 4, c: 'var(--iso-mark)' }));

    // Club house des supporters : bannière aux couleurs du club, buvette en façade, une table en terrasse
    {
      const ch = { x: 3.05, y: 7.35, w: 1.65, d: 1.4, h: 21, c: 'var(--iso-club)' };
      shade(ch);
      const fy = ch.y + ch.d;
      // Nom des supporters sur deux lignes équilibrées (coupure aux espaces et après les traits d'union)
      const words = H.fansOf(t).name.toUpperCase().split(/(?<=-)|\s+/).filter(Boolean);
      const join = (ws) => ws.join(' ').replace(/- /g, '-');
      let lines = [join(words)];
      for (let k = 1; k < words.length; k++) { const c = [join(words.slice(0, k)), join(words.slice(k))]; if (Math.max(...c.map((l) => l.length)) < Math.max(...lines.map((l) => l.length))) lines = c; }
      const bx0 = ch.x + 0.1, bx1 = ch.x + ch.w - 0.1, z0 = 9.6, z1 = 20.3;
      const fs = Math.min(5, ((bx1 - bx0) * 35.8 - 5) / (Math.max(...lines.map((l) => l.length)) * 0.7));
      let club = isoBox(ch) + parapet(ch) + winR(ch, 2, 2, WIN, 0.6) + unit(ch.x + 0.2, ch.y + 0.25, ch.h, 0.8)
        // Bannière : couleur du club, liserés de contraste, nom des supporters
        + poly([P(bx0, fy, z0), P(bx1, fy, z0), P(bx1, fy, z1), P(bx0, fy, z1)], t.color, EDGE)
        + poly([P(bx0, fy, z0), P(bx1, fy, z0), P(bx1, fy, z0 + 0.8), P(bx0, fy, z0 + 0.8)], t.color2)
        + poly([P(bx0, fy, z1 - 0.8), P(bx1, fy, z1 - 0.8), P(bx1, fy, z1), P(bx0, fy, z1)], t.color2)
        + lines.map((l, k) => skewText(bx0 + 0.06, fy, lines.length > 1 ? (k ? z0 + 1.3 : z1 - 1 - fs * 0.75) : (z0 + z1) / 2 - fs * 0.37, l, fs, '#fff')).join('');
      // Buvette en façade : comptoir éclairé, auvent rayé, enseigne
      club += poly([P(ch.x + 0.25, fy, 2.6), P(ch.x + 1.1, fy, 2.6), P(ch.x + 1.1, fy, 6.4), P(ch.x + 0.25, fy, 6.4)], 'var(--iso-lamp)', 'fill-opacity="0.85"')
        + poly([P(ch.x + 0.2, fy, 2.2), P(ch.x + 1.15, fy, 2.2), P(ch.x + 1.15, fy, 3), P(ch.x + 0.2, fy, 3)], 'var(--iso-stone)', EDGE)
        + door(ch.x + 1.25, ch.x + 1.5, fy, 7);
      for (let k = 0; k < 5; k++) { const x0 = ch.x + 0.2 + k * 0.19; club += poly([P(x0, fy, 8.6), P(x0 + 0.19, fy, 8.6), P(x0 + 0.19, fy + 0.1, 8), P(x0, fy + 0.1, 8)], k % 2 ? '#f4f4f4' : t.color, EDGE); }
      club += skewText(ch.x + 0.34, fy, 3.4, 'BUVETTE', 2.6, '#3a2a20');
      // Terrasse : table haute et parasol aux couleurs du club
      { const [tx, ty] = P(4.45, 9.3, 0), [px, py] = P(4.45, 9.3, 12);
        club += `<line x1="${tx.toFixed(1)}" y1="${ty.toFixed(1)}" x2="${px.toFixed(1)}" y2="${py.toFixed(1)}" stroke="var(--iso-pole)" stroke-width="0.9"/><ellipse cx="${tx.toFixed(1)}" cy="${(ty - 4.5).toFixed(1)}" rx="3" ry="1.4" fill="var(--iso-stone)" ${EDGE}/><path d="M${(px - 8).toFixed(1)} ${(py + 3).toFixed(1)} Q${px.toFixed(1)} ${(py - 4).toFixed(1)} ${(px + 8).toFixed(1)} ${(py + 3).toFixed(1)} Z" fill="${t.color2}" ${EDGE}/>`; }
      add(ch.x + ch.w / 2, ch.y + ch.d / 2 + 0.3, bwrap(pl.clubhouse, club)); foot('clubhouse', ch, pl.clubhouse.c, pl.clubhouse.beam);
      { const [gx, gy] = P(4.6, 9.0, 0);
        add(4.6, 9.0, `<g class="deco bbq" transform="translate(${gx.toFixed(1)} ${gy.toFixed(1)})">
          <ellipse cx="0" cy="0.5" rx="5" ry="2.2" fill="#000" fill-opacity="0.18"/>
          <path d="M-3 -5 L-4 0.5 M3 -5 L4 0.5 M0 -4 L0 1.5" stroke="var(--iso-pole)" stroke-width="0.9" stroke-linecap="round"/>
          <path d="M-5 -7 A5 3.4 0 0 0 5 -7 Z" fill="#2b2d30"/>
          <ellipse cx="0" cy="-7" rx="5" ry="2.1" fill="#3a2420"/>
          <ellipse class="ember" cx="0" cy="-7" rx="4.2" ry="1.6" fill="#d8643c"/>
          <path d="M-3.8 -7.6 H3.8 M-4 -6.4 H4" stroke="#9aa0a6" stroke-width="0.4"/>
          <rect x="-3" y="-8.2" width="3" height="1.1" rx="0.55" fill="#8a4b2a"/><rect x="0.6" y="-7.4" width="3" height="1.1" rx="0.55" fill="#9a5530"/>
          <circle class="glow ember-glow" cx="0" cy="-8" r="7" fill="#f2a066" opacity="0.18"/>
          ${[0, 1.4, 2.8].map((dl) => `<circle class="smoke bbq-smoke" cx="0" cy="-10" r="1.8" style="animation-delay:${-dl}s"/>`).join('')}
        </g>`); }
    }
    // Bâtiments grisés à venir
    const gh = Object.fromEntries(GHOSTS.map((g) => [g.key, g]));
    const si = { x: 1, y: 1, w: 1.6, d: 1.6, h: 62, c: 'var(--iso-hq)' };
    shade(si);
    foot('siege', si, pl.siege.c, pl.siege.beam);
    add(1.8, 1.8, bwrap(pl.siege, isoBox(si) + parapet(si) + winL(si, 7, 3, WIN, 0.4) + winR(si, 7, 3, WIN, 0.35) + door(1.6, 2.0, 2.6, 8) + unit(1.2, 1.2, 62) + unit(2.0, 1.9, 62, 0.8)
      + isoBox({ x: 1.5, y: 1.5, w: 0.6, d: 0.6, h: 6, z: 62, c: 'var(--iso-hq)' })));
    const inf = { x: 3.2, y: 9.6, w: 1.3, d: 1.3, h: 24, c: 'var(--iso-med)' };
    shade(inf);
    foot('infirmerie', inf, pl.infirmerie.c, pl.infirmerie.beam);
    add(3.85, 10.25, bwrap(pl.infirmerie, isoBox(inf) + parapet(inf) + winR(inf, 2, 2, WIN, 0.35) + door(3.3, 3.6, 10.9, 8)
      // Croix d'hôpital dressée sur le toit
      // Croix d'hôpital peinte à plat sur le toit
      + (() => { const cx = 3.85, cy = 10.25, L = 0.42, W = 0.14; return poly([[-W, -L], [W, -L], [W, -W], [L, -W], [L, W], [W, W], [W, L], [-W, L], [-W, W], [-L, W], [-L, -W], [-W, -W]].map(([dx, dy]) => P(cx + dx, cy + dy, 24)), 'var(--iso-cross)', EDGE); })()
      // Sirène sur le toit : verte si tout le monde est valide, rouge dès qu'un joueur est en soins
      + (() => { const n = t.players.filter(H.hurt).length, col = n ? 'var(--bad)' : 'var(--good)', [sx, sy] = P(3.5, 9.8, 26.2);
        return isoBox({ x: 3.39, y: 9.69, w: 0.22, d: 0.22, h: 2.2, z: 24, c: 'var(--iso-stone)' })
          + `<g class="siren${n ? ' alert' : ''}"><circle class="halo" cx="${sx.toFixed(1)}" cy="${(sy - 2.6).toFixed(1)}" r="9" fill="${col}"/><path d="M${(sx - 3.6).toFixed(1)} ${sy.toFixed(1)} A3.6 4.6 0 0 1 ${(sx + 3.6).toFixed(1)} ${sy.toFixed(1)} Z" fill="${col}" stroke="var(--iso-edge)" stroke-width="0.6"/><circle cx="${(sx - 1.1).toFixed(1)}" cy="${(sy - 2.8).toFixed(1)}" r="0.9" fill="#fff" opacity="0.7"/></g>`; })()));
    const bo = { x: 7.2, y: 11.0, w: 1.6, d: 0.8, h: 15, c: G1 };
    shade(bo);
    let shop = isoBox(bo) + parapet(bo) + winL(bo, 1, 3, WIN, 0.4);
    for (let k = 0; k < 6; k++) { const x0 = 7.2 + k * 0.267; shop += poly([P(x0, 11.8, 11), P(x0 + 0.267, 11.8, 11), P(x0 + 0.267, 12, 8.5), P(x0, 12, 8.5)], k % 2 ? 'var(--iso-mark)' : 'var(--iso-roof)', EDGE); }
    add(8, 11.4, gwrap(gh.boutique, shop)); foot('boutique', bo, 'var(--muted)', false);

    // Décor : immeubles, maisons
    const deco = [
      { x: 3, y: 1, w: 1.4, d: 2.2, h: 44, win: [5, 2, 4, 3], units: 2 }, { x: 0.8, y: 3.6, w: 2.2, d: 1.4, h: 30, win: [3, 4, 3, 2], units: 1 },
      { x: 3.4, y: 4, w: 1.2, d: 1.2, h: 52, win: [6, 2, 6, 2], units: 1 }, 
      { x: 10.8, y: 4.4, w: 1, d: 0.9, h: 13, roof: 9, house: true }, { x: 3.5, y: 11.2, w: 0.9, d: 0.6, h: 11, roof: 8, house: true },
      { x: 0.5, y: 7.4, w: 0.9, d: 0.8, h: 12, roof: 8, house: true }
    ];
    for (const b of deco) {
      const bb = Object.assign({ c: G1 }, b);
      shade(bb);
      let s = isoBox(bb);
      if (b.win) s += parapet(bb) + winL(bb, b.win[0], b.win[1], WIN, 0.38) + winR(bb, b.win[2], b.win[3], WIN, 0.3) + door(b.x + b.w / 2 - 0.15, b.x + b.w / 2 + 0.15, b.y + b.d, 7);
      if (b.units) { s += unit(b.x + 0.15, b.y + 0.2, b.h); if (b.units > 1) s += unit(b.x + b.w - 0.5, b.y + b.d - 0.5, b.h, 0.8); }
      if (b.roof) {
        s += winL(bb, 1, 2, WIN, 0.4) + gable(bb, b.roof, 'var(--iso-roof)') + isoBox({ x: b.x + b.w * 0.65, y: b.y + 0.15, w: 0.12, d: 0.12, h: 7, z: b.h + 2, c: 'var(--iso-roof)' });
        const [sx, sy] = P(b.x + b.w * 0.65 + 0.06, b.y + 0.21, b.h + 9.5), d0 = (b.x * 1.7 + b.y) % 4;
        s += [0, 1.6, 3.2].map((dl) => `<circle class="smoke" cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="1.6" style="animation-delay:${-(d0 + dl).toFixed(1)}s"/>`).join('');
      }
      add(b.x + b.w / 2, b.y + b.d / 2, `<g class="deco">${s}</g>`);
    }
    // Végétation, mobilier, voitures
    const trees = [[4.6, 0.5, 1], [0.4, 0.5, 0.9], [0.4, 5.4, 0.85], [4.7, 5.4, 0.9], [6.6, 0.6, 1], [11.6, 0.5, 0.9], [11.5, 5.5, 0.95], [6.5, 5.6, 0.85], [2.6, 7.4, 0.9], [4.7, 11.4, 1], [6.5, 11.5, 0.9], [6.5, 7.5, 0.95], [11.6, 7.4, 0.9], [0.4, 9.2, 0.85], [2.65, 5.45, 0.8]];
    for (const [x, y, s] of trees) add(x, y, `<g class="deco">${tree(x, y, s)}</g>`);
    for (const [x, y, s] of [[4.6, 2.9, 0.9], [0.35, 2.6, 1], [4.65, 10.2, 0.85], [11.75, 6.2, 0.8], [6.45, 3.6, 0.85]]) add(x, y, `<g class="deco">${conifer(x, y, s)}</g>`);
    for (const [x, y] of [[6.75, 10.65], [7.4, 10.65], [9.7, 10.65], [10.3, 10.65], [1.45, 7.6], [0.9, 8.6], [2.85, 3.3]]) add(x, y, `<g class="deco">${bush(x, y)}</g>`);
    for (const [x, y] of [[4.88, 1.6], [4.88, 4.4], [4.88, 8.6], [4.88, 11.1], [6.1, 3.0], [6.1, 9.4], [2.4, 5.9], [9.8, 5.92], [2.4, 7.05], [9.8, 7.06]]) add(x, y, `<g class="deco">${lamp(x, y)}</g>`);
    for (const [x, y] of [[1.0, 5.8], [2.1, 5.8], [8.2, 3.95]]) add(x, y, `<g class="deco">${bench(x, y)}</g>`);
    const cols = ['#c0392b', '#2e86c1', '#f1c40f', '#ecf0f1', '#34495e', '#16a085', '#8e44ad'];
    for (const [x, y, a, c] of [[9.55, 10.95, 'y', 4], [10.45, 10.95, 'y', 5], [11.35, 10.95, 'y', 6]]) add(x + 0.2, y + 0.2, `<g class="deco">${car(x, y, a, cols[c])}</g>`);
    // Buts du terrain de quartier
    for (const g of U.courtGoals || []) {
      const ln = (a, b, c) => `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${c}" stroke-width="1.3" stroke-linecap="round"/>`;
      const back = g.gx + g.d * 0.05, h = 5;
      const a1 = P(g.gx, g.gy - g.w, 0), a2 = P(g.gx, g.gy - g.w, h), b1 = P(g.gx, g.gy + g.w, 0), b2 = P(g.gx, g.gy + g.w, h);
      const net = poly([P(g.gx, g.gy - g.w, h), P(back, g.gy - g.w, h * 0.6), P(back, g.gy + g.w, h * 0.6), P(g.gx, g.gy + g.w, h)], 'var(--iso-mark)', 'fill-opacity="0.3"') + poly([P(back, g.gy - g.w, 0), P(back, g.gy + g.w, 0), P(back, g.gy + g.w, h * 0.6), P(back, g.gy - g.w, h * 0.6)], 'var(--iso-mark)', 'fill-opacity="0.25"');
      add(g.gx + 0.01, g.gy, `<g class="deco">${net}${ln(a1, a2, 'var(--iso-press)')}${ln(b1, b2, 'var(--iso-press)')}${ln(a2, b2, 'var(--iso-mark)')}</g>`);
    }
    // Car de l'équipe, garé devant la salle
    {
      const bus = { x: 5.42, y: 9.6, w: 0.38, d: 1.45, h: 10, c: t.color };
      shade(bus);
      let s = isoBox(bus)
        + poly([P(bus.x + bus.w, bus.y + 0.12, 5.5), P(bus.x + bus.w, bus.y + bus.d - 0.12, 5.5), P(bus.x + bus.w, bus.y + bus.d - 0.12, 8.6), P(bus.x + bus.w, bus.y + 0.12, 8.6)], 'var(--iso-glass)', 'fill-opacity="0.95"')
        + poly([P(bus.x + bus.w, bus.y + 0.12, 3.2), P(bus.x + bus.w, bus.y + bus.d - 0.12, 3.2), P(bus.x + bus.w, bus.y + bus.d - 0.12, 4.3), P(bus.x + bus.w, bus.y + 0.12, 4.3)], '#ffffff', 'fill-opacity="0.85"')
        + poly([P(bus.x + 0.04, bus.y + bus.d, 5), P(bus.x + bus.w - 0.04, bus.y + bus.d, 5), P(bus.x + bus.w - 0.04, bus.y + bus.d, 8.8), P(bus.x + 0.04, bus.y + bus.d, 8.8)], 'var(--iso-glass)')
        + isoBox({ x: bus.x + 0.06, y: bus.y + 0.25, w: 0.26, d: 0.4, h: 0.8, z: 10, c: 'var(--iso-unit)' });
      for (const k of [0.25, 1.15]) { const [wx, wy] = P(bus.x + bus.w, bus.y + k, 0.8); s += `<ellipse cx="${wx.toFixed(1)}" cy="${wy.toFixed(1)}" rx="2.2" ry="2.6" fill="#1d1f22"/>`; }
      add(bus.x + bus.w / 2 + 0.2, bus.y + bus.d / 2 + 0.2, `<g class="deco">${s}</g>`);
    }
    // Clins d'œil : chat, pigeon, résine, panneau Beyond9M, affiche 1995, voyant du bureau
    { const [cx, cy] = P(11.05, 8.7, 22);
      objs.push({ d: 20.3, svg: prop(`<g transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)})"><ellipse cx="0" cy="-2.6" rx="3.6" ry="2.3" fill="#2a2a2a"/><circle cx="3.2" cy="-5" r="1.9" fill="#2a2a2a"/><path d="M2 -6.3 L2.4 -8.4 L3.4 -6.7 Z M3.6 -6.7 L4.6 -8.4 L4.9 -6.2 Z" fill="#2a2a2a"/><path d="M-3.4 -2.6 C -6 -3, -6.2 -6.5, -4.8 -7.4" stroke="#2a2a2a" stroke-width="1.1" fill="none" stroke-linecap="round"/><circle cx="3.9" cy="-5.2" r="0.35" fill="#f6c453"/></g>`) }); }
    { const [cx, cy] = P(2.15, 8.8, 25);
      objs.push({ d: 11, svg: prop(`<g transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)})"><ellipse cx="0" cy="-2" rx="2.6" ry="1.7" fill="#8f98a3"/><circle cx="2.2" cy="-3.6" r="1.2" fill="#6f7882"/><path d="M3.2 -3.6 L4.4 -3.3 L3.2 -3.1 Z" fill="#e0a34a"/><path d="M-2.4 -2 L-4.2 -1.2 L-2.4 -1.3 Z" fill="#6f7882"/></g>`) }); }
    objs.push({ d: 12.7, svg: prop(isoBox({ x: 9.0, y: 3.45, w: 0.16, d: 0.16, h: 2.4, c: '#e8c547' }) + isoBox({ x: 8.99, y: 3.44, w: 0.18, d: 0.18, h: 0.5, z: 2.4, c: '#c94f3d' })) });
    objs.push({ d: 8.7, svg: prop(poly([P(3.48, 5.2, 25), P(4.52, 5.2, 25), P(4.52, 5.2, 46), P(3.48, 5.2, 46)], '#121417', EDGE) + skewText(3.55, 5.2, 37.5, 'BEYOND', 7, '#ffffff') + skewText(3.75, 5.2, 28.5, '9M', 8, '#e8c547')) });
    objs.push({ d: 11.9, svg: prop(poly([P(3.55, 8.3, 3.5), P(3.68, 8.3, 3.5), P(3.68, 8.3, 9), P(3.55, 8.3, 9)], '#2b4fa0') + poly([P(3.68, 8.3, 3.5), P(3.81, 8.3, 3.5), P(3.81, 8.3, 9), P(3.68, 8.3, 9)], '#f4f4f4') + poly([P(3.81, 8.3, 3.5), P(3.94, 8.3, 3.5), P(3.94, 8.3, 9), P(3.81, 8.3, 9)], '#c8453b') + skewText(3.57, 8.3, 7.4, '95', 3.2, '#111')) });
    { const [lx, ly] = P(11.25, 1.45, 72);
      objs.push({ d: 12.9, svg: prop(`<circle class="blink" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.6" fill="#ef5b4c"/>`) }); }
    objs.push(...beams);
    objs.sort((a, b) => a.d - b.d);
    // Circulation : deux voies par avenue, dans les deux sens, à des rythmes différents
    const drive = (x0, y0, x1, y1, along, col, dur, dl) => {
      const [ax, ay] = P(x0, y0), [bx, by] = P(x1, y1);
      moveLayer.push(`<g class="drive" style="--dx:${(bx - ax).toFixed(1)}px;--dy:${(by - ay).toFixed(1)}px;animation-duration:${dur}s;animation-delay:${dl}s">${car(x0, y0, along, col)}</g>`);
    };
    drive(0.15, 6.62, 11.4, 6.62, 'x', cols[3], 17, -2); drive(11.4, 6.14, 0.15, 6.14, 'x', cols[0], 21, -11);
    drive(5.14, 11.4, 5.14, 0.15, 'y', cols[2], 22, -15); drive(5.14, 11.4, 5.14, 0.15, 'y', cols[1], 22, -4);
    drive(0.15, 6.62, 11.4, 6.62, 'x', t.color, 26, -19);
    // Passants sur les trottoirs (un ou deux aux couleurs du club)
    const walker = (x0, y0, x1, y1, col, dur, dl) => {
      const [ax, ay] = P(x0, y0), [bx, by] = P(x1, y1);
      return `<g class="walk" style="--dx:${(bx - ax).toFixed(1)}px;--dy:${(by - ay).toFixed(1)}px;animation-duration:${dur}s;animation-delay:${dl}s"><g transform="translate(${ax.toFixed(1)} ${ay.toFixed(1)})"><ellipse cx="0" cy="0" rx="2.4" ry="1.1" fill="#000" fill-opacity="0.25"/><g class="bob"><rect x="-1.5" y="-6.4" width="3" height="5" rx="1.3" fill="${col}"/><circle cx="0" cy="-8.1" r="1.55" fill="#e8c7a8"/></g></g></g>`;
    };
    moveLayer.push(walker(4.9, 0.4, 4.9, 5.5, t.color, 26, -4), walker(6.09, 11.6, 6.09, 7.4, '#d6dbdf', 22, -9), walker(0.5, 5.9, 4.6, 5.9, '#7fb6d6', 20, -3),
      walker(11.5, 7.08, 7.4, 7.08, t.color2 && t.color2.toLowerCase() !== '#ffffff' ? t.color2 : '#c9a7a0', 24, -14), walker(6.09, 0.4, 6.09, 5.4, '#a6b8ab', 28, -20));

    const signs = places.map((p) => citySign(p, false)).join('') + GHOSTS.map((g) => citySign(g, true)).join('');
    const sel = (k, g) => `.city:has([data-place="${k}"]:hover) [data-${g ? 'g' : 'p'}sign="${k}"], .city:has([data-place="${k}"]:focus-visible) [data-${g ? 'g' : 'p'}sign="${k}"]`;
    const fsel = (k) => `.city:has([data-place="${k}"]:hover) [data-foot="${k}"], .city:has([data-place="${k}"]:focus-visible) [data-foot="${k}"]`;
    const css = GHOSTS.map((g) => sel(g.key, true)).concat(places.map((p) => sel(p.key))).join(',') + '{opacity:1;transform:none}'
      + GHOSTS.concat(places).map((p) => fsel(p.key)).join(',') + '{opacity:1}';
    U.cityCards = Object.fromEntries(places.concat(GHOSTS).map((p) => [p.key, cityCardHtml(p)]));
    const ob = objs.map((o) => o.svg).join('');
    const defs = `<defs>
      <linearGradient id="isoL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.07"/><stop offset="0.55" stop-color="#000" stop-opacity="0.1"/><stop offset="1" stop-color="#000" stop-opacity="0.34"/></linearGradient>
      <linearGradient id="isoR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.2"/><stop offset="1" stop-color="#000" stop-opacity="0.48"/></linearGradient>
      <linearGradient id="isoT" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.3"/><stop offset="1" stop-color="#fff" stop-opacity="0.1"/></linearGradient>
      <radialGradient id="groundV" cx="0.5" cy="0.45" r="0.6"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.32"/></radialGradient>
      <radialGradient id="skyG" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="var(--iso-sky)" stop-opacity="1"/><stop offset="1" stop-color="var(--iso-sky)" stop-opacity="0"/></radialGradient>
      <filter id="softSh" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.2"/></filter>
      <filter id="beamBlur" x="-50%" y="-5%" width="200%" height="110%"><feGaussianBlur stdDeviation="5"/></filter>
    </defs>`;
    const [gcx, gcy] = P(6, 6);
    const ground = poly([P(0, 0), P(12, 0), P(12, 12), P(0, 12)], 'url(#groundV)');
    return `<svg class="city" viewBox="${CITY_VB.join(' ')}" role="group" aria-label="Plan de la ville du club">${defs}<style>${css}</style>
      <ellipse cx="${gcx}" cy="${gcy + 20}" rx="470" ry="270" fill="url(#skyG)" class="sky"/><g class="cam">${flatLayer.join('')}<g class="shadows" filter="url(#softSh)">${shadowLayer.join('')}</g>${ground}<g class="glows">${glowLayer.join('')}</g><g class="moves">${moveLayer.join('')}</g>${ob}<g class="signs">${signs}</g></g></svg>`;
  }
  const CITY_VB = [40, 92, 780, 448];
  function cityOpts() {
    if (!U.cityOpt) { try { U.cityOpt = Object.assign({ lab: false, beam: true }, JSON.parse(localStorage.getItem('hbm-city') || '{}')); } catch (e) { U.cityOpt = { lab: false, beam: true }; } }
    return U.cityOpt;
  }
  // Pop-up du bâtiment survolé, posée à côté de lui dans le cadre du plan
  function cityCard(el) {
    const card = document.getElementById('citycard'), wrap = document.querySelector('.citywrap');
    if (!card || !wrap) return;
    if (!el) { card.classList.remove('show'); U.cardKey = null; return; }
    const key = el.dataset.place;
    if (U.cardKey !== key) { card.innerHTML = (U.cityCards || {})[key] || ''; U.cardKey = key; }
    const r = el.getBoundingClientRect(), wr = wrap.getBoundingClientRect(), cw = card.offsetWidth, ch = card.offsetHeight, gap = 16;
    let x = r.right - wr.left + gap, side = 'r';
    if (x + cw > wr.width - 12) { x = r.left - wr.left - cw - gap; side = 'l'; }
    x = Math.max(12, x);
    const y = Math.max(12, Math.min(wr.height - ch - 12, r.top - wr.top + r.height / 2 - ch / 2));
    card.style.left = x + 'px'; card.style.top = y + 'px'; card.dataset.side = side;
    card.classList.add('show');
  }
  function renderCity() {
    const t = me(), o = cityOpts(), pl = cityPlaces(), intro = U.lastTab !== 'ville';
    const nf = nextFixture(), hurt = t.players.filter(H.hurt).length, nFree = (G.free || []).length;
    const chips = [];
    if (G.youth) chips.push(['formation', 'Un jeune attend', 'youth']);
    if (G.trainPending && !(U.view === 'post' && U.post)) chips.push(['entrainement', 'Entraînement à lancer', 'warn']);
    if (hurt) chips.push(['infirmerie', `${hurt} blessé${hurt > 1 ? 's' : ''}`, 'bad']);
    if (nFree) chips.push(['libres', `${nFree} joueur${nFree > 1 ? 's' : ''} libre${nFree > 1 ? 's' : ''}`, '']);
    const games = teamGames(t.id), lg = games[0];
    const news = lg ? `J${lg.j} · ${{ w: 'victoire', d: 'nul', l: 'défaite' }[lg.r]} ${lg.us}–${lg.them} ${lg.home ? 'contre' : 'à'} ${esc(lg.o.name)}` : nf && !nf.rest ? `Ouverture de la saison : ${nf.h === t.id ? 'réception de' : 'déplacement à'} ${esc(T(nf.h === t.id ? nf.a : nf.h).name)}` : '';
    const sw = (id, lbl, on) => `<button class="cswitch" data-act="citytog" data-id="${id}" aria-pressed="${on}">${lbl}<i></i></button>`;
    return `<section class="citypanel"><div class="citywrap${intro ? ' intro' : ''}${o.lab ? ' labels' : ''}${o.beam ? '' : ' nobeam'}" style="--club:${t.color}">
      ${renderCityMap()}
      <div class="cityhud">
        <div class="cityhead"><h2>${esc(t.city)}</h2><span class="muted">La Cité du hand · ${pl.length} lieux · journée ${Math.min(G.round + 1, G.sched.length)} sur ${G.sched.length}</span>
          ${chips.length ? `<div class="cchips">${chips.map(([tab, txt, cls]) => `<button class="cchip ${cls}" data-act="tab" data-id="${tab}">${esc(txt)}</button>`).join('')}</div>` : ''}</div>
        ${news ? `<div class="citynews">${badge(lg ? lg.o : t, true)}<span>${news}</span></div>` : ''}
      </div>
      <div class="cityopts">${sw('lab', 'Étiquettes', o.lab)}${sw('beam', 'Faisceaux', o.beam)}</div>
      <div class="cityhint">Survole un bâtiment pour l'essentiel, clique pour y entrer</div>
      <div id="citycard" class="citycard" aria-hidden="true"></div>
    </div></section>`;
  }

  // ---------- Club house : les supporters ----------
  const BUVETTE = { PAR: 'jambon-beurre à 9 €', MTP: 'tielle sétoise', LYO: 'saucisson brioché', TLS: 'saucisse de Toulouse', NAN: 'petit-beurre trempé dans le muscadet', BDX: 'canelés', REN: 'galette-saucisse', MRS: 'panisses', LIL: 'fricadelle-frites', STR: 'bretzel', NCE: 'socca', STE: 'râpée', GRE: 'gratin en barquette', ANG: 'quernons d\'ardoise', DIJ: 'pain d\'épices', CLE: 'truffade' };
  function renderClubhouse() {
    const t = me(), f = H.fansOf(t), tip = fanTips(t);
    const rows = G.teams.slice().sort((a, b) => H.fansOf(b).h - H.fansOf(a).h || H.fansOf(b).a - H.fansOf(a).a || a.name.localeCompare(b.name, 'fr'));
    return `<div class="grid2">
      <section class="panel"><h3>Club house</h3>
        <div class="banner" style="background:${t.color};border-color:${t.color2}"><span>${esc(f.name)}</span></div>
        <div style="display:grid;gap:12px;margin-top:14px">
          <div class="opt"><span class="label">Ferveur à domicile</span><div class="row" style="gap:10px">${pips(f.h, tip.h, 'Ferveur à domicile')}<span>+${pctTxt(H.homeShot(t))} de réussite au tir à domicile.</span></div></div>
          <div class="opt"><span class="label">Supporters en déplacement</span><div class="row" style="gap:10px">${pips(f.a, tip.a, 'Supporters en déplacement')}<span>${H.awayCut(t) ? `Handicap du visiteur réduit de ${Math.round(H.awayCut(t) * 100)} % (pertes de balle, exclusions, fatigue du trajet).` : 'Personne ne fait le déplacement : tu subis tout le handicap du visiteur.'}</span></div></div>
          <div class="opt"><span class="label">À la buvette</span><p style="margin:0">Spécialité de la maison : ${esc(BUVETTE[t.id] || H.clubOf(t).buvette || 'merguez-frites')}.</p></div>
        </div>
        <p class="legend">Les supporters sont propres au club, les mêmes à chaque partie.</p></section>
      <section class="panel"><h3>Les tribunes de la ${LEAGUE}</h3><div class="scroll"><table><thead><tr><th>Club</th><th>Supporters</th><th title="Ferveur à domicile">Dom.</th><th title="Supporters en déplacement">Ext.</th></tr></thead><tbody>
        ${rows.map((o) => { const fo = H.fansOf(o), tp = fanTips(o); return `<tr${o.id === t.id ? ' class="me"' : ''}><td class="nw">${badge(o, true)} ${esc(o.name)}</td><td>${esc(fo.name)}</td><td>${pips(fo.h, tp.h, 'Ferveur à domicile')}</td><td>${pips(fo.a, tp.a, 'Supporters en déplacement')}</td></tr>`; }).join('')}
      </tbody></table></div><p class="legend">Au survol des pastilles, l'effet sur les matchs.</p></section></div>`;
  }

  // ---------- Infirmerie ----------
  function renderInfirmerie() {
    const t = me(), hurtP = t.players.filter(H.hurt).sort((a, b) => b.inj.n - a.inj.n);
    const frag = t.players.filter((p) => !H.hurt(p) && p.frag > 0);
    const log = (G.injLog || []).filter((x) => x.team === t.id).slice().reverse();
    const card = (p) => {
      const i = p.inj, ok = H.canRushBack(t, p), ask = U.rushAsk === p.id, done = Math.max(0, i.n0 - i.n);
      return `<div class="injcard"><div class="row" style="gap:8px"><span class="pos${p.pos === 'GB' ? ' gb' : ''}">${p.pos}</span>${plink(p)}<span class="muted" style="font-size:0.85rem" title="Robustesse ${p.a.robustesse} : ${robTxt(p.a.robustesse)}">${robTxt(p.a.robustesse).split(',')[0].replace(/^./, (c) => c.toUpperCase())}</span><span class="spacer" style="flex:1"></span><span class="tag sev ${i.sev}">${H.INJ_LABEL[i.sev]}</span></div>
        <p style="margin:6px 0 0">${esc(i.type)} <span class="muted">· ${i.ctx === 'train' ? "à l'entraînement" : 'en match'}, journée ${i.round}</span></p>
        <div class="row" style="gap:10px;margin-top:6px"><span class="injprog" title="${done} match${done > 1 ? 's' : ''} manqué${done > 1 ? 's' : ''} sur ${i.n0}"><span style="width:${(done / i.n0) * 100}%"></span></span><span>${absTxt(i.n)} · retour prévu à la journée ${G.round + i.n + 1}</span></div>
        ${ok ? (ask ? `<div class="opt injask"><p style="margin:0">Il rejoue dès le prochain match, mais reste fragile pendant ${i.n + 2} semaines : environ une chance sur quatre de rechute, plus longue que la blessure de départ.</p>
            <div class="row" style="margin-top:8px"><button class="btn primary" data-act="rushyes" data-id="${p.id}">Oui, il revient</button><button class="btn" data-act="rush" data-id="${p.id}">Annuler</button></div></div>`
          : `<div class="row" style="margin-top:8px"><button class="btn" data-act="rush" data-id="${p.id}">Le faire revenir plus tôt</button></div>`)
          : `<p class="legend" style="margin:8px 0 0">${{ grave: 'Blessure grave : le staff médical refuse tout retour anticipé.', rechute: 'Rechute : le staff médical le garde jusqu\'au bout.', effectif: `Pas de retour anticipé pour l'instant : en cas de rechute, il te resterait moins de ${H.MIN_FIELD} joueurs de champ valides (les joueurs déjà revenus plus tôt comptent comme fragiles).` }[H.rushBlock(t, p)]}</p>`}</div>`;
    };
    return `<div class="grid2">
      <section class="panel"><h3>En soins</h3><div style="display:grid;gap:12px">
        ${hurtP.length ? hurtP.map(card).join('') : '<p class="muted" style="margin:0">Personne à l\'infirmerie. Le kiné en profite pour ranger ses strappings.</p>'}
        ${frag.length ? `<div class="opt"><span class="label">Revenus plus tôt</span>${frag.map((p) => `<div class="row" style="gap:8px"><span class="pos${p.pos === 'GB' ? ' gb' : ''}">${p.pos}</span>${plink(p)}<span class="muted">fragile encore ${p.frag} semaine${p.frag > 1 ? 's' : ''}</span></div>`).join('')}</div>` : ''}
      </div></section>
      <div style="display:grid;gap:20px;min-width:0">
        <section class="panel"><h3>Blessures de la saison</h3>${log.length ? `<div class="scroll"><table><thead><tr><th class="r">J.</th><th>Joueur</th><th>Blessure</th><th class="r">Absence</th></tr></thead><tbody>${log.map((x) => `<tr><td class="r num">${x.round}</td><td class="nw"><span class="pos${x.pos === 'GB' ? ' gb' : ''}">${x.pos}</span> ${esc(short(x.name))}</td><td>${esc(x.type)}<span class="muted"> · ${x.ctx === 'train' ? 'entraînement' : 'match'}</span></td><td class="r num">${x.n} match${x.n > 1 ? 's' : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted" style="margin:0">Aucune blessure pour l\'instant.</p>'}</section>
        <section class="panel"><h3>Ce qui joue sur les blessures</h3><p style="margin:0">Chaque joueur a sa robustesse (colonne Rob. de l'effectif) : un joueur fragile se blesse environ quatre fois plus souvent qu'un joueur très solide. Un joueur fatigué se blesse aussi bien plus souvent, en match comme à l'entraînement : faire tourner l'effectif protège. En match, l'intensité, l'homme à homme et la défense agressive augmentent un peu le risque ; à l'entraînement, l'intensité Intense le double presque. Un blessé ne peut pas aller sur la feuille de match. Blessé en cours de match, il sort aussitôt et le meilleur du banc à son poste le remplace.${H.hasMod(t, 'soins+') ? ' Ton kiné aux mains de fée limite les blessures et raccourcit parfois les absences.' : H.hasMod(t, 'soins-') ? ' Ton kiné est à Ibiza : un peu plus de blessures, et des absences parfois plus longues.' : ''}</p></section>
      </div></div>`;
  }

  // ---------- Tactique ----------
  const COURT = `<svg viewBox="0 0 200 150" preserveAspectRatio="none" aria-hidden="true">
    <path d="M25 0 A60 60 0 0 0 85 60 L115 60 A60 60 0 0 0 175 0 Z" fill="var(--zone)" fill-opacity="0.92"/>
    <path d="M0 29.6 A90 90 0 0 0 85 90 L115 90 A90 90 0 0 0 200 29.6" fill="none" stroke="#fff" stroke-opacity="0.8" stroke-width="1" stroke-dasharray="4 3"/>
    <path d="M25 0 A60 60 0 0 0 85 60 L115 60 A60 60 0 0 0 175 0" fill="none" stroke="#fff" stroke-width="1.2"/>
    <line x1="95" y1="70" x2="105" y2="70" stroke="#fff" stroke-width="1.2"/>
    <rect x="85" y="0" width="30" height="3.5" fill="#fff"/>
    <line x1="0" y1="149.5" x2="200" y2="149.5" stroke="#fff" stroke-opacity="0.6" stroke-width="1"/>
  </svg>`;
  // Glisser-déposer de la composition : banc ⇄ tribune, et vers un poste du terrain
  function setLineup(t, pos, pid) {
    const p = t.players.find((x) => x.id === pid);
    if (!p || H.hurt(p) || (pos === 'GB') !== (p.pos === 'GB')) return false;
    const other = Object.keys(t.lineup).find((k) => k !== pos && t.lineup[k] === pid);
    if (other) t.lineup[other] = t.lineup[pos];
    t.out = (t.out || []).filter((x) => x !== pid);
    t.lineup[pos] = pid;
    return true;
  }
  function dropPlayer(pid, zone, targetId, pos) {
    const t = me();
    t.out = t.out || [];
    const P = (id) => t.players.find((x) => x.id === id);
    const p = P(pid);
    if (!p || H.hurt(p)) return;
    const starters = new Set(Object.values(t.lineup));
    const inOut = t.out.includes(pid);
    const slotOf = (id) => Object.keys(t.lineup).find((k) => t.lineup[k] === id);
    const tg = targetId && targetId !== pid ? P(targetId) : null;
    if (zone === 'slot') { const prev = t.lineup[pos]; if (!setLineup(t, pos, pid)) return false; if (inOut && prev && prev !== pid) t.out.push(prev); }
    // Titulaire posé sur un joueur précis du banc ou de la réserve : les deux s'échangent
    else if (starters.has(pid) && tg && !starters.has(tg.id) && (tg.pos === 'GB') === (p.pos === 'GB')) {
      const toOut = t.out.includes(tg.id);
      if (!setLineup(t, slotOf(pid), tg.id)) return false;
      if (toOut) t.out.push(pid);
    }
    else if ((zone === 'bench' || zone === 'tribune') && starters.has(pid)) setStatus(t, pid, zone === 'bench' ? 'B' : 'R');
    else if (zone === 'tribune' && !inOut && !starters.has(pid)) {
      let back = targetId && t.out.includes(targetId) ? targetId : null;
      if (!back) back = t.out.slice().sort((a, b) => (P(b).pos === p.pos) - (P(a).pos === p.pos) || P(b).ovr - P(a).ovr)[0];
      if (!back) return false;
      t.out = t.out.map((x) => x === back ? pid : x);
    } else if (zone === 'bench' && inOut) {
      const bench = t.players.filter((x) => !starters.has(x.id) && !t.out.includes(x.id) && !H.hurt(x));
      let go = targetId && bench.some((x) => x.id === targetId) ? targetId : null;
      if (!go) { const g = bench.slice().sort((a, b) => (b.pos === p.pos) - (a.pos === p.pos) || a.ovr - b.ovr)[0]; go = g && g.id; }
      if (!go) return false;
      t.out = t.out.map((x) => x === pid ? go : x);
    } else return false;
    H.ensureSheet(t);
    save();
    render();
    return true;
  }
  // Sélection par clics (souris ou doigt) : un joueur, puis sa destination. Même logique que le glisser-déposer.
  function pickClick(el) {
    const id = el.dataset.pick || null, zone = el.closest('[data-drop]'), z = zone ? zone.dataset.drop : null;
    if (!U.pick) { if (id) { U.pick = id; render(); } return; }
    if (id === U.pick) { U.pick = null; render(); return; }
    const t = me(), st = (x) => x && statusOf(t, t.players.find((q) => q.id === x));
    // Ligne du groupe, ou même zone que le joueur choisi (banc sur banc, réserve sur réserve) : on change de joueur choisi
    if (!z || (id && z !== 'slot' && st(id) === st(U.pick))) { U.pick = id; render(); return; }
    const pid = U.pick;
    U.pick = null;
    if (!dropPlayer(pid, z, id, el.dataset.pos || zone.dataset.pos)) { U.pick = pid; render(); notify('<span><b>Déplacement impossible</b><br>Un gardien ne va qu\'au poste de gardien, et un joueur de champ jamais dans les buts.</span>', false); }
  }
  function modsHtml() {
    const t = me();
    return `<div class="row" style="justify-content:space-between;align-items:flex-start;gap:12px"><h2 id="modstitle" style="margin:0">Bonus et malus du club</h2><button class="btn" data-act="modsclose" aria-label="Fermer">✕</button></div>
      <p class="muted" style="margin:6px 0 14px">Choisis au lancement de la saison, ils restent jusqu'au bout. Le staff t'en reparle dans ses conseils quand ils comptent pour ta tactique ou ton entraînement.</p>
      <div style="display:grid;gap:12px">${(t.mods || []).map((k) => `<div class="modline">${modChip(k, true)}</div>`).join('')}</div>
      <div class="row" style="margin-top:16px"><button class="btn primary" data-act="modsclose">Fermer</button></div>`;
  }
  function backStyleSummary(t) {
    const st = H.BACK_POS.map((pos) => ({ pos, p: t.players.find((x) => x.id === t.lineup[pos]) })).filter((x) => x.p);
    const custom = t.players.filter((p) => H.BACK_POS.includes(p.pos) && p.style).length;
    const forMatch = U.preStep === 2 ? t.players.filter((p) => H.BACK_POS.includes(p.pos) && p.matchStyle && p.matchStyle !== (p.style || 'equilibre')).length : 0;
    return `<div class="opt"><span class="label">Jeu des arrières</span>
      <div class="row" style="gap:6px">${st.map((x) => `<span class="chip"><span class="pos">${x.pos}</span>${esc(short(x.p.name))} · <b>${H.BACK_STYLES[H.backStyle(x.p)]}</b></span>`).join('')}</div>
      <div class="row" style="margin-top:4px"><button class="btn" data-act="bsopen">Régler le jeu des arrières</button><span class="muted" style="font-size:0.85rem">${forMatch ? `${forMatch} changement${forMatch > 1 ? 's' : ''} pour ce match` : custom ? `${custom} réglage${custom > 1 ? 's' : ''} personnalisé${custom > 1 ? 's' : ''}` : 'Équilibré pour tous'}</span></div></div>`;
  }
  function backStyleHtml(t) {
    const pre = U.preStep === 2;
    const backs = t.players.filter((p) => H.BACK_POS.includes(p.pos)).sort((a, b) => H.BACK_POS.indexOf(a.pos) - H.BACK_POS.indexOf(b.pos) || b.ovr - a.ovr);
    const starters = new Set(Object.values(t.lineup));
    return `<div class="row" style="justify-content:space-between;align-items:flex-start;gap:12px"><h2 id="bstitle" style="margin:0">Jeu des arrières</h2><button class="btn" data-act="bsclose" aria-label="Fermer">✕</button></div>
      <p class="muted" style="margin:6px 0 10px">${pre ? 'Choisis comment chaque arrière attaque pendant ce match. Au match suivant, chacun reprend son réglage habituel (onglet Tactique).' : 'Choisis comment chaque arrière attaque. Le réglage suit le joueur, même s\'il change de poste.'}</p>
      <div class="bstyles">${backs.map((p) => { const cur = H.backStyle(p);
        return `<div class="bsrow"><span class="bsname"><span class="pos">${p.pos}</span> ${plink(p, short(p.name))}${starters.has(p.id) ? ' <span class="tit" title="Titulaire">T</span>' : ''}<span class="bsnotes muted num" title="Tir de loin · tir à 6 m · duel">9 m ${p.a.tirLoin} · 6 m ${p.a.tirPres} · duel ${p.a.duel}</span></span>
          <span class="seg sm">${Object.entries(H.BACK_STYLES).map(([k, l]) => `<button data-act="${pre ? 'mstyle' : 'pstyle'}" data-id="${p.id}|${pre && k === (p.style || 'equilibre') ? '' : k}" aria-pressed="${cur === k}"${pre && k === (p.style || 'equilibre') ? ' title="Son réglage habituel"' : ''}>${l}</button>`).join('')}</span></div>`; }).join('')}</div>
      <p>De loin : il arme à 9 m (le moins efficace, peu de pertes ; à éviter face à de bons contreurs). Au contact : il perce à 6 m et provoque des 7 m et des exclusions, mais risque le passage en force face à de bons duellistes, et se fatigue un peu plus. Par défaut, tout le monde joue Équilibré. À toi de lire ses notes : un arrière dans son registre naturel gagne +3 % de réussite, à contre-emploi il en perd 2,5.</p>
      <div class="row" style="margin-top:12px"><button class="btn primary" data-act="bsclose">Valider</button><button class="btn" data-act="bsreset">Tout remettre en Équilibré</button></div>`;
  }
  function renderTactics() {
    H.ensureSheet(me());
    const t = me(), tac = t.tactic, r = tac.rules, fi = fitInfo(t);
    const nx = nextFixture(), oppNext = nx && !nx.rest ? T(nx.h === t.id ? nx.a : nx.h) : null;
    const sel = (rule, field, opts, cur, fmt) => `<select class="rsel" data-rule="${rule}" data-field="${field}" aria-label="${rule} ${field}">${opts.map((o) => `<option value="${o}" ${String(o) === String(cur) ? 'selected' : ''}>${fmt ? fmt(o) : o}</option>`).join('')}</select>`;
    return `
      <section class="panel"><h3>Système de jeu</h3><div class="tgrid">
        <div>${adviceHtml(t, 'tactique')}</div>
        <div class="tsec"><span class="tsech">Attaque</span>
          <div class="opt"><span class="label">Rythme</span><div class="seg">${['place', 'rapide'].map((x) => `<button data-act="att" data-id="${x}" aria-pressed="${tac.att === x}">${ATT_TXT[x][0]}</button>`).join('')}</div><p>${ATT_TXT[tac.att][1]}.</p></div>
          <div class="opt"><span class="label">Jeu</span><div class="seg">${Object.entries(H.JEU).map(([k, l]) => `<button data-act="jeu" data-id="${k}" aria-pressed="${tac.jeu === k}">${l}</button>`).join('')}</div>
            <p>${JEU_TXT[tac.jeu]} Ton équipe est <b style="color:var(--fg)">${fi.id.label.toLowerCase()}</b> (esprit collectif moyen ${fi.id.v.toFixed(1)}) : <span class="${fi.cls}">${fi.txt}</span>.</p></div>
          ${backStyleSummary(t)}
          ${consRow(tac, 'att', 'cons', oppNext)}
        </div>
        <div class="tsec"><span class="tsech">Défense</span>
          <div class="opt"><span class="label">Style</span><div class="seg">${Object.entries(H.DSTYLE).map(([k, l]) => `<button data-act="dstyle" data-id="${k}" aria-pressed="${tac.dstyle === k}">${l}</button>`).join('')}</div>
            <p><b style="color:var(--fg)">Point fort</b> : ${DSTYLE_TXT[tac.dstyle][0].toLowerCase()}.<br><b style="color:var(--fg)">Point faible</b> : ${DSTYLE_TXT[tac.dstyle][1].toLowerCase()}.</p></div>
          <div class="opt"><span class="label">Système</span><p style="margin:0">Base <b style="color:var(--fg)">6-0</b> : ${DEF_TXT['6-0'][0].toLowerCase()}, mais ${DEF_TXT['6-0'][1].toLowerCase()}. Les bascules ci-dessous s'appliquent seules pendant le match, par ordre de priorité.</p>
            <div class="rules">
              <div class="rule"><button class="chip" data-act="rule" data-id="mene" aria-pressed="${r.mene.on}">Pour revenir au score</button>
                <span>Si mené de ${sel('mene', 'ecart', [2, 3, 4, 5], r.mene.ecart, (v) => v + ' buts')} à partir de la ${sel('mene', 'min', [40, 45, 50, 55], r.mene.min, (v) => v + 'e')}, passer en ${sel('mene', 'sys', ['5-1', '4-2'], r.mene.sys)}</span></div>
              <div class="rule"><button class="chip" data-act="rule" data-id="sup" aria-pressed="${r.sup.on}">En supériorité numérique</button>
                <span>Quand l'adversaire a un joueur exclu, passer en ${sel('sup', 'sys', ['5-1', '4-2'], r.sup.sys)}</span></div>
              <div class="rule"><button class="chip" data-act="rule" data-id="tireur" aria-pressed="${r.tireur.on}">Contre un tireur redoutable</button>
                <span>Si un arrière adverse a 16 ou plus en tir de loin sur le terrain, passer en ${sel('tireur', 'sys', ['5-1', '4-2'], r.tireur.sys)}</span></div>
            </div>
            <p class="legend" style="margin:6px 0 0">5-1 : ${DEF_TXT['5-1'][0].toLowerCase()} ; ${DEF_TXT['5-1'][1].toLowerCase()}. 4-2 : ${DEF_TXT['4-2'][0].toLowerCase()} ; ${DEF_TXT['4-2'][1].toLowerCase()}.</p></div>
          ${consRow(tac, 'def', 'cons', oppNext)}
        </div>
        <div class="tsec" style="grid-column:1 / -1"><span class="tsech">Transition et gestion</span>
          ${consRow(tac, 'ges', 'cons', oppNext)}
        </div>
      </div></section>`;
  }

  // ---------- Feuille de match : le groupe (titulaire, banc, réserve), les 7 de départ, le banc, la réserve, l'infirmerie ----------
  const FOLD_KEY = 'hbm-fold';
  function folded() { if (!U.fold) { try { U.fold = JSON.parse(localStorage.getItem(FOLD_KEY) || '[]'); } catch (e) { U.fold = []; } } return U.fold; }
  const GROUP_LABEL = { GB: 'Gardiens', AiG: 'Ailiers gauches', ArG: 'Arrières gauches', DC: 'Demi-centres', Piv: 'Pivots', ArD: 'Arrières droits', AiD: 'Ailiers droits' };
  const statusOf = (t, p) => H.hurt(p) ? 'I' : Object.values(t.lineup).includes(p.id) ? 'T' : (t.out || []).includes(p.id) ? 'R' : 'B';
  // Hors de la feuille : un jeune du centre joue avec la réserve, un pro reste en tribune (sans match)
  const offLabel = (p) => H.inReserve(p) ? 'R' : 'Tr';
  const offTitle = (p) => H.inReserve(p) ? 'Réserve (jeune du centre ou moins de 23 ans : joue avec la réserve)' : 'Tribune (un pro de 23 ans et plus ne joue pas avec la réserve)';
  const fatCol = (f) => f < 28 ? 'var(--good)' : f < 55 ? 'var(--warn)' : 'var(--bad)';
  const fbar = (f) => `<span class="mbar" title="Fatigue ${f}/100"><span style="width:${Math.min(100, f)}%;background:${fatCol(f)}"></span></span>`;
  const formTag = (f) => f > 0 ? `<span style="color:var(--good)">+${f}</span>` : f < 0 ? `<span style="color:var(--bad)">${f}</span>` : '<span class="muted">=</span>';
  // Étiquettes après un nom : J (centre) ; drapeau et croix en plus quand le nom n'est pas un lien (plink les met déjà)
  const ptags = (p, full) => (p.cf ? ' <span class="yt" title="Joueur du centre de formation">J</span>' : '') + (full ? (H.flagOf(p) ? ` <span class="flag">${H.flagOf(p)}</span>` : '') + injTag(p) : '');
  const rowTip = (p) => `${p.name} · ${p.age} ans · ${p.hand === 'G' ? 'gaucher' : 'droitier'} · fatigue ${p.fatigue} · forme ${p.form > 0 ? '+' : ''}${p.form} · robustesse : ${robTxt(p.a.robustesse ?? 12)} · expérience ×${H.matchXP(p).toFixed(1).replace('.', ',')}`;
  // Poignée de glisser-déposer : seule elle se saisit, la ligne reste cliquable normalement
  const GRIP = (id) => `<span class="mgrip" draggable="true" data-drag="${id}" title="Glisser" aria-hidden="true"><svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor"><circle cx="2" cy="2" r="1.3"/><circle cx="6" cy="2" r="1.3"/><circle cx="2" cy="7" r="1.3"/><circle cx="6" cy="7" r="1.3"/><circle cx="2" cy="12" r="1.3"/><circle cx="6" cy="12" r="1.3"/></svg></span>`;
  function renderFeuille(head) {
    H.ensureSheet(me());
    const t = me(), fold = folded(), nf = nextFixture();
    const fit = t.players.filter((p) => !H.hurt(p)), hurtP = t.players.filter(H.hurt);
    const flt = U.sheetFilter || 'tous', can = fit.length > 14;
    const show = fit.filter((p) => flt === 'tous' || (flt === 'centre' ? p.cf : !p.cf));
    const st = (p) => statusOf(t, p);
    const bench = fit.filter((p) => st(p) === 'B').sort((a, b) => H.POS.indexOf(a.pos) - H.POS.indexOf(b.pos) || b.ovr - a.ovr);
    const off = fit.filter((p) => st(p) === 'R').sort((a, b) => H.POS.indexOf(a.pos) - H.POS.indexOf(b.pos) || b.ovr - a.ovr);
    const res = off.filter(H.inReserve), trib = off.filter((p) => !H.inReserve(p));
    const row = (p) => { const s = st(p);
      return `<div class="mrow${s === 'R' ? ' mres' : ''}${U.pick === p.id ? ' picked' : ''}" data-drag="${p.id}" data-pick="${p.id}" title="${esc(rowTip(p))}">${GRIP(p.id)}<span class="pos${p.pos === 'GB' ? ' gb' : ''}">${p.pos}</span><span class="mname">${plink(p, short(p.name))}${ptags(p)}</span>${lstars(p, { sm: true })}${fbar(p.fatigue)}<span class="mform num">${formTag(p.form)}</span>
        <span class="seg sm mseg">${['T', 'B', 'R'].map((k) => `<button data-act="pst" data-id="${p.id}|${k}" aria-pressed="${s === k || (U.swap && U.swap.pid === p.id && U.swap.to === k)}" title="${k === 'R' ? offTitle(p) : { T: 'Titulaire', B: 'Banc' }[k]}"${k === 'R' && !can && s !== 'R' ? ' disabled' : ''}>${k === 'R' ? offLabel(p) : k}</button>`).join('')}</span></div>${U.swap && U.swap.pid === p.id ? swapMenu(t, p, U.swap.to) : ''}`; };
    const groups = H.POS.map((pos) => {
      const ps = show.filter((p) => p.pos === pos).sort((a, b) => 'TBR'.indexOf(st(a)) - 'TBR'.indexOf(st(b)) || b.ovr - a.ovr);
      if (!ps.length) return '';
      const sum = ['T', 'B'].map((k) => { const n = ps.filter((p) => st(p) === k).length; return n ? `${k} ${n}` : ''; }).concat([['R', (p) => H.inReserve(p)], ['Tr', (p) => !H.inReserve(p)]].map(([k, f]) => { const n = ps.filter((p) => st(p) === 'R' && f(p)).length; return n ? `${k} ${n}` : ''; })).filter(Boolean).join(' · ');
      const f = fold.includes(pos);
      return `<div class="mgrp${f ? ' fold' : ''}"><button class="mghead" data-act="fold" data-id="${pos}" aria-expanded="${!f}"><span class="chev">${f ? '▸' : '▾'}</span><span class="label">${GROUP_LABEL[pos]} · ${ps.length}</span><span class="muted msum">${sum}</span></button>${f ? '' : ps.map(row).join('')}</div>`;
    }).join('');
    const slot = (pos) => { const p = t.players.find((x) => x.id === t.lineup[pos]);
      return `<div class="slot mslot${p && U.pick === p.id ? ' picked' : ''}" data-drop="slot" data-pos="${pos}" data-pick="${p ? p.id : ''}" style="${SLOT[pos]}"${p ? ` draggable="true" data-drag="${p.id}" title="${esc(rowTip(p))}"` : ''}><span class="label">${H.POS_LABEL[pos]}</span>${p ? `<b>${esc(short(p.name))}${ptags(p, true)}</b><span class="row" style="gap:6px">${vstars(ovrAt(p, pos), { sm: true })}${fbar(p.fatigue)}${p.pos !== pos ? `<span class="muted" style="font-size:0.72rem">${p.pos}</span>` : ''}${(pos === 'ArD' || pos === 'AiD') && p.hand === 'D' ? '<span style="color:var(--bad);font-size:0.72rem" title="Droitier côté droit : moins efficace au tir">main</span>' : ''}</span>` : '<span class="muted">—</span>'}</div>`; };
    const gkBench = bench.some((p) => p.pos === 'GB');
    const noCover = H.POS.filter((pos) => pos !== 'GB' && !bench.some((p) => p.pos === pos));
    const benchRow = (p) => `<div class="mrow mb${U.pick === p.id ? ' picked' : ''}" data-drag="${p.id}" data-pick="${p.id}" title="${esc(rowTip(p))}">${GRIP(p.id)}<span class="pos${p.pos === 'GB' ? ' gb' : ''}">${p.pos}</span><span class="mname">${plink(p, short(p.name))}${ptags(p)}</span>${lstars(p, { sm: true })}${fbar(p.fatigue)}</div>`;
    return `<div class="row" style="justify-content:space-between;margin-bottom:16px;gap:12px;flex-wrap:wrap">${head || `<div><h2 style="margin:0">Feuille de match${nf && !nf.rest ? ` · journée ${G.round + 1}` : ''}</h2>${nf && !nf.rest ? `<span class="muted">${nf.h === t.id ? 'contre' : 'à'} ${esc(T(nf.h === t.id ? nf.a : nf.h).name)}</span>` : ''}</div>`}
      <div class="row" style="gap:8px;flex-wrap:wrap"><span class="chip">Titulaires <b>${Object.keys(t.lineup).length}/7</b></span><span class="chip">Banc <b>${bench.length}/7</b></span><span class="chip">Réserve <b>${res.length}</b></span>${trib.length ? `<span class="chip" title="Pros de 23 ans et plus hors de la feuille de match : en tribune, sans match">Tribune <b>${trib.length}</b></span>` : ''}<span class="chip">Infirmerie <b>${hurtP.length}</b></span>
        ${G.lastSheet ? '<button class="btn" data-act="sheetback" title="Les 7 de départ et la feuille de match du dernier match">Reprendre la dernière feuille</button>' : ''}<button class="btn" data-act="rotate" title="Les titulaires au-delà de 55 de fatigue passent sur le banc, remplacés par le joueur le plus frais du poste">Faire tourner</button><button class="btn primary" data-act="auto">Composition auto</button></div></div>
      ${(() => { const q = U.pick && t.players.find((x) => x.id === U.pick); return q ? `<p class="pickhint"><span><b>${esc(q.name)}</b> sélectionné : clique sur un poste du terrain, un joueur du banc ou la réserve.</span><button class="btn sm" data-act="unpick">Annuler</button></p>` : ''; })()}
      <div class="mgrid${U.pick ? ' picking' : ''}">
        <section class="panel"><div class="row" style="justify-content:space-between;margin-bottom:6px"><h3 style="margin:0">Groupe · ${fit.length}</h3><span class="seg sm mseg">${[['tous', 'Tous'], ['pros', 'Pros'], ['centre', 'Centre']].map(([k, l]) => `<button data-act="sflt" data-id="${k}" aria-pressed="${flt === k}">${l}</button>`).join('')}</span></div>
          <p class="legend" style="margin:0 0 4px">T titulaire · B banc · R réserve (jeunes du centre et moins de 23 ans) · Tr tribune (pros de 23 ans et plus, sans match). Les boutons T, B, R d'une ligne proposent un échange 1-1 : tu choisis qui fait le chemin inverse. Tu peux aussi cliquer sur un joueur puis sur sa destination (poste du terrain, joueur du banc, réserve), ou le glisser par sa poignée (⠿) sur le joueur qu'il remplace (banc, réserve, tribune ou poste du terrain). Clic sur un poste pour le replier ; âge, robustesse et expérience au survol d'une ligne.</p>${groups}</section>
        <div class="mright">
          <section class="panel"><h3>Les 7 de départ</h3><div class="court mbig">${COURT}${H.POS.map(slot).join('')}</div><p class="legend">${LINEUP_LEGEND}</p></section>
          <div class="mbelow"><div style="display:grid;gap:20px;align-content:start">
            <section class="panel"><div class="dropzone mdz" data-drop="bench"><h3>Banc · ${bench.length}/7</h3><div class="mbench">${bench.map(benchRow).join('') || '<span class="muted">Personne sur le banc.</span>'}</div>
              <p class="malert" style="color:var(--${gkBench ? 'good' : 'warn'})">${gkBench ? '✓ Gardien remplaçant' : '⚠ Pas de gardien remplaçant'}</p>${noCover.length ? `<p class="malert" style="color:var(--warn)" title="Un joueur d'un poste voisin dépannera">⚠ Pas de doublure : ${noCover.map((pos) => H.POS_LABEL[pos].toLowerCase()).join(', ')}</p>` : ''}</div></section>
            ${can ? `<section class="panel"><div class="dropzone mdz" data-drop="tribune"><h3>Réserve · ${res.length}</h3>${(() => { const offRow = (p) => benchRow(p).replace('class="mrow mb', 'class="mrow mb mres');
              return `<div class="mbench">${res.map(offRow).join('') || '<span class="muted">Aucun jeune hors de la feuille.</span>'}</div><p class="legend">Les jeunes du centre et les moins de 23 ans hors de la feuille jouent avec la réserve le jour du match : 60 minutes à 7, partagées entre eux.</p>${trib.length ? `<span class="label" style="display:block;margin-top:10px">Tribune · ${trib.length}</span><div class="mbench">${trib.map(offRow).join('')}</div><p class="legend">Un pro de 23 ans et plus ne joue pas avec la réserve : hors de la feuille, il reste en tribune, sans match.</p>` : ''}`; })()}</div></section>` : ''}</div>
            <section class="panel"><h3>Infirmerie · ${hurtP.length}</h3>${hurtP.length ? hurtP.map((p) => `<div class="row" style="gap:8px;padding-block:3px"><span class="pos${p.pos === 'GB' ? ' gb' : ''}">${p.pos}</span>${plink(p, short(p.name))}<span class="muted">${esc(p.inj.type.toLowerCase())}, ${absTxt(p.inj.n)}</span></div>`).join('') : '<p class="muted" style="margin:0">Tout le monde est valide.</p>'}<p class="legend">Les blessés ne peuvent pas aller sur la feuille de match.</p></section>
            <section class="panel"><h3>Consignes</h3><div style="display:grid;gap:12px">${consBlock(t.tactic, 'cons', nf && !nf.rest ? T(nf.h === t.id ? nf.a : nf.h) : null)}</div></section>
          </div></div></div>`;
  }
  const LINEUP_LEGEND = `Le niveau affiché (en étoiles) est celui du joueur à ce poste. Un joueur de champ peut être aligné hors de son poste, avec le niveau correspondant. Latéralité : à l'arrière droit et à l'aile droite, un gaucher gagne +3 à +4 % de réussite au tir, un droitier perd 2 à 3 %. Poste secondaire (DC et arrières entre eux, ailier vers l'arrière de son côté) : il garde 85 % de son niveau ; ailleurs, tout dépend de ses attributs. Les titulaires jouent environ 40 minutes (32 avec rotations fréquentes) et restent sur le terrain dans les 10 dernières minutes d'un match serré. Les gardiens se partagent les mi-temps, sauf si tu changes le tien en pause depuis le terrain et le banc.`;
  // Changement 1-1 depuis les boutons T / B / R : on choisit qui fait le chemin inverse
  // B → R : qui monte sur la feuille · R → B : qui en sort · T → B / R : qui prend son poste · B / R → T : quel titulaire il remplace
  function swapCands(t, p, to) {
    const cur = statusOf(t, p), gk = (q) => q.pos === 'GB';
    const score = (q, pos) => ovrAt(q, pos || q.pos) - q.fatigue * 0.04;
    const fit = t.players.filter((q) => q.id !== p.id && !H.hurt(q));
    if (to === 'T') {
      return H.POS.filter((pos) => t.lineup[pos] && (pos === 'GB') === gk(p)).map((pos) => ({ q: t.players.find((x) => x.id === t.lineup[pos]), pos }))
        .filter((c) => c.q).sort((a, b) => (b.pos === p.pos) - (a.pos === p.pos) || score(p, b.pos) - score(p, a.pos));
    }
    const slot = cur === 'T' ? Object.keys(t.lineup).find((k) => t.lineup[k] === p.id) : null;
    const pool = fit.filter((q) => statusOf(t, q) === (cur === 'T' ? to : cur === 'B' ? 'R' : 'B'));
    if (slot) return pool.filter((q) => gk(q) === (slot === 'GB')).sort((a, b) => (b.pos === slot) - (a.pos === slot) || score(b, slot) - score(a, slot)).map((q) => ({ q, pos: slot }));
    // Banc ⇄ réserve : même poste d'abord ; on propose les meilleurs qui montent, les moins bons qui sortent
    const up = cur === 'B';
    return pool.sort((a, b) => (b.pos === p.pos) - (a.pos === p.pos) || (up ? score(b) - score(a) : score(a) - score(b))).map((q) => ({ q }));
  }
  function doSwap(t, pid, to, qid) {
    const p = t.players.find((x) => x.id === pid), q = t.players.find((x) => x.id === qid);
    if (!p || !q || H.hurt(p) || H.hurt(q)) return;
    t.out = t.out || [];
    const cur = statusOf(t, p);
    if (to === 'T') {
      const slot = Object.keys(t.lineup).find((k) => t.lineup[k] === qid);
      if (!slot) return;
      t.out = t.out.filter((x) => x !== pid);
      t.lineup[slot] = pid;
      if (cur === 'R') t.out.push(qid);
    } else if (cur === 'T') {
      const slot = Object.keys(t.lineup).find((k) => t.lineup[k] === pid);
      t.out = t.out.filter((x) => x !== qid);
      t.lineup[slot] = qid;
      if (to === 'R') t.out.push(pid);
    } else t.out = cur === 'B' ? t.out.map((x) => x === qid ? pid : x) : t.out.map((x) => x === pid ? qid : x);
    H.ensureSheet(t);
  }
  function swapMenu(t, p, to) {
    const cur = statusOf(t, p), cands = swapCands(t, p, to);
    // Même poste d'abord ; les autres postes sur demande
    const same = cands.filter((c) => to === 'T' ? c.pos === p.pos : c.q.pos === (c.pos || p.pos));
    const shown = U.swap.all || !same.length ? cands : same, more = cands.length - shown.length;
    const where = { T: 'titulaire', B: 'sur le banc', R: H.inReserve(p) ? 'en réserve' : 'en tribune' }[to];
    const q0 = to === 'T' ? `${esc(short(p.name))} titulaire à la place de qui ?` : cur === 'T' ? `Qui prend son poste (${H.POS_LABEL[cands[0].pos].toLowerCase()}) ?` : cur === 'B' ? 'Qui monte sur le banc à sa place ?' : 'Qui sort du banc pour lui laisser la place ?';
    const btn = (c, i) => `<button class="mswapb${i === 0 ? ' sugg' : ''}" data-act="swapto" data-id="${c.q.id}" title="${esc(rowTip(c.q))}${i === 0 ? ' · suggestion du staff' : ''}"><span class="pos${c.q.pos === 'GB' ? ' gb' : ''}">${to === 'T' ? c.pos : c.q.pos}</span><span class="mname">${esc(short(c.q.name))}</span>${cur === 'T' ? vstars(ovrAt(c.q, c.pos), { sm: true }) : lstars(c.q, { sm: true })}${fbar(c.q.fatigue)}</button>`;
    return `<div class="mswap"><div class="row" style="justify-content:space-between;gap:8px"><span class="label" style="margin:0">${q0}</span><button class="btn sm" data-act="swapx" aria-label="Annuler">✕</button></div>
      <div class="mswapl">${shown.map(btn).join('')}</div>${more ? `<button class="btn sm" style="margin-top:6px" data-act="swapall">Autres postes · ${more}</button>` : ''}<p class="legend" style="margin:4px 0 0">${esc(short(p.name))} passe ${where} ; ${to === 'T' ? `le titulaire remplacé ${cur === 'B' ? 'prend sa place sur le banc' : 'sort de la feuille'}` : cur === 'T' ? 'le joueur choisi prend son poste' : cur === 'B' ? 'le joueur choisi prend sa place sur le banc' : 'le joueur choisi sort de la feuille'}. En premier, la suggestion du staff.</p></div>`;
  }
  // Changer le statut d'un joueur en gardant 14 joueurs sur la feuille (7 titulaires, 7 sur le banc)
  function setStatus(t, pid, to) {
    const P = (id) => t.players.find((x) => x.id === id), p = P(pid);
    if (!p || H.hurt(p)) return;
    t.out = t.out || [];
    const cur = statusOf(t, p);
    if (cur === to) return;
    const score = (q, pos) => ovrAt(q, pos || q.pos) - q.fatigue * 0.04;
    const benchOf = () => t.players.filter((q) => statusOf(t, q) === 'B');
    const resOf = () => t.players.filter((q) => statusOf(t, q) === 'R');
    const pickBest = (list, pos) => list.filter((q) => (pos === 'GB') === (q.pos === 'GB')).sort((a, b) => (b.pos === pos) - (a.pos === pos) || score(b, pos) - score(a, pos))[0];
    // Un joueur quitte le banc : on fait monter le meilleur de la réserve à son poste ; il y entre : on y renvoie le moins bon
    const pullFromRes = (pos) => { const q = pickBest(resOf(), pos) || resOf().sort((a, b) => score(b) - score(a))[0]; if (q) t.out = t.out.filter((x) => x !== q.id); };
    const pushToRes = (pos, keep) => { const b = benchOf().filter((q) => !keep.includes(q.id)); const gk = b.filter((q) => q.pos === 'GB').length;
      const q = b.filter((x) => x.pos !== 'GB' || gk > 1).sort((a, c) => (c.pos === pos) - (a.pos === pos) || score(a) - score(c))[0]; if (q) t.out.push(q.id); };
    if (cur === 'T') {
      const slot = Object.keys(t.lineup).find((k) => t.lineup[k] === pid);
      const rep = pickBest(benchOf(), slot) || pickBest(resOf(), slot);
      if (!rep) return;
      const fromRes = t.out.includes(rep.id);
      t.out = t.out.filter((x) => x !== rep.id);
      t.lineup[slot] = rep.id;
      if (to === 'R') { t.out.push(pid); if (!fromRes) pullFromRes(p.pos); } else if (fromRes) { /* il va sur le banc, le remplaçant venait de la réserve : rien à compenser */ }
    } else if (to === 'T') {
      const slot = p.pos;
      const prev = t.lineup[slot];
      const fromRes = cur === 'R';
      t.out = t.out.filter((x) => x !== pid);
      t.lineup[slot] = pid;
      if (fromRes) pushToRes(slot, [prev]);
    } else if (to === 'B') { t.out = t.out.filter((x) => x !== pid); pushToRes(p.pos, [pid]); }
    else if (to === 'R') { t.out.push(pid); pullFromRes(p.pos); }
    H.ensureSheet(t);
  }
  // Faire tourner : un titulaire au-delà de 55 de fatigue cède sa place au joueur le plus frais de son poste
  function rotateTired(t) {
    let n = 0;
    for (const pos of H.POS) {
      const p = t.players.find((x) => x.id === t.lineup[pos]);
      if (!p || p.fatigue <= 55) continue;
      const alt = t.players.filter((q) => q.pos === pos && q.id !== p.id && !H.hurt(q) && q.fatigue < 55 && !Object.values(t.lineup).includes(q.id)).sort((a, b) => a.fatigue - b.fatigue || b.ovr - a.ovr)[0];
      if (alt) { setStatus(t, alt.id, 'T'); n++; }
    }
    return n;
  }

  // ---------- Championnat ----------
  function resultRow(g) {
    const h = T(g.h), a = T(g.a);
    const mine = g.h === G.userId || g.a === G.userId;
    const s = g.hs === undefined ? '<span class="muted">–</span>' : `<b class="num">${g.hs}–${g.as}</b>`;
    return `<tr class="${mine ? 'me' : ''}"><td>${badge(h, true)} ${esc(h.name)}</td><td class="r" style="text-align:center">${s}</td><td style="text-align:right">${esc(a.name)} ${badge(a, true)}</td></tr>`;
  }
  function renderLeague() {
    const s = H.standings(G);
    const table = s.map((r, i) => {
      const t = T(r.id);
      return `<tr class="${r.id === G.userId ? 'me' : ''}"><td class="r">${i + 1}</td><td>${badge(t, true)} ${esc(t.name)} ${(t.mods || []).map((k) => { const m = H.modInfo(k); return m ? `<span class="moddot ${m.bonus ? 'plus' : 'minus'}" title="${esc(m.name)} : ${esc(m.desc)}">${m.bonus ? '+' : '−'}</span>` : ''; }).join('')}</td><td class="r">${r.j}</td><td class="r">${r.g}</td><td class="r">${r.n}</td><td class="r">${r.p}</td><td class="r">${r.bp}</td><td class="r">${r.bc}</td><td class="r">${r.bp - r.bc > 0 ? '+' : ''}${r.bp - r.bc}</td><td class="r"><b>${r.pts}</b></td></tr>`;
    }).join('');
    const last = G.results[G.results.length - 1];
    const next = G.round < G.sched.length ? G.sched[G.round].map(([h, a]) => ({ h, a })) : null;
    const sc = H.scorers(G, 10), mv = H.mvps(G, 10);
    return `<div class="grid2">
      <section class="panel"><h3>Classement de la ${LEAGUE}</h3><div class="scroll"><table><thead><tr><th class="r">#</th><th>Club</th><th class="r">J</th><th class="r">G</th><th class="r">N</th><th class="r">P</th><th class="r">BP</th><th class="r">BC</th><th class="r">Diff</th><th class="r">Pts</th></tr></thead><tbody>${table}</tbody></table></div>
        <p class="legend">Victoire 2 pts, nul 1, défaite 0 (ici, les points ne sont jamais en promo). Départage : points, différence de buts particulière, différence générale, buts marqués.</p></section>
      <div style="display:grid;gap:20px;min-width:0">
        ${last ? `<section class="panel"><h3>Journée ${G.results.length}</h3><div class="scroll"><table><tbody>${last.map(resultRow).join('')}</tbody></table></div></section>` : ''}
        ${next ? `<section class="panel"><h3>Journée ${G.round + 1} · à venir</h3><div class="scroll"><table><tbody>${next.map(resultRow).join('')}</tbody></table></div></section>` : ''}

      </div></div>
      <div class="duo" style="margin-top:20px"><section class="panel"><h3>Meilleurs buteurs</h3>${sc.length ? `<div class="scroll"><table><tbody>${sc.map((x, i) => `<tr class="${x.t.id === G.userId ? 'me' : ''}"><td class="r">${i + 1}</td><td>${esc(x.p.name)} <span class="pos">${x.p.pos}</span></td><td>${badge(x.t, true)}</td><td class="r"><b>${x.p.goals}</b></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Le classement des buteurs apparaît après la 1re journée.</p>'}</section>
        <section class="panel"><h3 class="row" style="gap:8px"><span class="mvpmini">${CROWN}</span>MVP de la saison</h3>${mv.length ? `<div class="scroll"><table><tbody>${mv.map((x, i) => `<tr class="${x.t.id === G.userId ? 'me' : ''}"><td class="r">${i + 1}</td><td>${plink(x.p)} <span class="pos${x.p.pos === 'GB' ? ' gb' : ''}">${x.p.pos}</span></td><td>${badge(x.t, true)}</td><td class="r"><b>${x.p.mvp}</b></td></tr>`).join('')}</tbody></table></div><p class="legend" style="margin:8px 0 0">Titres de MVP du match : meilleure note sur 10 des deux équipes, bonus aux vainqueurs.</p>` : '<p class="muted" style="margin:0">Le premier MVP sera désigné à la fin de la 1re journée.</p>'}</section></div>`;
  }

  // ---------- Événements ----------
  // Ville : pop-up au survol
  const cityTarget = (e) => e.target.closest && e.target.closest('.city .bld, .city .gbld');
  document.addEventListener('pointerover', (e) => { if (e.pointerType !== 'touch' && e.target.closest && e.target.closest('.city')) cityCard(cityTarget(e)); });
  document.addEventListener('pointerout', (e) => { if (e.target.closest && e.target.closest('.city') && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.city .bld, .city .gbld'))) cityCard(null); });
  document.addEventListener('focusin', (e) => { if (e.target.closest && e.target.closest('.city')) cityCard(cityTarget(e)); });
  document.addEventListener('focusout', (e) => { if (e.target.closest && e.target.closest('.city')) cityCard(null); });
  document.addEventListener('click', (e) => {
    if (e.target.id === 'bsov') { U.bsModal = false; render(); return; }
    if (e.target.id === 'preov') return;
    if (e.target.id === 'modsov') { U.modsModal = false; render(); return; }
    if (e.target.id === 'inboxov') { U.inbox = false; render(); return; }
    const yr = document.querySelector('.modal.yreveal');
    if (yr && e.target.closest('.overlay')) { const done = yr.getAnimations({ subtree: true }).every((a) => a.playState === 'finished'); yr.classList.remove('yreveal'); if (!done && !e.target.closest('[data-act]')) return; }
    // Menu des clubs : se ferme au clic ailleurs, mémorise son état d'ouverture
    if (U.ly) { const dd = e.target.closest('.ddrop'); if (!dd) { U.ly.open = false; const o = document.querySelector('.ddrop[open]'); if (o) o.open = false; } else if (e.target.closest('summary')) U.ly.open = !dd.open; }
    const b = e.target.closest('[data-act]');
    // Feuille de match : clic sur un joueur (hors lien et boutons), ou sur une zone quand un joueur est choisi
    if (G && !U.dragId) {
      const pk = e.target.closest('[data-pick]'), dz = U.pick && e.target.closest('[data-drop]');
      if (pk && !(b && pk.contains(b))) { pickClick(pk); return; }
      if (dz && !b) { pickClick(dz); return; }
      if (U.pick && !(b && b.dataset.act === 'player')) { U.pick = null; if (!b) { render(); return; } }
    }
    if (U.swap && !(b && ['pst', 'swapto', 'swapx', 'swapall', 'player'].includes(b.dataset.act))) { U.swap = null; render(); if (!b) return; }
    if (!b || b.disabled) return;
    const act = b.dataset.act, id = b.dataset.id;
    const t = G ? me() : null;
    const ms = U.m ? U.m.S[U.side] : null;
    switch (act) {
      case 'pick': U.newClub = id; render(); return;
      case 'nclose': hideNotify(); return;
      case 'lyall': U.ly.teams = []; U.ly.open = true; render(); return;
      case 'lyme': U.ly.teams = [G.userId]; U.ly.open = true; render(); return;
      case 'lyreset': U.ly = { teams: [], lv: 0, pot: 0, open: false, ref: U.ly.ref }; render(); return;
      case 'dotrain': doTraining(); return;
      case 'modsopen': U.modsModal = true; render(); { const c = document.querySelector('#modsov [data-act=modsclose]'); if (c) c.focus(); } return;
      case 'modsclose': U.modsModal = false; render(); { const o = document.querySelector('[data-act=modsopen]'); if (o) o.focus(); } return;
      case 'bsopen': U.bsModal = true; render(); { const c = document.querySelector('#bsov [data-act=bsclose]'); if (c) c.focus(); } return;
      case 'bsclose': U.bsModal = false; render(); { const o = document.querySelector('[data-act=bsopen]'); if (o) o.focus(); } return;
      case 'bsreset': for (const p of t.players) { if (U.preStep) { if (H.BACK_POS.includes(p.pos) && (p.style || 'equilibre') !== 'equilibre') p.matchStyle = 'equilibre'; else delete p.matchStyle; } else delete p.style; } save(); render(); return;
      case 'colt': { const h = hiddenCols(); U.hidden = h.includes(id) ? h.filter((x) => x !== id) : h.concat(id); try { localStorage.setItem('hbm-cols', JSON.stringify(U.hidden)); } catch (e) {} render(); return; }
      case 'mstyle': { const [pid, v] = id.split('|'); const pl = t.players.find((x) => x.id === pid); if (pl) { if (v) pl.matchStyle = v; else delete pl.matchStyle; save(); render(); } return; }
      case 'pstyle': { const [pid, v] = id.split('|'); const pl = t.players.find((x) => x.id === pid); if (pl) { if (v === 'equilibre') delete pl.style; else pl.style = v; save(); render(); } return; }
      case 'player': openSheet(id); return;
      case 'unpick': render(); return;
      case 'inbox': { const cs = inboxContacts(), k = cs.find((c) => unread(c)) || (cs.includes(U.inboxC) ? U.inboxC : cs[0]); if (k) openConv(k); else U.inboxC = null; U.inbox = true; render(); const c = document.querySelector('#inboxov [data-act=inboxclose]'); if (c) c.focus({ preventScroll: true }); return; }
      case 'inboxclose': U.inbox = false; render(); { const o = document.querySelector('[data-act=inbox]'); if (o) o.focus({ preventScroll: true }); } return;
      case 'ibc': openConv(id); render(); return;
      case 'ibflt': U.ibFilter = id; render(); return;
      case 'fsign': signFree(id); return;
      case 'yopen': if (G.youth) { U.inbox = false; U.youthModal = true; U.yStage = null; U.yAnim = false; render(); } return;
      case 'tutook': tutoDone(false); return;
      case 'tutooff': tutoDone(true); return;
      case 'tutohelp': U.tutoAsk = 0; U.tutoAt = tutoScreen().join(); tutoSync(); { const b = document.querySelector('#tuto [data-act=tutook]'); if (b) b.focus({ preventScroll: true }); } return;
      case 'psclose': closeSheet(); return;
      case 'devok': U.devOk = true; try { sessionStorage.setItem('hbm-dev-ok', '1'); } catch (e) { /* ignore */ } render(); return;
      case 'step2': U.homeStep = 2; render(); window.scrollTo(0, 0); return;
      case 'step1': U.homeStep = 1; render(); window.scrollTo(0, 0); return;
      case 'pickb': ensureDraft().b = id; render(); return;
      case 'pickm': ensureDraft().m = id; render(); return;
      case 'start': { const d = ensureDraft(); if (!d.b || !d.m) return; G = H.newGame(U.newClub, undefined, [d.b + '+', d.m + '-']); G.tuto.on = U.tutoOpt !== false; U.draft = null; U.homeStep = 1; } me().tactic.rules = H.defaultRules(); U.tab = 'ville'; U.view = 'pre'; U.post = null; save(); render(); return;
      case 'citytog': { const o = cityOpts(); o[id] = !o[id]; try { localStorage.setItem('hbm-city', JSON.stringify(o)); } catch (e) { /* stockage indisponible */ }
        const w = document.querySelector('.citywrap'); if (w) w.classList.toggle(id === 'lab' ? 'labels' : 'nobeam', id === 'lab' ? o.lab : !o.beam); b.setAttribute('aria-pressed', String(o[id])); return; }
      case 'tab': U.pick = null; U.swap = null; U.tab = id; if (U.view === 'post' && id === 'match') { /* garde le résumé */ } render(); window.scrollTo(0, 0); return;
      case 'kickoff': openPre(); return;
      case 'prenext': U.preStep = 2; U.bsModal = false; render(); return;
      case 'preback': U.preStep = 1; U.bsModal = false; render(); return;
      case 'precancel': cancelPre(); return;
      case 'prego': startMatch(); return;
      case 'rest': restRound(); return;
      case 'gonext': U.tab = 'match'; U.post = null; U.view = 'pre'; render(); window.scrollTo(0, 0); return;
      case 'pause': U.paused = !U.paused; if (!U.paused) U.subSel = null; schedule(); liveUpdate([]); return;
      case 'speed': U.speed = Number(id); schedule(); liveUpdate([]); return;
      case 'finish': finishMatch(); return;
      case 'timeout': if (U.m.timeout(U.side)) { U.paused = true; U.tPanel = true; clearTimeout(U.timer); liveUpdate(U.m.ev.slice(-1)); } return;
      case 'resume': hideNotify(); U.tPanel = false; U.paused = false; U.subSel = null; liveUpdate([]); schedule(); return;
      case 'empty': ms.empty = !ms.empty; liveUpdate([]); return;
      case 'mgk': U.m.setGK(U.side, id); liveUpdate([]); return;
      case 'subpick': if (!U.paused) return; U.subSel = U.subSel === id ? null : id; liveUpdate([]); return;
      case 'subin': if (!U.paused || !U.subSel) return; U.m.manualSub(U.side, U.subSel, id); U.subSel = null; U.ctlSig = ''; liveUpdate([]); return;
      case 'subauto': if (!U.paused) return; U.m.releasePos(U.side, id); liveUpdate([]); return;
      case 'mdef': ms.forceDef = id === 'auto' ? null : id; liveUpdate([]); return;
      case 'mds': ms.tac.dstyle = id; liveUpdate([]); return;
      case 'mjeu': ms.tac.jeu = id; liveUpdate([]); return;
      case 'dstyle': t.tactic.dstyle = id; save(); render(); return;
      case 'jeu': t.tactic.jeu = id; save(); render(); return;
      case 'rule': t.tactic.rules[id].on = !t.tactic.rules[id].on; save(); render(); return;
      case 'matt': ms.tac.att = id; liveUpdate([]); return;
      case 'mcons': toggleCons(ms.tac, id); liveUpdate([]); return;
      case 'att': t.tactic.att = id; save(); render(); return;
      case 'cons': toggleCons(t.tactic, id); save(); render(); return;
      case 'auto': H.autoLineup(t); t.out = []; H.ensureSheet(t); save(); render(); return;
      case 'yrel': U.yRelease = id; render(); return;
      case 'ycmp': U.yCmp = !U.yCmp; render(); return;
      case 'pst': { const [pid, k] = id.split('|'), t = me(), pl = t.players.find((x) => x.id === pid);
        if (!pl || statusOf(t, pl) === k) { U.swap = null; render(); return; }
        if (U.swap && U.swap.pid === pid && U.swap.to === k) { U.swap = null; render(); return; }
        if (swapCands(t, pl, k).length) U.swap = { pid, to: k }; else { U.swap = null; setStatus(t, pid, k); save(); }
        render(); return; }
      case 'swapto': { const sw = U.swap; U.swap = null; if (sw) { doSwap(me(), sw.pid, sw.to, id); save(); } render(); return; }
      case 'swapx': U.swap = null; render(); return;
      case 'swapall': if (U.swap) U.swap.all = true; render(); return;
      case 'fold': { const f = folded(); U.fold = f.includes(id) ? f.filter((x) => x !== id) : f.concat(id); try { localStorage.setItem(FOLD_KEY, JSON.stringify(U.fold)); } catch (e) { /* stockage indisponible */ } render(); return; }
      case 'sflt': U.sheetFilter = id; render(); return;
      case 'sqf': U.sqf = id; render(); return;
      case 'rotate': { const n = rotateTired(me()); save(); render(); notify(`<span><b>Faire tourner</b><br>${n ? `${n} titulaire${n > 1 ? 's' : ''} fatigué${n > 1 ? 's' : ''} mis au repos.` : 'Aucun titulaire au-delà de 55 de fatigue avec un remplaçant frais à son poste.'}</span>`, false); return; }
      case 'sheetback': { const t = me(), L = G.lastSheet; if (!L) return; for (const pos of H.POS) { const p = t.players.find((x) => x.id === L.lineup[pos]); if (p && !H.hurt(p)) t.lineup[pos] = p.id; } t.out = L.out.filter((id) => t.players.some((p) => p.id === id && !H.hurt(p))); H.ensureSheet(t); save(); render(); return; }
      case 'relask': U.relAsk = U.relAsk === id ? null : id; render(); return;
      case 'relyes': { const t = me(), p = t.players.find((x) => x.id === id); if (!p || !p.cf) return; const mv = H.releasePlayer(G, t, p); U.relAsk = null; save(); render();
        if (mv) notify(`<span class="nbadge" style="background:var(--iso-youth)">J</span><span><b>${esc(mv.name)} quitte le centre</b><br>${mv.to ? `Il signe à ${esc(T(mv.to).name)}.` : 'Il reste sans club pour l\'instant.'}</span>`, false); return; }
      case 'tocf': { const p = me().players.find((x) => x.id === id); if (H.joinCF(p)) { save(); render(); } return; }
      case 'rush': U.rushAsk = U.rushAsk === id ? null : id; render(); return;
      case 'rushyes': { const p = me().players.find((x) => x.id === id); if (p && H.rushBack(me(), p)) { U.rushAsk = null; save(); render(); } return; }
      case 'ylater': U.youthModal = false; U.yBatch = false; render(); return;
      case 'yflip': U.yStage = null; U.yAnim = true; render(); return;
      case 'ybatch': U.yBatch = !U.yBatch; render(); { const m = document.querySelector('.ymodal, .ycard, .ybatch'); if (m) m.scrollTop = 0; } return;
      case 'yrefuse': if (G.youth) { G.youthLog.unshift({ round: G.youth.round, name: G.youth.p.name, pos: G.youth.p.pos, ovr: G.youth.p.ovr, pot: G.youth.p.pot, age: G.youth.p.age, id: G.youth.p.id, decision: 'Refusé' }); G.youth = null; } U.youthModal = false; save(); render(); return;
      case 'yaccept': {
        if (!G.youth) return;
        const tm = me(), y = G.youth.p;
        const decision = 'Intégré au centre';
        y.cf = true;
        tm.players.push(y);
        for (const pos of H.POS) if (!tm.players.some((p) => p.id === tm.lineup[pos])) tm.lineup[pos] = y.id;
        H.ensureSheet(tm);
        G.youthLog.unshift({ round: G.youth.round, name: y.name, pos: y.pos, ovr: y.ovr, pot: y.pot, age: y.age, id: y.id, decision });
        G.youth = null; U.youthModal = false; U.yRelease = null; save(); render(); return;
      }
      case 'tribune': {
        const tm = me();
        if (H.hurt(tm.players.find((p) => p.id === id))) return;
        tm.out = tm.out || [];
        if (tm.out.includes(id)) {
          tm.out = tm.out.filter((x) => x !== id);
          const starters = new Set(Object.values(tm.lineup));
          const c = tm.players.filter((p) => !starters.has(p.id) && !tm.out.includes(p.id) && p.id !== id && !H.hurt(p)).sort((a, b) => a.ovr - b.ovr)[0];
          if (c) tm.out.push(c.id);
        } else tm.out.push(id);
        H.ensureSheet(tm); save(); render(); return;
      }
      case 'sort': U.sort = U.sort.k === id ? { k: id, dir: -U.sort.dir } : { k: id, dir: 1 }; render(); return;
      case 'tfocus': case 'tint': {
        const lt = G.lastTraining;
        if (lt && !G.trainPending && lt.round === G.round && !G.ended) return;
        G.training[act === 'tfocus' ? 'focus' : 'intensity'] = id; save(); render(); return;
      }
      case 'next': U.view = 'pre'; U.post = null; U.tab = G.ended ? 'match' : 'ville'; render(); window.scrollTo(0, 0); return;
      case 'reset': U.confirmReset = true; render(); return;
      case 'resetNo': U.confirmReset = false; render(); return;
      case 'resetYes': clearTimeout(U.timer); U.draft = null; U.homeStep = 1; clearSave(); U.newClub = G && H.CLUBS.some((c) => c.id === G.userId) ? G.userId : U.newClub; G = null; U.m = null; U.view = 'pre'; U.post = null; U.confirmReset = false; render(); window.scrollTo(0, 0); return;
      case 'replay': { const club = G.userId; const mods = (me().mods || []).slice(); G = H.newGame(club, undefined, mods); me().tactic.rules = H.defaultRules(); U.view = 'pre'; U.post = null; U.tab = 'ville'; save(); render(); window.scrollTo(0, 0); return; }
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('psheet')) { closeSheet(); return; }
    if (e.key === 'Escape' && U.pick) { U.pick = null; render(); return; }
    if (e.key === 'Escape' && U.swap) { U.swap = null; render(); return; }
    if (e.key === 'Escape' && U.bsModal) { U.bsModal = false; render(); return; }
    if (e.key === 'Escape' && U.modsModal) { U.modsModal = false; render(); return; }
    if (e.key === 'Escape' && U.inbox) { U.inbox = false; render(); return; }
    if (e.key === 'Escape' && U.preStep) { cancelPre(); return; }
    if (document.getElementById('psheet')) return;
    if (e.key === ' ' && U.view === 'live' && U.m && U.tab === 'match' && !(e.target.closest && e.target.closest('button, select, input, [role="button"]'))) {
      e.preventDefault();
      if (U.tPanel) { hideNotify(); U.tPanel = false; U.paused = false; U.subSel = null; liveUpdate([]); schedule(); }
      else { U.paused = !U.paused; if (!U.paused) U.subSel = null; schedule(); liveUpdate([]); }
      return;
    }
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const g = e.target.closest && e.target.closest('svg [role="button"][data-act]');
    if (!g) return;
    e.preventDefault();
    g.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  function toggleCons(tac, id) { H.setCons(tac, id); }
  document.addEventListener('change', (e) => {
    if (e.target.matches && e.target.matches('input[data-tutoopt]')) { U.tutoOpt = e.target.checked; return; }
    if (e.target.matches && e.target.matches('input[data-prekeep]')) { if (G && G.pre) { G.pre.keep = e.target.checked; save(); } return; }
    const ir = e.target.closest && e.target.closest('input[data-int]');
    if (ir && U.m) { U.m.S[U.side].tac.int = Number(ir.value); U.ctlSig = null; liveUpdate([]); const n = document.querySelector('input[data-int]'); if (n) n.focus(); return; }
    const ly = e.target.closest('[data-lyteam], select[data-lyf], [data-lyref]');
    if (ly && G) {
      const F = U.ly;
      if (ly.hasAttribute('data-lyref')) F.ref = ly.checked;
      else if (ly.dataset.lyteam) { const id = ly.dataset.lyteam; F.teams = ly.checked ? F.teams.concat(id) : F.teams.filter((x) => x !== id); F.open = true; }
      else F[ly.dataset.lyf] = Number(ly.value);
      render();
      return;
    }
    const rs = e.target.closest('select[data-rule]');
    if (rs && G) {
      const v = rs.value;
      me().tactic.rules[rs.dataset.rule][rs.dataset.field] = /^\d+$/.test(v) ? Number(v) : v;
      save(); render();
      return;
    }
    const sel = e.target.closest('select[data-pos]');
    if (!sel || !G) return;
    const t = me(), pos = sel.dataset.pos, pid = sel.value;
    const other = Object.keys(t.lineup).find((k) => k !== pos && t.lineup[k] === pid);
    if (other) t.lineup[other] = t.lineup[pos];
    t.lineup[pos] = pid;
    H.ensureSheet(t);
    save();
    render();
    const again = document.getElementById('slot-' + pos);
    if (again) again.focus();
  });

  document.addEventListener('dragstart', (e) => {
    const c = e.target.closest && e.target.closest('[data-drag]');
    if (!c) return;
    e.dataTransfer.setData('text/plain', c.dataset.drag);
    e.dataTransfer.effectAllowed = 'move';
    U.dragId = c.dataset.drag;
    // Fantôme compact (poste + nom) accroché au curseur, plutôt que la ligne entière décalée
    const p = G && me() && me().players.find((x) => x.id === c.dataset.drag);
    if (p && e.dataTransfer.setDragImage) {
      const g = document.createElement('div');
      g.className = 'dragghost';
      g.innerHTML = `<span class="pos${p.pos === 'GB' ? ' gb' : ''}">${p.pos}</span><b>${esc(short(p.name))}</b>`;
      document.body.appendChild(g);
      e.dataTransfer.setDragImage(g, 14, g.offsetHeight / 2);
      setTimeout(() => g.remove(), 0);
    }
    (c.closest('.mrow') || c).classList.add('dragging');
    document.body.classList.add('isdragging');
  });
  document.addEventListener('dragend', () => {
    U.dragId = null;
    document.body.classList.remove('isdragging');
    document.querySelectorAll('.dragging, .dropover, .droptg').forEach((x) => x.classList.remove('dragging', 'dropover', 'droptg'));
  });
  document.addEventListener('dragover', (e) => {
    const z = U.dragId && e.target.closest && e.target.closest('[data-drop]');
    if (!z) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    document.querySelectorAll('.dropover').forEach((x) => x !== z && x.classList.remove('dropover'));
    z.classList.add('dropover');
    // Joueur visé (X remplace Y) : surligné
    const tg = e.target.closest('.mrow[data-drag], .slot[data-drag]'), on = tg && tg.dataset.drag !== U.dragId && z.contains(tg) ? tg : null;
    document.querySelectorAll('.droptg').forEach((x) => x !== on && x.classList.remove('droptg'));
    if (on) on.classList.add('droptg');
  });
  document.addEventListener('drop', (e) => {
    const z = U.dragId && e.target.closest && e.target.closest('[data-drop]');
    if (!z) return;
    e.preventDefault();
    const tgt = e.target.closest('[data-drag]');
    document.querySelectorAll('.droptg').forEach((x) => x.classList.remove('droptg'));
    const id = U.dragId;
    U.dragId = null;
    document.body.classList.remove('isdragging');
    dropPlayer(id, z.dataset.drop, tgt && tgt.dataset.drag !== id ? tgt.dataset.drag : null, z.dataset.pos);
  });

  // ---------- Messagerie : le téléphone du coach ----------
  // Une conversation par contact, la plus récente en haut ; point et compteur sur celles qui ont du nouveau.
  const CONTACTS = {
    agent: { name: 'Max Commission', role: 'Agent de joueurs', ini: 'MC', c: 'var(--iso-office)' },
    kine: { name: 'Paulo Strap', role: 'Kiné du club', ini: 'PS', c: 'var(--iso-med)' },
    centre: { name: 'Josiane Relève', role: 'Directrice du centre de formation', ini: 'JR', c: 'var(--iso-youth)' }
  };
  // Message : texte brut (échappé à l'affichage), pl = joueurs libres présentés, y = jeune du centre, me = envoyé par toi
  function msg(c, t, extra) {
    G.inbox = G.inbox || [];
    const id = G.inbox.length ? G.inbox[G.inbox.length - 1].id + 1 : 1;
    G.inbox.push(Object.assign({ id, c, r: G.round, t, read: false }, extra || {}));
    if (G.inbox.length > 250) G.inbox.splice(0, G.inbox.length - 250);
  }
  const injTxt = (x) => `${x.name} : ${x.type.toLowerCase()}, ${x.n > 1 ? `absent ${x.n} matchs` : 'absent un match'}.`;
  const unread = (c) => (G.inbox || []).filter((m) => (!c || m.c === c) && !m.read).length;
  function inboxContacts() {
    const last = {};
    for (const m of G.inbox || []) last[m.c] = m.id;
    return Object.keys(last).filter((c) => CONTACTS[c]).sort((a, b) => last[b] - last[a]);
  }
  function phoneBtn() {
    const n = unread();
    return `<button class="phonebtn" data-act="inbox" aria-label="Messages${n ? ` : ${n} non lu${n > 1 ? 's' : ''}` : ''}" title="Messages">${WA_LOGO(30)}${n ? `<span class="pbadge">${n}</span>` : ''}</button>`;
  }
  // Ce qui intéresse l'agent : un profil surprise, un bon niveau ou un gros potentiel pour ton club, ou un poste où tu es court
  function freeWorth(p) {
    const t = me(), ref = sref();
    if (p.free.why) return 3;
    const fit = t.players.filter((x) => x.pos === p.pos && !H.hurt(x)).length;
    return H.stars(p.ovr, ref) >= 3 ? 2 : H.potRange(p, ref).hi >= 4 ? 1.5 : fit < 2 ? 1 : 0;
  }
  const told = (id) => (G.inbox || []).some((m) => m.pl && m.pl.includes(id));
  function roundMessages(fr) {
    const L = G.lastInj;
    if (L && (L.inj.length || L.back.length)) {
      const back = L.back.map((b) => b.name);
      msg('kine', `${L.inj.length ? `Point infirmerie après la journée ${G.round}. ${L.inj.map(injTxt).join(' ')}` : ''}${back.length ? `${L.inj.length ? ' ' : ''}${back.length > 1 ? `${back.slice(0, -1).join(', ')} et ${back[back.length - 1]} sont` : `${back[0]} est`} de retour, ${back.length > 1 ? 'aptes' : 'apte'} pour la suite.` : ''}`);
    }
    const late = fr.gone.filter((g) => told(g.p.id));
    if (late.length) msg('agent', late.map((g) => g.to ? `Trop tard pour ${g.p.name} : il s'engage avec ${T(g.to).name}.` : `${g.p.name} n'a rien trouvé en ${LEAGUE} : il part tenter sa chance à l'étranger.`).join(' '));
    const hot = fr.fresh.filter((p) => p.free.why);
    for (const p of hot) msg('agent', `Info de première main : ${T(p.free.from).name} se sépare de ${p.name} (${p.free.why}). Il est libre dès maintenant, et il ne le restera pas longtemps.`, { pl: [p.id] });
    const more = fr.fresh.filter((p) => !p.free.why && freeWorth(p) > 0).sort((a, b) => freeWorth(b) - freeWorth(a) || H.freeLevel(b) - H.freeLevel(a)).slice(0, 3);
    if (more.length) msg('agent', more.length > 1 ? 'Des joueurs viennent de se libérer, ça peut t\'intéresser :' : 'Un joueur vient de se libérer, il peut t\'intéresser :', { pl: more.map((p) => p.id) });
    if (G.youth) msg('centre', `Un jeune sort du centre après la journée ${G.round} : ${G.youth.p.name}, ${G.youth.p.pos}, ${G.youth.p.age} ans. Il attend ta réponse avant le prochain match.`, { y: G.youth.p.id });
  }
  const REFUS = {
    back: (n) => `${n} ne veut pas entendre parler d'un retour : c'est toi qui l'as libéré.`,
    small: (n) => `${n} vise plus haut que ton club pour l'instant. C'est non, et il ne changera pas d'avis.`,
    time: (n) => `${n} a regardé ton effectif : avec deux joueurs devant lui à son poste, il préfère un club où il jouera.`,
    gone: (n) => `Trop tard, ${n} n'est plus libre.`
  };
  function signFree(id) {
    const p = (G.free || []).find((x) => x.id === id), t = me();
    if (!p) return;
    const r = H.signFree(G, t, p);
    let txt;
    if (r.ok) txt = `C'est signé ! ${p.name} rejoint ${r.cf ? 'ton centre de formation' : 'ton effectif'}. Bienvenue à ${t.city}.`;
    else if (r.why === 'full') txt = p.age < H.CF.maxAge ? `Ton centre est plein (${H.FREE.cfMax} jeunes) : libère un jeune avant de signer ${p.name}.` : `Ton effectif pro est complet (${H.FREE.proMax} joueurs) : impossible de signer ${p.name} pour l'instant.`;
    else txt = (REFUS[r.why] || REFUS.small)(p.name);
    msg('agent', `On tente ${p.name} ?`, { me: true, read: true });
    msg('agent', txt, { read: U.inbox && U.inboxC === 'agent' });
    save();
    render();
    if (!(U.inbox && U.inboxC === 'agent')) notify(`<span class="nbadge" style="background:${CONTACTS.agent.c}">${CONTACTS.agent.ini}</span><span><b>${esc(CONTACTS.agent.name)}</b><br>${esc(txt)}</span>`, false);
  }
  function freeAction(p) {
    if (p.free.no) return `<span class="muted" title="${esc((REFUS[p.free.no] || REFUS.small)(p.name))}">A refusé</span>`;
    if (!H.freeRoom(me(), p)) return `<span class="muted">${p.age < H.CF.maxAge ? 'Centre plein' : 'Effectif complet'}</span>`;
    return `<button class="btn sm primary fsignbtn" data-act="fsign" data-id="${p.id}">Faire signer</button>`;
  }
  // Ouvre une conversation : ses messages passent en lus, le repère « Nouveau » se place avant le premier non lu
  function openConv(k) {
    U.inboxC = k;
    const first = (G.inbox || []).find((m) => m.c === k && !m.read && !m.me);
    U.ibNew = first ? first.id : null;
    for (const m of G.inbox || []) if (m.c === k) m.read = true;
    save();
  }
  // Carte d'un joueur présenté par l'agent : état à jour (libre, signé chez toi, parti ailleurs)
  function freeCard(id) {
    const f = findPlayer(id);
    if (!f) return '<div class="fcard gone"><span class="muted">Joueur parti hors de la ligue.</span></div>';
    const p = f.p, t = me();
    const state = p.free ? freeAction(p) : f.t.id === t.id ? '<span class="muted">Signé chez toi</span>' : `<span class="muted">Signé à ${esc(f.t.name)}</span>`;
    return `<div class="fcard"><span class="pos${p.pos === 'GB' ? ' gb' : ''}">${p.pos}</span><span class="fname">${plink(p)}<br><span class="muted">${p.age} ans${p.free ? ` · ex-${esc(T(p.free.from) ? T(p.free.from).name : '')}` : ''}</span></span><span class="fst">${lstars(p, { sm: true })}${pot(p, { sm: true })}</span>${state}</div>`;
  }
  // Messagerie façon appli de messagerie verte (« HandsApp ») : discussions à gauche, conversation à droite
  const WA_LOGO = (sz) => `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" aria-hidden="true"><path d="M12 2.2a9.8 9.8 0 0 0-8.5 14.7L2.2 21.8l5-1.3A9.8 9.8 0 1 0 12 2.2z" fill="#25d366"/><path d="M12 3.9a8.1 8.1 0 0 0-7 12.2l.2.4-.8 2.9 3-.8.4.2A8.1 8.1 0 1 0 12 3.9z" fill="none" stroke="#fff" stroke-width="1.4"/><path d="M8 10.2h8M8 13.6h5.4" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  const waTime = (m) => `${String(8 + (m.id * 7) % 14).padStart(2, '0')}:${String((m.id * 37) % 60).padStart(2, '0')}`;
  const WA_TICKS = '<svg class="waticks" viewBox="0 0 16 11" width="16" height="11" aria-label="Lu"><path d="M11.1.6 4.9 7.7 2.3 5.2l-.9.9 3.5 3.4L12 1.4z" fill="currentColor"/><path d="m15.1.6-6.2 7.1-.8-.8-.9.9 1.7 1.7L16 1.4z" fill="currentColor"/></svg>';
  function inboxModal() {
    if (!U.inbox || !G) return '';
    const flt = U.ibFilter || 'all';
    const cs = inboxContacts().filter((k) => flt === 'all' || unread(k) || k === U.inboxC);
    const av = (k) => `<span class="waav" style="background:${CONTACTS[k].c}" aria-hidden="true">${CONTACTS[k].ini}</span>`;
    const list = cs.map((k) => {
      const ms = G.inbox.filter((m) => m.c === k), last = ms[ms.length - 1], n = k === U.inboxC ? 0 : unread(k);
      return `<button class="warow${n ? ' new' : ''}" data-act="ibc" data-id="${k}" aria-current="${k === U.inboxC}">${av(k)}<span class="watxt"><span class="waname"><b>${esc(CONTACTS[k].name)}</b><span class="wadate">J${last.r}</span></span><span class="waprev">${last.me ? WA_TICKS : ''}<span>${esc(last.t)}</span>${n ? `<span class="wabadge" aria-label="${n} non lu${n > 1 ? 's' : ''}">${n}</span>` : ''}</span></span></button>`;
    }).join('');
    let conv = `<div class="waintro">${WA_LOGO(72)}<b>HandsApp</b><p>Ton agent, ton kiné et la directrice du centre t'écrivent ici au fil de la saison.</p><span class="wasecure">🔒 Messages du club, entre le staff et toi</span></div>`;
    if (U.inboxC && CONTACTS[U.inboxC]) {
      const k = U.inboxC, ms = G.inbox.filter((m) => m.c === k);
      let lastR = null;
      const rows = ms.map((m) => {
        let h = '';
        if (m.r !== lastR) { lastR = m.r; h += `<div class="waday"><span>${m.r ? `Après la journée ${m.r}` : 'Avant la saison'}</span></div>`; }
        if (m.id === U.ibNew) h += '<div class="waday wanew"><span>Non lus</span></div>';
        const cards = m.pl ? `<div class="wacards">${m.pl.map(freeCard).join('')}</div>` : '';
        const acts = m.y && G.youth && G.youth.p.id === m.y ? '<div class="waacts"><button data-act="yopen">Voir le jeune</button></div>' : '';
        return h + `<div class="wamsg${m.me ? ' me' : ''}"><div class="wabub">${esc(m.t)}${cards}<span class="wameta">${waTime(m)}${m.me ? WA_TICKS : ''}</span></div>${acts}</div>`;
      }).join('');
      conv = `<div class="wachead">${av(k)}<span class="watxt"><b>${esc(CONTACTS[k].name)}</b><span class="wasub">${esc(CONTACTS[k].role)}</span></span><button class="waicon" data-act="inboxclose" aria-label="Fermer" title="Fermer">✕</button></div>
        <div class="wamsgs">${rows}</div>
        <div class="wacompose" title="On répond avec les boutons des messages"><span class="waicon" aria-hidden="true">☺</span><span class="waicon" aria-hidden="true">+</span><span class="wainput">Écrire un message</span></div>`;
    }
    return `<div class="overlay" id="inboxov" role="dialog" aria-modal="true" aria-label="Messages"><div class="modal wa">
      <aside class="waside"><div class="wahead"><span class="wabrand">HandsApp</span>${U.inboxC ? '' : '<button class="waicon" data-act="inboxclose" aria-label="Fermer" title="Fermer">✕</button>'}</div>
        <div class="wachips">${[['all', 'Toutes'], ['unread', 'Non lues']].map(([k, l]) => `<button data-act="ibflt" data-id="${k}" aria-pressed="${flt === k}">${l}</button>`).join('')}</div>
        <nav class="walist" aria-label="Discussions">${list || `<p class="waempty">${flt === 'unread' ? 'Aucun message non lu.' : 'Aucune discussion pour l\'instant.'}</p>`}</nav></aside>
      <section class="wamain">${conv}</section></div></div>`;
  }

  // ---------- Siège : les joueurs libres ----------
  function renderFree() {
    const t = me(), free = (G.free || []).slice().sort((a, b) => !!b.free.why - !!a.free.why || H.freeLevel(b) - H.freeLevel(a));
    const pros = t.players.filter((p) => !p.cf).length, cf = H.cfOf(t).length;
    const rows = free.map((p) => `<tr><td class="nw"><span class="pos${p.pos === 'GB' ? ' gb' : ''}">${p.pos}</span> ${plink(p)}</td><td class="r">${p.age}</td><td class="nw">${lstars(p, { sm: true })}</td><td class="nw">${pot(p, { sm: true })}</td>
      <td class="nw"><span title="${esc(T(p.free.from).name)}">${badge(T(p.free.from), true)}</span></td><td class="fwhy">${p.free.why ? esc(p.free.why[0].toUpperCase() + p.free.why.slice(1)) : '<span class="muted">Libéré du centre</span>'}</td>
      <td class="r muted">J${p.free.since}</td><td class="r">${freeAction(p)}</td></tr>`).join('');
    const signs = (G.signs || []).slice().reverse();
    return `<div class="freegrid"><section class="panel"><div class="row" style="justify-content:space-between;gap:8px;margin-bottom:10px"><h3 style="margin:0">Joueurs libres · ${free.length}</h3><span class="row" style="gap:6px"><span class="chip">Pros <b>${pros}/${H.FREE.proMax}</b></span><span class="chip">Centre <b>${cf}/${H.FREE.cfMax}</b></span></span></div>
      ${free.length ? `<div class="scroll"><table class="ly"><thead><tr><th>Joueur</th><th class="r">Âge</th><th>Niveau</th><th>Potentiel</th><th>Ex-club</th><th>Raison</th><th class="r" title="Libre depuis la journée">Depuis</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="muted" style="margin:0">Personne sur le marché pour l\'instant. Les centres de formation libèrent des jeunes toutes les 5 journées, et un club se sépare parfois d\'un joueur en cours de saison.</p>'}
      <p class="legend" style="margin:10px 0 0">Un joueur reste libre au plus ${H.FREE.weeks} semaines, et chaque semaine un autre club peut le signer avant toi. Les moins de 23 ans rejoignent ton centre de formation, les autres l'effectif pro. Un joueur peut refuser si ton club est trop modeste pour lui ou s'il ne voit pas de temps de jeu : sa réponse est définitive.</p></section>
      <section class="panel"><h3>Arrivées</h3>${signs.length ? signs.map((s) => `<div class="row" style="gap:8px;padding-block:3px"><span class="muted num">J${s.round}</span><span class="pos${s.pos === 'GB' ? ' gb' : ''}">${s.pos}</span>${(() => { const f = findPlayer(s.id); return f ? plink(f.p) : esc(s.name); })()}<span class="muted">ex-${esc(T(s.from) ? T(s.from).name : s.from)}</span></div>`).join('') : '<p class="muted" style="margin:0">Pas encore de recrue cette saison. Ton agent te signale les joueurs intéressants dans tes messages.</p>'}</section></div>`;
  }

  // ---------- Tuto : l'adjoint accompagne la première journée ----------
  // Un conseil par écran, la première fois qu'on y arrive. Le « ? » de la barre d'onglets le rouvre à tout moment.
  const TUTO = {
    ville: { h: 'Bienvenue en ville, coach', at: '.nextbtn', t: "Chaque bâtiment est un écran du club : la salle pour jouer, le vestiaire pour l'effectif, le gymnase pour l'entraînement… Survole-le pour voir l'essentiel, clique pour y entrer ; un faisceau lumineux signale un lieu qui attend ta décision. Pas besoin de tout visiter : le bouton en haut à droite mène toujours à l'étape suivante." },
    mods: { h: 'Ton bonus et ton malus', at: '.modsbtn', t: "Ils jouent toute la saison. Ce bouton te les rappelle quand tu veux. Et si tu te perds, le « ? » au bout des onglets rouvre mes conseils." },
    avantmatch: { h: "L'avant-match", at: '[data-act=kickoff]', t: "À gauche ton plan de match, au centre l'adversaire : sa forme, sa tactique, ses joueurs à surveiller. Quand tu es prêt, « Préparer le match »." },
    feuille: { h: 'La feuille de match', at: '#preov [data-act=auto]', t: "Sur le terrain, tes 7 de départ ; à côté, le banc et la réserve. Pour un changement, les boutons T, B, R de sa ligne : tu choisis qui prend sa place. Tu peux aussi glisser un joueur par sa poignée (⠿) sur celui qu'il remplace. Les étoiles donnent le niveau ; un joueur fatigué rate plus. Pas sûr de toi ? « Composition auto » fait le travail. Tes consignes se règlent aussi ici, en bas." },
    tactique: { h: 'La tactique du match', at: '[data-tuto=face]', t: "Choisis ta défense, ton attaque et ton rythme, puis au plus une consigne par type : attaque, défense, transition et gestion (le détail s'affiche au survol). Aucun réglage ne gagne à tous les coups : chacun a son contre. Le face-à-face, en bas, compare tes arrières à leurs défenseurs. En cas de doute, garde tout tel quel et donne le coup d'envoi." },
    live: { h: 'Le match en direct', at: '.lbpause', ok: "Compris, coup d'envoi", t: "Le match attend que tu aies lu. Le fil raconte chaque action, la courbe sous le score montre qui domine. Changements et réglages se font en pause (barre d'espace ou bouton en bas). Tu peux aussi accélérer en ×2 ou ×4." },
    post: { h: 'Après le match', at: 'main .btn.primary[data-id=entrainement]', t: "Les notes de tes joueurs, l'homme du match, les blessés éventuels. Ensuite, une semaine d'entraînement avant la journée suivante." },
    entrainement: { h: "L'entraînement", at: '[data-act=dotrain]', t: "Choisis un thème et une intensité. Plus c'est dur, plus tes joueurs progressent, mais plus ils arrivent fatigués au match et plus le risque de blessure monte. Puis « Lancer la semaine »." },
    championnat: { h: 'Le championnat', t: `Classement, résultats et calendrier de la ${LEAGUE} : 30 journées en aller-retour. Un faux pas n'est pas grave, le titre se joue sur la durée.` }
  };
  // Conseils de l'écran affiché, dans l'ordre
  function tutoScreen() {
    if (!G) return [];
    if (U.preStep && G.pre) return [U.preStep === 1 ? 'feuille' : 'tactique'];
    if (U.tab === 'ville') return ['ville', 'mods'];
    if (U.tab === 'match') {
      if (U.view === 'live' && U.m) return ['live'];
      if (U.view === 'post' && U.post) return ['post'];
      const nf = nextFixture();
      return !G.ended && !G.trainPending && nf && !nf.rest ? ['avantmatch'] : [];
    }
    if (U.tab === 'entrainement') return ['entrainement'];
    if (U.tab === 'championnat') return ['championnat'];
    return [];
  }
  function tutoCur() {
    if (!G || !G.tuto || (U.youthModal && G.youth) || U.modsModal || U.inbox || U.bsModal || document.getElementById('psheet')) return null;
    const keys = tutoScreen();
    if (U.tutoAsk !== undefined && U.tutoAsk !== null) {
      if (U.tutoAsk < keys.length && U.tutoAt === keys.join()) return keys[U.tutoAsk];
      U.tutoAsk = null;
    }
    if (!G.tuto.on) return null;
    return keys.find((k) => !G.tuto.seen.includes(k)) || null;
  }
  function tutoHl() {
    const k = U.tutoKey;
    for (const el of document.querySelectorAll('.tuto-hl')) if (!k || !TUTO[k].at || !el.matches(TUTO[k].at)) el.classList.remove('tuto-hl');
    const el = k && TUTO[k].at ? document.querySelector(TUTO[k].at) : null;
    if (el) el.classList.add('tuto-hl');
  }
  function tutoSync() {
    const k = tutoCur();
    let el = document.getElementById('tuto');
    if (!k) { U.tutoKey = null; if (el) el.remove(); tutoHl(); return; }
    if (!el) { el = document.createElement('aside'); el.id = 'tuto'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-labelledby', 'tutoh'); document.body.appendChild(el); }
    const tip = TUTO[k], ask = U.tutoAsk !== null && U.tutoAsk !== undefined;
    const n = Object.keys(TUTO).length, i = Math.min(n, G.tuto.seen.length + (G.tuto.seen.includes(k) ? 0 : 1));
    const sig = `${k}|${ask}|${G.tuto.on}|${!!U.tutoHold}`;
    if (el.dataset.k !== sig) {
      el.dataset.k = sig;
      el.innerHTML = `<div class="tutohead"><span class="label">L'adjoint${ask || !G.tuto.on ? '' : ` · ${i}/${n}`}</span>${!ask && G.tuto.on ? '<button class="linkbtn" data-act="tutooff">Couper le tuto</button>' : ''}</div><b id="tutoh">${esc(tip.h)}</b><p>${esc(tip.t)}</p><div class="row"><button class="btn primary" data-act="tutook">${esc(tip.ok && U.tutoHold ? tip.ok : 'Compris')}</button></div>`;
      el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    }
    el.classList.toggle('live', U.tab === 'match' && U.view === 'live');
    U.tutoKey = k;
    tutoHl();
  }
  // Compris (off = false) ou Couper le tuto (off = true)
  function tutoDone(off) {
    const k = U.tutoKey;
    if (!G || !k) return;
    if (U.tutoAsk !== null && U.tutoAsk !== undefined) U.tutoAsk += 1;
    else if (G.tuto.on) {
      if (!G.tuto.seen.includes(k)) G.tuto.seen.push(k);
      const all = Object.keys(TUTO).every((x) => G.tuto.seen.includes(x));
      if (off || all) {
        G.tuto.on = false;
        notify(`<span><b>L'adjoint te laisse la main</b><br>Le « ? » au bout des onglets rouvre ses conseils.</span>`, false);
      }
      save();
    }
    if (U.tutoHold) {
      U.tutoHold = false;
      if (U.m && U.view === 'live' && U.paused && !U.tPanel) { U.paused = false; liveUpdate([]); schedule(); }
    }
    tutoSync();
    const b = document.querySelector('#tuto [data-act=tutook]');
    if (b) b.focus({ preventScroll: true });
  }

  // ---------- Démarrage ----------
  function start(data) {
    G = load();
    if (G && G.pre) { dropPre(); save(); }
    if (G) {
      U.tab = (data && data.tab) || 'ville';
      if (G.last && G.last.round === G.round && !G.ended) U.post = null;
    }
    render();
  }
  if (window.claude && window.claude.hot && window.claude.hot.snapshot) {
    try { window.claude.hot.snapshot(() => ({ tab: U.tab })); } catch (e) { /* ignore */ }
  }
  if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(start);
  else start((window.claude && window.claude.hot && window.claude.hot.data) || {});
})();
