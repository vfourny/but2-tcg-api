import type {Card} from "../generated/prisma/client";
import {GameStatus, TurnState} from "../types/game.type";
import {Player} from "./player.model";
import {
    createErrorEvent,
    createGameEndedEvent,
    createStateUpdateEvent,
    GameEventBatch
} from "../utils/game.events";

/**
 * Représente une partie de jeu
 * Gère à la fois le matchmaking (WAITING) et la partie en cours (PLAYING/FINISHED)
 */
export class Game {
    private readonly id: string;

    // Métadonnées des joueurs (pour matchmaking et Socket.io)
    private readonly host: {
        socketId: string;
        userId: string;
        deckId: string;
    };

    private guest: {
        socketId: string | null;
        userId: string | null;
        deckId: string | null;
    } = {
        socketId: null,
        userId: null,
        deckId: null,
    };

    // Instances Player (null tant que la partie n'a pas commencé)
    private hostPlayer: Player | null = null;
    private guestPlayer: Player | null = null;

    // État du jeu
    private currentTurn: TurnState = TurnState.HOST;
    private status: GameStatus = GameStatus.WAITING;
    private winner?: string;

    constructor(
        id: string,
        hostSocketId: string,
        hostUserId: string,
        hostDeckId: string
    ) {
        this.id = id;
        this.host = {
            socketId: hostSocketId,
            userId: hostUserId,
            deckId: hostDeckId,
        };
    }

    //
    // Matchmaking
    //

    /**
     * Vérifier si la partie est en attente d'un adversaire
     */
    public isWaiting(): boolean {
        return this.status === GameStatus.WAITING;
    }

    /**
     * Vérifier si la partie est complète (2 joueurs)
     */
    public isFull(): boolean {
        return this.guest.socketId !== null;
    }

    /**
     * Démarrer la partie avec un guest
     */
    public startWithGuest(
        guestSocketId: string,
        guestUserId: string,
        guestDeckId: string,
        hostDeck: Card[],
        guestDeck: Card[]
    ): { success: boolean; message: string } {
        if (!this.isWaiting()) {
            return {success: false, message: "Game already started"};
        }

        if (this.isFull()) {
            return {success: false, message: "Game is full"};
        }

        // Mettre à jour les infos du guest
        this.guest = {
            socketId: guestSocketId,
            userId: guestUserId,
            deckId: guestDeckId,
        };

        // Créer les joueurs
        this.hostPlayer = new Player(this.host.socketId, hostDeck);
        this.guestPlayer = new Player(guestSocketId, guestDeck);

        // Changer le statut
        this.status = GameStatus.PLAYING;

        return {success: true, message: "Game started"};
    }

    //
    // Helpers pour Socket.io
    //

    /**
     * Récupérer l'ID de la partie
     */
    public getId(): string {
        return this.id;
    }

    /**
     * Récupérer les socketIds pour envoyer des événements
     */
    public getSocketIds(): { host: string; guest: string | null } {
        return {
            host: this.host.socketId,
            guest: this.guest.socketId,
        };
    }

    /**
     * Récupérer le deckId du host
     */
    public getHostDeckId(): string {
        return this.host.deckId;
    }

    /**
     * Récupérer le deckId du guest
     */
    public getGuestDeckId(): string | null {
        return this.guest.deckId;
    }

    /**
     * Vérifier si un socketId appartient à cette partie
     */
    public hasPlayer(socketId: string): boolean {
        return (
            this.host.socketId === socketId || this.guest.socketId === socketId
        );
    }

    /**
     * Vérifier si le socketId est celui de l'hôte
     */
    public isHost(socketId: string): boolean {
        return this.host.socketId === socketId;
    }

    //
    // Logique de jeu avec événements structurés
    //

