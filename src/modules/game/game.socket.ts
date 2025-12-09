import {Server, Socket} from "socket.io";
import jwt from "jsonwebtoken";
import {v4 as uuidv4} from "uuid";
import {env, prisma} from "../../config";
import {Game} from "./game.class";
import {AttackEvent, CreateRoomEvent, DrawCardsEvent, JoinRoomEvent, PlayCardEvent, Room,} from "./game.type";

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
    private rooms: Map<string, Room>;

    constructor(io: Server) {
        this.io = io;
        this.rooms = new Map();
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
            console.log('test')
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

            const roomId = uuidv4();
            const room: Room = {
                id: roomId,
                host: {
                    socketId: socket.id,
                    deckId: data.deckId,
                },
                guest: {
                    socketId: null,
                    deckId: null,
                },
                game: null,
            };

            this.rooms.set(roomId, room);
            socket.join(roomId);

            socket.emit("roomCreated", {
                roomId,
                message: "Room créée avec succès. En attente d'un adversaire...",
            });

            // Notifier tous les clients de la nouvelle room disponible
            this.io.emit("roomsListUpdated", this.getAvailableRooms());

            console.log(`🎮 Room created: ${roomId} by ${socket.email}`);
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
            const room = this.rooms.get(data.roomId);

            if (!room) {
                socket.emit("error", {message: "Room non trouvée"});
                return;
            }

            if (room.guest.socketId !== null) {
                socket.emit("error", {message: "La room est déjà pleine"});
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

            // Récupérer le deck de l'hôte
            const hostDeck = await prisma.deck.findFirst({
                where: {
                    id: room.host.deckId,
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

            // Mettre à jour la room
            room.guest.socketId = socket.id;
            room.guest.deckId = data.deckId;

            // Créer l'instance du jeu
            const hostCards = hostDeck.cards.map((dc) => dc.card);
            const guestCards = deck.cards.map((dc) => dc.card);

            room.game = new Game(
                data.roomId,
                room.host.socketId,
                hostCards,
                room.guest.socketId,
                guestCards
            );

            socket.join(data.roomId);

            // Notifier les deux joueurs que la partie commence
            this.io.to(room.host.socketId).emit("gameStarted", {
                message: "Un adversaire a rejoint ! La partie commence !",
                gameState: room.game.getStateForPlayer(room.host.socketId),
            });

            this.io.to(room.guest.socketId).emit("gameStarted", {
                message: "Vous avez rejoint la partie ! La partie commence !",
                gameState: room.game.getStateForPlayer(room.guest.socketId),
            });

            // Notifier tous les clients que la room n'est plus disponible
            this.io.emit("roomsListUpdated", this.getAvailableRooms());

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
        socket.emit("roomsList", this.getAvailableRooms());
    }

    /**
     * Pioche des cartes
     */
    private handleDrawCards(socket: AuthenticatedSocket, data: DrawCardsEvent): void {
        const room = this.rooms.get(data.roomId);

        if (!room || !room.game) {
            socket.emit("error", {message: "Room ou partie non trouvée"});
            return;
        }

        const result = room.game.drawCards(socket.id);

        if (!result.success) {
            socket.emit("error", {message: result.message});
            return;
        }

        // Envoyer l'état mis à jour aux deux joueurs
        this.io.to(room.host.socketId).emit("gameStateUpdated", {
            message: socket.id === room.host.socketId ? result.message : "L'adversaire a pioché des cartes",
            gameState: room.game.getStateForPlayer(room.host.socketId),
        });

        this.io.to(room.guest.socketId!).emit("gameStateUpdated", {
            message: socket.id === room.guest.socketId ? result.message : "L'adversaire a pioché des cartes",
            gameState: room.game.getStateForPlayer(room.guest.socketId!),
        });
    }

    /**
     * Joue une carte sur le board
     */
    private handlePlayCard(socket: AuthenticatedSocket, data: PlayCardEvent): void {
        const room = this.rooms.get(data.roomId);

        if (!room || !room.game) {
            socket.emit("error", {message: "Room ou partie non trouvée"});
            return;
        }

        const result = room.game.playCard(socket.id, data.cardIndex);

        if (!result.success) {
            socket.emit("error", {message: result.message});
            return;
        }

        // Envoyer l'état mis à jour aux deux joueurs
        this.io.to(room.host.socketId).emit("gameStateUpdated", {
            message: socket.id === room.host.socketId ? result.message : "L'adversaire a joué une carte",
            gameState: room.game.getStateForPlayer(room.host.socketId),
        });

        this.io.to(room.guest.socketId!).emit("gameStateUpdated", {
            message: socket.id === room.guest.socketId ? result.message : "L'adversaire a joué une carte",
            gameState: room.game.getStateForPlayer(room.guest.socketId!),
        });
    }

    /**
     * Attaque le Pokemon adverse
     */
    private handleAttack(socket: AuthenticatedSocket, data: AttackEvent): void {
        const room = this.rooms.get(data.roomId);

        if (!room || !room.game) {
            socket.emit("error", {message: "Room ou partie non trouvée"});
            return;
        }

        const result = room.game.attack(socket.id);

        if (!result.success) {
            socket.emit("error", {message: result.message});
            return;
        }

        // Envoyer l'état mis à jour aux deux joueurs
        this.io.to(room.host.socketId).emit("gameStateUpdated", {
            message: result.message,
            gameState: room.game.getStateForPlayer(room.host.socketId),
        });

        this.io.to(room.guest.socketId!).emit("gameStateUpdated", {
            message: result.message,
            gameState: room.game.getStateForPlayer(room.guest.socketId!),
        });

        // Si la partie est terminée
        if (result.gameWon && room.game.getStatus() === 'finished') {
            this.io.to(data.roomId).emit("gameEnded", {
                winner: room.game.getWinner(),
                message: room.game.getWinner() === socket.id ? "Vous avez gagné !" : "Vous avez perdu !",
            });

            // Supprimer la room après un délai
            setTimeout(() => {
                this.rooms.delete(data.roomId);
                console.log(`🗑️ Room ${data.roomId} supprimée`);
            }, 5000);
        }
    }

    /**
     * Gère la déconnexion d'un joueur
     */
    private handleDisconnect(socket: AuthenticatedSocket): void {
        console.log(`❌ User disconnected: ${socket.email} (${socket.id})`);

        // Trouver et supprimer les rooms où le joueur était présent
        for (const [roomId, room] of this.rooms.entries()) {
            if (room.host.socketId === socket.id || room.guest.socketId === socket.id) {
                // Notifier l'autre joueur
                if (room.guest.socketId && room.guest.socketId !== socket.id) {
                    this.io.to(room.guest.socketId).emit("opponentDisconnected", {
                        message: "Votre adversaire s'est déconnecté. La partie est terminée.",
                    });
                } else if (room.host.socketId !== socket.id) {
                    this.io.to(room.host.socketId).emit("opponentDisconnected", {
                        message: "Votre adversaire s'est déconnecté. La partie est terminée.",
                    });
                }

                this.rooms.delete(roomId);
                this.io.emit("roomsListUpdated", this.getAvailableRooms());
            }
        }
    }

    /**
     * Retourne la liste des rooms disponibles (en attente)
     */
    private getAvailableRooms(): Array<{ id: string; hostSocketId: string }> {
        const availableRooms: Array<{ id: string; hostSocketId: string }> = [];

        for (const [roomId, room] of this.rooms.entries()) {
            if (room.guest.socketId === null) {
                availableRooms.push({
                    id: roomId,
                    hostSocketId: room.host.socketId,
                });
            }
        }

        return availableRooms;
    }
}
