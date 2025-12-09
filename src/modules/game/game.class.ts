import {Card} from "../../generated/prisma/client";
import {GameStatus, TurnState} from "./game.type";
import {Player} from "../player/player.class";

/**
 * Représente une partie de jeu
 * Contient les deux joueurs et l'état global du jeu
 */
export class Game {
    private readonly hostPlayer: Player;
    private readonly guestPlayer: Player;
    private readonly roomId: string;
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
        this.roomId = roomId;
        this.hostPlayer = new Player(hostSocketId, hostDeck);
        this.guestPlayer = new Player(guestSocketId, guestDeck);
    }

    /**
     * Pioche des cartes jusqu'à remplir la main (5 cartes max)
     */
    public drawCards(playerSocketId: string): { success: boolean; message: string } {
        const player = this.getPlayer(playerSocketId);

        if (!player) {
            return {success: false, message: "Joueur non trouvé"};
        }

        return player.drawCards();
    }

    /**
     * Joue une carte de la main sur le board
     */
    public playCard(playerSocketId: string, cardIndex: number): {
        success: boolean;
        message: string
    } {
        const player = this.getPlayer(playerSocketId);

        if (!player) {
            return {success: false, message: "Joueur non trouvé"};
        }

        // Vérifier que c'est le tour du joueur
        const playerTurn = this.getPlayerTurn(playerSocketId);
        if (this.currentTurn !== playerTurn) {
            return {success: false, message: "Ce n'est pas votre tour"};
        }

        return player.playCard(cardIndex);
    }

    /**
     * Attaque le Pokemon adverse
     */
    public attack(attackerSocketId: string): {
        success: boolean;
        message: string;
        cardDefeated?: boolean;
        gameWon?: boolean
    } {
        const attacker = this.getPlayer(attackerSocketId);
        const defender = this.getOpponent(attackerSocketId);

        if (!attacker || !defender) {
            return {success: false, message: "Erreur lors de la récupération des joueurs"};
        }

        // Vérifier que c'est le tour du joueur
        const playerTurn = this.getPlayerTurn(attackerSocketId);
        if (this.currentTurn !== playerTurn) {
            return {success: false, message: "Ce n'est pas votre tour"};
        }

        const result = attacker.attack(defender);

        // Si l'attaque a réussi et que la partie n'est pas gagnée, changer de tour
        if (result.success && !result.gameWon) {
            this.switchTurn();
        }

        // Si la partie est gagnée, mettre à jour le statut
        if (result.gameWon) {
            this.status = GameStatus.FINISHED;
            this.winner = attackerSocketId;
        }

        return result;
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
            roomId: this.roomId,
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
            roomId: this.roomId,
            host: {
                socketId: this.hostPlayer.getSocketId(),
                board: this.hostPlayer.getBoard(),
            },
            guest: {
                socketId: this.guestPlayer.getSocketId(),
                board: this.guestPlayer.getBoard(),
            },
            currentTurn: this.currentTurn,
            status: this.status,
            winner: this.winner,
        };
    }

    /**
     * Récupère une instance Player pour le joueur host
     */
    public getHostPlayer(): Player {
        return this.hostPlayer;
    }

    /**
     * Récupère une instance Player pour le joueur guest
     */
    public getGuestPlayer(): Player {
        return this.guestPlayer;
    }

    /**
     * Récupère une instance Player par son socketId
     */
    public getPlayer(socketId: string): Player | null {
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
        this.currentTurn = this.currentTurn === TurnState.HOST ? TurnState.GUEST : TurnState.HOST;
    }
}
