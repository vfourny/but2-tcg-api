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
    private readonly players: Map<string, Player>; // socketId -> Player
    private readonly socketIds: [string, string]; // [host, guest]
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
        this.socketIds = [hostSocketId, guestSocketId];

        const hostPlayer = new Player(hostDeck);
        const guestPlayer = new Player(guestDeck);

        this.players = new Map([
            [hostSocketId, hostPlayer],
            [guestSocketId, guestPlayer],
        ]);

        // Host commence toujours
        this.currentPlayer = hostPlayer;
    }

    /**
     * Pioche des cartes jusqu'à remplir la main (5 cartes max)
     */
    public drawCards(socketId: string): GameActionResult {
        const player = this.players.get(socketId);

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
        const player = this.players.get(socketId);

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
        const attacker = this.players.get(attackerSocketId);
        const defenderSocketId = this.getOpponentSocketId(attackerSocketId);
        const defender = defenderSocketId ? this.players.get(defenderSocketId) : null;

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
        const player = this.players.get(socketId);
        const opponentSocketId = this.getOpponentSocketId(socketId);
        const opponent = opponentSocketId ? this.players.get(opponentSocketId) : null;

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
        return this.players.has(socketId);
    }

    /**
     * Retourne les socketIds des deux joueurs
     */
    public getSocketIds(): { host: string; guest: string } {
        return {
            host: this.socketIds[0],
            guest: this.socketIds[1],
        };
    }

    /**
     * Retourne le socketId de l'adversaire
     */
    private getOpponentSocketId(socketId: string): string | null {
        if (socketId === this.socketIds[0]) {
            return this.socketIds[1];
        } else if (socketId === this.socketIds[1]) {
            return this.socketIds[0];
        }
        return null;
    }

    /**
     * Change le tour au joueur suivant
     */
    private switchTurn(): void {
        const currentSocketId = [...this.players.entries()].find(
            ([_, player]) => player === this.currentPlayer
        )?.[0];

        if (currentSocketId) {
            const opponentSocketId = this.getOpponentSocketId(currentSocketId);
            if (opponentSocketId) {
                const opponent = this.players.get(opponentSocketId);
                if (opponent) {
                    this.currentPlayer = opponent;
                }
            }
        }
    }

    /**
     * Retourne l'état interne du jeu (pour les tests)
     * @internal
     */
    public getState() {
        const hostPlayer = this.players.get(this.socketIds[0]);
        const guestPlayer = this.players.get(this.socketIds[1]);

        return {
            roomId: this.id,
            host: {
                socketId: this.socketIds[0],
                board: hostPlayer?.getBoard() || null,
            },
            guest: {
                socketId: this.socketIds[1],
                board: guestPlayer?.getBoard() || null,
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
