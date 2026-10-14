# B9M Manager — instructions pour Claude

Jeu de gestion de handball type « Football Manager », jouable dans le navigateur. Projet perso d'Anaëlle (média Beyond9M). Tout se fait en français, ton direct et concis.

## Où est quoi

- `src/engine.js` : moteur (clubs, génération des joueurs, match possession par possession, coach IA, saison, entraînement, centre de formation, joueurs libres, migration des sauvegardes). Exporté en `window.HB` et en `module.exports` (testable avec Node).
- `src/ui.js` : interface (ville isométrique « Cité du hand », effectif, tactique, match en direct, fiche joueur, joueurs libres, messagerie, tuto de l'adjoint, thème aux couleurs du club, notifications).
- `src/starligue.js` : saison réelle (clubs de la Starligue 2026-2027 et effectifs relevés sur lnh.fr), exportée en `window.HBDATA` ; les anciens clubs fictifs restent dans `engine.js` (`LEGACY_CLUBS`) pour les sauvegardes existantes.
- `src/shell.html` : gabarit HTML et CSS (tokens de couleur, mode clair et sombre). Contient les marqueurs `/*DATA*/`, `/*ENGINE*/` et `/*UI*/`.
- `build.py` : assemble `src/` en `index.html` (le fichier publié sur GitHub Pages) ; il force le mode sombre (`data-theme="dark"` sur `<html>`).
- `docs/game-design.md` : le document de game design (copie Markdown du doc Claude « B9M Manager — Game Design Document »).

## Façon de travailler

1. Modifier `src/`, jamais `index.html` directement.
2. `python3 build.py` pour régénérer `index.html`.
3. Vérifier : `node --check src/engine.js src/ui.js`, puis simuler avec Node (`require('./src/engine.js')`) pour tout changement d'équilibrage, et tester l'interface (Playwright) si elle change.
4. Ne jamais casser les sauvegardes existantes : toute nouvelle donnée passe par `migrate()` dans `engine.js` (sauvegarde `localStorage`, clé `hbm-save-v1`).
5. Tuto de l'adjoint : à chaque ajustement d'interface ou de gameplay, compléter ou adapter les étapes concernées (objet des étapes du tuto dans `ui.js`, cible `at` comprise) pour qu'il reste juste.
6. Pousser sur `main` : GitHub Pages publie https://adx-codes.github.io/b9m-manager/ en une à deux minutes.

## Repères d'équilibrage (à préserver)

- Environ 29 buts par équipe et par match, 58–62 % d'efficacité.
- Environ 7,5 % de matchs nuls (moyenne Starligue 2023-2026), soit 15 à 20 par saison.
- L'équipe qui reçoit prend 58–60 % des points à niveau égal.
- Un club 4 étoiles prend environ 75–80 % des points contre un 2 étoiles.
- Bonus et malus de club : 1 à 3 points chacun sur une saison, jamais plus.
- Chaque réglage tactique a un contre ; aucun choix ne gagne à tous les coups.
- Les réglages tactiques dépendent du contexte (tes joueurs, l'adversaire, son système et son style) : bien choisi, un réglage rapporte environ +10 à +14 % des points d'un match, à contre-emploi il en coûte autant. Aucun indice dans le jeu : le coach analyse l'adversaire. Outil de calibrage : comparer un contexte favorable et un défavorable (constantes `CS` dans engine.js).
- Consignes : une au plus par type (attaque, défense, transition et gestion), modifiables dans la tactique, l'avant-match, la feuille de match et en pause.

## Préférences d'Anaëlle

- Interface sobre : pas de surcharge visuelle, infos au survol plutôt qu'affichées en permanence.
- Couleurs du club atténuées, pas de violet ni d'orange criard.
- Les changements de joueurs se font uniquement en pause ; pas de message dans le fil du match pour les changements.
- Les clins d'œil (ville, légendes) restent visuels et discrets, sans mécanique de collection.
- Noms de légendes : reconnaissables mais pas trop proches des vrais noms.
- Jeux de mots bienvenus là où ils tombent bien (noms, petites légendes, messages), sans en faire trop : un clin d'œil de temps en temps, jamais dans les infos utiles au jeu. Le championnat s'appelle la SparLigue (clin d'œil à la Lidl Starligue).
- Jeu pensé pour PC et tablette, pas pour mobile : on peut utiliser la largeur (conteneur à 1 440 px).
- Ne jamais afficher la note sur 20 ni le potentiel chiffré : tout passe par les étoiles (`stars`, `potRange` dans engine.js ; `pstars`, `vstars` dans ui.js).

## Chantiers notés pour plus tard

- Robustesse et âge : avec les saisons multiples, faire décroître la robustesse de chaque joueur saison après saison, à partir de sa robustesse de base (à mémoriser par joueur, via `migrate()`). Aujourd'hui elle est tirée une fois à la création, un peu plus basse après 30 ans, et ne bouge plus.
