import {Card} from "../../generated/prisma/client";

/**
 * Carte dans le jeu avec son état
 */
export interface GameCard extends Card {
    currentHp: number;
}

/**
 * État du board d'un joueur
 */
export interface PlayerBoard {
    activeCard: GameCard | null;
    hand: Card[];
    deck: Card[];
    score: 0 | 1 | 2 | 3;
}
