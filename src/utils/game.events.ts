/**
 * Système d'événements structurés pour le jeu
 * Permet à Game de retourner des événements à émettre via Socket.io
 */

export type EventTarget = 'host' | 'guest' | 'both';

export interface GameEvent {
    /** Destinataire de l'événement */
    target: EventTarget;
    /** Type d'événement Socket.io */
    type: string;
    /** Données à envoyer */
    data: any;
}

export interface GameEventBatch {
    /** Liste des événements à émettre */
    events: GameEvent[];
}

/**
 * Helper pour créer un événement d'erreur
 */
export function createErrorEvent(target: EventTarget, message: string): GameEvent {
    return {
        target,
        type: 'error',
        data: { message },
    };
}

/**
 * Helper pour créer un événement de mise à jour d'état
 */
export function createStateUpdateEvent(
    target: EventTarget,
    message: string,
    gameState: any
): GameEvent {
    return {
        target,
        type: 'gameStateUpdated',
        data: { message, gameState },
    };
}

/**
 * Helper pour créer un événement de fin de partie
 */
export function createGameEndedEvent(winner: string, message: string): GameEvent {
    return {
        target: 'both',
        type: 'gameEnded',
        data: { winner, message },
    };
}
