# Réactions — atlas de révision

Application web statique/PWA en français pour explorer 73 réactions organiques nommées et s’entraîner.

## Modes restaurés

- QCM chronométré : identifier le schéma et enchaîner les questions.
- Memory : associer six noms et six schémas.
- Mécanisme : associer un mécanisme global à son nom.
- Mode survie : une erreur termine la série et met à jour le record local.

Le catalogue, les fiches, la recherche, les familles et la page de progression complètent les modes de jeu. Le QCM utilise le serveur pour tirer une partie, valider chaque réponse et publier une seule fois le résultat final au classement partagé. La survie et les autres modes conservent leur fonctionnement local.

## Lancer

Depuis le dossier extrait `github-agreg/`, lancer le serveur applicatif :

```bash
node server.js
```

Puis ouvrir `http://localhost:8787/` dans le navigateur. Le port peut être changé avec `PORT=9000 node server.js`. Le classement est écrit dans `leaderboard.json` (ou dans `DATA_FILE=/chemin/leaderboard.json node server.js`).

Pour servir seulement l’interface sans API : `python3 -m http.server 8000`. Dans ce mode, le catalogue et les jeux locaux restent accessibles, mais le QCM vérifié et le classement partagé sont indisponibles.

Les données référencent `assets/001_schema.png` à `assets/073_mecanisme.png`, absents des archives fournies : les emplacements de remplacement sont affichés si ces images ne sont pas disponibles.
