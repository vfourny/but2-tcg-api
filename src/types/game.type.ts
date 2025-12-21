import type {Game} from "../models/game.model";
import type {PlayerBoard} from "./player.type";

/**
 * Tour du joueur
 */
export enum TurnState {
    HOST = 'host',
    GUEST = 'guest',
}

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
    /** Tour du joueur (HOST ou GUEST) */
    currentTurn: TurnState;
    /** Statut de la partie */
    status: GameStatus;
    /** ID du gagnant (si la partie est terminée) */
    winner?: string;
}

/**
 * Room d'attente pour le matchmaking
 * @deprecated Use Game class directly (Game now handles matchmaking)
 */
export interface Room {
    /** ID unique de la room */
    id: string;
    /** ID du socket de l'hôte */
    host: { socketId: string, deckId: string };
    guest: { socketId: string | null, deckId: string | null };
    /** Instance du jeu (null tant que la partie n'a pas commencé) */
    game: Game | null;
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
