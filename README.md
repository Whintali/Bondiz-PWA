# Bondiz — application

Application de rencontre amicale : on like des profils, on matche, on discute,
puis on réserve une activité ensemble. Un seul code [Expo](https://expo.dev)
(React Native + `expo-router`) produit l'app iOS, l'app Android et la version
web installable (PWA).

Le backend est dans le dépôt `strapi-mydsu`.

## Démarrer

```bash
npm install
cp .env.dist .env   # puis renseigner l'adresse de l'API
```

| Variable | Rôle |
|---|---|
| `EXPO_PUBLIC_STRAPI_URL` | Adresse de l'API Strapi, `/api` compris (ex. `http://localhost:1337/api`) |
| `EXPO_PUBLIC_STRAPI_TOKEN` | Jeton d'API utilisé avant la connexion. Il est embarqué dans le bundle, donc lisible côté web |

Ces variables sont lues au moment du build : après un changement, il faut
relancer la commande.

## Lancer l'app

| Commande | Effet |
|---|---|
| `npm start` | Serveur de développement Expo (QR code, simulateurs) |
| `npm run ios` / `npm run android` | Ouvre directement le simulateur ou l'émulateur |
| `npm run web` | Version web en développement, avec rechargement à chaud |
| `npm run lint` | ESLint |
| `npm test` | Tests unitaires (voir plus bas) |

## Version web installable (PWA)

En développement (`npm run web`), le service worker n'est pas enregistré : le
cache gênerait le rechargement à chaud. Pour tester la vraie PWA (installation,
cache, notifications), il faut le build de production :

```bash
npm run build:web   # exporte le site statique dans dist/
npm run serve:web   # le sert sur http://localhost:8081
```

Dans Chrome, l'icône d'installation apparaît dans la barre d'adresse ; le
manifeste et le service worker se vérifient dans les outils de développement,
onglet « Application ». Après chaque modification du code, relancer
`npm run build:web` puis recharger la page.

### Ce qui compose la PWA

| Fichier | Rôle |
|---|---|
| `public/manifest.json` | Nom, couleurs, icônes et mode plein écran |
| `public/icons/` | Icônes de l'app (192, 512 et Apple) |
| `public/sw.js` | Service worker : cache et notifications |
| `app/+html.tsx` | Gabarit HTML : lien vers le manifeste, balises iOS |
| `utils/registerServiceWorker.ts` | Enregistrement du service worker (production uniquement) |

Stratégie de cache du service worker :

- pages : réseau d'abord, copie en cache en secours hors connexion. Une nouvelle
  version est donc visible dès le déploiement ;
- fichiers statiques d'Expo (noms hachés) : cache d'abord ;
- appels à l'API : jamais mis en cache.

### Code propre à chaque plateforme

Metro choisit `fichier.web.ts(x)` pour le web et `fichier.ts(x)` pour le natif.
C'est ce qui remplace les modules sans équivalent web :

| Module | Natif | Web |
|---|---|---|
| `utils/storage` | `expo-secure-store` | `localStorage` |
| `components/DatePickerModal` | `react-native-modal-datetime-picker` | champ date/heure du navigateur |
| `utils/push` | pas encore branché | Web Push |

`utils/upload.ts` (envoi d'image) et `utils/alert.ts` (boîtes d'alerte) gèrent
les deux cas dans le même fichier.

### Déploiement

Le dossier `dist/` se dépose sur n'importe quel hébergement statique en HTTPS
(obligatoire pour le service worker). Deux points à prévoir :

- l'adresse `/chat/<id>` doit être renvoyée vers la page du chat (règle de
  réécriture), sinon un clic sur une notification app fermée tombe sur une 404 ;
- l'API doit accepter les requêtes venant de l'origine du site (CORS).

## Notifications push

Disponibles sur la version web uniquement pour l'instant. Elles préviennent
d'un nouveau message et d'un nouveau match ; un clic ouvre la conversation.

- Activation : Paramètres → Notifications.
- Sur iPhone, il faut d'abord ajouter Bondiz à l'écran d'accueil (bouton
  Partager, puis « Sur l'écran d'accueil »).
- La déconnexion désabonne l'appareil.
- Le serveur doit avoir ses clés VAPID : voir le README de `strapi-mydsu`.

Pour les tester en local, lancer le backend avec ses clés VAPID, puis
reconstruire l'app en la pointant dessus :

