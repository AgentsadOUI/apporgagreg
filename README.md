# Réactions — Labo de révision

PWA statique offline de révision des 73 réactions nommées extraites du paquet Anki. Lancer avec un serveur statique (`python3 -m http.server`), puis ouvrir l’URL dans le navigateur. Le service worker met en cache le shell et les images au premier usage; l’installation mobile dépend du navigateur et nécessite HTTPS (ou localhost).

## Données et choix technique
Chaque objet de `data.json` contient le nom, le schéma et le mécanisme global. Les notes Anki fournissaient deux images par réaction, mais aucun découpage fiable en étapes n’était disponible dans le modèle. Le jeu 3 est donc une association mécanisme global ↔ nom, avec quatre propositions, plutôt qu’un faux réordonnancement de pixels.

Les images ont été renommées `NNN_schema.png` et `NNN_mecanisme.png`. Le score du mode Survie est stocké dans `localStorage`.
