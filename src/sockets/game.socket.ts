import {Server as HTTPServer} from "http";
import {Server, Socket} from "socket.io";
import jwt from "jsonwebtoken";
import {v4 as uuidv4} from "uuid";
import {env} from "../env";
import {prisma} from "../database";
import {Game} from "../models/game.model";
import {Lobby} from "../models/lobby.model";
import {AttackEvent, CreateRoomEvent, DrawCardsEvent, JoinRoomEvent, PlayCardEvent} from "../types/game.type";

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
    private lobbies: Map<string, Lobby>;
    private games: Map<string, Game>;

    constructor(httpServer: HTTPServer) {
        this.io = new Server(httpServer, {
            cors: {
                origin: env.CORS_ORIGIN,
                credentials: true,
            },
        });
        this.lobbies = new Map();
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
     * Crée un nouveau lobby
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

            // Créer un Lobby
            const lobbyId = uuidv4();
            const lobby = new Lobby(lobbyId, socket.id, socket.userId!, data.deckId);

            this.lobbies.set(lobbyId, lobby);
            socket.join(lobbyId);

            socket.emit("roomCreated", {
                roomId: lobbyId,
                message: "Room créée avec succès. En attente d'un adversaire...",
            });

            // Notifier tous les clients de la nouvelle room disponible
            this.io.emit("roomsListUpdated", this.getAvailableLobbies());

            console.log(`🎮 Lobby created: ${lobbyId} by ${socket.email}`);
        } catch (error) {
            console.error("Error creating room:", error);
            socket.emit("error", {message: "Erreur lors de la création de la room"});
        }
    }

    /**
     * Rejoint un lobby et démarre la partie
     */
    private async handleJoinRoom(socket: AuthenticatedSocket, data: JoinRoomEvent): Promise<void> {
        try {
            const lobby = this.lobbies.get(data.roomId);

            if (!lobby) {
                socket.emit("error", {message: "Room non trouvée"});
                return;
            }

            if (lobby.isFull()) {
                socket.emit("error", {message: "Cette room est déjà complète"});
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

            // Ajouter le guest au lobby
            const added = lobby.addGuest(socket.id, socket.userId!, data.deckId);

            if (!added) {
                socket.emit("error", {message: "Impossible de rejoindre cette room"});
                return;
            }

            // Récupérer les decks pour créer le jeu
            const host = lobby.getHost();
            const guest = lobby.getGuest()!;

            const hostDeck = await prisma.deck.findFirst({
                where: {id: host.deckId},
                include: {cards: {include: {card: true}}},
            });

            if (!hostDeck) {
                socket.emit("error", {message: "Deck de l'hôte non trouvé"});
                return;
            }

            // Créer le jeu
            const gameId = data.roomId;
            const game = new Game(
                gameId,
                host.socketId,
                hostDeck.cards.map(dc => dc.card),
                guest.socketId,
                deck.cards.map(dc => dc.card)
            );

            this.games.set(gameId, game);
            socket.join(gameId);

            // Supprimer le lobby
            this.lobbies.delete(data.roomId);

            // Notifier les deux joueurs
            this.io.to(host.socketId).emit("gameStarted", {
                message: "Un adversaire a rejoint ! La partie commence !",
                gameState: game.getStateForPlayer(host.socketId),
            });

            this.io.to(guest.socketId).emit("gameStarted", {
                message: "Vous avez rejoint la partie ! La partie commence !",
                gameState: game.getStateForPlayer(guest.socketId),
            });

            // Notifier tous les clients que la room n'est plus disponible
            this.io.emit("roomsListUpdated", this.getAvailableLobbies());

            console.log(`🎮 Game started in room ${gameId}`);
        } catch (error) {
            console.error("Error joining room:", error);
            socket.emit("error", {message: "Erreur lors de la jonction à la room"});
        }
    }

    /**
     * Retourne la liste des lobbies disponibles
     */
    private handleGetRooms(socket: AuthenticatedSocket): void {
        socket.emit("roomsList", this.getAvailableLobbies());
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

        const result = game.drawCards(socket.id);

        if (!result.success) {
            socket.emit("error", {message: result.message});
            return;
        }

        // Envoyer l'état mis à jour au joueur
        socket.emit("gameStateUpdated", {
            message: result.message,
            gameState: game.getStateForPlayer(socket.id),
        });

        // Notifier l'adversaire
        if (result.notifyOpponent) {
            const opponentSocketId = this.getOpponentSocketId(game, socket.id);
            if (opponentSocketId) {
                this.io.to(opponentSocketId).emit("gameStateUpdated", {
                    message: result.notifyOpponent,
                    gameState: game.getStateForPlayer(opponentSocketId),
                });
            }
        }
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

        const result = game.playCard(socket.id, data.cardIndex);

        if (!result.success) {
            socket.emit("error", {message: result.message});
            return;
        }

        // Envoyer l'état mis à jour au joueur
        socket.emit("gameStateUpdated", {
            message: result.message,
            gameState: game.getStateForPlayer(socket.id),
        });

        // Notifier l'adversaire
        if (result.notifyOpponent) {
            const opponentSocketId = this.getOpponentSocketId(game, socket.id);
            if (opponentSocketId) {
                this.io.to(opponentSocketId).emit("gameStateUpdated", {
                    message: result.notifyOpponent,
                    gameState: game.getStateForPlayer(opponentSocketId),
                });
            }
        }
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

        const result = game.attack(socket.id);

        if (!result.success) {
            socket.emit("error", {message: result.message});
            return;
        }

        // Envoyer l'état mis à jour au joueur
        socket.emit("gameStateUpdated", {
            message: result.message,
            gameState: game.getStateForPlayer(socket.id),
        });

        // Notifier l'adversaire
        const opponentSocketId = this.getOpponentSocketId(game, socket.id);
        if (opponentSocketId && result.notifyOpponent) {
            this.io.to(opponentSocketId).emit("gameStateUpdated", {
                message: result.notifyOpponent,
                gameState: game.getStateForPlayer(opponentSocketId),
            });
        }

        // Si la partie est terminée
        if (result.gameEnded && result.winner) {
            const winnerSocketId = result.winner;
            const loserSocketId = opponentSocketId;

            this.io.to(winnerSocketId).emit("gameEnded", {
                winner: winnerSocketId,
                message: "Vous avez gagné !",
            });

            if (loserSocketId) {
                this.io.to(loserSocketId).emit("gameEnded", {
                    winner: winnerSocketId,
                    message: "Vous avez perdu !",
                });
            }

            // Supprimer la game après un délai
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

        // Supprimer les lobbies où le joueur était présent
        for (const [lobbyId, lobby] of this.lobbies.entries()) {
            if (lobby.hasPlayer(socket.id)) {
                this.lobbies.delete(lobbyId);
                this.io.emit("roomsListUpdated", this.getAvailableLobbies());
            }
        }

        // Trouver et supprimer les games où le joueur était présent
        for (const [gameId, game] of this.games.entries()) {
            if (game.hasPlayer(socket.id)) {
                const socketIds = game.getSocketIds();

                // Notifier l'autre joueur
                const opponentSocketId = socket.id === socketIds.host ? socketIds.guest : socketIds.host;

                this.io.to(opponentSocketId).emit("opponentDisconnected", {
                    message: "Votre adversaire s'est déconnecté. La partie est terminée.",
                });

                this.games.delete(gameId);
            }
        }
    }

    /**
     * Retourne le socketId de l'adversaire
     */
    private getOpponentSocketId(game: Game, socketId: string): string | null {
        const socketIds = game.getSocketIds();
        return socketId === socketIds.host ? socketIds.guest : socketIds.host;
    }

    /**
     * Retourne la liste des lobbies disponibles
     */
    private getAvailableLobbies(): Array<{ id: string; hostSocketId: string }> {
        return Array.from(this.lobbies.values())
            .filter(lobby => !lobby.isFull())
            .map(lobby => ({
                id: lobby.getId(),
                hostSocketId: lobby.getHost().socketId,
            }));
    }
}