```bash
EXPO_PUBLIC_STRAPI_URL=http://localhost:1337/api npm run build:web
npm run serve:web
```

Les notifications fonctionnent sur `localhost` dans Chrome et Firefox. Sur un
téléphone, il faut une adresse en HTTPS.

## Tests

Tests unitaires avec Jest (`jest-expo/web`, la configuration de la version web)
et Testing Library pour le DOM.

```bash
npm test               # toutes les suites
npm run test:coverage  # avec le rapport de couverture (dossier coverage/)
npx jest __tests__/pwa # une seule partie
```

| Dossier | Couvre |
|---|---|
| `__tests__/pwa/` | service worker (cache, mode hors ligne, notifications), manifeste et icônes, abonnement aux notifications, enregistrement du service worker, stockage web |
| `__tests__/services/` | appels à l'API (en-têtes, erreurs en français), activités et réservations |
| `__tests__/utils/` | photos de profil, favoris, envoi d'images, alertes, calcul de l'âge |
| `__tests__/components/` | composants de la maquette, barre de navigation, sélecteur de date web, carte d'activité, feuille de réservation |

Le service worker (`public/sw.js`) est exécuté dans un faux contexte de
service worker (module `vm` de Node) : on lui envoie les mêmes événements que
le navigateur (`install`, `fetch`, `push`, `notificationclick`).

`jest.setup.ts` remplace les icônes et `expo-image` par de simples éléments
HTML : ils dépendent d'un module natif absent sous Jest.

### Tests de bout en bout (Playwright)

Les parcours complets tournent dans Chrome (format iPhone, en français) sur le
build web de production, service worker compris, branché sur un **vrai Strapi
local** dont la base SQLite est recréée à chaque exécution. Le dépôt
`strapi-mydsu` doit être cloné à côté de `bondiz-app` avec ses dépendances
installées.

```bash
npm run test:e2e                         # toute la suite (≈ 1 min 30)
npx playwright test e2e/social.spec.ts   # un seul fichier
npm run test:e2e:report                  # rapport HTML du dernier passage
E2E_STRAPI_LOGS=1 npm run test:e2e       # avec les journaux de Strapi
```

| Fichier | Couvre |
|---|---|
| `e2e/auth.spec.ts` | accueil, connexion, erreurs, inscription et les 5 étapes du questionnaire, âge minimum, déconnexion |
| `e2e/social.spec.ts` | découverte, like, match, fiche « À propos », messagerie (non-lus, envoi, réponse reçue), accès refusé |
| `e2e/activities.spec.ts` | liste, recherche, favoris (gardés sur le compte), fiche activité, réservation avec contacts, « Mes réservations » |
| `e2e/account.spec.ts` | mot de passe oublié et réinitialisation, export des données, suppression du compte |
| `e2e/map.spec.ts` | carte des activités, fiche d'un lieu, « Autour de moi » |
| `e2e/profile.spec.ts` | profil et statistiques, modification, ajout de photo, changement de mot de passe, barre de navigation |
| `e2e/pwa.spec.ts` | manifeste, service worker, cache, ouverture hors connexion |

Ce que fait `playwright.config.ts` :

- lance Strapi sur le port 1338 avec `.tmp/e2e.db` (jamais la base ni le
  stockage de prod) ; `e2e/global-setup.ts` y crée un admin et trois
  activités, `e2e/global-teardown.ts` supprime les fichiers envoyés pendant les
  tests ;
- exporte l'app dans `e2e/.dist` avec l'API locale (`--clear` obligatoire :
  sinon Metro réutilise l'URL du `.env`, donc la prod), puis
  `e2e/support/check-build.mjs` **refuse de lancer les tests** si le build
  vise une autre API ;
- sert ce build avec `e2e/support/serve.mjs`, qui reprend les règles de
  `docker/nginx.conf` (routes `/chat/:id`, `/user/:id`, `/activity/:id`).

Chaque test crée ses propres comptes (`e2e/support/api.ts`), les tests
tournent donc en parallèle.

## Organisation du code

| Dossier | Contenu |
|---|---|
| `app/` | Écrans (un fichier par route) et `app/components/` |
| `components/` | Composants avec une variante par plateforme |
| `context/` | `AuthContext` : session, connexion, inscription |
| `services/` | `api.ts` : appels à Strapi |
| `utils/` | Stockage, envoi d'images, alertes, notifications, dates |
| `constants/` | Couleurs, styles, images |
| `public/` | Fichiers servis tels quels sur le web |
