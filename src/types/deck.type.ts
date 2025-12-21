import {Request} from 'express';

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
 * Paramètres de suppression de deck.
 */
export interface DeleteDeckParams {
    /** ID du deck */
    id: string;
}

/**
 * Requête de création de deck étendue.
 */
export interface CreateDeckRequest extends Request<{}, any, CreateDeckRequestBody> {
}

/**
 * Requête de récupération de tous les decks de l'utilisateur étendue.
 */
export interface GetUserDecksRequest extends Request {
}

/**
 * Requête de récupération de deck par ID étendue.
 */
export interface GetDeckByIdRequest extends Request<GetDeckByIdParams> {
}

/**
 * Requête de mise à jour de deck étendue.
 */
export interface UpdateDeckRequest extends Request<UpdateDeckParams, any, UpdateDeckRequestBody> {
}

/**
 * Requête de suppression de deck étendue.
 */
export interface DeleteDeckRequest extends Request<DeleteDeckParams> {
}
