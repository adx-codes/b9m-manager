# B9M Manager — Game Design Document (MVP)

Copie Markdown du doc Claude « B9M Manager — Game Design Document » · mise à jour du 10 octobre 2026 · Anaëlle

## Vision et périmètre du MVP

Le MVP est un jeu de gestion de handball jouable dans le navigateur : on dirige un club fictif pendant une saison complète, et chaque match est simulé à partir des effectifs et des choix tactiques.

**Pitch.** Un « Football Manager » centré sur ce qui fait le handball : rotations fréquentes, exclusions de 2 minutes, duels avec le gardien, choix du système défensif.

**Boucle de jeu, une journée :**

1. Consulter son effectif (forme, fatigue, notes).
2. Choisir les 7 titulaires, le banc et la tactique.
3. Lancer le match : simulation, puis score et événements clés.
4. Voir les résultats de la journée et le classement mis à jour.

**Dans le MVP (prototype jouable) :** un championnat de 16 équipes (la SparLigue), effectifs générés, ville isométrique comme accueil, bonus et malus de club, tactique avec styles et bascules défensives, moteur de match (avantage du terrain, face-à-face, intensité) avec rotations et coach IA, jeu des arrières, légendes à découvrir, entraînement hebdomadaire, centre de formation, fiche joueur, profil d'équipe, classement, sauvegarde locale.

**Hors MVP :** mercato, finances, staff, coupes, blessures longues, saisons multiples, joueurs réels. Ces briques sont déjà représentées dans la ville par des bâtiments grisés.

## Monde de jeu

Un seul championnat fictif de 16 clubs, en matchs aller-retour : 30 journées par saison.

- **Clubs :** nom, ville, note de réputation (1 à 5) qui règle le niveau moyen de l'effectif généré.
- **Effectif :** 14 joueurs par club, dont 2 gardiens.
- **Calendrier :** généré en round-robin, une journée = un match par club.
- **Points :** victoire 2, nul 1, défaite 0 (barème LNH).
- **Départage :** points, puis différence de buts particulière, puis différence de buts générale, puis buts marqués.
- **Fin de saison :** écran de bilan avec classement final et meilleurs buteurs.

**Les 16 clubs (fictifs, un par grande ville, chacun avec une couleur et une couleur de contraste) :**

| Club | Ville | Réputation (1 à 5) |
| --- | --- | --- |
| Lutèce Handball | Paris | 5 |
| Montpellier Écusson HB | Montpellier | 5 |
| Lyon Confluence HB | Lyon | 4 |
| Toulouse Briques Roses | Toulouse | 4 |
| Les Éléphants de Nantes | Nantes | 4 |
| Bordeaux Garonne HB | Bordeaux | 4 |
| Grenoble Bastille HB | Grenoble | 4 |
| Rennes Hermine HB | Rennes | 3 |
| Marseille Calanques HB | Marseille | 3 |
| Lille Beffroi HB | Lille | 3 |
| Strasbourg Rhin HB | Strasbourg | 3 |
| Angers Ardoise HB | Angers | 3 |
| Clermont Volcans HB | Clermont-Ferrand | 3 |
| Nice Baie des Anges | Nice | 2 |
| Saint-Étienne Forez HB | Saint-Étienne | 2 |
| Dijon Moutarde HB | Dijon | 2 |

## Joueurs

Chaque joueur a un poste principal, 14 attributs notés de 1 à 20, 2 traits de profil, et une note globale calculée selon les attributs clés de son poste. Cette note sur 20 sert au moteur mais n'est jamais affichée : le joueur la voit en étoiles (voir ci-dessous).

