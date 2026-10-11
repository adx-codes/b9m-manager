// Saison réelle de Starligue : clubs et effectifs (À VALIDER point par point avant de pousser).
// Clubs : liste 2026-2027 validée ; étoiles validées ; couleurs à revoir plus tard ; buvette pas encore affichée pour tous.
// Couleurs, étoiles, supporters, centre de formation et buvette : premières propositions, à corriger.
// Effectifs : vides tant que l'accès à lnh.fr n'est pas ouvert ; un club sans effectif garde des joueurs générés.
// Format d'un joueur : { name: 'Prénom Nom', pos: 'GB'|'AiG'|'ArG'|'DC'|'Piv'|'ArD'|'AiD', hand: 'G'|'D', born: 1998, nat: 'DK' }
// (hand, born et nat facultatifs ; nat en code pays à deux lettres, rien ou 'FR' pour un Français).
(function (root) {
  const HBDATA = {
    season: '2026-2027',
    year: 2026,
    clubs: [
      { id: 'PSG', name: 'Paris Saint-Germain Handball', city: 'Paris', region: 'paris', rep: 5, color: '#1d2f6b', color2: '#c8323f', fans: { h: 3, a: 2, name: 'Les Titis de Coubertin' }, academy: 4, buvette: 'jambon-beurre à 9 €' },
      { id: 'HBN', name: 'HBC Nantes', city: 'Nantes', region: 'ouest', rep: 5, color: '#4b3470', color2: '#e3c35a', fans: { h: 5, a: 4, name: 'La Marée Violette' }, academy: 4, buvette: 'petit-beurre trempé dans le muscadet' },
      { id: 'MHB', name: 'Montpellier Handball', city: 'Montpellier', region: 'sudouest', rep: 4, color: '#1f4f8f', color2: '#d98a4a', fans: { h: 4, a: 3, name: 'Les Pailladins Survoltés' }, academy: 5, buvette: 'tielle sétoise' },
      { id: 'AIX', name: 'Provence Aix UC', city: 'Aix-en-Provence', region: 'provence', rep: 4, color: '#2b2b2b', color2: '#e0b83c', fans: { h: 4, a: 2, name: 'Les Calissons Survoltés' }, academy: 3, buvette: 'calissons' },
      { id: 'LIM', name: 'Limoges Handball', city: 'Limoges', region: 'auvergne', rep: 4, color: '#2a5d9f', color2: '#e6e6e6', fans: { h: 4, a: 3, name: 'Les Porcelaines Fêlées' }, academy: 3, buvette: 'clafoutis aux cerises' },
      { id: 'CHA', name: 'Chambéry Savoie Mont-Blanc Handball', city: 'Chambéry', region: 'alpes', rep: 4, color: '#9e2a2b', color2: '#2b2b2b', fans: { h: 4, a: 3, name: 'Les Diots Déchaînés' }, academy: 4, buvette: 'tartiflette en barquette' },
      { id: 'SRA', name: 'Saint-Raphaël Var Handball', city: 'Saint-Raphaël', region: 'provence', rep: 3, color: '#2f6fa6', color2: '#f0f0f0', fans: { h: 3, a: 2, name: 'Les Rascasses du Var' }, academy: 3, buvette: 'panisse' },
      { id: 'FTH', name: 'Fenix Toulouse Handball', city: 'Toulouse', region: 'sudouest', rep: 3, color: '#2b2b2b', color2: '#c8453b', fans: { h: 3, a: 2, name: 'Les Phénix Roses' }, academy: 3, buvette: 'saucisse de Toulouse' },
      { id: 'NIM', name: 'USAM Nîmes Gard', city: 'Nîmes', region: 'provence', rep: 3, color: '#2e6b3f', color2: '#c8453b', fans: { h: 4, a: 3, name: 'Les Gladiateurs des Arènes' }, academy: 3, buvette: 'brandade de morue' },
      { id: 'CES', name: 'Cesson Rennes Métropole Handball', city: 'Cesson-Sévigné', region: 'bretagne', rep: 3, color: '#24406b', color2: '#c8453b', fans: { h: 4, a: 3, name: 'Les Irréductibles' }, academy: 4, buvette: 'galette-saucisse' },
      { id: 'DUN', name: 'US Dunkerque', city: 'Dunkerque', region: 'nord', rep: 3, color: '#2a4f8a', color2: '#e3c35a', fans: { h: 3, a: 2, name: 'Les Carnavaleux' }, academy: 3, buvette: 'frites-fricadelle' },
      { id: 'CHR', name: "C'Chartres Métropole Handball", city: 'Chartres', region: 'ouest', rep: 3, color: '#2c5a8c', color2: '#e0b83c', fans: { h: 3, a: 2, name: 'Les Gargouilles' }, academy: 2, buvette: 'pâté de Chartres' },
      { id: 'TRE', name: 'Tremblay Handball', city: 'Tremblay-en-France', region: 'paris', rep: 2, color: '#a3262a', color2: '#f0f0f0', fans: { h: 2, a: 2, name: 'Les Secousses de Tremblay' }, academy: 3, buvette: 'kebab-frites' },
      { id: 'SEL', name: 'Sélestat Alsace Handball', city: 'Sélestat', region: 'alsace', rep: 2, color: '#2f6b4a', color2: '#f0f0f0', fans: { h: 3, a: 2, name: 'Les Bretzels Bouillants' }, academy: 3, buvette: 'bretzel et bière d\'Alsace' },
      { id: 'SAR', name: 'Saran Loiret Handball', city: 'Saran', region: 'ouest', rep: 2, color: '#a3262a', color2: '#2b2b2b', fans: { h: 2, a: 1, name: 'Les Castors du Loiret' }, academy: 2, buvette: "cotignac d'Orléans" },
      { id: 'CAE', name: 'Caen Handball', city: 'Caen', region: 'ouest', rep: 2, color: '#24406b', color2: '#c8453b', fans: { h: 3, a: 2, name: 'Les Teurgoules en Fusion' }, academy: 2, buvette: 'teurgoule' }
    ],
    rosters: {
      PSG: [], HBN: [], MHB: [], AIX: [], LIM: [], CHA: [], SRA: [], FTH: [], NIM: [], CES: [], DUN: [], CHR: [], TRE: [], SEL: [], SAR: [], CAE: []
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = HBDATA;
  else root.HBDATA = HBDATA;
})(typeof window !== 'undefined' ? window : this);
