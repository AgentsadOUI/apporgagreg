# Réactions — Labo de révision

PWA de révision des réactions organiques avec mode Survie et classement partagé sous pseudonyme. L'interface et les styles existants sont conservés.

## Lancer en local

Node.js 18+ est requis. Depuis ce dossier :

```sh
node server.js
```

Ouvrir http://localhost:8787. `PORT=3000 node server.js` permet de choisir un autre port. Les scores sont enregistrés dans `leaderboard.json` (créé au premier score). Utilisez `DATA_FILE=/chemin/vers/leaderboard.json` pour un volume persistant en déploiement.

## Déploiement

Déployer ce dossier sur un service Node.js qui garde un processus HTTP actif et un volume disque persistant. La commande de démarrage est `node server.js`; fournir `PORT` si la plateforme l'exige. Le serveur doit être exposé derrière HTTPS en production. Un seul fichier JSON est adapté à un petit groupe; remplacez `loadScores`/`saveScores` par une base de données transactionnelle si plusieurs instances ou un trafic réel sont nécessaires.

## Validation et sécurité

Le serveur tire les questions, conserve la session en mémoire, vérifie chaque réponse, calcule le score et remet un jeton de fin à usage unique. La publication exige ce jeton et le score calculé côté serveur. Les pseudonymes sont nettoyés et limités à 20 caractères; les scores sont limités aux 25 meilleurs affichés et les requêtes sont limitées par adresse IP.

Il n'y a pas de compte utilisateur, d'authentification forte ni de protection anti-abus complète. Le classement est donc pseudonyme et modérable seulement en éditant le fichier de données. La mémoire de session est perdue au redémarrage; les scores persistants ne le sont pas si le volume n'est pas configuré.
