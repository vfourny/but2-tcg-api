import type {Card} from "../generated/prisma/client";
import type {GameCard} from "../types/player.type";
import {calculateDamage} from "../utils/rules.util";

/**
 * Représente un joueur dans une partie
 * Contient l'état du joueur (main, deck, carte active, score) et la logique métier
 * Pure classe métier sans couplage à Socket.io
 */
export class Player {
    private hand: Card[] = [];
    private deck: Card[];
    private activeCard: GameCard | null = null;
    private score: 0 | 1 | 2 | 3 = 0;

    constructor(deck: Card[]) {
        // Mélanger le deck
        this.deck = [...deck].sort(() => Math.random() - 0.5);
    }

    /**
     * Pioche des cartes jusqu'à remplir la main (5 cartes max)
     */
    public drawCards(): { success: boolean; message: string } {
        // Piocher jusqu'à avoir 5 cartes en main
        while (this.hand.length < 5 && this.deck.length > 0) {
            const card = this.deck.pop();
            if (card) {
                this.hand.push(card);
            }
        }

        return {success: true, message: `Vous avez maintenant ${this.hand.length} cartes en main`};
    }

    /**
     * Joue une carte de la main sur le board
     */
    public playCard(cardIndex: number): { success: boolean; message: string } {
        // Vérifier que l'index est valide
        if (cardIndex < 0 || cardIndex >= this.hand.length) {
            return {success: false, message: "Index de carte invalide"};
        }

        // Vérifier qu'il n'y a pas déjà une carte active
        if (this.activeCard !== null) {
            return {success: false, message: "Vous avez déjà une carte active sur le board"};
        }

        // Retirer la carte de la main et la placer sur le board
        const card = this.hand.splice(cardIndex, 1)[0];
        this.activeCard = {
            ...card,
            currentHp: card.hp,
        };

        return {success: true, message: `${card.name} a été placé sur le board !`};
    }

    /**
     * Attaque le Pokemon adverse
     * @param opponent Le joueur adverse
     */
    public attack(opponent: Player): {
        success: boolean;
        message: string;
        cardDefeated?: boolean;
        gameWon?: boolean;
    } {
        // Vérifier que l'attaquant a une carte active
        if (!this.activeCard) {
            return {success: false, message: "Vous n'avez pas de carte active pour attaquer"};
        }

        // Vérifier que le défenseur a une carte active
        if (!opponent.activeCard) {
            return {success: false, message: "L'adversaire n'a pas de carte active à attaquer"};
        }

        // Calculer les dégâts
        const damage = calculateDamage(
            this.activeCard.attack,
            this.activeCard.type,
            opponent.activeCard.defense,
            opponent.activeCard.type
        );

        // Appliquer les dégâts
        opponent.activeCard.currentHp -= damage;

        const isDefeated = opponent.activeCard.currentHp <= 0;
        let message = `${this.activeCard.name} attaque ${opponent.activeCard.name} et inflige ${damage} dégâts !`;

        // Si la carte adverse est KO
        if (isDefeated) {
            const defeatedCardName = opponent.activeCard.name;
            opponent.activeCard = null;
            this.score += 1;

            message += ` ${defeatedCardName} est K.O. ! Vous gagnez 1 point.`;

            // Vérifier si le joueur a gagné (3 points)
            if (this.score >= 3) {
                return {
                    success: true,
                    message: message + " Vous avez gagné la partie !",
                    cardDefeated: true,
                    gameWon: true,
                };
            }
        }

        return {
            success: true,
            message,
            cardDefeated: isDefeated,
            gameWon: false,
        };
    }

    /**
     * Retourne l'état du joueur pour l'affichage
     */
    public getBoard() {
        return {
            activeCard: this.activeCard,
            hand: this.hand,
            deck: this.deck,
            score: this.score,
        };
    }

    /**
     * Retourne l'état du joueur formaté pour lui-même
     */
    public getOwnState() {
        return {
            activeCard: this.activeCard,
            hand: this.hand,
            deckCount: this.deck.length,
            score: this.score,
        };
    }

    /**
     * Retourne l'état du joueur formaté pour l'adversaire
     * (cache la main et le deck)
     */
    public getOpponentState() {
        return {
            activeCard: this.activeCard,
            handCount: this.hand.length,
            deckCount: this.deck.length,
            score: this.score,
        };
    }

    /**
     * Définit le deck du joueur (pour les tests)
     * @internal
     */
    public setDeck(cards: Card[]): void {
        this.deck = cards;
    }

    /**
     * Définit la carte active (pour les tests)
     * @internal
     */
    public setActiveCard(card: GameCard | null): void {
        this.activeCard = card;
    }

    /**
     * Définit le score (pour les tests)
     * @internal
     */
    public setScore(score: 0 | 1 | 2 | 3): void {
        this.score = score;
    }
}
