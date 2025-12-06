/**
 * Corps de la requête de création de deck.
 */
export interface CreateDeckRequestBody {
    /** Nom du deck */
    name: string;
    /** Liste de 20 IDs de cartes */
    cards: string[];
}

/**
 * Paramètres de récupération de deck par ID.
 */
export interface GetDeckByIdParams {
    /** ID du deck */
    id: string;
}

/**
 * Paramètres de mise à jour de deck.
 */
export interface UpdateDeckParams {
    /** ID du deck */
    id: string;
}

/**
 * Corps de la requête de mise à jour de deck.
 */
export interface UpdateDeckRequestBody {
    /** Nouveau nom du deck (optionnel) */
    name?: string;
    /** Nouvelle liste de 20 IDs de cartes (optionnel) */
    cards?: string[];
}

/**
 * Corps de la réponse de mise à jour de deck.
 */
export interface UpdateDeckResponseBody {
    id: string;
    name: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Paramètres de suppression de deck.
 */
export interface DeleteDeckParams {
    /** ID du deck */
    id: string;
}

/**
 * Corps de la réponse de suppression de deck.
 */
export interface DeleteDeckResponseBody {
    /** Message de confirmation */
    message: string;
}
