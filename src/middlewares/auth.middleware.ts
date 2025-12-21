import {NextFunction, Request, Response} from 'express';
import jwt from 'jsonwebtoken';
import {env} from "../env";
import {JwtPayload} from "../types/auth.type";

/**
 * Middleware d'authentification JWT.
 *
 * @param req - Requête Express
 * @param res - Réponse Express
 * @param next - Fonction next du middleware
 *
 * @remarks
 * Vérifie le token JWT dans le header Authorization (format: Bearer token).
 * Injecte les données utilisateur (userId, email) dans req.user si valide.
 */
export const authenticateToken = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            res.status(401).json({error: 'Unauthorized', message: 'No token provided'});
            return;
        }

        req.user = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
        next();
    } catch (error) {
        res.status(403).json({error: 'Forbidden', message: 'Invalid or expired token'});
    }
};