import type {Card} from "../generated/prisma/client";
import {GameStatus} from "../types/game.type";
import {Player} from "./player.model";

/**
 * Résultat d'une action de jeu
 */
export interface GameActionResult {
    success: boolean;
    message: string;
    notifyOpponent?: string;
    gameEnded?: boolean;
    winner?: string;
}

/**
 * Représente une partie de jeu en cours
 * TOUJOURS 2 joueurs, jamais null (matchmaking géré par Lobby)
 */
export class Game {
    private readonly id: string;
    private readonly hostSocketId: string;
    private readonly guestSocketId: string;
    private readonly hostPlayer: Player;
    private readonly guestPlayer: Player;
    private currentPlayer: Player;
    private status: GameStatus = GameStatus.PLAYING;
    private winner?: string;

    constructor(
        id: string,
        hostSocketId: string,
        hostDeck: Card[],
        guestSocketId: string,
        guestDeck: Card[]
    ) {
        this.id = id;
        this.hostSocketId = hostSocketId;
        this.guestSocketId = guestSocketId;
        this.hostPlayer = new Player(hostDeck);
        this.guestPlayer = new Player(guestDeck);

        // Host commence toujours
        this.currentPlayer = this.hostPlayer;
    }

    /**
     * Pioche des cartes jusqu'à remplir la main (5 cartes max)
     */
    public drawCards(socketId: string): GameActionResult {
        const player = this.getPlayerBySocketId(socketId);

        if (!player) {
            return {success: false, message: "Joueur non trouvé"};
        }

        if (player !== this.currentPlayer) {
            return {success: false, message: "Ce n'est pas votre tour"};
        }

        const result = player.drawCards();

        return {
            success: true,
            message: result.message,
            notifyOpponent: "L'adversaire a pioché des cartes",
        };
    }

    /**
     * Joue une carte de la main sur le board
     */
    public playCard(socketId: string, cardIndex: number): GameActionResult {
        const player = this.getPlayerBySocketId(socketId);

        if (!player) {
            return {success: false, message: "Joueur non trouvé"};
        }

        if (player !== this.currentPlayer) {
            return {success: false, message: "Ce n'est pas votre tour"};
        }

        const result = player.playCard(cardIndex);

        if (!result.success) {
            return {success: false, message: result.message};
        }

        return {
            success: true,
            message: result.message,
            notifyOpponent: "L'adversaire a joué une carte",
        };
    }

    /**
     * Attaque le Pokemon adverse
     */
    public attack(attackerSocketId: string): GameActionResult {
        const attacker = this.getPlayerBySocketId(attackerSocketId);
        const defender = this.getOpponentBySocketId(attackerSocketId);

        if (!attacker || !defender) {
            return {success: false, message: "Erreur lors de la récupération des joueurs"};
        }

        if (attacker !== this.currentPlayer) {
            return {success: false, message: "Ce n'est pas votre tour"};
        }

        const result = attacker.attack(defender);

        if (!result.success) {
            return {success: false, message: result.message};
        }

        // Si l'attaque a réussi et que la partie n'est pas gagnée, changer de tour
        if (!result.gameWon) {
            this.switchTurn();
        }

        // Si la partie est gagnée
        if (result.gameWon) {
            this.status = GameStatus.FINISHED;
            this.winner = attackerSocketId;

            return {
                success: true,
                message: result.message,
                notifyOpponent: result.message,
                gameEnded: true,
                winner: attackerSocketId,
            };
        }

        // Partie continue
        return {
            success: true,
            message: result.message,
            notifyOpponent: result.message,
        };
    }

    /**
     * Formate l'état du jeu pour un joueur spécifique
     * (cache la main et le deck de l'adversaire)
     */
    public getStateForPlayer(socketId: string): any {
        const player = this.getPlayerBySocketId(socketId);
        const opponent = this.getOpponentBySocketId(socketId);

        if (!player || !opponent) {
            return null;
        }

        const isYourTurn = player === this.currentPlayer;

        return {
            roomId: this.id,
            status: this.status,
            winner: this.winner,
            isYourTurn,
            yourBoard: player.getOwnState(),
            opponentBoard: opponent.getOpponentState(),
        };
    }

    /**
     * Retourne l'ID de la partie
     */
    public getId(): string {
        return this.id;
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
     * Vérifie si un socketId appartient à cette partie
     */
    public hasPlayer(socketId: string): boolean {
        return this.hostSocketId === socketId || this.guestSocketId === socketId;
    }

    /**
     * Retourne les socketIds des deux joueurs
     */
    public getSocketIds(): { host: string; guest: string } {
        return {
            host: this.hostSocketId,
            guest: this.guestSocketId,
        };
    }

    /**
     * Retourne le joueur correspondant au socketId
     */
    private getPlayerBySocketId(socketId: string): Player | null {
        if (socketId === this.hostSocketId) {
            return this.hostPlayer;
        } else if (socketId === this.guestSocketId) {
            return this.guestPlayer;
        }
        return null;
    }

    /**
     * Retourne l'adversaire du joueur correspondant au socketId
     */
    private getOpponentBySocketId(socketId: string): Player | null {
        if (socketId === this.hostSocketId) {
            return this.guestPlayer;
        } else if (socketId === this.guestSocketId) {
            return this.hostPlayer;
        }
        return null;
    }

    /**
     * Retourne le socketId de l'adversaire
     */
    public getOpponentSocketId(socketId: string): string | null {
        if (socketId === this.hostSocketId) {
            return this.guestSocketId;
        } else if (socketId === this.guestSocketId) {
            return this.hostSocketId;
        }
        return null;
    }

    /**
     * Change le tour au joueur suivant
     */
    private switchTurn(): void {
        if (this.currentPlayer === this.hostPlayer) {
            this.currentPlayer = this.guestPlayer;
        } else {
            this.currentPlayer = this.hostPlayer;
        }
    }

    /**
     * Retourne l'état interne du jeu (pour les tests)
     * @internal
     */
    public getState() {
        return {
            roomId: this.id,
            host: {
                socketId: this.hostSocketId,
                board: this.hostPlayer.getBoard(),
            },
            guest: {
                socketId: this.guestSocketId,
                board: this.guestPlayer.getBoard(),
            },
            status: this.status,
            winner: this.winner,
        };
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
}
