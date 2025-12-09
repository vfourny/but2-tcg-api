# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Pokemon-like Trading Card Game (TCG) backend server built with Express, TypeScript, Prisma, and Socket.io. The
application provides REST APIs for user authentication, card management, and deck building, plus real-time multiplayer
game functionality via WebSockets.

## Development Commands

### Environment Setup

```bash
# Copy the environment template and configure variables
cp .env.example .env

# Install dependencies
npm install

# Generate Prisma client (required after schema changes)
npm run db:generate
```

### Database Management

```bash
# Run migrations (creates database schema)
npm run db:migrate

# Reset database and reseed with Pokemon data and test users
npm run db:reset

# Open Prisma Studio (database GUI)
npm run db:studio
```

### Running the Server

```bash
# Development mode with hot reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Production mode (requires build first)
npm run start
```

### Testing

```bash
# Run tests in watch mode (auto-reload)
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Architecture Overview

### Entry Point

- `src/server.ts` - Express app initialization with Socket.io server setup, middleware configuration (CORS, JSON
  parsing), and route registration

### Module Structure

The codebase follows a modular architecture with three main modules:

**Auth Module** (`src/modules/auth/`)

- JWT-based authentication using bcryptjs for password hashing
- Middleware: `authenticateToken` validates JWT tokens and injects user data into requests via `req.user`
- Types: `JwtPayload` contains userId and email
- Express type extension in `src/types/express.d.ts` adds `user` property to Request interface
- Endpoints: sign-up and sign-in at `/api/auth/*`

**Card Module** (`src/modules/card/`)

- Read-only card catalog system
- Cards are loaded from `prisma/data/pokemon.json` during seeding
- Uses Prisma-generated enums for PokemonType
- Endpoints: `/api/cards/*`

**Deck Module** (`src/modules/deck/`)

- CRUD operations for user decks
- Uses Prisma relations: `User -> Deck -> DeckCard <- Card`
- Deck validation: exactly 20 cards required
- All endpoints require authentication
- Endpoints: `/api/decks/*`

**Game Module** (`src/modules/game/`)

- Real-time multiplayer game logic via Socket.io
- `SocketHandler` class manages rooms, matchmaking, and game state
- `Game` entity contains game orchestration and player management (turn-based Pokemon card battles)
- `Player` entity encapsulates player state and behavior
- Game rules (type weakness, damage calculation) are in `game.rules.ts` utility functions
- Weakness system: each Pokemon type has one primary weakness (2x damage multiplier)
- Authentication via JWT tokens in socket handshake
- Key concepts:
    - Rooms: lobby system for matchmaking (host creates, guest joins)
    - PlayerBoard: active Pokemon, hand (5 cards max), deck, score
    - Turn-based gameplay: draw cards, play to board, attack
    - Win condition: first to defeat 3 opponent Pokemon
- See `GAME_SYSTEM.md` for complete documentation

### Database Configuration

- SQLite database with Prisma ORM
- Custom Prisma client output: `src/generated/prisma` (NOT `node_modules/@prisma/client`)
- Schema location: `prisma/schema.prisma`
- Models: User, Card, Deck, DeckCard (junction table)
- Seeding creates test users (red/blue) with password "password123" and 20-card starter decks

### Type Definitions

- Auth types in `src/modules/auth/auth.type.ts`: `JwtPayload`, request/response interfaces
- Deck types in `src/modules/deck/deck.type.ts`: CRUD request/response interfaces
- Game types in `src/modules/game/game.type.ts`: `GameState`, `PlayerBoard`, `Room`, Socket.io event interfaces
- Express Request extension in `src/types/express.d.ts` adds authenticated user data (optional `user` property)
- Card types use Prisma-generated enums from schema

### API Documentation

- Swagger UI available at `/api-docs` when server is running
- Swagger JSON endpoint at `/api-docs.json`
- Module-specific swagger definitions in `src/modules/*/**.swagger.ts`
- Main swagger config in `src/config/swagger.ts`

### API Testing

- Bruno collection in `bruno/` directory for testing REST endpoints
- Environment variables configured in `bruno/environments/local.bru`
- Test users documentation in `bruno/Auth/README.md`
- Organized by module: Auth, Cards, Decks

## Key Implementation Details

### Authentication Flow

**REST API:**

1. User signs up or signs in via `/api/auth/*` endpoints
2. Server returns JWT token containing userId and email
3. Protected REST endpoints use `authenticateToken` middleware
4. Middleware validates token and injects `req.user` with JwtPayload data

**Socket.io:**

1. Client connects with JWT token in `socket.handshake.auth.token`
2. SocketHandler middleware validates token and injects `userId` and `email` into socket
3. All game events require authenticated socket connection

### Prisma Client Location

The Prisma client is generated to a custom location (`src/generated/prisma`) instead of `node_modules/@prisma/client`.
Import from:

```typescript
import {prisma} from './config/database';
// or for types
import {PrismaClient, PokemonType} from '../src/generated/prisma/client';
```

### Environment Variables

Required variables (see `.env.example`):

- `PORT` - Server port (default: 3001)
- `JWT_SECRET` - Secret key for JWT signing
- `CORS_ORIGIN` - Allowed frontend origin (default: http://localhost:5173)
- `DATABASE_URL` - SQLite database file location
- `NODE_ENV` - Environment (development/production)

### Testing Strategy

- **Framework**: Vitest with TypeScript support
- **Mocking**: `vitest-mock-extended` for type-safe Prisma mocks
- **Structure**: Service-layer tests in `tests/` directory
- **Pattern**: Mock Prisma client BEFORE importing service functions
- **Coverage**: Configured to exclude generated files, config, and Prisma schema
- See `tests/README.md` for detailed testing patterns and examples

## Common Patterns

### Adding a New REST Endpoint

1. Create service function in `src/modules/{module}/{module}.service.ts`
2. Add route in `src/modules/{module}/{module}.route.ts`
3. Register route in `src/server.ts` if new module
4. Use `authenticateToken` middleware for protected routes
5. Add swagger documentation in `src/modules/{module}/{module}.swagger.ts`
6. Add Bruno request file in `bruno/{Module}/` for testing

### Modifying Database Schema

1. Edit `prisma/schema.prisma`
2. Run `npm run db:generate` to update Prisma client
3. Run `npm run db:migrate` to create migration
4. Update seed script in `prisma/seed.ts` if needed
5. Run `npm run db:reset` to apply changes

### Writing Tests

1. Mock Prisma client BEFORE importing the service:
   ```typescript
   vi.mock('../src/config/database', () => ({
     prisma: mockDeep<PrismaClient>(),
   }));
   ```
2. Import service functions AFTER the mock
3. Use `mockReset()` in `beforeEach()` to reset mocks
4. Mock return values: `prismaMock.user.findUnique.mockResolvedValue(...)`
5. Verify calls: `expect(prismaMock.user.findUnique).toHaveBeenCalledWith(...)`

### Working with the Game System

1. The game runs entirely server-side to prevent cheating
2. GameState is the single source of truth, stored in memory in SocketHandler
3. Use `Game.getStateForPlayer()` to format state for clients (hides opponent's hand/deck)
4. `Game` entity orchestrates gameplay, `Player` entity handles player logic, game rules are in `game.rules.ts`, socket
   event handling is in `SocketHandler`
5. Weakness system: each type has one primary weakness with 2x damage multiplier
6. Test with two separate socket connections (different browsers/tabs)
7. See `GAME_SYSTEM.md` for complete event documentation and examples
