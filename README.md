# BUT2 TCG API

Template pour une API de jeu de cartes Pokemon-like développée durant les cours de Node.js à l'IUT Littoral Côte d'Opale - BUT2 Info.

## 📋 Description

API REST backend pour un jeu de cartes à collectionner (TCG) inspiré de Pokemon. Le projet inclut :
- Authentification JWT
- Gestion de cartes Pokemon
- Système de decks (collections de 20 cartes)
- Système de jeu en temps réel avec Socket.io
- Base de données PostgreSQL avec Prisma ORM

## 🚀 Installation

### Prérequis

- **Node.js** 20+ (LTS recommandé)
- **Docker Desktop** (pour PostgreSQL)
- **npm** ou **yarn**

### Étapes d'installation

1. **Cloner le repository**
```bash
git clone <repository-url>
cd but2-tcg-api
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**
```bash
cp .env.example .env
# Éditer .env si besoin (les valeurs par défaut fonctionnent)
```

4. **Démarrer PostgreSQL avec Docker**
```bash
npm run db:start
```

5. **Initialiser la base de données**
```bash
npm run db:generate  # Génère le client Prisma
npm run db:migrate   # Crée le schéma
npm run db:seed      # Seed avec données de test
```

6. **Démarrer le serveur**
```bash
npm run dev
```

L'API est maintenant accessible sur `http://localhost:3001`

## 🔧 Scripts disponibles

### Développement
```bash
npm run dev          # Démarre le serveur en mode dev avec hot-reload
npm run build        # Compile TypeScript → JavaScript
npm start            # Démarre le serveur en mode production
npm run ts:check     # Vérifie les types TypeScript
```

### Base de données (Docker + Prisma)
```bash
npm run db:start     # Démarre PostgreSQL (Docker)
npm run db:stop      # Arrête PostgreSQL

npm run db:generate  # Génère le client Prisma
npm run db:migrate   # Crée/applique les migrations
npm run db:seed      # Seed la base de données
npm run db:reset     # Reset complet + migrations + seed
npm run db:studio    # Ouvre Prisma Studio (GUI)
```

Commandes Docker supplémentaires (optionnel):
```bash
docker ps                              # Vérifie le statut
docker logs but2-tcg-postgres          # Voir les logs
docker restart but2-tcg-postgres       # Redémarre
docker volume rm but2-tcg-postgres-data # Supprime les données
```

### Tests
```bash
npm test             # Tests en mode watch
npm run test:run     # Tests une seule fois
npm run test:ui      # Tests avec interface graphique
npm run test:coverage # Tests avec rapport de couverture
```

## 📁 Structure du projet

```
but2-tcg-api/
├── docker/                 # Configuration Docker
│   ├── docker-compose.yml # PostgreSQL container
│   ├── .env.example       # Variables Docker
│   └── README.md          # Documentation Docker
├── prisma/
│   ├── schema.prisma      # Schéma de base de données
│   ├── seed.ts            # Script de seed
│   └── data/
│       └── pokemon.json   # Données Pokemon
├── src/
│   ├── index.ts           # Point d'entrée
│   ├── env.ts             # Configuration env
│   ├── database.ts        # Instance Prisma
│   ├── controllers/       # Logique métier
│   ├── routes/            # Définition des routes
│   ├── middlewares/       # Middlewares Express
│   ├── sockets/           # Handlers Socket.io
│   ├── models/            # Modèles de jeu
│   ├── utils/             # Utilitaires
│   ├── types/             # Types TypeScript
│   └── docs/              # Documentation Swagger
├── tests/                 # Tests unitaires
├── bruno/                 # Collection Bruno (API testing)
└── CLAUDE.md              # Documentation pour Claude Code
```

## 🎮 Utilisation

### API REST

#### Authentification
```bash
# Inscription
POST /api/auth/sign-up
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123"
}

# Connexion
POST /api/auth/sign-in
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Cartes
```bash
# Récupérer toutes les cartes
GET /api/cards
Authorization: Bearer <token>
```

#### Decks
```bash
# Créer un deck (20 cartes)
POST /api/decks
Authorization: Bearer <token>
{
  "name": "My Deck",
  "cards": ["001", "002", ..., "020"]
}

# Récupérer ses decks
GET /api/decks/mine
Authorization: Bearer <token>

# Récupérer un deck par ID
GET /api/decks/:id
Authorization: Bearer <token>

# Modifier un deck
PATCH /api/decks/:id
Authorization: Bearer <token>
{
  "name": "Updated Name",
  "cards": ["001", "002", ..., "020"]
}

# Supprimer un deck
DELETE /api/decks/:id
Authorization: Bearer <token>
```

### Documentation interactive

- **Swagger UI** : http://localhost:3001/api-docs
- **Prisma Studio** : `npm run db:studio`
- **Bruno Collection** : Ouvrir le dossier `bruno/` avec Bruno

### Utilisateurs de test

Après le seed, deux utilisateurs sont disponibles :

| Username | Email | Password | Decks |
|----------|-------|----------|-------|
| red | red@example.com | password123 | 1 deck pré-créé |
| blue | blue@example.com | password123 | 1 deck pré-créé |

## 🐳 Docker

Le projet utilise Docker pour PostgreSQL. Voir `docker/README.md` pour :
- Configuration détaillée
- Variables d'environnement
- Troubleshooting
- Connexion directe à PostgreSQL

### Connexion à PostgreSQL

**Via Docker**
```bash
docker exec -it but2-tcg-postgres psql -U tcg_user -d tcg_database
```

**Via client externe** (DBeaver, pgAdmin, etc.)
- Host: `localhost`
- Port: `5432`
- Database: `tcg_database`
- Username: `tcg_user`
- Password: `tcg_password`

## 🧪 Tests

Le projet utilise Vitest pour les tests.

```bash
# Lancer tous les tests
npm run test:run

# Tests avec couverture
npm run test:coverage

# Tests en mode watch
npm test
```

## 📚 Documentation

- **CLAUDE.md** : Guide complet pour développeurs et Claude Code
- **docker/README.md** : Documentation Docker détaillée
- **bruno/** : Collection de requêtes API avec documentation
- **MIGRATION_POSTGRESQL.md** : Guide de migration SQLite → PostgreSQL
- **GAME_SYSTEM.md** : Documentation du système de jeu Socket.io

## 🔧 Technologies

- **Runtime** : Node.js 20+
- **Framework** : Express.js
- **Language** : TypeScript
- **Database** : PostgreSQL 16 Alpine
- **ORM** : Prisma
- **Real-time** : Socket.io
- **Auth** : JWT (jsonwebtoken) + bcryptjs
- **Testing** : Vitest
- **API Testing** : Bruno
- **Containerization** : Docker + Docker Compose

## 📝 Notes importantes

- Un deck doit contenir **exactement 20 cartes**
- Les cartes peuvent être dupliquées dans un deck
- Le token JWT expire après **7 jours**
- Les IDs de cartes sont au format "001", "002", etc.
- Les decks sont privés (liés à l'utilisateur)

## 🤝 Contribution

Ce projet est un template éducatif pour les cours de BUT2 Info.

## 📄 Licence

MIT

## 🆘 Support

En cas de problème :
1. Vérifier que Docker Desktop est démarré
2. Consulter `docker/README.md` pour le troubleshooting
3. Consulter `MIGRATION_POSTGRESQL.md` pour les migrations
4. Vérifier les logs : `docker logs but2-tcg-postgres`
5. Reset complet :
   ```bash
   npm run db:stop
   docker volume rm but2-tcg-postgres-data
   npm run db:start
   npm run db:reset
   ```