    /**
     * Pioche des cartes jusqu'à remplir la main (5 cartes max)
     */
    public drawCards(playerSocketId: string): GameEventBatch {
        if (this.status !== GameStatus.PLAYING) {
            return {
                events: [
                    createErrorEvent(
                        this.isHost(playerSocketId) ? "host" : "guest",
                        "Game not started"
                    ),
                ],
            };
        }

        const player = this.getPlayer(playerSocketId);

        if (!player) {
            return {
                events: [
                    createErrorEvent(
                        this.isHost(playerSocketId) ? "host" : "guest",
                        "Joueur non trouvé"
                    ),
                ],
            };
        }

        const result = player.drawCards();

        if (!result.success) {
            return {
                events: [
                    createErrorEvent(
                        this.isHost(playerSocketId) ? "host" : "guest",
                        result.message
                    ),
                ],
            };
        }

        // Créer les événements pour les deux joueurs
        const isHostPlayer = this.isHost(playerSocketId);
        return {
            events: [
                createStateUpdateEvent(
                    "host",
                    isHostPlayer ? result.message : "L'adversaire a pioché des cartes",
                    this.getStateForPlayer(this.host.socketId)
                ),
                createStateUpdateEvent(
                    "guest",
                    !isHostPlayer
                        ? result.message
                        : "L'adversaire a pioché des cartes",
                    this.getStateForPlayer(this.guest.socketId!)
                ),
            ],
        };
    }

    /**
     * Joue une carte de la main sur le board
     */
    public playCard(
        playerSocketId: string,
        cardIndex: number
    ): GameEventBatch {
        if (this.status !== GameStatus.PLAYING) {
            return {
                events: [
                    createErrorEvent(
                        this.isHost(playerSocketId) ? "host" : "guest",
                        "Game not started"
                    ),
                ],
            };
        }

        const player = this.getPlayer(playerSocketId);

        if (!player) {
            return {
                events: [
                    createErrorEvent(
                        this.isHost(playerSocketId) ? "host" : "guest",
                        "Joueur non trouvé"
                    ),
                ],
            };
        }

        // Vérifier que c'est le tour du joueur
        const playerTurn = this.getPlayerTurn(playerSocketId);
        if (this.currentTurn !== playerTurn) {
            return {
                events: [
                    createErrorEvent(
                        this.isHost(playerSocketId) ? "host" : "guest",
                        "Ce n'est pas votre tour"
                    ),
                ],
            };
        }

        const result = player.playCard(cardIndex);

        if (!result.success) {
            return {
                events: [
                    createErrorEvent(
                        this.isHost(playerSocketId) ? "host" : "guest",
                        result.message
                    ),
                ],
            };
        }

        // Créer les événements pour les deux joueurs
        const isHostPlayer = this.isHost(playerSocketId);
        return {
            events: [
                createStateUpdateEvent(
                    "host",
                    isHostPlayer ? result.message : "L'adversaire a joué une carte",
                    this.getStateForPlayer(this.host.socketId)
                ),
                createStateUpdateEvent(
                    "guest",
                    !isHostPlayer
                        ? result.message
                        : "L'adversaire a joué une carte",
                    this.getStateForPlayer(this.guest.socketId!)
                ),
            ],
        };
    }

    /**
     * Attaque le Pokemon adverse
     */
    public attack(attackerSocketId: string): GameEventBatch {
        if (this.status !== GameStatus.PLAYING) {
            return {
                events: [
                    createErrorEvent(
                        this.isHost(attackerSocketId) ? "host" : "guest",
                        "Game not started"
                    ),
                ],
            };
        }

        const attacker = this.getPlayer(attackerSocketId);
        const defender = this.getOpponent(attackerSocketId);

        if (!attacker || !defender) {
            return {
                events: [
                    createErrorEvent(
                        this.isHost(attackerSocketId) ? "host" : "guest",
                        "Erreur lors de la récupération des joueurs"
                    ),
                ],
            };
        }

        // Vérifier que c'est le tour du joueur
        const playerTurn = this.getPlayerTurn(attackerSocketId);
        if (this.currentTurn !== playerTurn) {
            return {
                events: [
                    createErrorEvent(
                        this.isHost(attackerSocketId) ? "host" : "guest",
                        "Ce n'est pas votre tour"
                    ),
                ],
            };
        }

        const result = attacker.attack(defender);

        if (!result.success) {
            return {
                events: [
                    createErrorEvent(
                        this.isHost(attackerSocketId) ? "host" : "guest",
                        result.message
                    ),
                ],
            };
        }

        // Si l'attaque a réussi et que la partie n'est pas gagnée, changer de tour
        if (!result.gameWon) {
            this.switchTurn();
        }

        // Si la partie est gagnée, mettre à jour le statut
        if (result.gameWon) {
            this.status = GameStatus.FINISHED;
            this.winner = attackerSocketId;

            return {
                events: [
                    createStateUpdateEvent(
                        "host",
                        result.message,
                        this.getStateForPlayer(this.host.socketId)
                    ),
                    createStateUpdateEvent(
                        "guest",
                        result.message,
                        this.getStateForPlayer(this.guest.socketId!)
                    ),
                    createGameEndedEvent(
                        attackerSocketId,
                        this.winner === attackerSocketId
                            ? "Vous avez gagné !"
                            : "Vous avez perdu !"
                    ),
                ],
            };
        }

        // Partie continue
        return {
            events: [
                createStateUpdateEvent(
                    "host",
                    result.message,
                    this.getStateForPlayer(this.host.socketId)
                ),
                createStateUpdateEvent(
                    "guest",
                    result.message,
                    this.getStateForPlayer(this.guest.socketId!)
                ),
            ],
        };
    }

