# TP - Backend d'un Jeu de Cartes Pokémon en Temps Réel

**Durée estimée :** 20-25 heures
**Niveau :** BUT 2 Informatique
**Technologies :** Node.js, TypeScript, Express, Socket.io, Prisma, SQLite

---

## 📋 Table des matières

1. [Introduction](#introduction)
2. [Objectifs pédagogiques](#objectifs-pédagogiques)
3. [Architecture du projet](#architecture-du-projet)
4. [Prérequis](#prérequis)
5. [Partie 1 - API REST et Authentification](#partie-1---api-rest-et-authentification)
6. [Partie 2 - Gestion des Cartes et Decks](#partie-2---gestion-des-cartes-et-decks)
7. [Partie 3 - Système de Jeu en Temps Réel](#partie-3---système-de-jeu-en-temps-réel)
8. [Partie 4 - Tests Unitaires](#partie-4---tests-unitaires)
9. [Critères d'évaluation](#critères-dévaluation)
10. [Ressources](#ressources)

---

## Introduction

Vous allez développer le backend d'un jeu de cartes Pokémon multijoueur en temps réel. Ce projet vous permettra de mettre en pratique vos connaissances en développement d'API REST, authentification JWT, bases de données relationnelles, et communication temps réel avec WebSockets.

### Contexte du jeu

Le jeu oppose deux joueurs qui utilisent chacun un deck de 20 cartes Pokémon. Le but est de vaincre 3 Pokémon adverses pour remporter la partie. Chaque tour, un joueur peut :
- Piocher des cartes (maximum 5 en main)
- Jouer une carte sur le plateau
- Attaquer le Pokémon adverse

Les dégâts sont calculés selon les statistiques des cartes (attaque, défense) et le système de faiblesses de types (Feu faible contre Eau, etc.).

---

## Objectifs pédagogiques

À la fin de ce TP, vous serez capable de :

- ✅ Concevoir et implémenter une API REST sécurisée avec Express
- ✅ Mettre en place un système d'authentification JWT
- ✅ Utiliser un ORM (Prisma) avec une base de données SQLite
- ✅ Implémenter des WebSockets avec Socket.io pour le temps réel
- ✅ Organiser un projet backend en modules
- ✅ Écrire des tests unitaires avec Vitest
- ✅ Gérer des états complexes côté serveur (logique de jeu)

---

## Architecture du projet

Le projet suit une architecture modulaire :

```
src/
├── modules/
│   ├── auth/          # Authentification et autorisation
│   ├── card/          # Catalogue de cartes (lecture seule)
│   ├── deck/          # Gestion des decks utilisateurs
│   ├── game/          # Logique de jeu temps réel
│   └── player/        # Logique du joueur
├── config/            # Configuration (DB, env, swagger)
├── types/             # Types TypeScript globaux
└── server.ts          # Point d'entrée
```

### Technologies utilisées

- **Runtime :** Node.js 20+ avec TypeScript
- **Framework web :** Express.js
- **Base de données :** SQLite avec Prisma ORM
- **Temps réel :** Socket.io
- **Authentification :** JWT avec bcryptjs
- **Tests :** Vitest avec vitest-mock-extended
- **Documentation API :** Swagger

---

## Prérequis

### Matériel fourni

✅ **Projet kickstart** avec :
- Structure de dossiers
- Configuration TypeScript, Prisma, Vitest
- Schéma de base de données Prisma
- Données de seed (cartes Pokémon)
- Fichier `.env.example`

✅ **Collection Bruno** pour tester l'API :
- Requêtes d'authentification
- Requêtes CRUD pour les decks
- Documentation des endpoints

✅ **Documentation** :
- `CLAUDE.md` : Guide du projet
- `GAME_SYSTEM.md` : Règles du jeu détaillées

### Installation

```bash
# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Générer le client Prisma
npm run db:generate

# Créer la base de données et insérer les données
npm run db:migrate
npm run db:reset

# Lancer le serveur en mode développement
npm run dev

# Lancer les tests
npm test
```

---

## Partie 1 - API REST et Authentification

### 🎯 Objectifs

Créer un système d'authentification sécurisé permettant aux utilisateurs de s'inscrire et se connecter.

### 📚 Concepts clés

- **JWT (JSON Web Token)** : Token contenant les informations utilisateur, signé par le serveur
- **Bcrypt** : Algorithme de hachage pour stocker les mots de passe de manière sécurisée
- **Middleware Express** : Fonction interceptant les requêtes pour vérifier l'authentification

### 📝 Tâches

#### 1.1 - Module d'authentification (`src/modules/auth/`)

**Fichier `auth.service.ts`**

Implémenter deux fonctions :

```typescript
/**
 * Inscription d'un nouvel utilisateur
 * - Vérifier que l'email n'existe pas déjà
 * - Hasher le mot de passe avec bcrypt (10 rounds de salt)
 * - Créer l'utilisateur en base de données
 * - Générer un token JWT
 */
export async function signUp(data: SignUpRequestBody): Promise<AuthResponse>

/**
 * Connexion d'un utilisateur existant
 * - Vérifier que l'utilisateur existe
 * - Comparer le mot de passe avec bcrypt
 * - Générer un token JWT
 */
export async function signIn(data: SignInRequestBody): Promise<AuthResponse>
```

**Fichier `auth.middleware.ts`**

Créer un middleware Express pour protéger les routes :

```typescript
/**
 * Middleware d'authentification
 * - Extraire le token du header Authorization (format: "Bearer <token>")
 * - Vérifier et décoder le token avec jwt.verify()
 * - Injecter les données utilisateur dans req.user
 * - Retourner 401 si le token est invalide ou absent
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction)
```

**Fichier `auth.route.ts`**

Créer les routes :
- `POST /api/auth/sign-up` - Inscription
- `POST /api/auth/sign-in` - Connexion

#### 1.2 - Extension des types Express

**Fichier `src/types/express.d.ts`**

Étendre l'interface Request pour ajouter la propriété `user` :

```typescript
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload; // {userId: string, email: string}
    }
  }
}
```

### ✅ Critères de validation

- [ ] Un utilisateur peut s'inscrire avec un email et mot de passe
- [ ] Les mots de passe sont hashés en base de données
- [ ] Un utilisateur peut se connecter et reçoit un token JWT
- [ ] Le token JWT contient `userId` et `email`
- [ ] Les routes protégées vérifient le token et rejettent les requêtes non authentifiées
- [ ] Tester avec Bruno : inscription → connexion → appel route protégée

### 💡 Conseils

- Utilisez `jwt.sign()` pour créer un token et `jwt.verify()` pour le vérifier
- Le secret JWT est dans `process.env.JWT_SECRET`
- N'oubliez pas de gérer les erreurs (email déjà utilisé, mot de passe incorrect, etc.)

---

## Partie 2 - Gestion des Cartes et Decks

### 🎯 Objectifs

Permettre aux utilisateurs de consulter le catalogue de cartes et de créer/gérer leurs decks.

### 📚 Concepts clés

- **Relations Prisma** : Gérer les relations entre tables (User → Deck → DeckCard ← Card)
- **CRUD** : Create, Read, Update, Delete
- **Validation métier** : Un deck doit contenir exactement 20 cartes

### 📝 Tâches

#### 2.1 - Module Card (Lecture seule)

**Fichier `src/modules/card/card.service.ts`**

```typescript
/**
 * Liste toutes les cartes disponibles
 * - Récupérer toutes les cartes depuis la base de données
 */
export async function listCards(): Promise<Card[]>
```

**Routes :**
- `GET /api/cards` - Liste toutes les cartes (route publique, pas d'authentification requise)

#### 2.2 - Module Deck

**Fichier `src/modules/deck/deck.service.ts`**

Implémenter les 5 fonctions CRUD :

```typescript
// Créer un nouveau deck
export async function createDeck(userId: string, data: CreateDeckRequestBody): Promise<DeckModel>

// Lister les decks de l'utilisateur
export async function getUserDecks(userId: string): Promise<DeckModel[]>

// Récupérer un deck par son ID
export async function getDeckById(deckId: string, userId: string): Promise<DeckModel>

// Mettre à jour un deck (nom et/ou cartes)
export async function updateDeck(deckId: string, userId: string, data: UpdateDeckRequestBody): Promise<DeckModel>

// Supprimer un deck
export async function deleteDeck(deckId: string, userId: string): Promise<void>
```

**Routes (toutes protégées par `authenticateToken`) :**
- `POST /api/decks` - Créer un deck
- `GET /api/decks` - Lister ses decks
- `GET /api/decks/:id` - Récupérer un deck
- `PUT /api/decks/:id` - Modifier un deck
- `DELETE /api/decks/:id` - Supprimer un deck

### ✅ Critères de validation

- [ ] Un utilisateur peut créer un deck avec un nom et 20 cartes
- [ ] La validation refuse les decks avec un nombre de cartes ≠ 20
- [ ] Un utilisateur ne voit que ses propres decks
- [ ] Un utilisateur ne peut pas modifier/supprimer le deck d'un autre utilisateur
- [ ] Les cartes d'un deck sont retournées avec leurs détails complets
- [ ] Tester avec Bruno toutes les opérations CRUD

### 💡 Conseils

**Modèle de données Prisma :**
```prisma
model Deck {
  id        String      @id @default(uuid())
  name      String
  userId    String
  user      User        @relation(fields: [userId], references: [id])
  cards     DeckCard[]  // Junction table
}

model DeckCard {
  deckId    String
  cardId    String
  deck      Deck   @relation(fields: [deckId], references: [id])
  card      Card   @relation(fields: [cardId], references: [id])
  @@id([deckId, cardId])
}
```

- Pour créer un deck, utilisez une **transaction Prisma** pour créer le deck et ses cartes atomiquement
- Utilisez `include` dans Prisma pour charger les relations

---

## Partie 3 - Système de Jeu en Temps Réel

### 🎯 Objectifs

Implémenter la logique de jeu multijoueur en temps réel avec Socket.io.

### 📚 Concepts clés

- **WebSockets** : Communication bidirectionnelle en temps réel
- **Socket.io** : Bibliothèque facilitant l'usage des WebSockets
- **Rooms** : Salles virtuelles regroupant des clients connectés
- **State management** : Gérer l'état du jeu côté serveur

### 📝 Tâches

#### 3.1 - Structure de données

**Fichier `src/modules/player/player.type.ts`**

```typescript
export interface GameCard extends Card {
  currentHp: number; // HP actuel (peut diminuer suite aux attaques)
}

export interface PlayerBoard {
  activeCard: GameCard | null;  // Carte actuellement jouée
  hand: Card[];                 // Main du joueur (max 5 cartes)
  deck: Card[];                 // Deck restant
  score: 0 | 1 | 2 | 3;        // Nombre de Pokémon vaincus
}
```

**Fichier `src/modules/game/game.type.ts`**

```typescript
export enum TurnState {
  HOST = 'host',
  GUEST = 'guest',
}

export enum GameStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  FINISHED = 'finished',
}

export interface GameState {
  roomId: string;
  host: { board: PlayerBoard; socketId: string };
  guest: { board: PlayerBoard; socketId: string };
  currentTurn: TurnState;
  status: GameStatus;
  winner?: string;
}

export interface Room {
  id: string;
  host: { socketId: string; deckId: string };
  guest: { socketId: string | null; deckId: string | null };
  game: Game | null;
}
```

#### 3.2 - Classe Player

**Fichier `src/modules/player/player.class.ts`**

Implémenter la logique d'un joueur :

```typescript
export class Player {
  private hand: Card[] = [];
  private deck: Card[];
  private activeCard: GameCard | null = null;
  private score: 0 | 1 | 2 | 3 = 0;

  constructor(private readonly socketId: string, deck: Card[]) {
    // Mélanger le deck aléatoirement
  }

  /**
   * Piocher des cartes jusqu'à avoir 5 cartes en main
   */
  public drawCards(): { success: boolean; message: string }

  /**
   * Jouer une carte de la main sur le board
   * - Vérifier que l'index est valide
   * - Vérifier qu'il n'y a pas déjà une carte active
   */
  public playCard(cardIndex: number): { success: boolean; message: string }

  /**
   * Attaquer le Pokémon adverse
   * - Calculer les dégâts avec calculateDamage()
   * - Appliquer les dégâts au Pokémon adverse
   * - Vérifier si le Pokémon est KO
   * - Incrémenter le score si KO
   * - Vérifier la condition de victoire (score >= 3)
   */
  public attack(opponent: Player): {
    success: boolean;
    message: string;
    cardDefeated?: boolean;
    gameWon?: boolean;
  }

  // Getters pour accéder à l'état
  public getBoard(): PlayerBoard
  public getSocketId(): string
}
```

#### 3.3 - Règles du jeu

**Fichier `src/modules/player/player.rules.ts`**

Implémenter le système de types et de dégâts :

```typescript
/**
 * Table des faiblesses de types Pokémon
 * Exemples :
 * - Feu est faible contre Eau
 * - Eau est faible contre Électrique
 * - Plante est faible contre Feu
 */
export function getWeakness(defenderType: PokemonType): PokemonType | null

/**
 * Calculer le multiplicateur de dégâts
 * - x2 si le type de l'attaquant correspond à la faiblesse du défenseur
 * - x1 sinon
 */
export function getDamageMultiplier(attackerType: PokemonType, defenderType: PokemonType): number

/**
 * Calculer les dégâts finaux
 * Formule : max(1, floor((attaque - défense) * multiplicateur))
 */
export function calculateDamage(
  attackerAttack: number,
  attackerType: PokemonType,
  defenderDefense: number,
  defenderType: PokemonType
): number
```

#### 3.4 - Classe Game

**Fichier `src/modules/game/game.class.ts`**

Orchestrer une partie entre deux joueurs :

```typescript
export class Game {
  private readonly hostPlayer: Player;
  private readonly guestPlayer: Player;
  private currentTurn: TurnState = TurnState.HOST;
  private status: GameStatus = GameStatus.PLAYING;
  private winner?: string;

  constructor(
    roomId: string,
    hostSocketId: string,
    hostDeck: Card[],
    guestSocketId: string,
    guestDeck: Card[]
  ) {
    this.hostPlayer = new Player(hostSocketId, hostDeck);
    this.guestPlayer = new Player(guestSocketId, guestDeck);
  }

  /**
   * Piocher des cartes pour un joueur
   */
  public drawCards(playerSocketId: string): { success: boolean; message: string }

  /**
   * Jouer une carte
   * - Vérifier que c'est le tour du joueur
   */
  public playCard(playerSocketId: string, cardIndex: number): { success: boolean; message: string }

  /**
   * Attaquer
   * - Vérifier que c'est le tour du joueur
   * - Effectuer l'attaque via Player.attack()
   * - Changer de tour si l'attaque réussit (et que la partie n'est pas finie)
   * - Mettre à jour le statut si victoire
   */
  public attack(playerSocketId: string): {
    success: boolean;
    message: string;
    cardDefeated?: boolean;
    gameWon?: boolean;
  }

  /**
   * Retourner l'état du jeu pour un joueur spécifique
   * IMPORTANT : Ne pas révéler la main ou le deck de l'adversaire
   */
  public getStateForPlayer(playerSocketId: string): any

  // Getters
  public getState(): GameState
  public getStatus(): GameStatus
  public getWinner(): string | undefined
}
```

#### 3.5 - Gestionnaire Socket.io

**Fichier `src/modules/game/game.socket.ts`**

Gérer les connexions WebSocket et les événements :

```typescript
export class SocketHandler {
  private io: Server;
  private rooms: Map<string, Room>;

  constructor(io: Server) {
    this.setupAuthMiddleware();
    this.setupEventHandlers();
  }

  /**
   * Middleware d'authentification Socket.io
   * - Vérifier le token JWT dans socket.handshake.auth.token
   * - Injecter userId et email dans le socket
   */
  private setupAuthMiddleware(): void

  /**
   * Configuration des événements Socket.io
   */
  private setupEventHandlers(): void {
    this.io.on("connection", (socket: AuthenticatedSocket) => {
      // Événements de room
      socket.on("createRoom", (data: CreateRoomEvent) => this.handleCreateRoom(socket, data));
      socket.on("joinRoom", (data: JoinRoomEvent) => this.handleJoinRoom(socket, data));
      socket.on("getRooms", () => this.handleGetRooms(socket));

      // Événements de jeu
      socket.on("drawCards", (data: DrawCardsEvent) => this.handleDrawCards(socket, data));
      socket.on("playCard", (data: PlayCardEvent) => this.handlePlayCard(socket, data));
      socket.on("attack", (data: AttackEvent) => this.handleAttack(socket, data));

      // Déconnexion
      socket.on("disconnect", () => this.handleDisconnect(socket));
    });
  }

  /**
   * Créer une room
   * - Générer un ID unique (UUID)
   * - Vérifier que le deck appartient au joueur et contient 20 cartes
   * - Créer la room et la stocker
   * - Rejoindre la room Socket.io
   * - Émettre "roomCreated" au créateur
   * - Notifier tous les clients avec "roomsListUpdated"
   */
  private async handleCreateRoom(socket: AuthenticatedSocket, data: CreateRoomEvent): Promise<void>

  /**
   * Rejoindre une room
   * - Vérifier que la room existe et n'est pas pleine
   * - Vérifier le deck du joueur
   * - Récupérer le deck de l'hôte
   * - Mettre à jour la room (ajouter le guest)
   * - Créer l'instance Game
   * - Rejoindre la room Socket.io
   * - Émettre "gameStarted" aux deux joueurs avec leur état respectif
   * - Notifier tous les clients que la room n'est plus disponible
   */
  private async handleJoinRoom(socket: AuthenticatedSocket, data: JoinRoomEvent): Promise<void>

  /**
   * Piocher des cartes
   * - Trouver la room et le game
   * - Appeler game.drawCards()
   * - Émettre "gameStateUpdated" aux deux joueurs
   */
  private handleDrawCards(socket: AuthenticatedSocket, data: DrawCardsEvent): void

  /**
   * Jouer une carte
   * - Trouver la room et le game
   * - Appeler game.playCard()
   * - Émettre "gameStateUpdated" aux deux joueurs
   */
  private handlePlayCard(socket: AuthenticatedSocket, data: PlayCardEvent): void

  /**
   * Attaquer
   * - Trouver la room et le game
   * - Appeler game.attack()
   * - Émettre "gameStateUpdated" aux deux joueurs
   * - Si victoire, émettre "gameEnded" et supprimer la room après 5 secondes
   */
  private handleAttack(socket: AuthenticatedSocket, data: AttackEvent): void

  /**
   * Déconnexion
   * - Trouver les rooms où le joueur était présent
   * - Notifier l'adversaire avec "opponentDisconnected"
   * - Supprimer la room
   */
  private handleDisconnect(socket: AuthenticatedSocket): void

  /**
   * Retourner les rooms disponibles (sans guest)
   */
  private getAvailableRooms(): Array<{ id: string; hostSocketId: string }>
}
```

#### 3.6 - Intégration dans le serveur

**Fichier `src/server.ts`**

```typescript
import { Server as SocketServer } from "socket.io";
import { SocketHandler } from "./modules/game/game.socket";

const server = app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});

// Créer le serveur Socket.io
const io = new SocketServer(server, {
  cors: {
    origin: env.CORS_ORIGIN,
    credentials: true,
  },
});

// Initialiser le gestionnaire Socket.io
new SocketHandler(io);
```

### ✅ Critères de validation

- [ ] Deux joueurs peuvent créer et rejoindre une room
- [ ] Les joueurs peuvent voir la liste des rooms disponibles
- [ ] Un joueur peut piocher des cartes (max 5 en main)
- [ ] Un joueur peut jouer une carte de sa main
- [ ] Un joueur peut attaquer le Pokémon adverse (seulement pendant son tour)
- [ ] Les dégâts sont calculés correctement selon les types
- [ ] Le score augmente quand un Pokémon adverse est KO
- [ ] La partie se termine quand un joueur atteint 3 points
- [ ] Les tours alternent entre les joueurs
- [ ] Chaque joueur ne voit que sa propre main et deck
- [ ] La déconnexion d'un joueur met fin à la partie

### 💡 Conseils

**Événements Socket.io à émettre :**

| Événement | Direction | Description |
|-----------|-----------|-------------|
| `roomCreated` | Serveur → Client | Room créée avec succès |
| `roomsListUpdated` | Serveur → Tous | Liste des rooms disponibles |
| `gameStarted` | Serveur → Joueurs | Partie démarrée |
| `gameStateUpdated` | Serveur → Joueurs | État du jeu mis à jour |
| `gameEnded` | Serveur → Joueurs | Partie terminée |
| `opponentDisconnected` | Serveur → Joueur | Adversaire déconnecté |
| `error` | Serveur → Client | Erreur |

**Points d'attention :**
- Le jeu doit être entièrement géré **côté serveur** (pas de logique côté client)
- Utilisez `socket.to(socketId)` pour émettre à un joueur spécifique
- Utilisez `io.to(roomId)` pour émettre à tous les joueurs d'une room
- Pensez à la **sécurité** : un joueur ne doit pas pouvoir tricher

---

## Partie 4 - Tests Unitaires

### 🎯 Objectifs

Écrire des tests pour valider le bon fonctionnement de chaque module.

### 📚 Concepts clés

- **Tests unitaires** : Tester une fonction ou classe isolément
- **Mocking** : Simuler les dépendances (base de données, etc.)
- **AAA Pattern** : Arrange, Act, Assert

### 📝 Tâches

#### 4.1 - Tests du module Auth

**Fichier `tests/auth.service.test.ts`**

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { PrismaClient } from '../src/generated/prisma/client';

// Mock Prisma AVANT d'importer le service
vi.mock('../src/config/database', () => ({
  prisma: mockDeep<PrismaClient>(),
}));

import { prisma } from '../src/config/database';
import { signUp, signIn } from '../src/modules/auth/auth.service';

const prismaMock = prisma as any;

describe('Auth Service', () => {
  beforeEach(() => {
    mockReset(prismaMock);
  });

  describe('signUp', () => {
    it('should create a new user and return a token', async () => {
      // Arrange
      const mockUser = { id: 'user-1', email: 'test@test.com', password: 'hashedPassword' };
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue(mockUser);

      // Act
      const result = await signUp({ email: 'test@test.com', password: 'password123' });

      // Assert
      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('test@test.com');
    });

    it('should return 409 if email already exists', async () => {
      // À implémenter...
    });
  });
});
```

Tests à écrire :
- [ ] Inscription réussie
- [ ] Inscription échoue si email existe
- [ ] Connexion réussie
- [ ] Connexion échoue si utilisateur n'existe pas
- [ ] Connexion échoue si mot de passe incorrect

#### 4.2 - Tests du module Deck

**Fichier `tests/deck.service.test.ts`**

Tests à écrire :
- [ ] Créer un deck avec 20 cartes
- [ ] Échec si nombre de cartes ≠ 20
- [ ] Lister les decks d'un utilisateur
- [ ] Récupérer un deck par ID
- [ ] Échec si le deck n'appartient pas à l'utilisateur
- [ ] Mettre à jour un deck
- [ ] Supprimer un deck

#### 4.3 - Tests du module Game

**Fichier `tests/game.service.test.ts`**

Tests à écrire :
- [ ] Initialisation d'une partie (decks mélangés)
- [ ] Piocher des cartes (max 5 en main)
- [ ] Jouer une carte
- [ ] Échec si pas le tour du joueur
- [ ] Attaque et calcul des dégâts
- [ ] Système de faiblesses (x2 dégâts)
- [ ] Score incrémenté quand Pokémon KO
- [ ] Victoire à 3 points
- [ ] Alternance des tours
- [ ] État du jeu masque les infos de l'adversaire

### ✅ Critères de validation

- [ ] Au moins 80% de couverture de code
- [ ] Tous les tests passent (`npm test`)
- [ ] Les tests sont organisés par module
- [ ] Les mocks sont correctement utilisés

### 💡 Conseils

**Pattern de test avec Prisma :**

```typescript
// 1. Mock Prisma AVANT l'import
vi.mock('../src/config/database', () => ({
  prisma: mockDeep<PrismaClient>(),
}));

// 2. Importer APRÈS le mock
import { prisma } from '../src/config/database';
import { myFunction } from '../src/modules/myModule/myModule.service';

// 3. Cast et reset
const prismaMock = prisma as any;

beforeEach(() => {
  mockReset(prismaMock);
});

// 4. Utiliser mockResolvedValue
it('test', async () => {
  prismaMock.user.findUnique.mockResolvedValue({ id: '1', email: 'test@test.com' });
  // ...
});
```

---

## Critères d'évaluation

### Fonctionnalités (60 points)

| Critère | Points |
|---------|--------|
| **Partie 1 - Authentification** | |
| Inscription et connexion fonctionnelles | 5 |
| Hachage des mots de passe | 3 |
| Génération et validation JWT | 5 |
| Middleware d'authentification | 5 |
| **Partie 2 - API REST** | |
| Module Card (lecture) | 2 |
| CRUD complet des decks | 10 |
| Validation métier (20 cartes) | 3 |
| Sécurité (isolation des données utilisateurs) | 5 |
| **Partie 3 - Temps réel** | |
| Authentification Socket.io | 3 |
| Création et gestion des rooms | 4 |
| Logique du joueur (Player class) | 5 |
| Logique du jeu (Game class) | 5 |
| Règles du jeu (dégâts, faiblesses) | 3 |
| Alternance des tours | 2 |
| Condition de victoire | 2 |
| Gestion de la déconnexion | 2 |
| Visibilité de l'état (masquage main adverse) | 3 |

### Qualité du code (20 points)

| Critère | Points |
|---------|--------|
| Architecture modulaire respectée | 5 |
| Code TypeScript propre (typage, pas de `any`) | 5 |
| Gestion des erreurs appropriée | 5 |
| Commentaires et documentation | 5 |

### Tests (20 points)

| Critère | Points |
|---------|--------|
| Tests du module Auth | 5 |
| Tests du module Deck | 5 |
| Tests du module Game | 8 |
| Couverture de code > 80% | 2 |

---

## Ressources

### Documentation officielle

- [Express.js](https://expressjs.com/)
- [Socket.io](https://socket.io/docs/)
- [Prisma](https://www.prisma.io/docs)
- [JWT](https://jwt.io/introduction)
- [Vitest](https://vitest.dev/)

### Guides utiles

- [Guide d'authentification JWT avec Express](https://www.digitalocean.com/community/tutorials/nodejs-jwt-expressjs)
- [Guide Socket.io pour débutants](https://socket.io/get-started/chat)
- [Guide Prisma Relations](https://www.prisma.io/docs/concepts/components/prisma-schema/relations)

### Outils de test

- **Bruno** : Client API fourni avec le projet
- **Prisma Studio** : Interface graphique pour explorer la base de données (`npm run db:studio`)
- **Socket.io Client Tool** : Pour tester les WebSockets

### Commandes utiles

```bash
# Base de données
npm run db:generate    # Générer le client Prisma
npm run db:migrate     # Créer/mettre à jour le schéma
npm run db:reset       # Reset et reseed la base
npm run db:studio      # Ouvrir Prisma Studio

# Développement
npm run dev            # Mode développement (hot reload)
npm run build          # Compiler TypeScript
npm run start          # Mode production

# Tests
npm test               # Tests en mode watch
npm run test:run       # Tests une fois
npm run test:ui        # Interface graphique des tests
npm run test:coverage  # Rapport de couverture
```

---

## FAQ

### Comment déboguer les WebSockets ?

Utilisez les logs console côté serveur :
```typescript
socket.on("createRoom", (data) => {
  console.log("📝 Create room:", socket.id, data);
  // ...
});
```

### Comment tester avec deux joueurs ?

Ouvrez deux onglets de navigateur (ou utilisez un navigateur privé) et connectez-vous avec deux comptes différents.

### Pourquoi mes tests échouent ?

Vérifiez que :
1. Le mock de Prisma est fait **avant** l'import du service
2. Vous utilisez `mockReset()` dans `beforeEach()`
3. Vos mocks retournent les bonnes valeurs avec `mockResolvedValue()`

### Comment voir la base de données ?

```bash
npm run db:studio
# Ouvre Prisma Studio sur http://localhost:5555
```

---

## Bon courage ! 🚀

N'hésitez pas à consulter la documentation fournie (`CLAUDE.md`, `GAME_SYSTEM.md`) et à utiliser les requêtes Bruno pour tester votre API au fur et à mesure.
