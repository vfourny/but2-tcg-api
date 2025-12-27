import type {PlayerBoard} from "./player.type";

/**
 * Statut de la partie
 */
export enum GameStatus {
    WAITING = 'waiting',
    PLAYING = 'playing',
    FINISHED = 'finished',
}

/**
 * État complet du jeu
 */
export interface GameState {
    /** ID de la room */
    roomId: string;
    /** Board de l'hôte (host) */
    host: { board: PlayerBoard, socketId: string };
    guest: { board: PlayerBoard, socketId: string };
    /** Statut de la partie */
    status: GameStatus;
    /** ID du gagnant (si la partie est terminée) */
    winner?: string;
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
