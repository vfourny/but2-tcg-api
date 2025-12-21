import {Server as HTTPServer} from "http";
import {Server, Socket} from "socket.io";
import jwt from "jsonwebtoken";
import {v4 as uuidv4} from "uuid";
import {env} from "../env";
import {prisma} from "../database";
import {Game} from "../models/game.model";
import {AttackEvent, CreateRoomEvent, DrawCardsEvent, JoinRoomEvent, PlayCardEvent} from "../types/game.type";
import {GameEventBatch} from "../utils/game.events";

/**
 * Interface pour un socket authentifié
 */
interface AuthenticatedSocket extends Socket {
    userId?: string;
    email?: string;
}

/**
 * Gestionnaire des événements Socket.io pour le jeu
 */
export class SocketHandler {
    private io: Server;
    private games: Map<string, Game>;

    constructor(httpServer: HTTPServer) {
        this.io = new Server(httpServer, {
            cors: {
                origin: env.CORS_ORIGIN,
                credentials: true,
            },
        });
        this.games = new Map();
        this.setupAuthMiddleware();
        this.setupEventHandlers();
    }

    /**
     * Configure le middleware d'authentification JWT
     */
    private setupAuthMiddleware(): void {
        this.io.use((socket: AuthenticatedSocket, next) => {
            const token = socket.handshake.auth.token;

            if (!token) {
                return next(new Error("Authentication error: No token provided"));
            }

            try {
                const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string; email: string };
                socket.userId = decoded.userId;
                socket.email = decoded.email;
                next();
            } catch (error) {
                next(new Error("Authentication error: Invalid token"));
            }
        });
    }

    /**
     * Configure les gestionnaires d'événements
     */
    private setupEventHandlers(): void {
        this.io.on("connection", (socket: AuthenticatedSocket) => {
            console.log(`✅ User connected: ${socket.email} (${socket.id})`);

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
     * Crée une nouvelle room
     */
    private async handleCreateRoom(socket: AuthenticatedSocket, data: CreateRoomEvent): Promise<void> {
        try {
            // Vérifier que le deck appartient au joueur
            const deck = await prisma.deck.findFirst({
                where: {
                    id: data.deckId,
                    userId: socket.userId,
                },
                include: {
                    cards: {
                        include: {
                            card: true,
                        },
                    },
                },
            });

            if (!deck) {
                socket.emit("error", {message: "Deck non trouvé ou vous n'en êtes pas le propriétaire"});
                return;
            }

            if (deck.cards.length !== 20) {
                socket.emit("error", {message: "Le deck doit contenir exactement 20 cartes"});
                return;
            }

            // Créer un Game directement (plus besoin de Room !)
            const gameId = uuidv4();
            const game = new Game(gameId, socket.id, socket.userId!, data.deckId);

            this.games.set(gameId, game);
            socket.join(gameId);

            socket.emit("roomCreated", {
                roomId: gameId,
                message: "Room créée avec succès. En attente d'un adversaire...",
            });

            // Notifier tous les clients de la nouvelle room disponible
            this.io.emit("roomsListUpdated", this.getAvailableGames());

            console.log(`🎮 Room created: ${gameId} by ${socket.email}`);
        } catch (error) {
            console.error("Error creating room:", error);
            socket.emit("error", {message: "Erreur lors de la création de la room"});
        }
    }

    /**
     * Rejoint une room existante
     */
    private async handleJoinRoom(socket: AuthenticatedSocket, data: JoinRoomEvent): Promise<void> {
        try {
            const game = this.games.get(data.roomId);

            if (!game) {
                socket.emit("error", {message: "Room non trouvée"});
                return;
            }

            if (!game.isWaiting() || game.isFull()) {
                socket.emit("error", {message: "Cannot join this game"});
                return;
            }

            // Vérifier que le deck appartient au joueur
            const deck = await prisma.deck.findFirst({
                where: {
                    id: data.deckId,
                    userId: socket.userId,
                },
                include: {
                    cards: {
                        include: {
                            card: true,
                        },
                    },
                },
            });

            if (!deck) {
                socket.emit("error", {message: "Deck non trouvé ou vous n'en êtes pas le propriétaire"});
                return;
            }

            if (deck.cards.length !== 20) {
                socket.emit("error", {message: "Le deck doit contenir exactement 20 cartes"});
                return;
            }

            // Récupérer le deck de l'hôte en utilisant le deckId stocké dans Game
            const hostDeck = await prisma.deck.findFirst({
                where: {
                    id: game.getHostDeckId(),
                },
                include: {
                    cards: {
                        include: {
                            card: true,
                        },
                    },
                },
            });

            if (!hostDeck) {
                socket.emit("error", {message: "Deck de l'hôte non trouvé"});
                return;
            }

            // Démarrer la partie
            const hostCards = hostDeck.cards.map((dc) => dc.card);
            const guestCards = deck.cards.map((dc) => dc.card);

            const result = game.startWithGuest(
                socket.id,
                socket.userId!,
                data.deckId,
                hostCards,
                guestCards
            );

            if (!result.success) {
                socket.emit("error", {message: result.message});
                return;
            }

            socket.join(data.roomId);

            // Notifier les deux joueurs que la partie commence
            const updatedSocketIds = game.getSocketIds();
            this.io.to(updatedSocketIds.host).emit("gameStarted", {
                message: "Un adversaire a rejoint ! La partie commence !",
                gameState: game.getStateForPlayer(updatedSocketIds.host),
            });

            this.io.to(updatedSocketIds.guest!).emit("gameStarted", {
                message: "Vous avez rejoint la partie ! La partie commence !",
                gameState: game.getStateForPlayer(updatedSocketIds.guest!),
            });

            // Notifier tous les clients que la room n'est plus disponible
            this.io.emit("roomsListUpdated", this.getAvailableGames());

            console.log(`🎮 Game started in room ${data.roomId}`);
        } catch (error) {
            console.error("Error joining room:", error);
            socket.emit("error", {message: "Erreur lors de la jonction à la room"});
        }
    }

    /**
     * Retourne la liste des rooms disponibles
     */
    private handleGetRooms(socket: AuthenticatedSocket): void {
        socket.emit("roomsList", this.getAvailableGames());
    }

    /**
     * Pioche des cartes
     */
    private handleDrawCards(socket: AuthenticatedSocket, data: DrawCardsEvent): void {
        const game = this.games.get(data.roomId);

        if (!game) {
            socket.emit("error", {message: "Game not found"});
            return;
        }

        const batch = game.drawCards(socket.id);
        this.emitEventBatch(game, batch);
    }

    /**
     * Joue une carte sur le board
     */
    private handlePlayCard(socket: AuthenticatedSocket, data: PlayCardEvent): void {
        const game = this.games.get(data.roomId);

        if (!game) {
            socket.emit("error", {message: "Game not found"});
            return;
        }

        const batch = game.playCard(socket.id, data.cardIndex);
        this.emitEventBatch(game, batch);
    }

    /**
     * Attaque le Pokemon adverse
     */
    private handleAttack(socket: AuthenticatedSocket, data: AttackEvent): void {
        const game = this.games.get(data.roomId);

        if (!game) {
            socket.emit("error", {message: "Game not found"});
            return;
        }

        const batch = game.attack(socket.id);
        this.emitEventBatch(game, batch);

        // Si la partie est terminée, supprimer la game après un délai
        if (game.getStatus() === 'finished') {
            setTimeout(() => {
                this.games.delete(data.roomId);
                console.log(`🗑️ Room ${data.roomId} supprimée`);
            }, 5000);
        }
    }

    /**
     * Gère la déconnexion d'un joueur
     */
    private handleDisconnect(socket: AuthenticatedSocket): void {
        console.log(`❌ User disconnected: ${socket.email} (${socket.id})`);

        // Trouver et supprimer les games où le joueur était présent
        for (const [gameId, game] of this.games.entries()) {
            if (game.hasPlayer(socket.id)) {
                const socketIds = game.getSocketIds();

                // Notifier l'autre joueur
                if (socketIds.guest && socketIds.guest !== socket.id) {
                    this.io.to(socketIds.guest).emit("opponentDisconnected", {
                        message: "Votre adversaire s'est déconnecté. La partie est terminée.",
                    });
                } else if (socketIds.host !== socket.id) {
                    this.io.to(socketIds.host).emit("opponentDisconnected", {
                        message: "Votre adversaire s'est déconnecté. La partie est terminée.",
                    });
                }

                this.games.delete(gameId);
                this.io.emit("roomsListUpdated", this.getAvailableGames());
            }
        }
    }

    /**
     * Émet tous les événements d'un batch
     */
    private emitEventBatch(game: Game, batch: GameEventBatch): void {
        const socketIds = game.getSocketIds();

        batch.events.forEach(event => {
            let targetSocketId: string | null = null;

            if (event.target === 'host') {
                targetSocketId = socketIds.host;
            } else if (event.target === 'guest') {
                targetSocketId = socketIds.guest;
            } else if (event.target === 'both') {
                // Émettre aux deux joueurs
                if (socketIds.host) {
                    this.io.to(socketIds.host).emit(event.type, event.data);
                }
                if (socketIds.guest) {
                    this.io.to(socketIds.guest).emit(event.type, event.data);
                }
                return;
            }

            if (targetSocketId) {
                this.io.to(targetSocketId).emit(event.type, event.data);
            }
        });
    }

    /**
     * Retourne la liste des games disponibles (en attente)
     */
    private getAvailableGames(): Array<{ id: string; hostSocketId: string }> {
        return Array.from(this.games.values())
            .filter(game => game.isWaiting() && !game.isFull())
            .map(game => ({
                id: game.getId(),
                hostSocketId: game.getSocketIds().host,
            }));
    }
}