**Étoiles (niveau et potentiel) :** affichage de 0,5 à 5 étoiles, par demi-étoile, relatif au niveau du club du joueur, comme dans Football Manager. Référence : moyenne du meilleur joueur à chacun des 7 postes de son effectif. Un joueur à ce niveau vaut 3½ ★, et 1,6 point de note vaut une étoile (5 ★ dès 2,4 points au-dessus). Les joueurs adverses sont notés sur la même référence : un titulaire d'un gros club peut valoir 5 ★ pour un petit club. Niveau et potentiel s'affichent séparément (deux colonnes dans l'effectif, deux lignes dans la fiche) : le potentiel est plein jusqu'au bas de la fourchette du staff, pâle jusqu'à son haut. Au survol, un libellé (joueur clé, titulaire solide, titulaire correct, joueur de rotation, remplaçant, niveau insuffisant) et sa traduction en étoiles, jamais le chiffre. La progression de la saison (Δ) s'affiche en flèche ▲ ou ▼. Les attributs restent sur 20, la note de match sur 10.

**Attributs de champ (1 à 20) :**

| Attribut | Rôle dans la simulation |
| --- | --- |
| Tir de loin (9 m) | Réussite des tirs extérieurs |
| Tir de près (6 m / aile) | Réussite au pivot, en contre-attaque |
| Tir de l'aile | Réussite à l'aile |
| Pénalty | Réussite sur 7 m |
| Passes | Qualité des transmissions, propension à perdre des ballons |
| Prise de position | Capacité à créer des blocs et des espaces pour ses coéquipiers |
| Vision de jeu | Qualité des occasions créées pour les partenaires |
| Duel / pénétration | Capacité à fixer, provoquer des 7 m |
| Vitesse | Contre-attaques, repli défensif |
| Contre | Bloquer les tirs de loin de son vis-à-vis (note élargie aux voisins en défense collective) |
| Duel défensif | Stopper les percées de son vis-à-vis, provoquer des passages en force ; compte deux fois moins pour un ailier |
| Discipline | Risque d'exclusion de 2 min |
| Endurance | Vitesse de baisse de la fatigue |
| Sang-froid | Bonus en fin de match serré |

**Traits de profil (1 à 20, joueurs de champ) :** ils décrivent une personnalité, pas un niveau. Ils n'entrent pas dans la note globale et ne progressent pas à l'entraînement.

| Trait | Bas | Haut | Effet dans la simulation |
| --- | --- | --- | --- |
| Excentricité | Joueur sobre | Artiste | Probabilité de tenter un geste spectaculaire (roucoulette, kung-fu, chabala, tir à la hanche, tir dans le dos) |
| Esprit collectif | Joueur perso | Joueur collectif | Alimente l'identité de l'équipe ; un joueur à 7 ou moins perd plus de ballons dans un jeu collectif |

Génération : excentricité centrée sur 9 avec une forte dispersion, esprit collectif centré sur 11.

**Attributs gardien :** réflexes, placement, 7 m, relance, endurance.

**Pondération de la note globale par poste :**

| Poste | Attributs les plus lourds |
| --- | --- |
| Gardien (GB) | Réflexes, placement, 7 m |
| Ailier (AiG / AiD) | Tir de l'aile, vitesse |
| Arrière (ArG / ArD) | Tir de loin, duel (profil tireur, pénétrant ou complet) |
| Demi-centre (DC) | Passes, vision de jeu, duel, sang-froid |
| Pivot (Piv) | Tir de près, prise de position, contre, duel défensif |

**Génération d'un effectif de 14 :** 2 GB, 2 AiG, 2 AiD, 2 ArG, 2 ArD, 2 DC, 2 Piv. Âge entre 18 et 35 ans, latéralité (droitier/gaucher) et une note moyenne centrée sur la réputation du club.

**État variable :** fatigue (0 à 100, 35 points récupérés entre deux journées), forme (–2 à +2 selon les derniers matchs), minutes jouées.

**Postes secondaires :** un joueur peut dépanner à un poste voisin. Il y vaut le meilleur entre sa note calculée à ce poste et 85 % de sa note.

| Poste d'origine | Peut dépanner en |
| --- | --- |
| Demi-centre | Arrière gauche, arrière droit |
| Arrière gauche | Demi-centre, ailier gauche |
| Arrière droit | Demi-centre, ailier droit |
| Ailier gauche | Arrière gauche |
| Ailier droit | Arrière droit |

**Latéralité :** chaque joueur est droitier (D) ou gaucher (G), visible dans l'effectif. À droite, un gaucher a le bon angle : +3 % au tir à l'arrière droit, +4 % à l'aile droite. Un droitier y tire sur son mauvais côté : −2 % et −3 %. Effet mesuré : environ 0,7 but par match.

**Potentiel :** chaque joueur a un plafond, affiché en étoiles comme une estimation du staff. Fourchette selon l'âge : 1½ étoile jusqu'à 18 ans, 1 étoile à 19–20 ans, ½ étoile de 21 à 23 ans, potentiel exact (arrondi à la demi-étoile) à partir de 24 ans. La fourchette contient toujours le vrai potentiel ; son décalage est propre à chaque joueur et ne change pas, si bien qu'elle se resserre autour de la vraie valeur en vieillissant. Marge selon l'âge : 2 à 6 points avant 21 ans, 1 à 4 avant 24 ans, presque rien après 28 ans. Sous son potentiel, il progresse jusqu'à 3 fois plus vite ; au-dessus, presque plus.

**Temps de jeu et progression :** les minutes du dernier match multiplient la progression de la semaine, de ×0,7 sans jouer à ×1,3 au-delà de 45 minutes. Effet doublé avant 23 ans (×0,4 à ×1,6). Les moins de 23 ans portent l'icône 🌱 pendant les matchs.

**Niveau selon l'âge :** le niveau de base du club (selon sa réputation) est ajusté par l'âge du joueur. Les clubs gardent le même niveau moyen, ce sont les profils qui changent.

| Âge | Ajustement | Note moyenne | Potentiel moyen |
| --- | --- | --- | --- |
| 18–20 ans | −1,5 | 11,7 | 15,8 |
| 21–23 ans | −0,8 | 12,3 | 14,9 |
| 24–27 ans | +0,15 | 13,4 | 14,1 |
| 28–31 ans | +0,5 | 13,7 | 13,9 |
| 32 ans et + | +0,7 | 13,9 | 13,9 |

**Profils d'arrières :** à la génération, 38 % des arrières et demi-centres sont tireurs de loin (+2 au tir à 9 m), 34 % pénétrants (+2 au duel et au tir à 6 m), les autres complets.

**Gauchers :** les arrières droits et ailiers droits sont toujours gauchers (4 par effectif), environ 15 % ailleurs.

**Noms :** chaque club a des noms typiques de sa région (Bretagne, Ouest, Nord, Alsace, Paris, Provence, Sud-Ouest, Alpes, Auvergne, Bourgogne). Environ 12 % de joueurs étrangers (Danemark, Allemagne, Norvège, Espagne, Croatie, Serbie, Suède, Islande), avec leur drapeau. Pas d'homonymes dans un effectif.

**Jeunes du centre :** attributs autour de 9 (rarement plus de 14), potentiel = note + 1,5 à 5,5 points, une vraie pépite (+3) environ une fois sur 8.

**Légendes (regens) :** 20 jeunes aux noms qui rappellent des légendes, au même poste (Thomas Omeyrac, Nikolaï Karabatov, Mikael Hanstrup, Uli Gensmeier, Luca Abalone, Bertrand Gillot…). Trois sont dispersées chez des clubs adverses au début de partie, puis environ un jeune sur cinq du centre de formation en est une. Attributs clés relevés, potentiel de 16,5 à 19,5, aucun signe distinctif. Chaque nom n'apparaît qu'une fois par partie.

## Tactique

Chaque secteur a toujours deux réglages : en attaque le rythme et le jeu, en défense le style et les bascules. Aucun choix ne gagne à tous les coups.

**Attaque · rythme**

- **Jeu placé :** moins de pertes de balle, possessions plus longues, peu de contre-attaques.
- **Jeu rapide :** contre-attaques et engagements rapides, plus de pertes, fatigue accrue.

**Attaque · jeu**

| Jeu | Effet | Colle avec |
| --- | --- | --- |
| Collectif | Vision du demi-centre comptée double, tirs répartis, plus de jeu au pivot et à l'aile | Une équipe collective (esprit collectif moyen haut) |
| Équilibré | Ni bonus ni malus | Tout le monde |
| Individuel | Plus de percées, les meilleurs tireurs prennent plus de tirs, plus de gestes tentés | Une équipe individuelle (esprit collectif moyen bas) |

**Défense · style**

| Style | Point fort | Point faible |
| --- | --- | --- |
| Défense collective | Aide permanente : solide contre les duels et les percées | Fragile face à de bons ailiers |
| Homme à homme | Pression sur le porteur, ailes étouffées, plus de ballons récupérés | Fragile face à des arrières forts en duel, fatigue accrue |

**Défense · système.** La base est toujours le 6-0 : il protège la zone et limite les tirs de près, mais laisse tirer de loin. Le 5-1 et le 4-2 sont contextuels : le coach fixe des règles de bascule, que le moteur applique seul pendant le match, par ordre de priorité.

| Règle (par défaut) | Déclencheur | Système |
| --- | --- | --- |
| Pour revenir au score (active) | Mené de 3 buts ou plus à partir de la 50e, écart et minute réglables | 4-2 |
| En supériorité numérique (active) | Un joueur adverse exclu | 5-1 |
| Contre un tireur redoutable (inactive) | Un arrière adverse à 16+ en tir de loin sur le terrain | 5-1 |

Rappel des systèmes : le 5-1 gêne la circulation et les tirs de 9 m, mais ouvre des espaces au pivot et aux changements de secteur. Le 4-2 provoque des pertes de balle, mais ouvre les espaces à 6 m, avec une fatigue accrue.

**Consignes (deux au choix) :** cibler le pivot, cibler les ailes, défense agressive, rotations fréquentes.

**Pendant le match :** un temps mort par mi-temps pour changer de rythme, de jeu, de style, de gardien, ou forcer un système (5-1 ou 4-2) à la place des règles. Il donne aussi un petit regain (+3 % au tir pendant 6 possessions, 4 points de fatigue en moins). Pause automatique à la mi-temps. 7 contre 6 activable à partir de la 50e. Curseur d'intensité (de Gestion à Tout donner) dans les temps morts et à la mi-temps.

## Jeu des arrières et face-à-face

Chaque arrière (ArG, DC, ArD) a un jeu : De loin, Équilibré ou Au contact. Par défaut, le jeu conseillé par le staff selon ses notes (écart de 2 points entre tir à 9 m et moyenne tir à 6 m + duel). Il se règle dans une fenêtre de la tactique, et peut être changé pour un seul match depuis la préparation.

- **De loin :** tirs à 9 m ×1,7, percées réduites, peu de pertes ; vulnérable face aux bons contreurs.
- **Au contact :** percées ×1,7, plus de 7 m et d'exclusions provoquées, risque de passage en force, fatigue +8 %.
- **Registre naturel :** +3 % de réussite dans son registre, −2,5 % à contre-emploi.

**Face-à-face :** sur une percée ou un tir de loin, l'attaquant affronte son vis-à-vis (ArG face à l'ArD adverse, ArD face à l'ArG, DC face au DC). Duel défensif contre les percées, contre contre les tirs de loin. Un défenseur exclu laisse un trou.

**Note élargie en défense collective :** chaque défenseur s'appuie sur ses deux voisins de ligne (35 % au duel, 50 % au contre). En homme à homme, il est seul. Les ailiers comptent moitié moins en défense.

**Préparation du match :** une carte par arrière montre son vis-à-vis, deux barres (percée, tir de loin) et un conseil : Percer, Tirer de loin, Au choix ou Duel difficile.

## Caractéristiques d'équipe

Trois indicateurs globaux, calculés à partir de l'effectif, décrivent l'équipe et pèsent sur chaque possession. Ils sont affichés au vestiaire et dans la fiche de l'adversaire avant chaque match.

| Indicateur | Calcul | Effet |
| --- | --- | --- |
| Identité de jeu | Moyenne de l'esprit collectif des 6 joueurs de champ titulaires : collective (12,5 et plus), mixte, individuelle (9,5 et moins) | Bonus si le jeu choisi colle à l'identité, malus sinon (jusqu'à ±4 points de réussite au tir) |
| Cohésion (20 à 100) | Monte quand les mêmes titulaires enchaînent les matchs (+1,5 par titulaire conservé au-delà de 5), plus 2 après une victoire ; baisse avec les changements | Réussite au tir et pertes de balle (±3 points environ aux extrêmes) |
| Expérience (0 à 100) | Âge et matchs joués des titulaires | Bonus dans les 10 dernières minutes d'un match serré, moins d'exclusions |

L'IA adverse choisit son jeu selon son identité : collectif au-dessus de 12, individuel en dessous de 10. L'identité bouge avec le style joué : un joueur qui passe ses minutes en jeu collectif voit son esprit collectif monter doucement (environ ±3 sur une saison), en jeu individuel il baisse, en jeu équilibré rien ne bouge.

## Bonus et malus de club

Au lancement, on choisit son club, puis un bonus parmi 3 tirés au hasard et un malus parmi 3 autres, d'un domaine différent. Chaque club IA reçoit aussi un bonus et un malus au hasard, visibles avant le match et dans le classement.

| Domaine | Bonus | Malus |
| --- | --- | --- |
| Public | Un chaudron les soirs de match : +3 % au tir à domicile, plus de pertes adverses | Trois pelés et un tondu : −3 % au tir à domicile |
| Staff | Un staff bac+12 : progression ×1,8 | Le staff joue à Fortnite : progression ×0,4 |
| Formation | La génération dorée : moins de 23 ans et jeunes du centre +1 partout | Les cadets sont encore au goûter : −1 partout |
| Vestiaire | Barbecue tous les dimanches : cohésion de départ 75 | Deux groupes WhatsApp : cohésion de départ 35 |
| Soins | Le kiné a des mains de fée : −20 % de fatigue en match, +10 de récupération | Le kiné est parti à Ibiza : −7 de récupération |
| Cage | Un mur dans les cages : gardiens +1 réflexes et placement | Des mains en beurre doux : −1 |
| Discipline | Des enfants de chœur : +4 discipline | Sang chaud garanti : −4 discipline |
| Spectacle | Les Harlem Globetrotters du hand : +3 excentricité, gestes mieux réussis | Roucoulette interdite au règlement intérieur : −6 excentricité, −1,5 % en attaque placée |
| Mental | Des nerfs d'acier : +4 sang-froid, +3 % au tir en fin serrée | Les jambes en coton à la 55e : −4 et −3 % |
| Physique | Ils ne transpirent jamais : +2 vitesse et endurance | La raclette de la veille : +8 de fatigue au coup d'envoi |
| Arbitrage | Les arbitres sont des cousins : +60 % de 7 m obtenus | L'arbitre a une dent contre nous : plus d'exclusions |
| Calendrier | Un calendrier en pente douce : 5 premières journées contre les plus faibles, +10 cohésion | Le calendrier du diable : contre les plus forts, −10 cohésion |

Plusieurs effets dépendent du plan de jeu (jeu rapide avec Physique, défense agressive avec Discipline ou Arbitrage). Le staff le rappelle dans ses conseils en tactique, en entraînement et avant chaque match. Chaque duo vaut 1 à 3 points sur une saison, pour que ce choix ne pèse pas plus que la gestion de l'équipe. Hors tirage : renseignement, latéralité et finances, à ajouter avec le mercato.

## Moteur de match

Le match est simulé possession par possession : environ 55 par équipe sur 60 minutes, chacune résolue en une issue tirée au sort selon les attributs et les tactiques.

**Déroulé d'une possession :**

1. Choix du type d'action : contre-attaque (si perte adverse et vitesse), sinon attaque placée.
2. Choix du tireur : pondéré par le poste, la consigne et la note de l'attaquant face à son vis-à-vis.
3. Issue : perte de balle, faute (jet franc, on rejoue), 7 m obtenu, ou tir.
4. Un tir se résout en duel tireur contre gardien : but, arrêt, ou tir hors cadre.
5. Sur chaque faute, test de discipline : exclusion de 2 minutes possible.

Les 7 m et les tirs passent tous deux par le duel avec le gardien ; les fautes déclenchent le test de discipline.

**Probabilité de but d'un tir** (point de départ à équilibrer) :

```latex
P(but) = base_{zone} + k \cdot (tir - gardien) + bonus_{tactique} - malus_{fatigue}
```

Base indicative par zone : contre-attaque 0,80 ; aile 0,60 ; pivot 0,70 ; 9 m 0,45 ; 7 m 0,75. Le résultat est borné entre 0,05 et 0,95.

**Exclusions :** l'équipe joue à 6 pendant 4 possessions environ, avec un malus en défense. Une troisième exclusion d'un même joueur vaut carton rouge.

**Fatigue :** chaque possession sur le terrain en coûte (moins avec une bonne endurance), le banc en fait récupérer. Dès 28, les attributs baissent de 0,9 % par point, jusqu'à −45 %. Détail plus bas, dans Match en direct.

**Sorties :** score, score à la mi-temps, buteurs, arrêts du gardien, exclusions, et 8 à 12 temps forts textuels (« 47e : exclusion de 2 min pour le pivot »).

**Gestes spectaculaires (excentricité) :** avant chaque tir hors 7 m, le tireur peut tenter un geste. La probabilité monte avec l'excentricité (0 sous 6, jusqu'à 26 % à 20), ×1,4 en contre-attaque, ×1,3 en jeu individuel, ×0,8 en jeu collectif.

1. Réussite d'exécution : 56 % de base, +2 points par point d'excentricité au-dessus de 10, +1,5 par point de tir au-dessus de 12.
2. Geste exécuté : +26 points de réussite au tir ; s'il fait but, l'équipe gagne +3 points de réussite pendant 4 possessions.
3. Geste raté : 55 % de perte de balle (contre-attaque possible), sinon tir perdu.

Effet mesuré sur 2 000 matchs : un excentrique moyen (12) est neutre, un artiste (18) rapporte environ un but par match.

**Bascules défensives :** à chaque possession, le moteur vérifie les règles du défenseur (revenir au score, supériorité, tireur redoutable) ou le système forcé en temps mort. Chaque changement est inscrit dans le fil du match.

**Styles :** l'homme à homme ajoute +3 points par point de duel moyen des arrières au-dessus de 12 sur les percées ; la défense collective ajoute +2,5 points par point de tir de l'aile moyen des ailiers au-dessus de 12 sur les tirs à l'aile.

## Match en direct

Un match dure environ 2 × 53 à 59 possessions, déroulées en direct à trois vitesses (×1, ×2, ×4). La barre du bas garde score, chrono et bouton pause, aussi accessible avec la touche Espace.

**Fatigue :** environ 0,9 point par possession sur le terrain (0,2 pour un gardien), modulé par l'endurance ; −0,35 par possession sur le banc ; −10 à la mi-temps. Le jeu rapide, la 4-2, l'homme à homme et la défense agressive fatiguent plus. Jauge verte sous 28, orange jusqu'à 55, rouge au-delà. Une équipe qui ne tourne jamais perd environ un but par match.

**Rotations automatiques :** le staff fait tourner chaque poste selon son propre plan, décalé et aléatoire : le demi-centre souffle d'abord, puis un ailier, puis le pivot, jamais tous ensemble. Chaque titulaire vise 35 à 45 minutes. Dans les fins serrées (écart de 3 buts ou moins après la 50e), les titulaires restent. Un joueur au-dessus de 70 de fatigue sort en urgence. Les gardiens se partagent les mi-temps par défaut.

**Changements manuels :** uniquement en pause. On clique un joueur du terrain, puis un remplaçant : vert au même poste, bleu à un poste secondaire. Chaque carte affiche le niveau au poste en étoiles et, si le joueur est fatigué, une petite courbe qui plonge : orange quand la baisse commence, puis de plus en plus rouge et pentue. Le niveau réel reste calculé par le moteur mais n'est pas affiché ; au survol, la baisse est seulement qualifiée (légère, nette ou forte). Dès qu'on change un joueur, le staff ne touche plus à ce poste pendant 7 minutes de jeu (compte à rebours sur la carte), puis reprend les rotations ; on peut lui rendre la main plus tôt. Pas de message dans le fil du match pour les changements.

**Coach IA adverse :**

- Temps mort après 3 ou 4 buts encaissés d'affilée, pour préparer une fin serrée, ou en gros retard. Environ 1 par équipe et par match.
- Mené au score, il durcit son plan par paliers : jeu rapide (écart de 4 après la 30e), homme à homme (3 après la 42e), 5-1 ou 4-2 forcé (2 après la 50e), 7 contre 6 dans les 3 dernières minutes. Revenu à +3, il reprend son plan de départ.
- Il change de gardien si le sien arrête moins de 20 % des tirs.
- Un tempérament tiré à chaque match le fait réagir un but plus tôt ou non.
- Ses décisions s'affichent avec l'étiquette « Coach ». Son temps mort met le match en pause : on peut ajuster sans utiliser le sien.
- Effet mesuré sur 3 000 matchs : moins de 1 % de points en plus. Ses ajustements sont risqués pour lui aussi.

**Performances individuelles :** pendant et après le match, un tableau par équipe donne minutes, buts sur tirs, pertes et exclusions, avec la réussite par secteur et des repères (« En feu », « Maladroit », « Un mur »).

**Intensité :** un curseur à cinq niveaux dans les temps morts et à la mi-temps, visible pour les deux équipes sur le tableau de score.

| Niveau | Effet |
| --- | --- |
| Gestion | Beaucoup moins de fatigue et d'exclusions, moins de ballons récupérés et de contre-attaques |
| Calme | Un peu moins d'engagement |
| Normale | Comportement habituel |
| Engagée | Plus de pression et de contre-attaques, un peu plus de fatigue et d'exclusions |
| Tout donner | Pression maximale, +1 % au tir, fatigue +32 %, exclusions en hausse |

Le coach IA monte d'un cran en homme à homme, demande de tout donner s'il est mené en fin de match, et lève le pied avec 6 buts d'avance.

**Avantage du terrain :** l'équipe qui reçoit a +3,5 % de réussite au tir ; le visiteur perd un peu plus de ballons, prend plus d'exclusions et démarre avec 4 points de fatigue en plus. Le bonus ou malus Public s'ajoute.

**Cotes Bet9M (préparation du match) :** un bookmaker fictif, clin d'œil à Beyond9M, affiche les cotes victoire, nul, défaite. Elles viennent de 200 matchs simulés sur des copies des deux équipes (effectifs, fatigue et tactiques du moment), le nul lissé vers 7,5 %, avec une marge de bookmaker de 7 %. Sous chaque cote, la part des parieurs (proportionnelle au carré de la probabilité : le public suit le favori). Calculées une fois par journée et gardées dans la sauvegarde ; purement indicatives, sans effet sur le match.

**Fins de match serrées :** à partir de la 45e, quand l'écart est de 1 à 5 buts, l'équipe qui mène gère (possessions plus longues, jeu passif) : −10 % au tir ; l'équipe menée prend des risques qui paient plus souvent : +8,5 % au tir (hors 7 m et cage vide). Les écarts se resserrent sans changer le score moyen : environ 7 % de nuls, comme en Starligue.

**Journées de repos :** avec un nombre impair de clubs, une équipe est au repos à chaque journée (écran dédié, +20 de récupération). Avec 16 clubs, plus de repos.

**Notifications :** un temps mort adverse met le match en pause et affiche une notification en haut de l'écran, jusqu'à la reprise. Les autres décisions du coach adverse (gardien, jeu rapide, homme à homme, système forcé, 7 contre 6, tout donner) s'affichent dans une notification courte qui disparaît seule.

**Fin de match :** un bouton « Passer à la suite » sous le score mène aux résultats de la journée et au classement avant la préparation du match suivant.

## Entraînement

Après chaque journée, le programme de la semaine fait progresser les attributs : chaque attribut ciblé a une chance de gagner +1, plafonné à 20.

| Focus | Attributs travaillés | Chance par attribut |
| --- | --- | --- |
| Équilibré | Les 14 attributs | 2,5 % |
| Tir | Tir de loin, tir de près, tir de l'aile, pénalty | 7,5 % |
| Jeu collectif | Passes, vision de jeu, prise de position | 7,5 % |
| Physique | Vitesse, endurance, duel | 7,5 % |
| Défense | Contre, duel défensif, discipline, sang-froid | 7,5 % |

Les gardiens suivent toujours leur programme : réflexes, placement, 7 m, relance (5 %).

| Intensité | Progression | Fatigue au prochain match |
| --- | --- | --- |
| Légère | ×0,5 | 10 points récupérés en plus |
| Normale | ×1 | Récupération normale (−38 entre deux journées) |
| Intense | ×1,6 | 12 points de fatigue en plus |

L'âge module tout : ×1,4 avant 23 ans, ×1 jusqu'à 28, ×0,5 jusqu'à 31, ×0,2 au-delà. Les clubs adverses s'entraînent en équilibré, intensité normale.

## Centre de formation

Toutes les 5 journées (après J5, J10, J15, J20…), une fenêtre propose un jeune du centre. Poste au hasard, 17 à 19 ans, attributs tirés autour de 9 (rarement plus de 14), potentiel affiché en fourchette d'étoiles estimée par le staff ; environ une fois sur cinq, une légende (voir Joueurs). Le bonus ou malus Formation ajoute ou retire 1 partout.

- **Le recruter :** il rejoint le groupe. À 16 joueurs, on choisit qui part parmi ceux de son poste. La feuille de match reste à 14, le staff place les autres en tribune.
- **Le laisser partir :** il est refusé.
- **Décider plus tard :** la proposition reste ouverte dans le bâtiment Centre de formation de la ville. Sans réponse avant le match suivant, il signe ailleurs.

Le centre garde l'historique des jeunes proposés et de la décision prise. Les jeunes recrutés portent l'étiquette J dans l'effectif.

**Clubs IA :** chaque club adverse a aussi un jeune de son centre aux mêmes journées, avec le même bonus ou malus Formation et le même plafond de 16 joueurs. Son staff juge sur le potentiel (moins une marge, avec un peu d'aléa) : sous 16 joueurs, il recrute si le jeune vaut au moins le plus faible du poste ; à 16, il ne libère le plus faible du poste que si le jeune vaut nettement mieux (plus d'un point au-dessus de sa valeur projetée). La feuille de match des IA reste à 14, les autres en tribune. Mesuré : environ 37 % des jeunes recrutés, deux fois plus souvent chez les petits clubs que chez les gros ; les légendes ne sortent pas des centres IA (les 3 placées en début de partie suffisent).

**Récap de la SparLigue :** sous le centre, un encart liste tous les jeunes recrutés dans le championnat (IA et joueur), du plus récent au plus ancien : journée, club, joueur (fiche cliquable), âge, niveau et potentiel en étoiles à jour, joueur libéré le cas échéant. En tête, le nombre de recrues et le club le plus friand ; le nombre de jeunes refusés par les adversaires est indiqué dans la légende.

## Interface et écrans

L'accueil est le quartier du club en vue isométrique : chaque bâtiment en couleur ouvre un écran. Les bâtiments gris représentent le reste de la ville et les fonctions à venir. Des onglets restent disponibles pour naviguer vite.

**Plateformes :** le jeu se joue sur ordinateur ou tablette (de préférence en paysage), pas sur téléphone. L'interface utilise jusqu'à 1 440 px de large. La page de création de partie le rappelle sous la présentation ; sur un écran de téléphone (moins de 700 px de large, ou écran tactile de moins de 600 px), une fenêtre le signale une fois par session, avec un bouton « Continuer quand même ».

| Bâtiment | Écran | Enseigne | Contenu |
| --- | --- | --- | --- |
| Salle | Match | Prochain adversaire, domicile ou extérieur | Préparation (plan, conseils du staff, forme de l'adversaire sur ses 5 derniers matchs avec son rang, cotes du bookmaker fictif Bet9M, face-à-face, effectif adverse), match en direct (changements, intensité, temps mort, 7 contre 6, vitesse), performances, résumé |
| Vestiaire | Effectif | Titulaires fatigués | Profil d'équipe, tableau des notes avec code couleur, tri et colonnes au choix, fiche joueur, gardiens à part |
| Gymnase | Entraînement | Focus et intensité | Programme de la semaine, progrès de la dernière journée |
| Bureau du coach | Tactique | Style défensif et jeu | Composition sur le terrain (glisser-déposer), rythme, jeu, jeu des arrières, style, bascules, consignes |
| Kiosque | Championnat | Classement et points | Classement, résultats, journée suivante, buteurs |
| Siège du club (gris) | À venir | Mercato et finances | — |
| Centre de formation | Formation | Prochain jeune | Jeune proposé, décompte jusqu'au prochain, jeunes du club, historique des décisions |
| Infirmerie (gris) | À venir | Blessures et soins | — |
| Boutique (gris) | À venir | Supporters et recettes | — |

**Effectif :** le tableau montre pour chaque joueur l'âge, la main (D ou G), le niveau et le potentiel en étoiles (deux colonnes triables), la progression depuis le début de saison (Δ, en flèche), la forme, la fatigue, les minutes moyennes, le multiplicateur d'expérience et tous les attributs. Les attributs gagnés à l'entraînement ou par le style joué sont marqués pour la semaine. L'effectif complet de l'adversaire est visible avant chaque match.

**Fiche joueur :** un clic sur un nom (effectif, adversaire, performances, même en direct) ouvre sa fiche :

- niveau et potentiel en étoiles, progression de la saison, postes de dépannage, jeu des arrières ;
- chiffres de la saison : matchs, minutes, buts et réussite (arrêts pour un gardien), pertes, exclusions ;
- note moyenne des matchs sur 10 ;
- courbe du niveau en étoiles journée après journée avec la bande du potentiel estimé, minutes et buts par match ;
- attributs et points gagnés depuis le début de saison ;
- tableau match par match.

Note d'un match : 6 de base, +0,55 par but, −0,3 par tir manqué, −0,45 par perte, −0,5 par exclusion, +0,3 au-delà de 40 minutes. Pour un gardien : 6 + 0,35 × (arrêts − un tiers des tirs subis). Bornée entre 2 et 10.

## Identité visuelle

L'écran de choix du club est neutre (graphite). Une fois la saison lancée, l'interface prend les couleurs du club, volontairement atténuées : sa couleur comme base (boutons, terrain, tableau de score) et une couleur de contraste choisie pour chaque club en touches (zone des 6 m, score, onglet actif). Par exemple Rennes graphite et rouge, Nantes vert et jaune, Dijon moutarde et cassis.

**La Cité du hand :** l'accueil est une ville isométrique au nom de la ville du club. Les noms des bâtiments n'apparaissent qu'au survol. Le bonus et le malus s'ouvrent depuis une pastille « + − » à côté du nom du club, et la ville est accessible par une icône maison en haut à gauche.

**Clins d'œil (purement visuels) :** un panneau « Beyond 9M », une affiche « 95 » bleu-blanc-rouge, un voyant rouge sur le bureau du coach, un pot de résine, un chat sur le vestiaire, un pigeon sur le kiosque, un vrai terrain de hand de quartier avec un petit arrière en bleu, et le car de l'équipe aux couleurs du club devant la salle.

## Équilibrage

Le moteur est validé quand 1 000 matchs simulés retombent dans ces fourchettes, proches d'un championnat pro (valeurs approximatives, à confirmer avec des stats réelles).

| Indicateur (moyenne par équipe et par match) | Cible |
| --- | --- |
| Buts marqués | 27 à 32 |
| Efficacité au tir | 58 à 65 % |
| Arrêts du gardien | 10 à 14 |
| Exclusions de 2 min | 3 à 5 |
| Jets de 7 m obtenus | 3 à 5 |
| Pertes de balle | 9 à 13 |
| Matchs nuls (sur la saison) | environ 7,5 % (Starligue : 20, 15 et 19 nuls sur 240 matchs de 2023-24 à 2025-26) |

**Résultats mesurés sur le prototype (60 saisons simulées, 14 400 matchs, octobre 2026) :**

| Indicateur | Cible | Mesuré |
| --- | --- | --- |
| Buts par équipe | 27 à 32 | 29,1 |
| Efficacité au tir | 58 à 65 % | 63,7 % |
| Arrêts du gardien | 10 à 14 | 11,8 |
| Exclusions de 2 min | 3 à 5 | 4,0 |
| Jets de 7 m obtenus | 3 à 5 | 4,0 |
| Pertes de balle | 9 à 13 | 10,4 |
| Matchs nuls | environ 7,5 % | 7,0 % (3,6 % avant le réglage des fins de match) |
| Matchs gagnés d'un but | — | 12,5 % |
| Points pris à domicile | 58 à 60 % | 58,1 % |
| Points du favori (réputation 4 contre 2) | 75 à 80 % | 86,6 % (déjà 86 % avant ce réglage : à revoir) |
| Gestes tentés / réussis par équipe | — | 3,1 / 1,6 |
| Buts encaissés face à de bons duellistes | Homme à homme > collective | 30,1 contre 29,2 |
| Buts encaissés face à de bons ailiers | Collective > homme à homme | 30,5 contre 29,3 |
| Jeu adapté à l'identité de l'équipe | Gain net | +1,7 à +1,8 but par match |

Point de vigilance : le meilleur buteur tourne autour de 9 buts par match, un peu au-dessus d'un championnat pro.

**Mesures du 10 octobre 2026** (simulations de 300 à 3 000 matchs) :

| Test | Résultat |
| --- | --- |
| Équipe qui reçoit (équipes équivalentes) | 58 à 60 % des points, +1,4 but en moyenne (47 % avant l'avantage du terrain) |
| Jeu des arrières conseillé / tous Équilibré / tous Au contact / tous De loin | 46 % / 42 % / 41 % / 35 % des points |
| +3 en contre (tous les joueurs de champ) | Tirs de loin adverses réussis : 57 % → 54 % |
| +3 en duel défensif (tous les joueurs de champ) | Percées adverses réussies : 64 % → 57 % |
| ArD adverse de 12 à 18 en duel défensif | Percées de ton ArG : 60 % → 56 % (zone), 69 % → 62 % (homme) |
| Intensité Tout donner tout le match | Résultat neutre, fatigue de fin 43 au lieu de 30 |
| Intensité Gestion tout le match | −0,7 but, fatigue de fin 17 au lieu de 30 |
| Coach IA (temps morts, ajustements) | Moins de 1 % de points en plus |
| Buts par équipe et par match | Environ 29 |

## Décisions et suite

**Tranché :**

- 16 clubs, 30 journées (12 clubs et 22 journées au départ).
- Niveau simulé : pro (type Starligue, rebaptisée SparLigue dans le jeu), handball masculin, match en direct accéléré avec temps morts.
- Clubs fictifs, un par grande ville française, Rennes inclus.
- Vision de jeu au demi-centre ; excentricité en risque / récompense.
- Défense en 6-0 par défaut, bascules 5-1 et 4-2 réglées par le coach ; deux réglages par secteur.
- Esprit collectif comme attribut joueur, identité d'équipe calculée, jeu choisi par le coach ; il évolue avec le style joué.
- Bonus et malus : un parmi 3 de chaque, noms drôles, un de chaque pour les clubs IA.
- Centre de formation : un jeune toutes les 5 journées, potentiel estimé en fourchette, décision du coach ; les clubs IA ont la même mécanique, récap des recrues de la SparLigue.
- Notes affichées en étoiles (sur 5, relatives au club, potentiel incertain chez les jeunes) ; note sur 20 masquée.
- Postes secondaires à 85 % ; latéralité avec effet réel au tir à droite.
- Changements manuels en pause seulement, rendus au staff après 7 minutes.
- Coach IA adverse, fiche joueur ; mini-terrain 2D abandonné.
- Nom du jeu : B9M Manager ; accueil neutre puis couleurs du club atténuées.
- Noms régionaux et 12 % d'étrangers ; niveau de départ lié à l'âge ; 4 gauchers à droite par effectif.
- Défense en deux attributs (contre, duel défensif), face-à-face et note élargie en zone.
- Jeu des arrières par joueur, modifiable pour un match.
- Avantage du terrain, curseur d'intensité, notifications du coach adverse.
- Légendes (regens) aux noms reconnaissables mais pas trop proches.

**Après le MVP, par ordre de priorité :**

1. Comprendre ses matchs : homme du match, rapport qui explique le résultat, objectifs de la direction.
2. Saisons multiples : vieillissement, retraites, nouveaux potentiels, historique des fiches joueurs sur plusieurs saisons.
3. Mercato et contrats, ouverts depuis le siège du club (et la chasse aux légendes des clubs adverses).
4. Blessures et suspensions, gérées à l'infirmerie.
5. Coupe et compétitions européennes.
6. Finances, boutique et infrastructures.

## Mise en ligne et organisation

Le jeu est en ligne sur https://adx-codes.github.io/b9m-manager/ : un seul fichier HTML, sauvegarde dans le navigateur de chaque joueur. Chaque nouvelle version est poussée sur le dépôt GitHub adx-codes/b9m-manager.

| Fichier du dépôt | Contenu |
| --- | --- |
| index.html | Le jeu publié (fichier assemblé) |
| src/engine.js | Moteur : génération, match, saison, entraînement |
| src/ui.js | Interface : ville, écrans, match en direct |
| src/shell.html | Gabarit HTML et styles |
| build.py | Assemble src/ en index.html |
| docs/game-design.md | Ce document, en Markdown |
| CLAUDE.md | Instructions de travail pour Claude |
