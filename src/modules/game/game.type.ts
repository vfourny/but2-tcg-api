import { Card } from "../../generated/prisma/client";
import type { GameService } from "./game.service";

/**
 * Carte dans le jeu avec son état
 */
export interface GameCard extends Card {
    /** Points de vie actuels (peut être inférieur au HP max) */
    currentHp: number;
}

/**
 * État du board d'un joueur
 */
export interface PlayerBoard {
    /** Carte Pokemon active sur le board */
    activeCard: GameCard | null;
    /** Main du joueur (5 cartes max) */
    hand: Card[];
    /** Deck du joueur (cartes restantes à piocher) */
    deck: Card[];
    /** Score (nombre de Pokemons adverses vaincus) */
    score: number;
}

/**
 * État complet du jeu
 */
export interface GameState {
    /** ID de la room */
    roomId: string;
    /** Board de l'hôte (host) */
    host: PlayerBoard;
    /** Board de l'invité (guest) */
    guest: PlayerBoard;
    /** ID du socket du joueur dont c'est le tour */
    currentTurn: string;
    /** ID du socket de l'hôte */
    hostSocketId: string;
    /** ID du socket de l'invité */
    guestSocketId: string;
    /** Statut de la partie */
    status: 'waiting' | 'playing' | 'finished';
    /** ID du gagnant (si la partie est terminée) */
    winner?: string;
}

/**
 * Room d'attente pour le matchmaking
 */
export interface Room {
    /** ID unique de la room */
    id: string;
    /** ID du socket de l'hôte */
    hostSocketId: string;
    /** ID du deck de l'hôte */
    hostDeckId: string;
    /** ID du socket de l'invité (null si pas encore rejoint) */
    guestSocketId: string | null;
    /** ID du deck de l'invité (null si pas encore rejoint) */
    guestDeckId: string | null;
    /** Instance du jeu (null tant que la partie n'a pas commencé) */
    game: GameService | null;
}

/**
 * Événement: créer une room
 */
export interface CreateRoomEvent {
    /** ID du deck à utiliser */
    deckId: string;
}

/**
 * Événement: rejoindre une room
 */
export interface JoinRoomEvent {
    /** ID de la room à rejoindre */
    roomId: string;
    /** ID du deck à utiliser */
    deckId: string;
}

/**
 * Événement: piocher des cartes
 */
export interface DrawCardsEvent {
    /** ID de la room */
    roomId: string;
}

/**
 * Événement: jouer une carte
 */
export interface PlayCardEvent {
    /** ID de la room */
    roomId: string;
    /** Index de la carte dans la main (0-4) */
    cardIndex: number;
}

/**
 * Événement: attaquer
 */
export interface AttackEvent {
    /** ID de la room */
    roomId: string;
}
