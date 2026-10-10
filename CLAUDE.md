# B9M Manager — instructions pour Claude

Jeu de gestion de handball type « Football Manager », jouable dans le navigateur. Projet perso d'Anaëlle (média Beyond9M). Tout se fait en français, ton direct et concis.

## Où est quoi

- `src/engine.js` : moteur (clubs, génération des joueurs, match possession par possession, coach IA, saison, entraînement, centre de formation, migration des sauvegardes). Exporté en `window.HB` et en `module.exports` (testable avec Node).
- `src/ui.js` : interface (ville isométrique « Cité du hand », effectif, tactique, match en direct, fiche joueur, thème aux couleurs du club, notifications).
- `src/shell.html` : gabarit HTML et CSS (tokens de couleur, mode clair et sombre). Contient les marqueurs `/*ENGINE*/` et `/*UI*/`.
- `build.py` : assemble `src/` en `index.html` (le fichier publié sur GitHub Pages).
- `docs/game-design.md` : le document de game design (copie Markdown du doc Claude « B9M Manager — Game Design Document »).

## Façon de travailler

1. Modifier `src/`, jamais `index.html` directement.
2. `python3 build.py` pour régénérer `index.html`.
3. Vérifier : `node --check src/engine.js src/ui.js`, puis simuler avec Node (`require('./src/engine.js')`) pour tout changement d'équilibrage, et tester l'interface (Playwright) si elle change.
4. Ne jamais casser les sauvegardes existantes : toute nouvelle donnée passe par `migrate()` dans `engine.js` (sauvegarde `localStorage`, clé `hbm-save-v1`).
5. Pousser sur `main` : GitHub Pages publie https://adx-codes.github.io/b9m-manager/ en une à deux minutes.

## Repères d'équilibrage (à préserver)

- Environ 29 buts par équipe et par match, 58–62 % d'efficacité.
- L'équipe qui reçoit prend 58–60 % des points à niveau égal.
- Un club 4 étoiles prend environ 75–80 % des points contre un 2 étoiles.
- Bonus et malus de club : 1 à 3 points chacun sur une saison, jamais plus.
- Chaque réglage tactique a un contre ; aucun choix ne gagne à tous les coups.

## Préférences d'Anaëlle

- Interface sobre : pas de surcharge visuelle, infos au survol plutôt qu'affichées en permanence.
- Couleurs du club atténuées, pas de violet ni d'orange criard.
- Les changements de joueurs se font uniquement en pause ; pas de message dans le fil du match pour les changements.
- Les clins d'œil (ville, légendes) restent visuels et discrets, sans mécanique de collection.
- Noms de légendes : reconnaissables mais pas trop proches des vrais noms.
