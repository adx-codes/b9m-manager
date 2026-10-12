(function (root) {
  'use strict';

  // ---------- RNG ----------
  let R = Math.random;
  function setSeed(seed) {
    let s = seed >>> 0;
    R = function () {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rnd = () => R();
  const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const pick = (a) => a[Math.floor(R() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function gauss() {
    let u = 0, v = 0;
    while (!u) u = R();
    while (!v) v = R();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function wpick(items, wf) {
    const w = items.map(wf);
    const s = w.reduce((a, b) => a + Math.max(0, b), 0);
    if (s <= 0) return pick(items);
    let r = R() * s;
    for (let i = 0; i < items.length; i++) {
      r -= Math.max(0, w[i]);
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  // ---------- Données de base ----------
  const POS = ['GB', 'AiG', 'ArG', 'DC', 'ArD', 'AiD', 'Piv'];
  const POS_LABEL = {
    GB: 'Gardien', AiG: 'Ailier gauche', ArG: 'Arrière gauche', DC: 'Demi-centre',
    ArD: 'Arrière droit', AiD: 'Ailier droit', Piv: 'Pivot'
  };
  const FIELD = [
    ['tirLoin', 'Tir de loin (9 m)'], ['tirPres', 'Tir de près (6 m)'], ['tirAile', "Tir de l'aile"],
    ['penalty', 'Pénalty (7 m)'], ['passes', 'Passes'], ['position', 'Prise de position'],
    ['vision', 'Vision de jeu'], ['duel', 'Duel / pénétration'], ['vitesse', 'Vitesse'],
    ['contre', 'Contre'], ['duelDef', 'Duel défensif'], ['discipline', 'Discipline'], ['endurance', 'Endurance'], ['sangfroid', 'Sang-froid']
  ];
  const TRAITS = [['excentricite', 'Excentricité'], ['collectif', 'Esprit collectif']];
  // Robustesse (tous les joueurs, gardiens compris) : résistance aux blessures, ne compte pas dans le niveau et ne s'entraîne pas
  const ROBUST = ['robustesse', 'Robustesse'];
  const robustOf = (age) => clamp(Math.round(12.5 - Math.max(0, age - 30) * 0.6 + gauss() * 3.5), 1, 20);
  const GKA = [['reflexes', 'Réflexes'], ['placement', 'Placement'], ['gk7m', 'Arrêts sur 7 m'], ['relance', 'Relance'], ['endurance', 'Endurance']];
  const WEIGHTS = {
    GB: { reflexes: 0.4, placement: 0.35, gk7m: 0.15, relance: 0.1 },
    AiG: { tirAile: 0.37, vitesse: 0.3, position: 0.15, penalty: 0.1, duelDef: 0.08 },
    AiD: { tirAile: 0.37, vitesse: 0.3, position: 0.15, penalty: 0.1, duelDef: 0.08 },
    ArG: { tirLoin: 0.35, duel: 0.25, passes: 0.15, contre: 0.08, duelDef: 0.07, tirPres: 0.1 },
    ArD: { tirLoin: 0.35, duel: 0.25, passes: 0.15, contre: 0.08, duelDef: 0.07, tirPres: 0.1 },
    DC: { vision: 0.3, passes: 0.2, duel: 0.2, sangfroid: 0.15, tirLoin: 0.15 },
    Piv: { tirPres: 0.45, position: 0.3, contre: 0.1, duelDef: 0.15 }
  };
  // Attributs travaillés à l'entraînement : ceux du poste, plus endurance et discipline pour les joueurs de champ
  const POS_ATTRS = Object.fromEntries(Object.entries(WEIGHTS).map(([k, w]) => [k, Object.keys(w).concat(k === 'GB' ? [] : ['endurance', 'discipline'])]));
  const SECONDARY = { GB: [], DC: ['ArG', 'ArD'], ArG: ['DC', 'AiG'], ArD: ['DC', 'AiD'], AiG: ['ArG'], AiD: ['ArD'], Piv: [] };
  function ovrAt(p, pos) {
    if (pos === p.pos) return p.ovr;
    if ((pos === 'GB') !== (p.pos === 'GB')) return 0;
    const w = WEIGHTS[pos];
    let v = 0;
    for (const k in w) v += w[k] * (p.a[k] || 0);
    if (SECONDARY[p.pos].includes(pos)) v = Math.max(v, p.ovr * 0.85);
    return Math.round(v * 10) / 10;
  }
  function potFor(p) {
    const head = p.age < 21 ? 2 + rnd() * 4 : p.age < 24 ? 1 + rnd() * 3 : p.age < 28 ? rnd() * 1.5 : p.age < 31 ? rnd() * 0.5 : 0;
    return Math.round(clamp(p.ovr + head, 1, 20) * 10) / 10;
  }
  // ---------- Étoiles (affichage seulement : le moteur garde la note sur 20) ----------
  // Échelle relative au club de référence (le club du joueur), comme dans FM :
  // le titulaire moyen du club vaut 3,5 étoiles, 1,6 point de note = 1 étoile.
  const half = (v) => Math.round(v * 2) / 2;
  function starRef(t) {
    const best = POS.map(pos => t.players.filter(p => p.pos === pos).reduce((m, p) => Math.max(m, p.ovr), 0)).filter(v => v > 0);
    return best.reduce((a, b) => a + b, 0) / Math.max(1, best.length);
  }
  const starRaw = (v, ref) => clamp(3.5 + (v - ref) / 1.6, 0.5, 5);
  const stars = (v, ref) => clamp(half(starRaw(v, ref)), 0.5, 5);
  // Biais fixe de l'estimation du staff, tiré de l'identifiant (stable, rien à sauvegarder)
  function potBias(p) {
    let h = 2166136261;
    for (const c of String(p.id)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return ((h >>> 0) % 1000) / 999;
  }
  // Marge d'incertitude du potentiel, en étoiles : large chez les très jeunes, nulle à partir de 24 ans
  const potMargin = (age) => age <= 18 ? 1.5 : age <= 20 ? 1 : age <= 23 ? 0.5 : 0;
  function potRange(p, ref) {
    const cur = stars(p.ovr, ref), pot = p.pot ?? p.ovr, w = potMargin(p.age);
    if (!w) { const v = Math.max(cur, stars(pot, ref)); return { lo: v, hi: v, cur, w }; }
    let lo = half(starRaw(pot, ref) - w * potBias(p));
    let hi = Math.min(5, lo + w);
    lo = clamp(Math.max(lo, cur), 0.5, 5); hi = Math.max(hi, lo);
    return { lo, hi, cur, w };
  }
  const STAR_LABEL = [[5, 'Joueur clé'], [4, 'Titulaire solide'], [3, 'Titulaire correct'], [2, 'Joueur de rotation'], [1, 'Remplaçant'], [0, 'Niveau insuffisant']];
  const POT_LABEL = [[5, 'Peut devenir un joueur clé'], [4, 'Peut devenir un titulaire solide'], [3, 'Peut devenir titulaire'], [2, 'Peut devenir un joueur de rotation'], [0, 'Avenir limité']];
  const starLabel = (s) => STAR_LABEL.find(([m]) => s >= m)[1];
  const potLabel = (s) => POT_LABEL.find(([m]) => s >= m)[1];
  // Clubs fictifs d'origine : gardés pour les parties commencées avant la saison réelle
  const LEGACY_CLUBS = [
    { id: 'PAR', name: 'Lutèce Handball', city: 'Paris', rep: 5, color: '#1d3f8f', color2: '#c8a24a', fans: { h: 3, a: 2, name: "Les Râleurs du Périph" }, academy: 4 },
    { id: 'MTP', name: 'Montpellier Comédie HB', city: 'Montpellier', rep: 5, color: '#0f6e8c', color2: '#e39a5b', fans: { h: 4, a: 3, name: "La Claque" }, academy: 5 },
    { id: 'LYO', name: 'Lyon Confluence HB', city: 'Lyon', rep: 4, color: '#a4161a', color2: '#d9b45a', fans: { h: 3, a: 2, name: "Les Bouchons Lyonnais" }, academy: 3 },
    { id: 'TLS', name: 'Toulouse Briques Roses', city: 'Toulouse', rep: 4, color: '#c2185b', color2: '#5fb3a1', fans: { h: 4, a: 3, name: "Les Chocolatines Ultras" }, academy: 3 },
    { id: 'NAN', name: 'Les Éléphants de Nantes', city: 'Nantes', rep: 4, color: '#2e7d32', color2: '#e3c35a', fans: { h: 5, a: 4, name: "Les Bretons Contrariés" }, academy: 4 },
    { id: 'BDX', name: 'Bordeaux Garonne HB', city: 'Bordeaux', rep: 4, color: '#6a1b4d', color2: '#d8b46a', fans: { h: 3, a: 2, name: "Les Grands Crus" }, academy: 3 },
    { id: 'REN', name: 'Rennes Hermine HB', city: 'Rennes', rep: 3, color: '#111111', color2: '#c8453b', fans: { h: 4, a: 3, name: "Les Galettes-Saucisses" }, academy: 3 },
    { id: 'MRS', name: 'Marseille Calanques HB', city: 'Marseille', rep: 3, color: '#1b8bb4', color2: '#e7b75a', fans: { h: 4, a: 3, name: "Les Sardines du Vieux-Port" }, academy: 2 },
    { id: 'LIL', name: 'Lille Beffroi HB', city: 'Lille', rep: 3, color: '#c62828', color2: '#5b7fa8', fans: { h: 4, a: 3, name: "Les Fricadelles du Beffroi" }, academy: 3 },
    { id: 'STR', name: 'Strasbourg Rhin HB', city: 'Strasbourg', rep: 3, color: '#455a9a', color2: '#e2b45c', fans: { h: 3, a: 2, name: "Les Choucroutés" }, academy: 3 },
    { id: 'NCE', name: 'Nice Baie des Anges', city: 'Nice', rep: 2, color: '#e65100', color2: '#2f5d7c', fans: { h: 2, a: 1, name: "Les Retraités de la Prom" }, academy: 2 },
    { id: 'STE', name: 'Saint-Étienne Forez HB', city: 'Saint-Étienne', rep: 2, color: '#1b5e20', color2: '#e0c060', fans: { h: 4, a: 4, name: "Les Verts de Rage" }, academy: 3 },
    { id: 'GRE', name: 'Grenoble Tacos HB', city: 'Grenoble', rep: 4, color: '#b8860b', color2: '#3d5a80', fans: { h: 3, a: 2, name: "Les Gratinés" }, academy: 3 },
    { id: 'ANG', name: 'Angers Redbox HB', city: 'Angers', rep: 3, color: '#4a5a6a', color2: '#d98c5f', fans: { h: 3, a: 2, name: "Les Pouces Bleus" }, academy: 3 },
    { id: 'DIJ', name: 'Dijon Moutarde HB', city: 'Dijon', rep: 2, color: '#8d8a1c', color2: '#7a2e3a', fans: { h: 2, a: 2, name: "Les Moutardes au Nez" }, academy: 2 },
    { id: 'CLE', name: 'Clermont Volcans HB', city: 'Clermont-Ferrand', rep: 3, color: '#8b3a2b', color2: '#e0a34a', fans: { h: 3, a: 2, name: "Les Bibendums" }, academy: 2 }
  ];
  // Saison réelle (src/starligue.js) : clubs du championnat et effectifs ; sans elle, les clubs fictifs
  const DATA = typeof HBDATA !== 'undefined' ? HBDATA : (typeof module !== 'undefined' && module.exports ? (() => { try { return require('./starligue.js'); } catch (e) { return null; } })() : root.HBDATA || null);
  const CLUBS = DATA && DATA.clubs && DATA.clubs.length ? DATA.clubs : LEGACY_CLUBS;
  // Noms : un clin d'œil aux régions des clubs, quelques joueurs venus d'ailleurs
  const FIRST = ['Lucas', 'Hugo', 'Théo', 'Nathan', 'Louis', 'Enzo', 'Mathis', 'Tom', 'Noah', 'Jules', 'Maxime', 'Antoine', 'Romain', 'Dylan', 'Yanis', 'Baptiste', 'Valentin', 'Ludovic', 'Benoît', 'Sami', 'Adrien', 'Kevin', 'Rémi', 'Jérémy', 'Quentin', 'Bastien', 'Thibault', 'Aymeric', 'Pierre', 'Mehdi', 'Ibrahima', 'Florian', 'Arthur', 'Samuel', 'Elias', 'Raphaël', 'Karim', 'Moussa', 'Nicolas', 'Julien'];
  const LAST = ['Martin', 'Bernard', 'Dubois', 'Leroy', 'Moreau', 'Lefèvre', 'Garnier', 'Chevalier', 'Roussel', 'Perrin', 'Morel', 'Fournier', 'Girard', 'Bonnet', 'Lambert', 'Fontaine', 'Rousseau', 'Vincent', 'Blanc', 'Guérin', 'Boyer', 'Gauthier', 'Robin', 'Clément', 'Mbaye', 'Diallo', 'Traoré', 'Benali', 'Haddad', 'Marchand', 'Picard', 'Barbier', 'Arnaud', 'Renaud', 'Brun'];
  const REGION_NAMES = {
    bretagne: { first: ['Erwan', 'Yann', 'Gaël', 'Malo', 'Ewen', 'Loïc', 'Corentin', 'Killian', 'Brieuc', 'Tanguy', 'Goulven', 'Ronan', 'Maël', 'Armel'], last: ['Le Gall', 'Le Goff', 'Kerjean', "Guivarc'h", 'Le Bihan', 'Tanguy', 'Riou', 'Quéméner', 'Le Roux', 'Morvan', 'Kervella', 'Cadiou', 'Le Floch', 'Le Bris', 'Guéguen', 'Le Corre', 'Jézéquel', 'Kerhervé'] },
    ouest: { first: ['Clément', 'Bastien', 'Mathéo', 'Gaëtan', 'Loïc', 'Maxence'], last: ['Rousseau', 'Chauvin', 'Gaudin', 'Pasquier', 'Tessier', 'Bouchet', 'Guérin', 'Brossard', 'Rabiller', 'Gautreau', 'Retailleau', 'Baudry', 'Boisseau', 'Pineau'] },
    nord: { first: ['Kévin', 'Dylan', 'Grégory', 'Jordan', 'Mathieu', 'Florian'], last: ['Delattre', 'Lefebvre', 'Vandenberghe', 'Desmet', 'Leclercq', 'Dumortier', 'Vanhoutte', 'Lemaire', 'Deschamps', 'Vercruysse', 'Dewaele', 'Delannoy', 'Wattiez', 'Pruvost'] },
    alsace: { first: ['Florian', 'Thomas', 'Luc', 'Mathias', 'Frédéric', 'Joël'], last: ['Muller', 'Schmitt', 'Meyer', 'Wolff', 'Klein', 'Weber', 'Hoffmann', 'Koenig', 'Fischer', 'Zimmermann', 'Stoeckel', 'Ehrhart', 'Burckel', 'Wurtz'] },
    paris: { first: ['Yanis', 'Ilyes', 'Samy', 'Adam', 'Bilal', 'Hugo', 'Paul'], last: ['Martin', 'Dubois', 'Lefèvre', 'Moreau', 'Diallo', 'Traoré', 'Benali', 'Haddad', 'Mendy', 'Camara', 'Nguyen', 'Da Silva', 'Lemoine', 'Rivière'] },
    provence: { first: ['Marius', 'Fabien', 'Olivier', 'Anthony', 'Rémi', 'Lucas'], last: ['Agostini', 'Fabre', 'Giraud', 'Castellani', 'Martini', 'Rossi', 'Santoni', 'Olivieri', 'Bertolini', 'Camoin', 'Roubaud', 'Bianchi', 'Gasparini', 'Mariani'] },
    sudouest: { first: ['Mathieu', 'Thibault', 'Bixente', 'Peio', 'Hugo', 'Romain'], last: ['Laborde', 'Etcheverry', 'Lafargue', 'Larrieu', 'Dupuy', 'Castaing', 'Bordenave', 'Cazenave', 'Lacoste', 'Fourcade', 'Lacombe', 'Salvat', 'Marty', 'Barthe'] },
    alpes: { first: ['Baptiste', 'Clément', 'Rémi', 'Jules', 'Valentin', 'Loris'], last: ['Girard', 'Chabert', 'Roux', 'Faure', 'Brun', 'Blanc', 'Gauthier', 'Chambon', 'Fayolle', 'Vidal', 'Rochette', 'Pélissier', 'Rey', 'Juge'] },
    auvergne: { first: ['Aurélien', 'Damien', 'Cyril', 'Hugo', 'Benjamin'], last: ['Chassaing', 'Vialle', 'Fayolle', 'Bonnefoy', 'Teyssier', 'Rochon', 'Vernet', 'Chambon', 'Delmas', 'Bayle'] },
    bourgogne: { first: ['Arnaud', 'Guillaume', 'Damien', 'Victor', 'Thomas'], last: ['Bonnot', 'Rameau', 'Guillot', 'Perrot', 'Bourgeois', 'Moreau', 'Morel', 'Perrin', 'Gautheron', 'Bretin'] }
  };
  const CLUB_REGION = { PAR: 'paris', MTP: 'sudouest', LYO: 'alpes', TLS: 'sudouest', NAN: 'ouest', BDX: 'sudouest', REN: 'bretagne', MRS: 'provence', LIL: 'nord', STR: 'alsace', NCE: 'provence', STE: 'alpes', GRE: 'alpes', ANG: 'ouest', DIJ: 'bourgogne', CLE: 'auvergne' };
  const FOREIGN = {
    DK: { flag: '🇩🇰', first: ['Mads', 'Rasmus', 'Magnus', 'Jesper', 'Emil', 'Frederik'], last: ['Nielsen', 'Pedersen', 'Sørensen', 'Kristensen', 'Mortensen', 'Holm'] },
    DE: { flag: '🇩🇪', first: ['Lukas', 'Jonas', 'Finn', 'Tobias', 'Niklas', 'Felix'], last: ['Schmidt', 'Becker', 'Wagner', 'Schäfer', 'Krüger', 'Hartmann'] },
    NO: { flag: '🇳🇴', first: ['Sander', 'Kristian', 'Eirik', 'Henrik', 'Sindre'], last: ['Berg', 'Haugen', 'Bakken', 'Strand', 'Lunde'] },
    ES: { flag: '🇪🇸', first: ['Jorge', 'Álex', 'Daniel', 'Iker', 'Pablo'], last: ['Fernández', 'Ruiz', 'Navarro', 'Ortega', 'Serrano'] },
    HR: { flag: '🇭🇷', first: ['Ivan', 'Luka', 'Marin', 'Domagoj', 'Josip'], last: ['Horvat', 'Kovačević', 'Babić', 'Marić', 'Jurić'] },
    RS: { flag: '🇷🇸', first: ['Nemanja', 'Stefan', 'Miloš', 'Dragan'], last: ['Petrović', 'Jovanović', 'Nikolić', 'Marković'] },
    SE: { flag: '🇸🇪', first: ['Oscar', 'Viktor', 'Albin', 'Gustav'], last: ['Lindqvist', 'Eriksson', 'Nyström', 'Bergström'] },
    IS: { flag: '🇮🇸', first: ['Gunnar', 'Bjarki', 'Arnar', 'Ómar'], last: ['Sigurðsson', 'Jónsson', 'Gunnarsson', 'Magnússon'] }
  };
  function makeName(teamId) {
    if (rnd() < 0.12) { const code = pick(Object.keys(FOREIGN)), f = FOREIGN[code]; return { name: pick(f.first) + ' ' + pick(f.last), nat: code }; }
    const reg = REGION_NAMES[CLUB_REGION[teamId] || (CLUBS.find(c => c.id === teamId) || {}).region];
    const first = reg && rnd() < 0.5 ? pick(reg.first) : pick(FIRST);
    const last = reg && rnd() < 0.7 ? pick(reg.last) : pick(LAST);
    return { name: first + ' ' + last };
  }
  // Drapeau d'un joueur étranger : pays connus des noms générés, sinon tiré du code pays (deux lettres)
  const flagOf = (p) => {
    if (!p || !p.nat || p.nat === 'FR') return '';
    if (FOREIGN[p.nat]) return FOREIGN[p.nat].flag;
    return /^[A-Z]{2}$/.test(p.nat) ? String.fromCodePoint(...[...p.nat].map(c => 0x1f1e6 + c.charCodeAt(0) - 65)) : '';
  };
  const TACTIC_DEFS = ['6-0', '5-1', '4-2'];
  const JEU = { collectif: 'Collectif', equilibre: 'Équilibré', individuel: 'Individuel' };
  const DSTYLE = { zone: 'Défense collective', homme: 'Homme à homme' };
  const GESTES = {
    aile: ['Roucoulette', 'Kung-fu'], pivot: ['Tir dans le dos', 'Roucoulette'], loin: ['Tir à la hanche', 'Tir rebond'],
    percee: ['Tir à la hanche', 'Chabala'], ca: ['Chabala', 'Kung-fu', 'Tir dans le dos'], er: ['Chabala', 'Tir à la hanche']
  };
  const MODS = {
    video: { label: 'Vidéo', plus: ["L'analyste dort au bureau", "Les tireurs adverses n'ont plus de secrets : défenseurs à +1 en contre et en duel défensif dans les face-à-face, gardiens à +1 sur les 7 m."], minus: ["La clé USB est restée à l'hôtel", 'On découvre les adversaires sur le terrain : défenseurs à −1 en contre et en duel défensif dans les face-à-face, gardiens à −1 sur les 7 m.'] },
    staff: { label: 'Staff', plus: ['Un staff bac+12', "Progression à l'entraînement ×1,8."], minus: ['Le staff joue à Fortnite', "Progression à l'entraînement ×0,4."] },
    deplacements: { label: 'Déplacements', plus: ['Le car a des sièges massants', "À l'extérieur, aucune fatigue du trajet, et le handicap du visiteur (pertes de balle, exclusions) est divisé par deux."], minus: ['Retour en TER Intercités', "À l'extérieur, 10 points de fatigue en plus au coup d'envoi, un handicap du visiteur (pertes de balle, exclusions) ×1,5, et 6 points récupérés en moins après chaque déplacement."] },
    capitanat: { label: 'Capitanat', plus: ['Un capitaine qui hausse le ton', 'Temps morts plus efficaces (regain au tir sur 10 possessions au lieu de 6, 7 points de fatigue en moins au lieu de 4), et il parle aux arbitres : 12 % d\'exclusions en moins.'], minus: ['Le brassard tourne chaque semaine', "Temps morts moins écoutés (regain au tir sur 3 possessions, 2 points de fatigue en moins seulement), et personne ne calme le jeu : 12 % d'exclusions en plus."] },
    vestiaire: { label: 'Vestiaire', plus: ['Barbecue tous les dimanches', 'Cohésion de départ à 75.'], minus: ['Deux groupes WhatsApp', 'Cohésion de départ à 35.'] },
    soins: { label: 'Soins', plus: ['Le kiné a des mains de fée', '20 % de fatigue en moins pendant les matchs, et 10 points récupérés en plus entre deux journées.'], minus: ['Le kiné est parti à Ibiza', '7 points de fatigue récupérés en moins entre deux journées.'] },
    cage: { label: 'Cage', plus: ['Un mur dans les cages', 'Gardiens à +1 en réflexes et en placement.'], minus: ['Des mains en beurre doux', 'Gardiens à −1 en réflexes et en placement.'] },
    discipline: { label: 'Discipline', plus: ['Des enfants de chœur', '+4 en discipline pour tous : moins d\'exclusions.'], minus: ['Sang chaud garanti', '−4 en discipline pour tous : plus d\'exclusions.'] },
    spectacle: { label: 'Spectacle', plus: ['Les Harlem Globetrotters du hand', '+3 en excentricité, et des gestes mieux exécutés (+12 % de réussite).'], minus: ['Roucoulette interdite au règlement intérieur', '−6 en excentricité, et un jeu prévisible : −1,5 % de réussite au tir en attaque placée.'] },
    mental: { label: 'Mental', plus: ["Des nerfs d'acier", '+4 en sang-froid, et +3 % au tir dans les fins de match serrées.'], minus: ['Les jambes en coton à la 55e', '−4 en sang-froid, et −3 % au tir dans les fins de match serrées.'] },
    physique: { label: 'Physique', plus: ['Ils ne transpirent jamais', '+2 en vitesse et en endurance.'], minus: ['La raclette de la veille', 'Chaque match commence avec 8 points de fatigue en plus.'] },
    arbitrage: { label: 'Arbitrage', plus: ['Les arbitres sont des cousins', '60 % de jets de 7 m obtenus en plus.'], minus: ["L'arbitre a une dent contre nous", 'Plus d\'exclusions subies.'] },
    calendrier: { label: 'Calendrier', plus: ['Un calendrier en pente douce', 'Les 5 premières journées contre les clubs les plus faibles (aller et retour), et un bon départ soude le groupe : +10 de cohésion.'], minus: ['Le calendrier du diable', 'Les 5 premières journées contre les clubs les plus forts (aller et retour), et le groupe doute : −10 de cohésion.'] }
  };
  const hasMod = (t, key) => !!(t && t.mods && t.mods.includes(key));
  // Caractéristiques fixes de chaque club (les mêmes à chaque partie) : supporters et centre de formation, de 1 à 5
  const clubOf = (t) => CLUBS.find(c => c.id === (t && t.id)) || LEGACY_CLUBS.find(c => c.id === (t && t.id)) || {};
  const fansOf = (t) => clubOf(t).fans || { h: 3, a: 2, name: 'Les Supporters' };
  const academyOf = (t) => clubOf(t).academy || 3;
  // Décalage de niveau et de potentiel des jeunes : −1 (centre à 1) à +1 (centre à 5)
  const academyOff = (t) => (academyOf(t) - 3) * 0.5;
  // Ferveur à domicile : de +2 % (1) à +5 % (5) de réussite au tir
  const homeShot = (t) => 0.02 + (fansOf(t).h - 1) * 0.0075;
  // Supporters en déplacement : réduisent le handicap du visiteur, de 0 % (1) à 50 % (5)
  const awayCut = (t) => (fansOf(t).a - 1) * 0.125;
  function modInfo(key) {
    const d = key.slice(0, -1), sign = key.slice(-1), m = MODS[d];
    if (!m) return null;
    const [name, desc] = sign === '+' ? m.plus : m.minus;
    return { key, domain: d, label: m.label, bonus: sign === '+', name, desc };
  }
  function applyGenMods(t) {
    const add = (p, k, v) => { if (p.a[k] !== undefined) p.a[k] = clamp(p.a[k] + v, 1, 20); };
    for (const p of t.players) {
      if (p.pos === 'GB') {
        const v = hasMod(t, 'cage+') ? 1 : hasMod(t, 'cage-') ? -1 : 0;
        if (v) { add(p, 'reflexes', v); add(p, 'placement', v); }
      } else {
        if (hasMod(t, 'discipline+')) add(p, 'discipline', 4);
        if (hasMod(t, 'discipline-')) add(p, 'discipline', -4);
        if (hasMod(t, 'spectacle+')) add(p, 'excentricite', 3);
        if (hasMod(t, 'spectacle-')) add(p, 'excentricite', -6);
        if (hasMod(t, 'mental+')) add(p, 'sangfroid', 4);
        if (hasMod(t, 'mental-')) add(p, 'sangfroid', -4);
        if (hasMod(t, 'physique+')) { add(p, 'vitesse', 2); add(p, 'endurance', 2); }
      }
      p.ovr = overall(p);
    }
    if (hasMod(t, 'vestiaire+')) t.cohesion = 75;
    if (hasMod(t, 'vestiaire-')) t.cohesion = 35;
    if (hasMod(t, 'calendrier+')) t.cohesion = (t.cohesion || 50) + 10;
    if (hasMod(t, 'calendrier-')) t.cohesion = (t.cohesion || 50) - 10;
  }
  function defaultRules() {
    return { sup: { on: true, sys: '5-1' }, mene: { on: true, sys: '4-2', ecart: 3, min: 50 }, tireur: { on: false, sys: '5-1' } };
  }
  const CONSIGNES = [
    ['pivot', 'Cibler le pivot'], ['ailes', 'Cibler les ailes'],
    ['agressive', 'Défense agressive'], ['rotations', 'Rotations fréquentes']
  ];

  // Jeu des arrières : de loin (tir à 9 m) ou au contact (6 m et duel) ; par défaut selon ses notes
  const BACK_STYLES = { loin: 'De loin', equilibre: 'Équilibré', contact: 'Au contact' };
  function autoStyle(p) {
    if (p.pos === 'GB') return 'equilibre';
    const loin = p.a.tirLoin, near = (p.a.tirPres + p.a.duel) / 2;
    return loin - near >= 2 ? 'loin' : near - loin >= 2 ? 'contact' : 'equilibre';
  }
  // Jeu choisi par le coach (Équilibré par défaut) ; autoStyle ne sert qu'au registre naturel du joueur
  const backStyle = (p) => p.matchStyle || p.style || 'equilibre';
  const BACK_POS = ['ArG', 'DC', 'ArD'];
  // Intensité du match, de −2 (gestion) à +2 (tout donner) : pression défensive, contre-attaques et engagement, contre fatigue et exclusions
  const INTENSITY_LV = { '-2': 'Gestion', '-1': 'Calme', 0: 'Normale', 1: 'Engagée', 2: 'Tout donner' };
  const intensity = (s) => s.tac.int || 0;
  // Ligne défensive (de la droite à la gauche du défenseur) et vis-à-vis de chaque attaquant
  const DLINE = ['AiD', 'ArD', 'DC', 'Piv', 'ArG', 'AiG'];
  const FACING = { ArG: 'ArD', ArD: 'ArG', DC: 'DC', Piv: 'Piv', AiG: 'AiD', AiD: 'AiG' };

  // ---------- Génération ----------
  function overall(p) {
    const w = WEIGHTS[p.pos];
    let s = 0;
    for (const k in w) s += w[k] * p.a[k];
    return Math.round(s * 10) / 10;
  }
  let pid = 0;
  // Niveau selon l'âge : les très jeunes un peu en dessous (mais avec du potentiel), les plus de 31 ans un peu au-dessus
  const AGE_LEVEL = (age) => age <= 20 ? -1.5 : age <= 23 ? -0.8 : age <= 27 ? 0.15 : age <= 31 ? 0.5 : 0.7;
  function makePlayer(pos, level, teamId, youthOff, age0) {
    const a = {};
    const age = age0 || ri(18, 35);
    level += AGE_LEVEL(age) + (youthOff && age < 23 ? youthOff : 0);
    const keys = Object.keys(WEIGHTS[pos]);
    const r = (m) => clamp(Math.round(m + gauss() * 1.8), 1, 20);
    if (pos === 'GB') {
      for (const [k] of GKA) a[k] = r(keys.includes(k) ? level : level - 1.5);
    } else {
      for (const [k] of FIELD) {
        let m = keys.includes(k) ? level : level - 3;
        if (k === 'discipline' || k === 'endurance') m = level - 1;
        if (k === 'penalty') m = level - 2;
        a[k] = r(m);
      }
      a.excentricite = clamp(Math.round(9 + gauss() * 3.8), 1, 20);
      a.collectif = clamp(Math.round(11 + gauss() * 3.2), 1, 20);
      // Profil des arrières : tireur de loin, pénétrant, ou complet
      if (['ArG', 'DC', 'ArD'].includes(pos)) {
        const r0 = rnd();
        if (r0 < 0.38) { a.tirLoin = clamp(a.tirLoin + 2, 1, 20); a.duel = clamp(a.duel - 1, 1, 20); a.tirPres = clamp(a.tirPres - 1, 1, 20); }
        else if (r0 < 0.72) { a.tirLoin = clamp(a.tirLoin - 2, 1, 20); a.duel = clamp(a.duel + 2, 1, 20); a.tirPres = clamp(a.tirPres + 2, 1, 20); }
      }
    }
    a.robustesse = robustOf(age);
    // Côté droit (arrière et ailier droits) : toujours des gauchers ; ailleurs, environ 15 % de gauchers
    const left = (pos === 'ArD' || pos === 'AiD') ? true : rnd() < 0.15;
    const p = {
      id: teamId + '-' + (++pid) + '-' + Math.floor(rnd() * 1e6),
      ...makeName(teamId), pos, age, hand: left ? 'G' : 'D',
      a, form: 0, fatigue: 0, goals: 0, apps: 0, saves: 0, mins: 0
    };
    p.ovr = overall(p);
    p.pot = potFor(p);
    if (youthOff && age < 23) p.pot = Math.round(clamp(Math.max(p.ovr, p.pot + youthOff), 1, 20) * 10) / 10;
    p.ovr0 = p.ovr;
    return p;
  }
  // Joueur réel : nom, poste, latéralité, âge et nationalité de l'effectif ; attributs tirés selon le niveau du club
  function realPlayer(r, level, clubId, yo) {
    // Âge au début de la saison (DATA.ref, AAAA-MM-JJ) depuis la date de naissance (AAAA-MM-JJ, ou l'année seule)
    const ageAt = (born) => { const [y, m = 1, d = 1] = String(born).split('-').map(Number), [ry, rm, rd] = (DATA.ref || DATA.year + '-09-01').split('-').map(Number); return ry - y - (rm < m || (rm === m && rd < d) ? 1 : 0); };
    const age = r.born && DATA ? clamp(ageAt(r.born), 16, 42) : 0;
    const p = makePlayer(r.pos, level, clubId, yo, age);
    p.name = r.name;
    if (r.nat && r.nat !== 'FR') p.nat = r.nat; else delete p.nat;
    if (r.hand === 'G' || r.hand === 'D') p.hand = r.hand;
    p.real = true;
    if (r.cf) { p.cf = true; p.youth = true; }
    return p;
  }
  // Niveau de départ des joueurs selon la réputation du club (en étoiles)
  // Écarts resserrés pour la saison réelle (effectifs plus fournis) : un 4 étoiles prend 76–79 % des points contre un 2 étoiles
  const REP_LEVEL = { 5: 13.9, 4: 13.2, 3: 12.8, 2: 12.4, 1: 11.9 };
  function makeTeam(club) {
    const base = REP_LEVEL[club.rep];
    const players = [], yo = club.academy ? (club.academy - 3) * 0.5 : 0;
    const roster = (DATA && DATA.rosters && DATA.rosters[club.id] || []).filter(r => r && r.name && POS.includes(r.pos));
    for (const pos of POS) {
      const real = roster.filter(r => r.pos === pos).sort((a, b) => !!a.cf - !!b.cf);
      // Effectif réel : le premier listé à chaque poste en titulaire, les autres en rotation (à affiner plus tard)
      // Joueurs du centre de formation (cf) : un cran en dessous, étiquette J comme les jeunes formés au club
      real.forEach((r, k) => players.push(realPlayer(r, r.cf ? base - 2.2 : k === 0 ? base + 1 : base - 0.8, club.id, yo)));
      // Poste vide dans l'effectif réel (ou club sans effectif) : joueurs générés pour en avoir deux
      for (let k = real.length; k < (roster.length ? 1 : 2); k++) players.push(makePlayer(pos, k === 0 ? base + 1 : base - 0.8, club.id, yo));
    }
    // Pas d'homonymes dans un même effectif
    const seen = new Set();
    for (const p of players) { let k = 0; while (seen.has(p.name) && k++ < 20) Object.assign(p, makeName(club.id)); seen.add(p.name); }
    const t = {
      ...club, players, cap: players.length,
      tactic: { att: rnd() < 0.5 ? 'place' : 'rapide', dstyle: rnd() < 0.6 ? 'zone' : 'homme', jeu: 'equilibre', cons: [], rules: defaultRules() },
      lineup: {}, cohesion: Math.round(45 + rnd() * 15), lastXI: null
    };
    const cons = CONSIGNES.map(c => c[0]);
    t.tactic.cons = [pick(cons)];
    t.tactic.rules.mene.ecart = pick([2, 3, 3, 4]);
    t.tactic.rules.mene.min = pick([45, 50, 50]);
    if (rnd() < 0.25) t.tactic.rules.sup.sys = '6-0';
    if (rnd() < 0.4) t.tactic.rules.tireur.on = true;
    autoLineup(t);
    aiStyle(t);
    return t;
  }
  function starters(t) { return POS.map(p => t.players.find(x => x.id === t.lineup[p])).filter(Boolean); }
  function identity(t) {
    const f = starters(t).filter(p => p.pos !== 'GB');
    const v = f.reduce((a, p) => a + (p.a.collectif || 11), 0) / Math.max(1, f.length);
    return { v: Math.round(v * 10) / 10, label: v >= 12.5 ? 'Collective' : v <= 9.5 ? 'Individuelle' : 'Mixte' };
  }
  function experience(t) {
    const s = starters(t);
    const age = s.reduce((a, p) => a + p.age, 0) / s.length, apps = s.reduce((a, p) => a + p.apps, 0) / s.length;
    return clamp(Math.round((age - 19) * 5 + apps * 1.2), 0, 100);
  }
  function aiStyle(t) {
    const id = identity(t).v;
    t.tactic.jeu = id >= 12 ? 'collectif' : id <= 10 ? 'individuel' : 'equilibre';
  }
  function migrate(st) {
    const pool = Object.keys(MODS).filter(k => k !== 'calendrier');
    for (const t of st.teams) {
      for (const p of t.players) {
        // Ancien attribut Défense : réparti en Contre et Duel défensif
        for (const a of [p.a, p.a0]) if (a && a.defense !== undefined) {
          a.contre = clamp(Math.round(a.defense + gauss() * 1.5), 1, 20);
          a.duelDef = clamp(Math.round(a.defense + gauss() * 1.5), 1, 20);
          delete a.defense;
        }
        if (p.a0 && p.a.contre !== undefined && p.a0.contre === undefined) { p.a0.contre = p.a.contre; p.a0.duelDef = p.a.duelDef; }
        p.ovr = overall(p);
        if (p.pot === undefined) p.pot = potFor(p);
        p.pot = Math.max(p.pot, p.ovr);
        if (p.ovr0 === undefined) p.ovr0 = p.ovr;
        if (!p.a0) p.a0 = Object.assign({}, p.a);
        if (!p.hist) p.hist = [];
        if (p.mins === undefined) p.mins = 0;
      }
      if (t.id !== st.userId && t.mods && t.mods.length === 1) {
        const k = t.mods[0], d = k.slice(0, -1), sign = k.slice(-1);
        const other = pick(pool.filter(x => x !== d));
        t.mods.push(other + (sign === '+' ? '-' : '+'));
      }
    }
    // Anciens domaines Public et Formation : remplacés par un nouveau domaine (même signe)
    for (const t of st.teams) if (t.mods && t.mods.some(k => /^(public|formation)[+-]$/.test(k))) {
      t.mods = t.mods.map(k => {
        if (!/^(public|formation)[+-]$/.test(k)) return k;
        const used = t.mods.map(x => x.slice(0, -1)), free = ['video', 'deplacements', 'capitanat'].filter(d => !used.includes(d));
        const d = free.length ? pick(free) : pick(pool.filter(x => !used.includes(x)));
        return d + k.slice(-1);
      });
    }
    if (!st.youthLog) st.youthLog = [];
    if (!st.leagueYouth) st.leagueYouth = [];
    if (!st.legends) st.legends = [];
    // Anciens noms de légendes, trop proches des vrais : renommés
    const LEG_OLD = { 'Thierry Omeyre': 'Thomas Omeyrac', 'Arpad Sterbich': 'Árpi Sterbán', 'Niklas Landinn': 'Nils Landström', 'Nicola Karabatik': 'Nikolaï Karabatov', 'Ivano Balicz': 'Ivo Balinović', 'Jackson Richardsonn': 'Jason Richardin', 'Aron Palmarsonn': 'Aric Palmarsen', 'Talant Duchebaev': 'Talan Dujshenko', 'Mikel Hanssen': 'Mikael Hanstrup', 'Daniel Narcis': 'Danny Narcissot', 'Kiril Lazarow': 'Kyrill Lazarević', 'Jérôme Fernandès': 'Jérémy Fernandini', 'Uwe Genshaimer': 'Uli Gensmeier', 'Michel Guigoux': 'Mickaël Guigard', 'Luc Abalow': 'Luca Abalone', 'Hans Lindbergh': 'Hans Lindhorst', 'Ivan Cupitch': 'Ivo Čupovac', 'Bertrand Gile': 'Bertrand Gillot', 'Bjarte Myrol': 'Bjørn Myrvold', 'Cédric Sorindo': 'Cédric Sorhandier' };
    st.legends = st.legends.map(n => LEG_OLD[n] || n);
    for (const t of st.teams) for (const p of t.players) if (LEG_OLD[p.name]) p.name = LEG_OLD[p.name];
    if (st.youth && LEG_OLD[st.youth.p.name]) st.youth.p.name = LEG_OLD[st.youth.p.name];
    if (st.youth === undefined) st.youth = null;
    // Tuto de l'adjoint : coupé pour les parties déjà commencées
    if (!st.tuto) st.tuto = { on: false, seen: [] };
    // Joueurs libres, signatures et messagerie
    if (!st.free) st.free = [];
    if (!st.signs) st.signs = [];
    if (!st.inbox) st.inbox = [];
    if (st.youth && st.youth.p.a.robustesse === undefined) st.youth.p.a.robustesse = robustOf(st.youth.p.age);
    for (const t of st.teams) {
      for (const p of t.players) if (p.pos !== 'GB' && p.a.excentricite === undefined) {
        p.a.excentricite = clamp(Math.round(9 + gauss() * 3.8), 1, 20);
        p.a.collectif = clamp(Math.round(11 + gauss() * 3.2), 1, 20);
      }
      for (const p of t.players) if (p.a.robustesse === undefined) p.a.robustesse = robustOf(p.age);
      const tc = t.tactic;
      if (!tc.rules) tc.rules = defaultRules();
      if (!tc.dstyle) tc.dstyle = 'zone';
      if (!tc.jeu) tc.jeu = 'equilibre';
      tc.cons = (tc.cons || []).filter(c => c !== 'loin');
      delete tc.def;
      if (t.cohesion === undefined) { t.cohesion = 50; t.lastXI = null; }
      if (!t.mods) t.mods = [];
      if (!t.out) t.out = [];
    }
    // Noms de clubs : toujours ceux de CLUBS (renommages repris dans les parties en cours)
    for (const t of st.teams) { const c = clubOf(t); if (c.name) t.name = c.name; }
    // Entraînement de la semaine lancé à la main après chaque journée
    if (st.trainPending === undefined) st.trainPending = false;
    // Blessures : journal de la saison (les joueurs sans champ « inj » sont valides)
    if (!st.injLog) st.injLog = [];
    // Centre de formation : les jeunes formés au club de moins de 23 ans y entrent ; journal des départs
    for (const t of st.teams) for (const p of t.players) if (p.youth && p.cf === undefined && p.age < 23) p.cf = true;
    if (!st.moves) st.moves = [];
    return st;
  }
  // ---------- Centre de formation et feuille de match ----------
  // « Regens » : de jeunes pépites aux noms qui rappellent des légendes du hand, au même poste
  const LEGENDS = [
    { name: 'Thomas Omeyrac', pos: 'GB', hand: 'D' }, { name: 'Árpi Sterbán', pos: 'GB', hand: 'D' }, { name: 'Nils Landström', pos: 'GB', hand: 'D' },
    { name: 'Nikolaï Karabatov', pos: 'DC', hand: 'D' }, { name: 'Ivo Balinović', pos: 'DC', hand: 'D' }, { name: 'Jason Richardin', pos: 'DC', hand: 'D' }, { name: 'Aric Palmarsen', pos: 'DC', hand: 'D' }, { name: 'Talan Dujshenko', pos: 'DC', hand: 'D' },
    { name: 'Mikael Hanstrup', pos: 'ArG', hand: 'D' }, { name: 'Danny Narcissot', pos: 'ArG', hand: 'D' },
    { name: 'Kyrill Lazarević', pos: 'ArD', hand: 'G' }, { name: 'Jérémy Fernandini', pos: 'ArD', hand: 'G' },
    { name: 'Uli Gensmeier', pos: 'AiG', hand: 'D' }, { name: 'Mickaël Guigard', pos: 'AiG', hand: 'D' },
    { name: 'Luca Abalone', pos: 'AiD', hand: 'G' }, { name: 'Hans Lindhorst', pos: 'AiD', hand: 'G' }, { name: 'Ivo Čupovac', pos: 'AiD', hand: 'G' },
    { name: 'Bertrand Gillot', pos: 'Piv', hand: 'D' }, { name: 'Bjørn Myrvold', pos: 'Piv', hand: 'D' }, { name: 'Cédric Sorhandier', pos: 'Piv', hand: 'D' }
  ];
  function legendize(p, L, st) {
    p.name = L.name; p.hand = L.hand; delete p.nat;
    for (const k of Object.keys(WEIGHTS[p.pos])) p.a[k] = Math.max(p.a[k], clamp(p.a[k] + 3, 1, 15));
    p.ovr = overall(p);
    p.pot = Math.round(clamp(Math.max(p.ovr + 5, 16.5 + rnd() * 2.5), 1, 19.5) * 10) / 10;
    p.legend = true;
    if (st) (st.legends = st.legends || []).push(L.name);
  }
  // Jeune du centre ; une légende avec la probabilité legendP (0,18 pour le joueur, 0,04 pour les clubs IA)
  function makeYouth(t, st, legendP) {
    const free = st ? LEGENDS.filter(L => !(st.legends || []).includes(L.name)) : [];
    const L = free.length && rnd() < (legendP ?? 0.18) ? pick(free) : null;
    const pos = L ? L.pos : pick(POS);
    const p = makePlayer(pos, 10, t.id);
    // Loterie, mais réaliste : niveau calé sur celui du club (un joueur de rotation, environ 2 étoiles), attributs du poste
    // autour de la référence du club moins 2,4, les autres plus bas ; traits de personnalité libres
    const off = academyOff(t), keys = Object.keys(WEIGHTS[pos]), lvl = starRef(t) - 2.4 + off;
    for (const k in p.a) if (k !== 'robustesse') p.a[k] = (k === 'excentricite' || k === 'collectif') ? ri(1, 20) : clamp(Math.round((keys.includes(k) ? lvl : lvl - 1.8) + gauss() * 2), 2, 17);
    p.age = ri(17, 19);
    p.ovr = overall(p);
    // Marge de progression : 1,5 à 5,5 points (±0,5 selon le centre), et une pépite (+3 en plus) de 6 % (centre à 1) à 20 % (centre à 5)
    p.pot = Math.round(clamp(p.ovr + 1.5 + off * 0.5 + rnd() * 4 + (rnd() < 0.06 + (academyOf(t) - 1) * 0.035 ? 3 : 0), 1, 18.5) * 10) / 10;
    if (L) legendize(p, L, st);
    p.youth = true;
    { let k = 0; while (t.players.some(x => x.name === p.name) && k++ < 20) Object.assign(p, makeName(t.id)); }
    p.ovr0 = p.ovr;
    p.a0 = Object.assign({}, p.a);
    p.hist = [];
    return p;
  }
  // ---------- Centre de formation : statut, libération, reprise par un club IA ----------
  // Le centre de formation accueille les moins de 23 ans ; un joueur du centre ne passe pro qu'en fin de saison.
  const CF = { maxAge: 23, aiMax: 12 };
  const canJoinCF = (p) => !!p && !p.cf && p.age < CF.maxAge;
  const cfOf = (t) => t.players.filter(p => p.cf);
  function joinCF(p) { if (!canJoinCF(p)) return false; p.cf = true; return true; }
  function detach(t, p) {
    t.players = t.players.filter(x => x.id !== p.id);
    t.out = (t.out || []).filter(id => id !== p.id);
    if (Object.values(t.lineup).includes(p.id)) fixLineup(t);
    ensureSheet(t);
  }
  // Joueur libéré (définitif) : il quitte le club ; un club IA peut le récupérer s'il l'intéresse,
  // sinon il rejoint la liste des joueurs libres
  function releasePlayer(st, t, p) {
    if (!t.players.includes(p)) return null;
    detach(t, p);
    let to = null;
    const cands = st.teams.filter(o => o.id !== t.id && o.id !== st.userId && (p.age >= CF.maxAge || cfOf(o).length < CF.aiMax))
      .map(o => ({ o, gap: (p.pot ?? p.ovr) - starRef(o) })).sort((a, b) => b.gap - a.gap).slice(0, 3);
    if (cands.length) {
      const c = cands[Math.floor(rnd() * cands.length)];
      if (rnd() < clamp(0.25 + (c.gap + 2) * 0.15, 0.1, 0.9)) {
        to = c.o;
        delete p.matchStyle; p.cf = p.age < CF.maxAge; p.form = 0;
        to.players.push(p);
        ensureSheet(to);
      }
    }
    if (!to) addFree(st, p, t.id, null);
    const mv = { round: st.round, id: p.id, name: p.name, pos: p.pos, age: p.age, from: t.id, to: to ? to.id : null };
    (st.moves = st.moves || []).push(mv);
    return mv;
  }

  // ---------- Joueurs libres ----------
  // Un joueur libéré que personne ne reprend tout de suite reste libre jusqu'à 6 semaines : chaque semaine,
  // un club IA peut le signer. Toi aussi, dans la limite de l'effectif (20 pros, 12 au centre), s'il accepte.
  // De temps en temps (environ 4 fois par saison), un club IA se sépare d'un profil plus intéressant ;
  // une fois sur trois, c'est un jeune à fort potentiel.
  const FREE = { weeks: 6, surprise: 0.14, gem: 0.35, pride: -0.3, proMax: 20, cfMax: 12 };
  const FREE_WHY = ['en froid avec son entraîneur', 'veut plus de temps de jeu', "contrat rompu d'un commun accord", "pas dans les plans du staff", 'le club allège sa masse salariale'];
  const freeLevel = (p) => Math.max(p.ovr, (p.pot ?? p.ovr) - 1);
  function addFree(st, p, from, why) {
    delete p.matchStyle; delete p.lastRes; delete p.resFocus;
    p.cf = false; p.form = 0; p.fatigue = 0; p.inj = null; p.frag = 0;
    p.free = { since: st.round, from, flex: Math.round(rnd() * 16) / 10, why: why || null };
    (st.free = st.free || []).push(p);
  }
  // Club IA intéressé : parmi les trois pour qui le joueur est le plus utile (niveau au-dessus de leur moyenne)
  function freeSuitor(st, p) {
    const cands = st.teams.filter(o => o.id !== st.userId && o.id !== p.free.from && (p.age >= CF.maxAge || cfOf(o).length < CF.aiMax))
      .map(o => ({ o, gap: freeLevel(p) - starRef(o) })).sort((a, b) => b.gap - a.gap).slice(0, 3);
    return cands.length ? cands[Math.floor(rnd() * cands.length)] : null;
  }
  // Semaine des joueurs libres (après la journée et les centres de formation) :
  // signatures des clubs IA, départs hors de la ligue, libération surprise.
  // Renvoie { fresh: nouveaux joueurs libres, gone: [{ p, to }] } pour la messagerie.
  function freeRound(st) {
    st.free = st.free || [];
    const gone = [];
    for (const p of st.free.slice()) {
      if (p.free.since >= st.round) continue;
      const c = freeSuitor(st, p);
      let to = null;
      if (c && rnd() < clamp(0.1 + (c.gap + 1.5) * 0.08, 0.04, 0.5)) to = c.o;
      else if (st.round - p.free.since < FREE.weeks) continue;
      st.free = st.free.filter(x => x !== p);
      if (to) { delete p.free; p.cf = p.age < CF.maxAge; to.players.push(p); ensureSheet(to); }
      gone.push({ p, to: to ? to.id : null });
    }
    if (st.round < st.sched.length - 1 && rnd() < FREE.surprise) {
      const t = pick(st.teams.filter(o => o.id !== st.userId));
      const xi = new Set(Object.values(t.lineup));
      const ok = t.players.filter(p => !xi.has(p.id) && !hurt(p) && t.players.filter(x => x.pos === p.pos).length >= 3);
      const gems = ok.filter(p => p.age < CF.maxAge).sort((a, b) => (b.pot ?? b.ovr) - (a.pot ?? a.ovr)).slice(0, 2);
      const pros = ok.filter(p => p.age >= CF.maxAge).sort((a, b) => b.ovr - a.ovr).slice(0, 4);
      const pool = (rnd() < FREE.gem || !pros.length) && gems.length ? gems : pros;
      if (pool.length) {
        const p = pick(pool);
        detach(t, p);
        (st.moves = st.moves || []).push({ round: st.round, id: p.id, name: p.name, pos: p.pos, age: p.age, from: t.id, to: null });
        addFree(st, p, t.id, pick(FREE_WHY));
        if (t.lineup) autoLineup(t);
        ensureSheet(t);
      }
    }
    return { fresh: st.free.filter(p => p.free.since === st.round), gone };
  }
  // Pourquoi un joueur libre refuse ton club : 'back' (tu l'as libéré), 'small' (club trop modeste pour lui),
  // 'time' (deux joueurs nettement meilleurs à son poste), null s'il accepte. Fixé par joueur : pas de nouveau tirage.
  function freeRefusal(st, t, p) {
    if (p.free.from === t.id) return 'back';
    if (freeLevel(p) - starRef(t) > FREE.pride + p.free.flex) return 'small';
    if (p.age >= CF.maxAge && t.players.filter(x => x.pos === p.pos && !x.cf && x.ovr > p.ovr + 1).length >= 2) return 'time';
    return null;
  }
  const freeRoom = (t, p) => p.age < CF.maxAge ? cfOf(t).length < FREE.cfMax : t.players.filter(x => !x.cf).length < FREE.proMax;
  function signFree(st, t, p) {
    if (!(st.free || []).includes(p)) return { ok: false, why: 'gone' };
    if (!freeRoom(t, p)) return { ok: false, why: 'full' };
    const why = p.free.no || freeRefusal(st, t, p);
    if (why) { p.free.no = why; return { ok: false, why }; }
    st.free = st.free.filter(x => x !== p);
    const from = p.free.from;
    delete p.free;
    p.cf = p.age < CF.maxAge;
    t.players.push(p);
    ensureSheet(t);
    (st.signs = st.signs || []).push({ round: st.round, id: p.id, name: p.name, pos: p.pos, age: p.age, from });
    return { ok: true, cf: p.cf };
  }
  // Centre de formation des clubs IA : même rythme que le joueur (après J5, J10…). Le jeune rejoint le centre ;
  // au-delà de 12 jeunes, le staff libère le moins prometteur (qu'un autre club peut récupérer).
  // Les centres IA sortent aussi des légendes, plus rarement (4 % des jeunes, environ 3 par saison).
  function aiYouth(st, t) {
    const y = makeYouth(t, st, 0.04);
    y.cf = true;
    t.players.push(y);
    let out = null;
    const cf = cfOf(t);
    if (cf.length > CF.aiMax) {
      const proj = (p) => Math.max(p.ovr, (p.pot ?? p.ovr) - 1) - p.age * 0.05;
      out = cf.slice().sort((a, b) => proj(a) - proj(b))[0];
      releasePlayer(st, t, out);
    }
    autoLineup(t);
    ensureSheet(t);
    const ok = !out || out.id !== y.id;
    (st.leagueYouth = st.leagueYouth || []).push({ round: st.round, team: t.id, id: y.id, name: y.name, pos: y.pos, age: y.age, ovr: y.ovr, pot: y.pot, ok, out: out && ok ? out.name : null });
    return ok;
  }
  function youthRound(st) {
    if (st.round % 5 !== 0 || st.round === 0 || st.round >= st.sched.length) return false;
    for (const t of st.teams) if (t.id !== st.userId) aiYouth(st, t);
    return true;
  }
  // Cotes du bookmaker fictif (Bet9M) : probabilités tirées de n matchs simulés sur des copies des deux équipes,
  // nul lissé vers la moyenne de la ligue (7,5 %), marge du bookmaker de 7 %
  function odds(home, away, n) {
    n = n || 200;
    let w = 0, d = 0;
    for (let k = 0; k < n; k++) {
      const m = new Match(JSON.parse(JSON.stringify(home)), JSON.parse(JSON.stringify(away))).run();
      const df = m.h.score - m.a.score;
      if (df > 0) w++; else if (!df) d++;
    }
    const pd = (d + 0.075 * 40) / (n + 40), pw = (1 - pd) * (w + 1) / (n - d + 2), pl = 1 - pd - pw;
    const o = (p) => clamp(Math.round(100 / (p * 1.07)) / 100, 1.03, 25);
    return { pw, pd, pl, ow: o(pw), od: o(pd), ol: o(pl) };
  }
  function sheetScore(p) { return p.ovr - (p.fatigue || 0) * 0.04; }
  // Feuille de match : 14 joueurs valides au plus ; les blessés n'y figurent pas et ne comptent pas dans la tribune
  function ensureSheet(t) {
    fixLineup(t);
    const starters = new Set(Object.values(t.lineup));
    const fit = t.players.filter(p => !hurt(p));
    const need = Math.max(0, fit.length - 14);
    t.out = (t.out || []).filter(id => !starters.has(id) && fit.some(p => p.id === id));
    while (t.out.length > need) t.out.shift();
    if (t.out.length < need) {
      const cands = fit.filter(p => !starters.has(p.id) && !t.out.includes(p.id))
        .sort((x, y) => sheetScore(x) - sheetScore(y));
      for (const p of cands) {
        if (t.out.length >= need) break;
        const left = fit.filter(q => q.pos === p.pos && !t.out.includes(q.id) && q.id !== p.id).length;
        // Un gardien remplaçant reste sur le banc s'il y en a un de valide
        const gkBench = p.pos === 'GB' && !fit.some(q => q.pos === 'GB' && q.id !== p.id && !starters.has(q.id) && !t.out.includes(q.id));
        if (left >= 1 && !gkBench) t.out.push(p.id);
      }
    }
    return t.out;
  }
  // Remplaçant d'un poste parmi les joueurs valides : même poste, sinon le meilleur niveau à ce poste
  function bestFor(t, pos, taken) {
    const c = t.players.filter(p => !hurt(p) && !taken.has(p.id) && (pos === 'GB') === (p.pos === 'GB'));
    c.sort((x, y) => (y.pos === pos) - (x.pos === pos) || (ovrAt(y, pos) - y.fatigue * 0.04) - (ovrAt(x, pos) - x.fatigue * 0.04));
    return c[0] || null;
  }
  // Titulaire blessé (ou parti) : remplacé dans le 7 de départ ; renvoie les changements faits
  function fixLineup(t) {
    const out = [], taken = new Set();
    for (const pos of POS) { const p = t.players.find(x => x.id === t.lineup[pos]); if (p && !hurt(p)) taken.add(p.id); }
    for (const pos of POS) {
      const p = t.players.find(x => x.id === t.lineup[pos]);
      if (p && !hurt(p)) continue;
      const r = bestFor(t, pos, taken);
      if (!r) continue;
      t.lineup[pos] = r.id; taken.add(r.id);
      out.push({ pos, from: p ? p.id : null, to: r.id });
    }
    return out;
  }
  function autoLineup(t) {
    const taken = new Set();
    for (const pos of POS) {
      const c = t.players.filter(p => p.pos === pos && !hurt(p) && !taken.has(p.id)).sort((x, y) => (y.ovr - y.fatigue * 0.04) - (x.ovr - x.fatigue * 0.04));
      const p = c[0] || bestFor(t, pos, taken) || t.players.find(x => x.pos === pos);
      t.lineup[pos] = p.id; taken.add(p.id);
    }
  }
  // Championnat aller-retour ; avec un nombre impair de clubs, une équipe est au repos à chaque journée
  function schedule(ids) {
    const arr = ids.slice();
    if (arr.length % 2) arr.push(null);
    const n = arr.length, rounds = [];
    for (let r = 0; r < n - 1; r++) {
      const games = [];
      for (let i = 0; i < n / 2; i++) {
        const h = arr[i], a = arr[n - 1 - i];
        if (h === null || a === null) continue;
        games.push(r % 2 === 0 ? [h, a] : [a, h]);
      }
      rounds.push(games);
      arr.splice(1, 0, arr.pop());
    }
    const second = rounds.map(g => g.map(([h, a]) => [a, h]));
    return rounds.concat(second);
  }
  function newGame(userId, seed, userMods) {
    seed = seed || Math.floor(Math.random() * 1e9);
    setSeed(seed);
    pid = 0;
    const teams = CLUBS.map(makeTeam);
    const pool = Object.keys(MODS).filter(k => k !== 'calendrier');
    // Légendes : jamais en début de partie, seulement parmi les jeunes sortis des centres pendant la saison
    const legends = [];
    for (const t of teams) {
      if (t.id === userId) t.mods = (userMods || []).slice();
      else { const b = pick(pool); const m = pick(pool.filter(k => k !== b)); t.mods = [b + '+', m + '-']; }
      applyGenMods(t);
      for (const p of t.players) { p.pot = Math.max(p.pot, p.ovr); p.ovr0 = p.ovr; p.a0 = Object.assign({}, p.a); p.hist = []; }
      autoLineup(t);
      aiStyle(t);
    }
    const ids = teams.map(t => t.id);
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    let sched = schedule(ids);
    const ut = teams.find(t => t.id === userId);
    if (hasMod(ut, 'calendrier+') || hasMod(ut, 'calendrier-')) {
      const first = sched.slice(0, sched.length / 2);
      const oppRep = (rd) => { const g = rd.find(([h, a]) => h === userId || a === userId); return g ? teams.find(t => t.id === (g[0] === userId ? g[1] : g[0])).rep + rnd() * 0.5 : (hasMod(ut, 'calendrier+') ? 9 : 0); };
      const keyed = first.map(rd => ({ rd, r: oppRep(rd) }));
      keyed.sort((x, y) => hasMod(ut, 'calendrier+') ? x.r - y.r : y.r - x.r);
      const ordered = keyed.map(k => k.rd);
      sched = ordered.concat(ordered.map(g => g.map(([h, a]) => [a, h])));
    }
    return { v: 1, seed, userId, round: 0, teams, legends, sched, youth: null, youthLog: [], leagueYouth: [], injLog: [], moves: [], results: [], last: null, ended: false, training: { focus: 'equilibre', intensity: 'normale' }, lastTraining: null, trainPending: false, tuto: { on: false, seen: [] }, free: [], signs: [], inbox: [] };
  }

  // ---------- Moteur de match ----------
  // Fatigue : gain par possession sur le terrain, récupération sur le banc, seuil et pente de la perte d'attributs
  // Avantage du terrain : réussite au tir, ballons perdus, sévérité de l'arbitre, fatigue du déplacement
  const HOME = { shot: 0.035, to: 0.007, ex: 0.03, travel: 4 };
  const MANUAL_MIN = 7;
  const FAT = { gain: 0.9, gk: 0.2, rest: 0.35, ht: 10, thr: 28, k: 0.009, recover: 35, release: 55 };
  // Fin de match (dès la 45e, écart de 1 à 5 buts) : malus au tir pour qui mène, bonus pour qui est mené
  const CLUTCH = { from: 45, gap: 5, lead: 0.10, trail: 0.085 };
  const ZONE_BASE = { loin: 0.44, aile: 0.56, pivot: 0.67, percee: 0.58, ca: 0.8, er: 0.68, '7m': 0.74, vide: 0.9 };
  const TO_MATRIX = { '6-0': { place: 0, rapide: 0 }, '5-1': { place: 0.03, rapide: 0 }, '4-2': { place: 0.005, rapide: 0.05 } };
  const ER_PROB = { '6-0': 0.08, '5-1': 0.22, '4-2': 0.16 };
  const ZONE_DEF = {
    '6-0': { loin: 0.06, pivot: -0.04, percee: -0.03, aile: 0 },
    '5-1': { loin: -0.05, pivot: 0.045, percee: 0, aile: 0.02 },
    '4-2': { loin: -0.02, pivot: 0.05, percee: 0.045, aile: 0.02 }
  };
  const ZONE_W = {
    '6-0': { loin: 1.35, aile: 1, pivot: 0.8, percee: 0.9 },
    '5-1': { loin: 0.75, aile: 1.1, pivot: 1.25, percee: 1 },
    '4-2': { loin: 0.9, aile: 1.05, pivot: 1.2, percee: 1.15 }
  };
  const ZONE_TXT = { loin: 'tir de loin', aile: "à l'aile", pivot: 'au pivot', percee: 'en percée', ca: 'en contre-attaque', er: 'sur engagement rapide', '7m': 'sur 7 m', vide: 'dans la cage vide' };

  // ---------- Blessures ----------
  // Risque par possession pour un joueur sur le terrain (environ 3,5 blessures par équipe et par saison en match),
  // et par joueur et par semaine d'entraînement (environ 1,2). La fatigue, l'engagement et le retour anticipé l'augmentent.
  const INJ = { match: 0.95e-4, train: 0.0026, gk: 0.4, frag: 9, fragTrain: 5 };
  const INJ_TYPES = {
    leger: { w: 0.58, n: [1, 1], labels: ['Contracture à la cuisse', 'Coup au genou', 'Petite entorse de la cheville', 'Doigt retourné', 'Contusion à la hanche', 'Torticolis'] },
    moyen: { w: 0.29, n: [2, 4], labels: ["Entorse de la cheville", 'Élongation aux ischios', 'Lombalgie', 'Déchirure au mollet', "Douleur à l'épaule", 'Entorse du pouce'] },
    serieux: { w: 0.11, n: [5, 8], labels: ['Déchirure musculaire à la cuisse', 'Fracture de la main', 'Entorse du genou', 'Luxation de l\'épaule'] },
    grave: { w: 0.02, n: [10, 16], labels: ['Rupture du ligament croisé', "Rupture du tendon d'Achille"] }
  };
  const INJ_LABEL = { leger: 'Légère', moyen: 'Moyenne', serieux: 'Sérieuse', grave: 'Grave' };
  function hurt(p) { return !!(p && p.inj && p.inj.n > 0); }
  function gone(s, id) { return s.red.has(id) || s.hurt.has(id); }
  // Garde-fou : l'équipe garde toujours un gardien valide et au moins 10 joueurs de champ valides
  const MIN_FIELD = 10;
  function canHurt(t, p, extra) {
    const fit = t.players.filter(x => !hurt(x) && !(extra && extra.has(x.id)));
    return p.pos === 'GB' ? fit.filter(x => x.pos === 'GB').length >= 2 : fit.filter(x => x.pos !== 'GB').length > MIN_FIELD;
  }
  // Robustesse : ×2 de risque tous les 5 points sous 12, ÷2 tous les 5 points au-dessus
  function robMult(p) { return Math.pow(2, (12 - (p.a.robustesse ?? 12)) / 5); }
  function injMods(t) { return hasMod(t, 'soins+') ? 0.85 : hasMod(t, 'soins-') ? 1.15 : 1; }
  function rollInjury(st, t, p, ctx) {
    let r = rnd(), sev = 'leger';
    for (const k in INJ_TYPES) { r -= INJ_TYPES[k].w; if (r <= 0) { sev = k; break; } }
    const T = INJ_TYPES[sev];
    let n = ri(T.n[0], T.n[1]), type = pick(p.pos === 'GB' && sev === 'leger' ? T.labels.concat(['Doigt luxé']) : T.labels);
    if (hasMod(t, 'soins+') && n > 1 && rnd() < 0.5) n--;
    if (hasMod(t, 'soins-') && rnd() < 0.5) n++;
    const relapse = (p.frag || 0) > 0;
    if (relapse) { n = Math.ceil(n * 1.5) + 1; type = 'Rechute : ' + type.charAt(0).toLowerCase() + type.slice(1); if (sev === 'leger') sev = 'moyen'; }
    p.inj = { n, n0: n, type, sev, round: st.round + 1, ctx };
    // Blessé pendant la journée qui se termine : la semaine qui suit ne compte pas encore
    if (ctx === 'match') p.inj.fresh = true;
    p.frag = 0;
    (st.injLog = st.injLog || []).push({ round: st.round + 1, team: t.id, id: p.id, name: p.name, pos: p.pos, type, sev, n, ctx, relapse });
    return { id: p.id, name: p.name, pos: p.pos, type, sev, n, ctx, team: t.id, relapse };
  }
  // Une semaine passe : chaque blessé a manqué un match (ou une semaine de repos) de plus
  function heal(st) {
    const back = [];
    for (const t of st.teams) for (const p of t.players) {
      if (p.frag > 0) p.frag--;
      if (p.inj && p.inj.fresh) { delete p.inj.fresh; continue; }
      if (p.inj && p.inj.n > 0) { p.inj.n--; if (!p.inj.n) { back.push({ team: t.id, id: p.id, name: p.name, type: p.inj.type }); p.inj = null; } }
    }
    return back;
  }
  // Blessures de la semaine d'entraînement
  function trainInjuries(st, t, intensity) {
    const I = intensity === 'intense' ? 1.8 : intensity === 'legere' ? 0.5 : 1, out = [];
    for (const p of t.players) {
      if (hurt(p) || !canHurt(t, p)) continue;
      const f = 1 + Math.max(0, (p.fatigue || 0) - 40) / 30;
      if (rnd() < INJ.train * I * f * injMods(t) * robMult(p) * (p.frag > 0 ? INJ.fragTrain : 1) * (p.pos === 'GB' ? INJ.gk * 1.5 : 1)) out.push(rollInjury(st, t, p, 'train'));
    }
    return out;
  }
  // Retour anticipé : disponible tout de suite, mais fragile pendant quelques semaines (rechute plus longue)
  // Raison d'un refus (null si possible) : blessure grave, rechute, ou effectif trop juste
  // (sans lui et sans les autres joueurs fragiles, il faut encore 10 joueurs de champ valides)
  function rushBlock(t, p) {
    if (!hurt(p)) return 'valide';
    if (p.inj.sev === 'grave') return 'grave';
    if (/^Rechute/.test(p.inj.type)) return 'rechute';
    if (p.pos !== 'GB' && t.players.filter(x => x.pos !== 'GB' && x.id !== p.id && !hurt(x) && !(x.frag > 0)).length < MIN_FIELD) return 'effectif';
    return null;
  }
  function canRushBack(t, p) { return !rushBlock(t, p); }
  function rushBack(t, p) {
    if (!canRushBack(t, p)) return false;
    p.frag = p.inj.n + 2;
    p.inj = null;
    ensureSheet(t);
    return true;
  }

  function makeSide(team) {
    const lineup = {};
    for (const p of POS) lineup[p] = team.players.find(x => x.id === team.lineup[p]);
    const ids = new Set(Object.values(lineup).map(p => p.id));
    return {
      team, lineup, bench: team.players.filter(p => !ids.has(p.id) && !(team.out || []).includes(p.id) && !hurt(p)),
      tac: JSON.parse(JSON.stringify(team.tactic)),
      curDef: '6-0', forceDef: null, coh: team.cohesion || 50, exp: experience(team), boost: -1,
      fat: Object.fromEntries(team.players.map(p => [p.id, (p.fatigue || 0) + (hasMod(team, 'physique-') ? 8 : 0)])),
      played: new Set(ids), excl: [], ex2: {}, red: new Set(), hurt: new Set(),
      starters: Object.fromEntries(POS.map(p => [p, lineup[p].id])), at: Object.fromEntries(POS.map(p => [lineup[p].id, p])),
      mins: {}, ps: {}, gkLock: false, manual: {}, lastSub: -9, styleMin: {},
      // Plan de rotation propre à chaque poste et à chaque match : décalage, temps de jeu visé, marge
      rot: Object.fromEntries(POS.map(p => [p, { off: ri(0, 7), share: (40 + (rnd() - 0.5) * 10) / 60, slack: 1 + rnd() * 4, since: 0, stint: 0 }])),
      score: 0, half: 0, goals: {}, saves: {}, empty: false, to: [0, 0],
      st: { shots: 0, goals: 0, saves: 0, excl: 0, seven: 0, sevenG: 0, to: 0, ca: 0, caG: 0, gest: 0, gestOk: 0, blocks: 0 }
    };
  }

  function Match(home, away, opts) {
    opts = opts || {};
    this.h = makeSide(home);
    this.a = makeSide(away);
    this.S = [this.h, this.a];
    // Avantage du terrain : ferveur du public qui reçoit ; handicap du visiteur réduit par ses supporters en déplacement
    this.homeShot = homeShot(home);
    this.awayK = (1 - awayCut(away)) * (hasMod(away, 'deplacements+') ? 0.5 : hasMod(away, 'deplacements-') ? 1.5 : 1);
    // Déplacement : l'équipe visiteuse démarre un peu plus fatiguée
    const trip = hasMod(away, 'deplacements+') ? 0 : HOME.travel * (1 - awayCut(away)) + (hasMod(away, 'deplacements-') ? 10 : 0);
    for (const id in this.a.fat) this.a.fat[id] = Math.min(100, this.a.fat[id] + trip);
    // Coach IA : toute équipe qui n'est pas celle du joueur. Tempérament : réagit plus ou moins tôt
    this.S.forEach(s => {
      s.ai = opts.user !== undefined && s.team.id === opts.user ? null : { bold: rnd() < 0.5 ? 1 : 0, orig: { att: s.tac.att, dstyle: s.tac.dstyle }, gk: false };
      // Temps morts : patience propre au coach (sanguin vers 2,5, flegmatique vers 5) et habitude de garder le sien pour la fin
      if (s.ai) { s.ai.patience = s.ai.bold ? 2.3 + rnd() * 1.4 : 3.4 + rnd() * 1.8; s.ai.saver = rnd() < 0.4; }
      s.run = 0; s.press = 0; s.snap = null; s.streak = null;
    });
    const fast = s => (s.tac.att === 'rapide' ? 3 : 0);
    this.N = 2 * (53 + fast(this.h) + fast(this.a) + ri(-2, 2));
    this.i = 0;
    this.ev = [];
    this.last = null;
    this.done = false;
    this.halfDone = false;
    this.lead = 0;
  }
  const P = Match.prototype;
  P.minute = function (i) { return Math.min(60, Math.floor((i / this.N) * 60) + 1); };
  P.half = function () { return this.i < this.N / 2 ? 0 : 1; };
  P.eff = function (s, p, k) {
    let v = p.a[k];
    const at = s.at[p.id];
    if (at && at !== p.pos && WEIGHTS[at][k] !== undefined && SECONDARY[p.pos].includes(at)) v = Math.max(v, p.ovr * 0.85);
    const f = s.fat[p.id] || 0;
    if (f > FAT.thr) v *= Math.max(0.55, 1 - (f - FAT.thr) * FAT.k);
    return v + (p.form || 0) * 0.3;
  };
  P.on = function (s, i) {
    const out = [];
    for (const pos of POS) {
      const p = s.lineup[pos];
      if (!p || gone(s, p.id)) continue;
      if (s.excl.some(e => e.id === p.id && e.until > i)) continue;
      out.push({ pos, p });
    }
    return out;
  };
  P.short = function (s, i) { return s.excl.filter(e => e.until > i).length; };
  P.field = function (s, i) { return this.on(s, i).filter(x => x.pos !== 'GB'); };
  P.avg = function (s, i, k) {
    const f = this.field(s, i);
    if (!f.length) return 10;
    return f.reduce((a, x) => a + this.eff(s, x.p, k), 0) / f.length;
  };
  P.coll = function (s, i) {
    const f = this.field(s, i);
    return f.length ? f.reduce((a, x) => a + (x.p.a.collectif || 11), 0) / f.length : 11;
  };
  P.fit = function (s, i) {
    const c = this.coll(s, i);
    return s.tac.jeu === 'collectif' ? clamp((c - 11) * 0.006, -0.04, 0.04) : s.tac.jeu === 'individuel' ? clamp((11 - c) * 0.006, -0.04, 0.04) : 0;
  };
  P.defSystem = function (D, A, i) {
    if (D.forceDef) return D.forceDef;
    const r = D.tac.rules, diff = D.score - A.score, min = this.minute(i);
    if (r.mene.on && diff <= -r.mene.ecart && min >= r.mene.min) return r.mene.sys;
    if (r.sup.on && this.short(A, i) > this.short(D, i)) return r.sup.sys;
    if (r.tireur.on && this.field(A, i).some(x => ['ArG', 'ArD', 'DC'].includes(x.pos) && this.eff(A, x.p, 'tirLoin') >= 16)) return r.tireur.sys;
    return '6-0';
  };
  // Défense centrale : les ailiers comptent moins face aux arrières
  // Face-à-face : l'attaquant affronte le défenseur placé en face de lui (l'arrière gauche face à l'arrière droit adverse…).
  // En défense collective, chaque défenseur s'appuie sur ses voisins de ligne (stat « élargie ») ; en homme à homme, il est seul.
  // Les ailiers pèsent moins en défense ; un défenseur absent (exclu) laisse un trou.
  P.defFace = function (D, i, attPos, k) {
    const map = {};
    for (const x of this.field(D, i)) map[x.pos] = x.p;
    const fpos = FACING[attPos] || 'DC', idx = DLINE.indexOf(fpos);
    // Vidéo : les tireurs adverses étudiés (ou non) avant le match
    const vid = hasMod(D.team, 'video+') ? 1 : hasMod(D.team, 'video-') ? -1 : 0;
    const val = (pos) => { const pl = map[pos]; if (!pl) return null; const v = this.eff(D, pl, k) + vid; return pos.startsWith('Ai') ? 12 + (v - 12) * 0.5 : v; };
    const own = val(fpos);
    const nb = [DLINE[idx - 1], DLINE[idx + 1]].filter(Boolean).map((pos) => ({ pos, v: val(pos) })).filter((x) => x.v !== null);
    let ws = 0, sum = 0;
    for (const x of nb) { const w = x.pos.startsWith('Ai') ? 0.5 : 1; sum += x.v * w; ws += w; }
    const nbAvg = ws ? sum / ws : 9;
    if (own === null) return { v: nbAvg - 2.5, who: nb.length ? map[nb[0].pos] : null, hole: true };
    if (D.tac.dstyle === 'homme') return { v: own, who: map[fpos] };
    const share = k === 'contre' ? 0.5 : 0.35;
    return { v: own * (1 - share) + nbAvg * share, who: map[fpos] };
  };
  P.defAvg = function (D, i, k) {
    const f = this.field(D, i);
    if (!f.length) return 10;
    let s = 0, w = 0;
    for (const x of f) { const wt = x.pos.startsWith('Ai') ? 0.4 : 1; s += this.eff(D, x.p, k) * wt; w += wt; }
    return s / w;
  };
  // Part des arrières sur le terrain qui jouent de loin ou au contact
  P.backMix = function (A, i) {
    const b = this.field(A, i).filter(x => BACK_POS.includes(x.pos));
    if (!b.length) return { loin: 0, contact: 0 };
    return { loin: b.filter(x => backStyle(x.p) === 'loin').length / b.length, contact: b.filter(x => backStyle(x.p) === 'contact').length / b.length };
  };
  P.ps = function (s, id) { return s.ps[id] || (s.ps[id] = { sh: 0, g: 0, to: 0, ex: 0, sv: 0, fa: 0 }); };
  P.swap = function (s, pos, p) {
    const cur = s.lineup[pos];
    if (!p || (cur && cur.id === p.id)) return;
    s.lineup[pos] = p;
    s.bench = s.bench.filter(b => b.id !== p.id).concat(cur ? [cur] : []);
    s.played.add(p.id);
    if (cur) delete s.at[cur.id];
    s.at[p.id] = pos;
  };
  P.manualSub = function (si, pos, pid) {
    const s = this.S[si], i = Math.min(this.i, this.N - 1);
    const cur = s.lineup[pos], p = s.bench.find(b => b.id === pid);
    if (!p || gone(s, p.id) || (pos === 'GB') !== (p.pos === 'GB')) return false;
    if (cur && s.excl.some(e => e.id === cur.id && e.until > i)) return false;
    this.swap(s, pos, p);
    s.manual[pos] = this.i;
    if (pos === 'GB') s.gkLock = true;
    return true;
  };
  P.releasePos = function (si, pos) {
    const s = this.S[si];
    delete s.manual[pos];
    if (pos === 'GB') s.gkLock = false;
  };
  P.setGK = function (si, pid) {
    const s = this.S[si], p = s.team.players.find(x => x.id === pid && x.pos === 'GB');
    if (!p || gone(s, p.id)) return false;
    this.swap(s, 'GB', p);
    s.gkLock = true;
    return true;
  };
  P.push = function (type, side, text, key, extra) {
    const e = { m: this.minute(this.i), side, type, text, key: !!key, sc: [this.h.score, this.a.score] };
    if (extra) Object.assign(e, extra);
    this.ev.push(e);
    return e;
  };

  P.step = function () {
    if (this.done) return [];
    const n0 = this.ev.length;
    const i = this.i;
    if (!this.halfDone && i >= this.N / 2) {
      this.halfDone = true;
      this.h.half = this.h.score; this.a.half = this.a.score;
      for (const s of this.S) for (const id in s.fat) s.fat[id] = Math.max(0, s.fat[id] - FAT.ht);
      this.push('mt', -1, `Mi-temps : ${this.h.score} – ${this.a.score}`, true);
      this.S.forEach((s, si) => {
        if (s.gkLock) return;
        const other = s.bench.filter(b => b.pos === 'GB' && !gone(s, b.id)).sort((x, y) => s.fat[x.id] - s.fat[y.id])[0];
        if (other) { this.swap(s, 'GB', other); this.push('gk', si, `${other.name} remplace le gardien pour la 2e mi-temps`, false); }
      });
    }
    if (i > 0) { this.rotate(this.h, i); this.rotate(this.a, i); }
    this.S.forEach((s, si) => this.coach(si, i));
    const ai = i % 2;
    this.possession(this.S[ai], this.S[1 - ai], ai, i);
    this.fatigue(i);
    this.i++;
    if (this.i >= this.N) {
      this.done = true;
      this.push('fin', -1, `Fin du match : ${this.h.score} – ${this.a.score}`, true);
    }
    return this.ev.slice(n0);
  };
  P.run = function () { while (!this.done) this.step(); return this.result(); };

  P.fatigue = function (i) {
    for (const s of this.S) {
      const onIds = new Set(this.on(s, i).map(x => x.p.id));
      const dm = 60 / this.N;
      const sty = s.tac.jeu === 'collectif' ? 1 : s.tac.jeu === 'individuel' ? -1 : 0;
      for (const id of onIds) { s.mins[id] = (s.mins[id] || 0) + dm; if (sty) s.styleMin[id] = (s.styleMin[id] || 0) + dm * sty; }
      const mult = (1 + intensity(s) * 0.16) * (s.tac.att === 'rapide' ? (hasMod(s.team, 'physique+') ? 1.05 : hasMod(s.team, 'physique-') ? 1.25 : 1.15) : 1) * (s.curDef === '4-2' ? 1.12 : 1) * (s.tac.dstyle === 'homme' ? 1.08 : 1) * (hasMod(s.team, 'soins+') ? 0.8 : 1) * (s.tac.cons.includes('agressive') ? 1.05 : 1);
      this.injure(s, i, onIds);
      for (const p of s.team.players) {
        if (onIds.has(p.id)) {
          const base = p.pos === 'GB' ? FAT.gk : FAT.gain;
          const ct = BACK_POS.includes(s.at[p.id]) && backStyle(p) === 'contact' ? 1.08 : 1;
          s.fat[p.id] = Math.min(100, s.fat[p.id] + base * (1.6 - p.a.endurance / 20) * mult * ct);
        } else {
          s.fat[p.id] = Math.max(0, s.fat[p.id] - FAT.rest);
        }
      }
    }
  };

  // Blessure en cours de match : le joueur sort aussitôt, remplacé par le meilleur du banc à ce poste
  P.injure = function (s, i, onIds) {
    if (this.noInj) return;
    const si = this.S.indexOf(s);
    const mult = (1 + intensity(s) * 0.2) * (s.tac.dstyle === 'homme' ? 1.1 : 1) * (s.tac.cons.includes('agressive') ? 1.1 : 1) * injMods(s.team);
    for (const id of onIds) {
      const p = s.team.players.find(x => x.id === id);
      const f = s.fat[id] || 0;
      const r = INJ.match * mult * robMult(p) * (1 + Math.max(0, f - 40) / 25) * (p.frag > 0 ? INJ.frag : 1) * (p.pos === 'GB' ? INJ.gk : 1);
      if (rnd() >= r || !canHurt(s.team, p, s.hurt)) continue;
      const pos = s.at[id];
      const c = s.bench.filter(b => !gone(s, b.id) && (pos === 'GB') === (b.pos === 'GB'));
      c.sort((x, y) => (y.pos === pos) - (x.pos === pos) || (ovrAt(y, pos) - s.fat[y.id] * 0.04) - (ovrAt(x, pos) - s.fat[x.id] * 0.04));
      if (pos === 'GB' && !c.length) continue;
      s.hurt.add(id);
      if (c.length) { if (s.starters[pos] === id) s.starters[pos] = c[0].id; this.swap(s, pos, c[0]); }
      if (pos === 'GB') s.gkLock = true;
      delete s.manual[pos];
      (this.inj = this.inj || []).push({ si, id, name: p.name, pos, m: this.minute(i), rep: c.length ? c[0].id : null });
    }
  };

  P.rotate = function (s, i) {
    const less = s.tac.cons.includes('rotations') ? 5 / 60 : 0;
    const opp = s === this.h ? this.a : this.h;
    const min = this.minute(i), elapsed = (i / this.N) * 60;
    const close = Math.abs(s.score - opp.score) <= 3;
    for (const pos of POS) {
      if (pos === 'GB') continue;
      const plan = s.rot[pos];
      // Un poste pris en main par le coach revient au staff au bout de 7 minutes de jeu
      if (pos in s.manual) {
        if ((i - s.manual[pos]) * 60 / this.N >= MANUAL_MIN) { delete s.manual[pos]; plan.since = -99; }
        else continue;
      }
      if ((i + plan.off) % 8 !== 0) continue;
      const share = plan.share - less;
      const cur = s.lineup[pos];
      if (!cur || s.excl.some(e => e.id === cur.id && e.until > i)) continue;
      const st = s.team.players.find(p => p.id === s.starters[pos]);
      const stAvail = st && !gone(s, st.id) && (st.id === cur.id || s.bench.some(b => b.id === st.id));
      if (!stAvail) continue;
      const subs = s.bench.filter(b => b.pos === pos && b.id !== st.id && !gone(s, b.id)).sort((x, y) => s.fat[x.id] - s.fat[y.id]);
      let want = st;
      if (!(close && min >= 50) && subs.length && (s.mins[st.id] || 0) >= share * elapsed + plan.slack) want = subs[0];
      let urgent = false;
      if (s.fat[want.id] > 70) {
        const alt = [st].concat(subs).filter(x => x.id !== want.id).sort((x, y) => s.fat[x.id] - s.fat[y.id])[0];
        if (alt && s.fat[alt.id] < 50) { want = alt; urgent = true; }
      }
      if (want.id === cur.id) continue;
      if (!urgent && (i - s.lastSub < 3 || i - (plan.since || 0) < plan.stint)) continue;
      this.swap(s, pos, want);
      s.lastSub = i;
      plan.since = i;
      plan.stint = 10 + ri(0, 8);
      plan.slack = 1 + rnd() * 4;
    }
  };

  P.exclude = function (D, di, p, i) {
    D.ex2[p.id] = (D.ex2[p.id] || 0) + 1;
    D.st.excl++;
    this.ps(D, p.id).ex++;
    // 2 minutes de jeu réelles : environ N/30 possessions (N possessions pour 60 minutes)
    D.excl.push({ id: p.id, until: i + 1 + Math.round(this.N / 30) });
    if (D.ex2[p.id] >= 3) {
      D.red.add(p.id);
      const pos = Object.keys(D.lineup).find(k => D.lineup[k] && D.lineup[k].id === p.id);
      const rep = D.bench.find(b => b.pos === pos && !gone(D, b.id));
      if (rep && pos) {
        D.lineup[pos] = rep;
        D.bench = D.bench.filter(b => b.id !== rep.id);
        D.played.add(rep.id);
        delete D.at[p.id];
        D.at[rep.id] = pos;
      }
      this.push('rouge', di, `Carton rouge pour ${p.name} (3e exclusion)`, true);
    } else {
      this.push('excl', di, `Exclusion de 2 min pour ${p.name} (${POS_LABEL[p.pos].toLowerCase()})`, true);
    }
  };

  P.possession = function (A, D, ai, i) {
    const last = this.last;
    this.last = null;
    const min = this.minute(i);
    const dsys = this.defSystem(D, A, i);
    if (dsys !== D.curDef) {
      D.curDef = dsys;
      const r = D.tac.rules, why = D.forceDef ? 'consigne du coach' : dsys === '6-0' ? 'retour à la base' : (r.mene.on && D.score - A.score <= -r.mene.ecart && min >= r.mene.min) ? 'pour revenir au score' : (r.sup.on && this.short(A, i) > this.short(D, i)) ? 'en supériorité numérique' : 'contre le tireur adverse';
      this.push('sys', 1 - ai, `${D.team.name} passe en défense ${dsys} (${why})`, why === 'pour revenir au score' || why === 'consigne du coach');
    }
    this.dsys = dsys;
    // Cage vide après une perte quand l'adversaire jouait à 7 contre 6
    if (last && last.by === 1 - ai && D.empty && last.kind !== 'goal' && rnd() < 0.6) {
      return this.shoot(A, D, ai, i, 'vide');
    }
    // Contre-attaque
    if (last && last.by === 1 - ai && last.kind === 'to') {
      const pca = 0.32 + intensity(A) * 0.03 + (A.tac.att === 'rapide' ? 0.12 : 0) + (this.avg(A, i, 'vitesse') - this.avg(D, i, 'vitesse')) * 0.015
        + (dsys === '4-2' ? 0.03 : 0) + (dsys === '6-0' ? -0.05 : 0)
        + (A.tac.att === 'rapide' && hasMod(A.team, 'physique+') ? 0.05 : 0);
      if (rnd() < pca) { A.st.ca++; return this.shoot(A, D, ai, i, 'ca'); }
    }
    // Engagement rapide après un but encaissé
    if (last && last.by === 1 - ai && last.kind === 'goal' && A.tac.att === 'rapide' && rnd() < ER_PROB[dsys]) {
      return this.shoot(A, D, ai, i, 'er');
    }
    const man0 = this.short(D, i) - this.short(A, i);
    const perso = this.field(A, i).filter(x => (x.p.a.collectif || 11) <= 7).length;
    const pTo = 0.165 + (A.tac.att === 'rapide' ? 0.025 : -0.01) + TO_MATRIX[dsys][A.tac.att] - (this.avg(A, i, 'passes') - 12) * 0.006
      + (D.tac.dstyle === 'homme' ? 0.008 : 0) + (A.tac.jeu === 'collectif' ? -0.01 + perso * 0.007 : 0) - this.fit(A, i) * 0.5 - (A.coh - 50) * 0.0006
      + ((this.avg(D, i, 'contre') + this.avg(D, i, 'duelDef')) / 2 - 12) * 0.005
      + (man0 < 0 ? 0.03 : man0 > 0 ? -0.02 : 0) + (D.tac.cons.includes('agressive') ? 0.015 : 0) + intensity(D) * 0.012 + (A.empty ? 0.02 : 0)
      + (A === this.a ? HOME.to * this.awayK : 0);
    if (rnd() < pTo) {
      const f = this.field(A, i);
      A.st.to++;
      this.last = { by: ai, kind: 'to' };
      const tp = f.length ? wpick(f, x => 21 - this.eff(A, x.p, 'passes')) : null;
      if (tp) this.ps(A, tp.p.id).to++;
      this.push('to', ai, tp ? `Perte de balle de ${tp.p.name}` : 'Perte de balle', false, { att: ai, pid: tp ? tp.p.id : null, pos: tp ? tp.pos : null });
      return;
    }
    let exNow = false;
    for (let k = 0; k < 2; k++) {
      if (rnd() < 0.21) {
        const df = this.field(D, i);
        if (df.length) {
          const d = wpick(df, x => 21 - this.eff(D, x.p, 'discipline')).p;
          const aggr = D.tac.cons.includes('agressive'), homme = D.tac.dstyle === 'homme';
          const pEx = 0.19 + (intensity(D) > 0 ? 0.03 : 0.015) * intensity(D) + (12 - this.eff(D, d, 'discipline')) * 0.012 + (aggr ? (hasMod(D.team, 'discipline+') ? 0 : 0.05) : 0)
            + (hasMod(D.team, 'discipline-') ? (aggr ? 0.03 : 0) + (homme ? 0.03 : 0) : 0)
            + (hasMod(D.team, 'arbitrage-') && (aggr || homme) ? 0.02 : 0) + (dsys === '4-2' ? 0.03 : 0) - (D.exp - 45) * 0.0008 + (hasMod(D.team, 'arbitrage-') ? 0.05 : 0) + (D === this.a ? HOME.ex * this.awayK : 0);
          // Une exclusion au plus par possession ; déjà à 5, la défense se calme (beaucoup moins de doubles exclusions)
          const sh = this.short(D, i);
          const capx = hasMod(D.team, 'capitanat+') ? 0.88 : hasMod(D.team, 'capitanat-') ? 1.12 : 1;
          if (!exNow && sh < 2 && rnd() < pEx * capx * (sh ? 0.35 : 1)) { this.exclude(D, 1 - ai, d, i); exNow = true; }
        }
        if (rnd() < (0.22 + (this.avg(A, i, 'duel') - 12) * 0.01 + this.backMix(A, i).contact * 0.05) * (hasMod(A.team, 'arbitrage+') ? (A.tac.jeu === 'individuel' ? 1.9 : 1.6) : 1)) return this.shoot(A, D, ai, i, '7m');
      }
    }
    return this.shoot(A, D, ai, i, null);
  };

  P.shoot = function (A, D, ai, i, kind) {
    const onA = this.field(A, i);
    if (!onA.length) return;
    let zone = kind, p, skill;
    const e = (pl, k) => this.eff(A, pl, k);
    if (kind === '7m') {
      p = onA.slice().sort((x, y) => e(y.p, 'penalty') - e(x.p, 'penalty'))[0].p;
      skill = e(p, 'penalty');
      A.st.seven++;
    } else if (kind === 'ca' || kind === 'vide' || kind === 'er') {
      p = wpick(onA, x => Math.pow(e(x.p, 'vitesse'), 2) * (x.pos.startsWith('Ai') ? 1.6 : 1)).p;
      skill = (e(p, 'tirPres') + e(p, 'vitesse')) / 2;
    } else {
      const zw = Object.assign({}, ZONE_W[this.dsys]);
      if (D.tac.dstyle === 'homme') { zw.percee *= 1.15; zw.aile *= 0.85; } else zw.aile *= 1.12;
      if (A.tac.jeu === 'collectif') { zw.percee *= 0.85; zw.pivot *= 1.1; zw.aile *= 1.1; }
      if (A.tac.jeu === 'individuel') zw.percee *= 1.3;
      const base = { loin: 0.36, aile: 0.26, pivot: 0.13, percee: 0.25 };
      if (A.tac.cons.includes('pivot')) zw.pivot *= 1.7;
      if (A.tac.cons.includes('ailes')) zw.aile *= 1.7;
      const mix = this.backMix(A, i);
      zw.loin *= 1 + 0.7 * mix.loin - 0.45 * mix.contact;
      zw.percee *= 1 + 0.7 * mix.contact - 0.45 * mix.loin;
      const zones = ['loin', 'aile', 'pivot', 'percee'];
      zone = wpick(zones, z => base[z] * zw[z]);
      const byPos = (list) => onA.filter(x => list.includes(x.pos));
      let cands;
      if (zone === 'loin') cands = byPos(['ArG', 'ArD', 'DC']);
      else if (zone === 'aile') cands = byPos(['AiG', 'AiD']);
      else if (zone === 'pivot') cands = byPos(['Piv']);
      else cands = byPos(['DC', 'ArG', 'ArD']);
      if (!cands.length) { zone = 'percee'; cands = onA; }
      const sk = (pl) => zone === 'loin' ? e(pl, 'tirLoin') : zone === 'aile' ? e(pl, 'tirAile')
        : zone === 'pivot' ? e(pl, 'tirPres') * 0.7 + e(pl, 'position') * 0.3 : e(pl, 'tirPres') * 0.5 + e(pl, 'duel') * 0.5;
      const jw = (pl) => A.tac.jeu === 'collectif' ? Math.pow(sk(pl), 0.8) * ((pl.a.collectif || 11) / 11)
        : A.tac.jeu === 'individuel' ? Math.pow(sk(pl), 2) * ((21 - (pl.a.collectif || 11)) / 10) : Math.pow(sk(pl), 1.2);
      const sw = (x) => !BACK_POS.includes(x.pos) ? 1 : zone === 'loin' ? { loin: 1.8, equilibre: 1, contact: 0.5 }[backStyle(x.p)] : zone === 'percee' ? { loin: 0.5, equilibre: 1, contact: 1.8 }[backStyle(x.p)] : 1;
      p = wpick(cands, x => jw(x.p) * sw(x)).p;
      skill = sk(p);
      // Percée : le duel défensif peut provoquer un passage en force
      if (zone === 'percee') {
        const face = this.defFace(D, i, A.at[p.id] || p.pos, 'duelDef'), dd = face.v;
        const pf = clamp(0.05 + (dd - e(p, 'duel')) * 0.012 + (backStyle(p) === 'contact' ? 0.015 : 0), 0.01, 0.16);
        if (rnd() < pf) {
          A.st.to++;
          this.ps(A, p.id).to++;
          this.last = { by: ai, kind: 'to' };
          const blk = face.who || wpick(this.field(D, i), x => Math.pow(this.eff(D, x.p, 'duelDef'), 2)).p;
          this.ps(D, blk.id).st = (this.ps(D, blk.id).st || 0) + 1;
          this.push('to', ai, `Passage en force de ${p.name}, bien stoppé par ${blk.name}`, false, { att: ai, pid: p.id, zone: 'percee' });
          return;
        }
      }
    }
    const gk = D.lineup.GB;
    const gkSkill = kind === '7m' ? this.eff(D, gk, 'gk7m') + (hasMod(D.team, 'video+') ? 1 : hasMod(D.team, 'video-') ? -1 : 0) : (this.eff(D, gk, 'reflexes') + this.eff(D, gk, 'placement')) / 2;
    let pr = ZONE_BASE[zone];
    if (kind !== 'vide') pr += 0.019 * (skill - gkSkill);
    if (!kind) {
      pr += ZONE_DEF[this.dsys][zone] || 0;
      const dc = onA.find(x => x.pos === 'DC');
      const vm = A.tac.jeu === 'collectif' ? 2 : A.tac.jeu === 'individuel' ? 0.5 : 1;
      if (dc) pr += (e(dc.p, 'vision') - 12) * 0.004 * vm;
      // Un arrière est à l'aise dans son registre naturel, et force à contre-emploi
      if (BACK_POS.includes(A.at[p.id] || p.pos) && (zone === 'loin' || zone === 'percee')) {
        const nat = autoStyle(p);
        if (nat !== 'equilibre') pr += zone === (nat === 'loin' ? 'loin' : 'percee') ? 0.03 : -0.025;
      }
      const fpos = A.at[p.id] || p.pos;
      if (zone === 'loin') pr -= (this.defFace(D, i, fpos, 'contre').v - 12) * 0.012;
      if (zone === 'percee') { const f = this.defFace(D, i, fpos, 'duelDef'); pr -= (f.v - 12) * 0.026 - (f.hole ? 0.03 : 0); }
      if (D.tac.dstyle === 'homme') {
        if (zone === 'percee') {
          const backs = onA.filter(x => ['ArG', 'ArD', 'DC'].includes(x.pos));
          const da = backs.length ? backs.reduce((t, x) => t + e(x.p, 'duel'), 0) / backs.length : 12;
          pr += (da - 12) * 0.03 + 0.02;
        }
        if (zone === 'aile') pr -= 0.03;
      } else {
        const wings = onA.filter(x => x.pos === 'AiG' || x.pos === 'AiD');
        const wa = wings.length ? wings.reduce((a, x) => a + e(x.p, 'tirAile'), 0) / wings.length : 12;
        if (zone === 'aile') pr += (wa - 12) * 0.025 + 0.01;
        if (zone === 'percee') pr -= 0.03;
      }
    }
    // Latéralité : à droite (ArD, AiD), un gaucher a le bon angle, un droitier tire sur son mauvais côté
    const atPos = A.at[p.id] || p.pos;
    if (kind !== '7m' && kind !== 'vide' && (atPos === 'ArD' || atPos === 'AiD')) {
      const wing = atPos === 'AiD';
      pr += p.hand === 'G' ? (wing ? 0.04 : 0.03) : (wing ? -0.03 : -0.02);
    }
    if (kind !== '7m' && kind !== 'vide') {
      pr += this.fit(A, i) + (A.coh - 50) * 0.0006;
      if (A.tac.jeu === 'collectif') pr += hasMod(A.team, 'vestiaire+') ? 0.01 : hasMod(A.team, 'vestiaire-') ? -0.01 : 0;
      if (!kind && hasMod(D.team, 'cage+') && D.tac.dstyle === 'zone') pr -= 0.015;
      if (!kind && hasMod(D.team, 'cage-') && D.tac.dstyle === 'homme') pr += 0.02;
      if (A === this.h) pr += this.homeShot;
      if (!kind && hasMod(A.team, 'spectacle-') && A.tac.jeu !== 'collectif') pr -= 0.015;
      if (A.boost > i) pr += 0.03;
      pr += intensity(A) * 0.01;
    }
    const man = clamp(this.short(D, i) - this.short(A, i), -2, 2);
    if (kind !== '7m' && kind !== 'vide') pr += man * 0.07;
    const min = this.minute(i);
    if (min >= 50 && Math.abs(A.score - D.score) <= 2) pr += (e(p, 'sangfroid') - 12) * 0.005 + (A.exp - 45) * 0.0006 + (hasMod(A.team, 'mental+') ? 0.03 : 0) - (hasMod(A.team, 'mental-') ? 0.03 : 0);
    if (A.empty && !kind) pr += 0.05;
    // Fins de match serrées : qui mène gère (possessions longues, jeu passif), qui est mené prend des risques payants.
    // Resserre les écarts sans toucher au score moyen : environ 7,5 % de nuls comme en Starligue.
    { const lead = A.score - D.score;
      if (kind !== '7m' && kind !== 'vide' && min >= CLUTCH.from && lead !== 0 && Math.abs(lead) <= CLUTCH.gap) pr += lead > 0 ? -CLUTCH.lead : CLUTCH.trail; }
    pr = clamp(pr, 0.05, 0.95);
    // Geste spectaculaire (excentricité)
    let geste = null;
    if (kind !== '7m' && kind !== 'vide' && p.a.excentricite !== undefined) {
      const exc = p.a.excentricite;
      let pa = clamp((exc - 6) * 0.018, 0, 0.26) * (A.tac.jeu === 'individuel' ? (hasMod(A.team, 'spectacle+') ? 1.55 : 1.3) : A.tac.jeu === 'collectif' ? 0.8 : 1);
      if (kind === 'ca' || kind === 'er') pa *= 1.4;
      if (rnd() < pa) {
        geste = pick(GESTES[zone] || GESTES.percee);
        A.st.gest++;
        const exec = clamp(0.56 + (exc - 10) * 0.02 + (skill - 12) * 0.015 + (hasMod(A.team, 'spectacle+') ? 0.12 : 0), 0.2, 0.9);
        if (rnd() < exec) pr = Math.min(0.95, pr + 0.26);
        else if (rnd() < 0.55) {
          A.st.to++;
          this.ps(A, p.id).to++;
          this.last = { by: ai, kind: 'to' };
          this.push('to', ai, `${geste} raté de ${p.name}, ballon perdu`, false, { geste: true, att: ai, pid: p.id, pos: atPos, zone });
          return;
        } else pr = 0;
      }
    }
    A.st.shots++;
    const pp = this.ps(A, p.id);
    pp.sh++;
    const H = this.h, W = this.a;
    if (rnd() < pr) {
      const before = H.score - W.score;
      A.score++; A.st.goals++;
      A.run = 0; D.run = (D.run || 0) + 1;
      A.streak = A.streak && A.streak.id === p.id ? { id: p.id, name: p.name, n: A.streak.n + 1 } : { id: p.id, name: p.name, n: 1 };
      pp.g++;
      this.ps(D, gk.id).fa++;
      A.goals[p.id] = (A.goals[p.id] || 0) + 1;
      if (kind === '7m') A.st.sevenG++;
      if (kind === 'ca') A.st.caG++;
      this.last = { by: ai, kind: 'goal' };
      const after = H.score - W.score;
      let key = kind === '7m' || kind === 'vide' || (H.score + W.score === 1) || !!geste;
      if (min >= 50 && (Math.sign(before) !== Math.sign(after))) key = true;
      if (geste) { A.st.gestOk++; A.boost = i + 8; }
      this.push('but', ai, geste ? `${geste} de ${p.name} : but ${ZONE_TXT[zone]} !` : `But de ${p.name} ${ZONE_TXT[zone]}`, key, { pid: p.id, geste: !!geste, att: ai, pos: atPos, zone, shot: 'but' });
    } else {
      this.last = { by: ai, kind: 'miss' };
      const cface = !kind && zone === 'loin' ? this.defFace(D, i, A.at[p.id] || p.pos, 'contre') : null;
      const cpb = cface ? clamp(0.3 + (cface.v - 12) * 0.04, 0.1, 0.6) : 0;
      if (cpb && rnd() < cpb) {
        const blk = cface.who && rnd() < 0.7 ? cface.who : wpick(this.field(D, i), x => Math.pow(this.eff(D, x.p, 'contre'), 2)).p;
        D.st.blocks = (D.st.blocks || 0) + 1;
        this.ps(D, blk.id).bl = (this.ps(D, blk.id).bl || 0) + 1;
        this.push('contre', 1 - ai, `Tir de ${p.name} contré par ${blk.name}`, false, { geste: !!geste, att: ai, pid: p.id, zone, shot: 'contre' });
      } else if (kind === 'vide' || rnd() < 0.36) {
        this.push('rate', ai, geste ? `${geste} manqué par ${p.name}` : `${p.name} manque le cadre ${ZONE_TXT[zone]}`, kind === '7m', { geste: !!geste, att: ai, pid: p.id, pos: atPos, zone, shot: 'rate' });
      } else {
        D.st.saves++;
        D.saves[gk.id] = (D.saves[gk.id] || 0) + 1;
        const gp = this.ps(D, gk.id);
        gp.sv++; gp.fa++;
        this.push('arret', 1 - ai, `Arrêt de ${gk.name} sur ${kind === '7m' ? 'le 7 m' : geste ? 'la ' + geste.toLowerCase() : 'un tir'} de ${p.name}`, kind === '7m', { att: ai, pid: p.id, pos: atPos, zone, shot: 'arret', gk: gk.id });
      }
    }
  };

  // Temps morts : 3 par équipe et par match, 2 au plus dans une même mi-temps
  P.canTO = function (si) {
    const s = this.S[si], h = this.half();
    return !this.done && s.to[h] < 2 && s.to[0] + s.to[1] < 3;
  };
  // Temps mort : coupe la série adverse (petit regain de réussite) et souffle pour les joueurs sur le terrain
  P.timeout = function (si, why) {
    const s = this.S[si], h = this.half();
    if (!this.canTO(si)) return false;
    s.to[h]++;
    s.lastTOmin = this.minute(this.i);
    const cap = hasMod(s.team, 'capitanat+') ? 1 : hasMod(s.team, 'capitanat-') ? -1 : 0;
    s.boost = Math.max(s.boost, this.i + (cap > 0 ? 10 : cap < 0 ? 3 : 6));
    s.run = 0; s.press = 0;
    this.lastTO = { si, i: this.i };
    for (const x of this.on(s, this.i)) s.fat[x.p.id] = Math.max(0, s.fat[x.p.id] - (cap > 0 ? 7 : cap < 0 ? 2 : 4));
    this.push('tm', si, `Temps mort ${s.team.name}${why ? ' (' + why + ')' : ''}`, true, { ai: !!s.ai });
    if (s.ai) this.adjust(si, true);
    return true;
  };
  // Coach IA : temps morts déclenchés par une jauge de pression (buts encaissés, contre-attaques, pertes, exclusions,
  // buteur adverse en série), selon la patience du coach ; plus quelques raisons tactiques ponctuelles.
  P.coach = function (si, i) {
    const s = this.S[si], o = this.S[1 - si];
    if (!s.ai || this.done) return;
    const min = this.minute(i), h = this.half(), diff = s.score - o.score, c = s.ai;
    // Mise à jour de la jauge depuis le dernier passage
    const cur = { gf: s.score, ga: o.score, ca: o.st.caG || 0, to: s.st.to, ex: s.st.excl };
    if (s.snap) {
      const d = (k) => cur[k] - s.snap[k];
      s.press = Math.max(0, s.press * 0.97 + d('ga') + d('ca') * 0.5 + d('to') * 0.5 + d('ex') - d('gf') * 1.5);
      s.recTo = (s.recTo || 0) * 0.9 + d('to');
      if (o.streak && o.streak.n >= 3 && d('ga') && o.streak.n !== s.hotSeen) { s.press += 1; s.hotSeen = o.streak.n; }
    }
    s.snap = cur;
    // Pas deux temps morts à moins de 6 minutes d'écart ; le 2e d'une mi-temps demande plus de pression,
    // et en 1re mi-temps le coach en garde un pour la fin de match
    if (this.canTO(si) && min >= 5 && (min < 29 || min > 32) && (s.lastTOmin === undefined || min - s.lastTOmin >= 6)) {
      let why = null;
      const need = c.patience + (c.saver && h === 1 && min < 50 ? 1.2 : 0) + (s.to[h] ? 1.5 : 0) + (h === 0 && s.to[0] ? 1 : 0);
      if (s.press > need && rnd() < clamp(0.3 + (s.press - need) * 0.12, 0.3, 0.75)) {
        why = s.run >= 3 ? `${s.run} buts encaissés d'affilée` : o.streak && o.streak.n >= 3 ? `pour calmer ${o.streak.name}` : (s.recTo || 0) >= 1.6 ? 'après des ballons perdus' : 'pour casser le rythme';
      }
      else if (this.short(s, i) - this.short(o, i) >= 2 && rnd() < 0.3) why = 'pour gagner du temps en double infériorité';
      else if (h === 1 && min >= 55 && Math.abs(diff) <= 1 && rnd() < 0.08) why = 'pour préparer la dernière attaque';
      else if (h === 1 && min >= 56 && diff <= -1 && diff >= -3 && !s.empty && rnd() < 0.12) why = 'pour mettre en place le 7 contre 6';
      else if (this.lastTO && this.lastTO.si !== si && i - this.lastTO.i <= 2 && rnd() < 0.04) why = 'pour répondre au temps mort adverse';
      else if (diff <= -5 && rnd() < 0.03) why = 'pour secouer son équipe';
      if (why) { this.timeout(si, why); return; }
    }
    if ((i + si) % 4 === 0) this.adjust(si, false);
  };
  P.adjust = function (si, atTO) {
    const s = this.S[si], o = this.S[1 - si], c = s.ai, i = this.i;
    const min = this.minute(Math.min(i, this.N - 1)), diff = s.score - o.score, b = c.bold;
    const say = (txt) => this.push('coach', si, `${s.team.name} ${txt}`, true, { ai: true });
    // Gardien en difficulté : le coach tente l'autre
    const gk = s.lineup.GB, gs = s.ps[gk.id];
    if (!c.gk && min >= 12 && min <= 52 && gs && gs.fa >= 8 && gs.sv / gs.fa < (atTO ? 0.28 : 0.2)) {
      const alt = s.bench.filter(x => x.pos === 'GB' && !gone(s, x.id))[0];
      if (alt) { this.swap(s, 'GB', alt); s.gkLock = true; c.gk = true; say(`change de gardien : ${alt.name} entre`); }
    }
    if (diff <= -(4 - b) && min >= 30 && s.tac.att !== 'rapide') { s.tac.att = 'rapide'; say('accélère : passage en jeu rapide pour revenir'); }
    if (diff <= -(3 - b) && min >= 42 && s.tac.dstyle !== 'homme') { s.tac.dstyle = 'homme'; s.tac.int = Math.max(intensity(s), 1); say('défend désormais en homme à homme, avec plus d\'engagement'); }
    if (diff <= -2 && min >= 54 && intensity(s) < 2) { s.tac.int = 2; say('demande à ses joueurs de tout donner'); }
    if (diff >= 6 && min >= 45 && intensity(s) >= 0) { s.tac.int = -1; }
    if (diff <= -2 && min >= 50 - b * 3 && !s.forceDef) s.forceDef = rnd() < 0.5 ? '5-1' : '4-2';
    if (diff <= -1 && diff >= -3 && min >= 57 - b && !s.empty) { s.empty = true; say('sort son gardien : 7 contre 6'); }
    if (s.empty && diff > 0) { s.empty = false; say('arrête le 7 contre 6'); }
    if (diff >= 3 && (s.tac.att !== c.orig.att || s.tac.dstyle !== c.orig.dstyle || s.forceDef || intensity(s) > 0)) {
      s.tac.att = c.orig.att; s.tac.dstyle = c.orig.dstyle; s.forceDef = null; s.empty = false; s.tac.int = 0;
      say('a repris la main et revient à son plan de jeu');
    }
  };

  P.result = function () {
    const sideRes = (s) => ({
      id: s.team.id, score: s.score, half: s.half, st: s.st, goals: s.goals, saves: s.saves,
      fat: s.fat, played: Array.from(s.played), mins: s.mins, ps: s.ps, styleMin: s.styleMin, hurt: Array.from(s.hurt)
    });
    return { h: sideRes(this.h), a: sideRes(this.a), ev: this.ev };
  };

  // ---------- Saison ----------
  function team(st, id) { return st.teams.find(t => t.id === id); }
  // Note de match sur 10 (aussi affichée dans la fiche joueur)
  function noteOf(pos, min, g, sh, sv, fa, to, ex) {
    if (min < 3) return null;
    const r = pos === 'GB' ? 6 + (sv - 0.33 * fa) * GK_NOTE + (min >= 25 ? 0.2 : 0) : 6 + 0.55 * g - 0.3 * (sh - g) - 0.45 * to - 0.5 * ex + (min >= 40 ? 0.3 : 0);
    return Math.max(2, Math.min(10, Math.round(r * 10) / 10));
  }
  const GK_NOTE = 0.75;
  const MVP_BOOST = { form: 1, rest: 8 };
  // MVP du match : meilleure note parmi les joueurs des deux équipes ayant joué 15 minutes, +0,5 pour les vainqueurs.
  // Petit boost pour le match suivant : +1 de forme (plafond +2, donc pas de cumul) et 8 points de fatigue en moins.
  // Compté pour le titre de MVP de la saison.
  function pickMvp(st, r) {
    let best = null;
    for (const side of [r.h, r.a]) {
      const t = team(st, side.id), opp = side === r.h ? r.a : r.h, won = side.score > opp.score;
      for (const id of side.played) {
        const p = t.players.find(x => x.id === id), min = (side.mins || {})[id] || 0;
        if (!p || min < 15) continue;
        const q = (side.ps || {})[id] || {};
        const n = noteOf(p.pos, min, q.g || 0, q.sh || 0, q.sv || 0, q.fa || 0, q.to || 0, q.ex || 0);
        const sc = n + (won ? 0.5 : 0) + (p.pos === 'GB' ? q.sv || 0 : q.g || 0) * 0.001 + min * 0.00001;
        if (!best || sc > best.sc) best = { sc, p, t, n, q, min };
      }
    }
    if (!best) return null;
    best.p.mvp = (best.p.mvp || 0) + 1;
    best.p.form = Math.min(2, (best.p.form || 0) + MVP_BOOST.form);
    best.p.fatigue = Math.max(0, (best.p.fatigue || 0) - MVP_BOOST.rest);
    best.p.mvpBoost = st.round + 1;
    const q = best.q;
    return { id: best.p.id, name: best.p.name, pos: best.p.pos, team: best.t.id, note: best.n, min: Math.round(best.min), g: q.g || 0, sh: q.sh || 0, sv: q.sv || 0, fa: q.fa || 0, to: q.to || 0, ex: q.ex || 0, n: best.p.mvp };
  }
  function mvps(st, n) {
    const all = [];
    for (const t of st.teams) for (const p of t.players) if (p.mvp) all.push({ p, t });
    all.sort((x, y) => y.p.mvp - x.p.mvp || (y.p.goals + y.p.saves) - (x.p.goals + x.p.saves));
    return all.slice(0, n || 10);
  }
  function applyResult(st, r) {
    const styleLog = [];
    for (const side of [r.h, r.a]) {
      const t = team(st, side.id);
      const opp = side === r.h ? r.a : r.h;
      const res = Math.sign(side.score - opp.score);
      const xi = Object.values(t.lineup);
      if (t.lastXI) {
        const same = xi.filter(id => t.lastXI.includes(id)).length;
        t.cohesion = clamp(Math.round((t.cohesion || 50) + (same - 5) * 1.5 + (res > 0 ? 2 : res < 0 ? -1 : 0)), 20, 95);
      }
      t.lastXI = xi;
      for (const p of t.players) {
        const f = side.fat[p.id] || 0;
        p.fatigue = Math.round(f);
        if (side.played.includes(p.id)) {
          p.apps++;
          p.form = clamp((p.form || 0) * 0.5 + res, -2, 2);
          p.form = Math.round(p.form);
        }
        p.goals += side.goals[p.id] || 0;
        p.lastMins = (side.mins && side.mins[p.id]) || 0;
        // Le style joué façonne l'esprit collectif : jeu collectif = il monte, jeu individuel = il baisse
        const sm = (side.styleMin && side.styleMin[p.id]) || 0;
        if (p.pos !== 'GB' && p.a.collectif !== undefined && sm) {
          const ageF = p.age < 23 ? 1.5 : p.age <= 30 ? 1 : 0.5;
          if (rnd() < Math.min(1, Math.abs(sm) / 60) * 0.18 * ageF) {
            const dir = Math.sign(sm), before = p.a.collectif;
            p.a.collectif = clamp(before + dir, 1, 20);
            if (p.a.collectif !== before) styleLog.push({ team: t.id, id: p.id, name: p.name, pos: p.pos, d: dir, v: p.a.collectif });
          }
        }
        p.mins = (p.mins || 0) + p.lastMins;
        p.saves += side.saves[p.id] || 0;
        // Historique : [journée, note, min, buts, tirs, arrêts, tirs subis, pertes, exclusions, adversaire, résultat]
        const q = (side.ps && side.ps[p.id]) || {};
        (p.hist = p.hist || []).push([st.round + 1, Math.round(p.ovr * 10) / 10, Math.round(p.lastMins), q.g || 0, q.sh || 0, q.sv || 0, q.fa || 0, q.to || 0, q.ex || 0, opp.id, res]);
      }
    }
    r.mvp = pickMvp(st, r);
    r.inj = [];
    for (const side of [r.h, r.a]) {
      const t = team(st, side.id);
      for (const id of side.hurt || []) { const p = t.players.find(x => x.id === id); if (p && !hurt(p)) r.inj.push(rollInjury(st, t, p, 'match')); }
    }
    return styleLog;
  }
  function recover(st) {
    for (const t of st.teams) {
      const lastRd = st.sched[st.round - 1] || [], away = lastRd.some(([, a]) => a === t.id);
      const r = FAT.recover + (hasMod(t, 'soins+') ? 10 : 0) - (hasMod(t, 'soins-') ? 7 : 0) - (away && hasMod(t, 'deplacements-') ? 6 : 0);
      for (const p of t.players) p.fatigue = Math.max(0, p.fatigue - r);
    }
  }
  // ---------- Entraînement ----------
  const TRAIN = {
    equilibre: { label: 'Équilibré', attrs: FIELD.map(f => f[0]) },
    tir: { label: 'Tir', attrs: ['tirLoin', 'tirPres', 'tirAile', 'penalty'] },
    collectif: { label: 'Jeu collectif', attrs: ['passes', 'vision', 'position'] },
    physique: { label: 'Physique', attrs: ['vitesse', 'endurance', 'duel'] },
    defense: { label: 'Défense', attrs: ['contre', 'duelDef', 'discipline', 'sangfroid'] }
  };
  const INTENSITY = {
    legere: { label: 'Légère', mult: 0.5, rec: 10 },
    normale: { label: 'Normale', mult: 1, rec: 0 },
    intense: { label: 'Intense', mult: 1.6, rec: -12 }
  };
  // Expérience de match : la progression de la semaine dépend des minutes jouées à la dernière journée
  // Réserve : les jeunes du centre de formation et les pros de moins de 23 ans hors de la feuille de match (et non blessés)
  // jouent avec la réserve le même jour ; un pro de 23 ans et plus hors de la feuille reste en tribune, sans match.
  // sans match simulé. 60 minutes à 7 : les gardiens se partagent la cage, les joueurs de champ les 6 autres places
  // (plus ils sont nombreux, moins chacun joue). Moins de 7 joueurs : pas de match, une séance d'entraînement
  // au hasard à la place. Une minute en réserve vaut 20 % d'une minute en Starligue pour la progression.
  const RESERVE = { size: 7, xp: 0.2 };
  // Réserve : jeunes du centre de formation et pros de moins de 23 ans
  const inReserve = (p) => !!(p && (p.cf || p.age < CF.maxAge));
  function reserveRound(st, ids) {
    for (const t of st.teams) {
      if (ids && !ids.has(t.id)) continue;
      const out = new Set(t.out || []), res = t.players.filter(p => out.has(p.id) && !hurt(p) && inReserve(p));
      for (const p of t.players) { p.lastRes = 0; delete p.resFocus; }
      if (res.length < RESERVE.size) {
        const keys = Object.keys(TRAIN).filter(k => k !== 'equilibre');
        for (const p of res) p.resFocus = pick(keys);
        continue;
      }
      const gk = res.filter(p => p.pos === 'GB'), field = res.filter(p => p.pos !== 'GB');
      // Parts tirées au hasard puis ramenées au total (60 minutes par place), 60 minutes au plus chacun
      const share = (grp, slots) => { const w = grp.map(() => 0.7 + rnd() * 0.6), sw = w.reduce((x, y) => x + y, 0);
        grp.forEach((p, k) => { p.lastRes = Math.max(1, Math.min(60, Math.round(slots * 60 * w[k] / sw))); }); };
      if (gk.length) { share(gk, 1); share(field, 6); } else share(field, 7);
      for (const p of res) { p.resApps = (p.resApps || 0) + 1; p.resMins = (p.resMins || 0) + p.lastRes; }
    }
  }
  function matchXP(p) {
    const m = (p.lastMins === undefined ? 20 : p.lastMins) + (p.lastRes || 0) * RESERVE.xp;
    let f = m < 20 ? 0.7 + 0.3 * (m / 20) : Math.min(1.3, 1 + 0.3 * (m - 20) / 25);
    if (p.age < 23) f = 1 + (f - 1) * 2;
    return Math.round(f * 100) / 100;
  }
  function train(t, focus, intensity) {
    const F = TRAIN[focus] || TRAIN.equilibre, I = INTENSITY[intensity] || INTENSITY.normale;
    const sm = hasMod(t, 'staff+') ? 1.8 : hasMod(t, 'staff-') ? 0.4 : 1;
    const log = [];
    for (const p of t.players) {
      const ageF = p.age < 23 ? 1.4 : p.age <= 28 ? 1 : p.age <= 31 ? 0.5 : 0.2;
      const posA = POS_ATTRS[p.pos];
      // Réserve sans match (moins de 7 joueurs) : la semaine se fait sur un focus tiré au hasard
      const pf = p.resFocus && TRAIN[p.resFocus] ? p.resFocus : focus, PF = TRAIN[pf];
      const keys = p.pos === 'GB' ? posA : pf === 'equilibre' ? posA : PF.attrs.filter(k => posA.includes(k));
      // Centre de formation : ses éducateurs font progresser ses jeunes de −20 % (niveau 1) à +20 % (niveau 5)
      const rate = (p.pos === 'GB' ? 0.05 : pf === 'equilibre' ? 0.04 : 0.075) * (p.cf ? 1 + (academyOf(t) - 3) * 0.1 : 1) * (focus !== 'equilibre' && hasMod(t, 'staff+') ? 1.1 : 1) * (p.pot !== undefined ? (p.pot > p.ovr ? Math.min(1 + (p.pot - p.ovr) / 4, 3) : 0.05) : 1);
      for (const k of keys) {
        if (p.a[k] < 20 && rnd() < rate * ageF * I.mult * sm * matchXP(p)) {
          p.a[k]++;
          log.push({ id: p.id, name: p.name, pos: p.pos, k, v: p.a[k] });
        }
      }
      p.ovr = overall(p);
      if (p.pot !== undefined) p.pot = Math.max(p.pot, p.ovr);
      if (p.hist && p.hist.length) p.hist[p.hist.length - 1][1] = Math.round(p.ovr * 10) / 10;
      let rec = I.rec;
      if (intensity === 'intense') rec = hasMod(t, 'soins+') ? -6 : hasMod(t, 'soins-') ? -18 : rec;
      p.fatigue = clamp(p.fatigue - rec, 0, 100);
    }
    return log;
  }

  function aiPrepare(t) {
    autoLineup(t);
    ensureSheet(t);
    aiStyle(t);
  }
  function standings(st) {
    const rows = {};
    for (const t of st.teams) rows[t.id] = { id: t.id, j: 0, g: 0, n: 0, p: 0, bp: 0, bc: 0, pts: 0 };
    const games = [];
    for (const rd of st.results) for (const g of rd) games.push(g);
    for (const g of games) {
      const H = rows[g.h], A = rows[g.a];
      H.j++; A.j++;
      H.bp += g.hs; H.bc += g.as; A.bp += g.as; A.bc += g.hs;
      if (g.hs > g.as) { H.g++; A.p++; H.pts += 2; }
      else if (g.hs < g.as) { A.g++; H.p++; A.pts += 2; }
      else { H.n++; A.n++; H.pts++; A.pts++; }
    }
    const list = Object.values(rows);
    const byPts = {};
    for (const r of list) (byPts[r.pts] = byPts[r.pts] || []).push(r);
    for (const k in byPts) {
      const grp = byPts[k];
      const ids = new Set(grp.map(r => r.id));
      for (const r of grp) r.h2h = 0;
      if (grp.length > 1) {
        for (const g of games) {
          if (ids.has(g.h) && ids.has(g.a)) {
            rows[g.h].h2h += g.hs - g.as;
            rows[g.a].h2h += g.as - g.hs;
          }
        }
      }
    }
    list.sort((x, y) => y.pts - x.pts || y.h2h - x.h2h || (y.bp - y.bc) - (x.bp - x.bc) || y.bp - x.bp);
    return list;
  }
  function scorers(st, n) {
    const all = [];
    for (const t of st.teams) for (const p of t.players) if (p.goals) all.push({ p, t });
    all.sort((x, y) => y.p.goals - x.p.goals);
    return all.slice(0, n || 10);
  }

  const API = {
    setSeed, rnd, POS, POS_LABEL, FIELD, GKA, WEIGHTS, CLUBS, CONSIGNES, TACTIC_DEFS,
    newGame, makeTeam, autoLineup, overall, Match, applyResult, recover, aiPrepare, standings, scorers, team,
    FREE, freeRound, signFree, freeRefusal, freeRoom, freeLevel, TRAIN, INTENSITY, train, TRAITS, ROBUST, REP_LEVEL, LEGACY_CLUBS, DATA, clubOf, reserveRound, RESERVE, inReserve, CF, canJoinCF, joinCF, releasePlayer, cfOf, robMult, hurt, heal, trainInjuries, rushBack, canRushBack, rushBlock, MIN_FIELD, fixLineup, INJ, INJ_LABEL, JEU, DSTYLE, defaultRules, identity, experience, migrate, starters, MODS, modInfo, hasMod, FAT, HOME, BACK_STYLES, INTENSITY_LV, MANUAL_MIN, flagOf, FOREIGN, autoStyle, backStyle, BACK_POS, DLINE, FACING, matchXP, makeYouth, ensureSheet, POS_ATTRS, SECONDARY, ovrAt, potFor, odds, noteOf, mvps, aiYouth, youthRound, starRef, stars, potRange, fansOf, academyOf, academyOff, homeShot, awayCut, potMargin, starLabel, potLabel
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.HB = API;
})(typeof window !== 'undefined' ? window : globalThis);