    /**
     * Formate l'état du jeu pour un joueur spécifique
     * (cache la main et le deck de l'adversaire)
     */
    public getStateForPlayer(playerSocketId: string): any {
        const player = this.getPlayer(playerSocketId);
        const opponent = this.getOpponent(playerSocketId);

        if (!player || !opponent) {
            return null;
        }

        const playerTurn = this.getPlayerTurn(playerSocketId);

        return {
            roomId: this.id,
            status: this.status,
            winner: this.winner,
            currentTurn: this.currentTurn,
            isYourTurn: this.currentTurn === playerTurn,
            yourBoard: player.getOwnState(),
            opponentBoard: opponent.getOpponentState(),
        };
    }

    /**
     * Retourne le statut de la partie
     */
    public getStatus(): GameStatus {
        return this.status;
    }

    /**
     * Retourne le gagnant (si la partie est terminée)
     */
    public getWinner(): string | undefined {
        return this.winner;
    }

    /**
     * Retourne l'état interne du jeu (pour les tests)
     * @internal
     */
    public getState() {
        return {
            roomId: this.id,
            host: {
                socketId: this.hostPlayer?.getSocketId() || this.host.socketId,
                board: this.hostPlayer?.getBoard() || null,
            },
            guest: {
                socketId: this.guestPlayer?.getSocketId() || this.guest.socketId,
                board: this.guestPlayer?.getBoard() || null,
            },
            currentTurn: this.currentTurn,
            status: this.status,
            winner: this.winner,
        };
    }

    /**
     * Récupère une instance Player pour le joueur host
     */
    public getHostPlayer(): Player | null {
        return this.hostPlayer;
    }

    /**
     * Récupère une instance Player pour le joueur guest
     */
    public getGuestPlayer(): Player | null {
        return this.guestPlayer;
    }

    /**
     * Récupère une instance Player par son socketId
     */
    public getPlayer(socketId: string): Player | null {
        if (!this.hostPlayer || !this.guestPlayer) {
            return null;
        }

        if (socketId === this.hostPlayer.getSocketId()) {
            return this.hostPlayer;
        } else if (socketId === this.guestPlayer.getSocketId()) {
            return this.guestPlayer;
        }
        return null;
    }

    /**
     * Définit le tour manuellement (pour les tests)
     * @internal
     */
    public setCurrentTurn(turn: TurnState): void {
        this.currentTurn = turn;
    }

    /**
     * Définit le statut manuellement (pour les tests)
     * @internal
     */
    public setStatus(status: GameStatus): void {
        this.status = status;
    }

    /**
     * Définit le gagnant manuellement (pour les tests)
     * @internal
     */
    public setWinner(winner: string): void {
        this.winner = winner;
    }

    /**
     * Récupère l'adversaire d'un joueur
     */
    private getOpponent(playerSocketId: string): Player | null {
        if (!this.hostPlayer || !this.guestPlayer) {
            return null;
        }

        if (playerSocketId === this.hostPlayer.getSocketId()) {
            return this.guestPlayer;
        } else if (playerSocketId === this.guestPlayer.getSocketId()) {
            return this.hostPlayer;
        }
        return null;
    }

    /**
     * Retourne le TurnState d'un joueur
     */
    private getPlayerTurn(playerSocketId: string): TurnState | null {
        if (!this.hostPlayer || !this.guestPlayer) {
            return null;
        }

        if (playerSocketId === this.hostPlayer.getSocketId()) {
            return TurnState.HOST;
        } else if (playerSocketId === this.guestPlayer.getSocketId()) {
            return TurnState.GUEST;
        }
        return null;
    }

    /**
     * Change le tour au joueur suivant
     */
    private switchTurn(): void {
        this.currentTurn =
            this.currentTurn === TurnState.HOST ? TurnState.GUEST : TurnState.HOST;
    }
}
