/**
 * Corps de la requête d'inscription.
 */
export interface SignUpRequestBody {
    email: string;
    password: string;
    username: string;
}

/**
 * Corps de la réponse d'inscription.
 */
export interface SignUpResponseBody {
    token: string;
    user: {
        id: string;
        email: string;
        username: string;
    };
}

/**
 * Corps de la requête de connexion.
 */
export interface SignInRequestBody {
    email: string;
    password: string;
}

/**
 * Corps de la réponse de connexion.
 */
export interface SignInResponseBody {
    token: string;
    user: {
        id: string;
        email: string;
        username: string;
    };
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
