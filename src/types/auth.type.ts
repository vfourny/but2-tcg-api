import {Request} from 'express';

/**
 * Corps de la requête d'inscription.
 */
export interface SignUpRequestBody {
    email: string;
    password: string;
    username: string;
}

/**
 * Corps de la requête de connexion.
 */
export interface SignInRequestBody {
    email: string;
    password: string;
}

/**
 * Payload du token JWT.
 *
 * @remarks
 * Contient les informations utilisateur encodées dans le token.
 */
export type JwtPayload = {
    userId: string;
    email: string;
};

/**
 * Requête d'inscription étendue.
 */
export interface SignUpRequest extends Request<{}, any, SignUpRequestBody> {
}

/**
 * Requête de connexion étendue.
 */
export interface SignInRequest extends Request<{}, any, SignInRequestBody> {
}
