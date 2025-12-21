import {Response} from 'express';
import {prisma} from "../database";
import {ListCardsRequest} from "../types/card.type";

/**
 * Récupère toutes les cartes disponibles.
 *
 * @param _req - Requête Express (non utilisée)
 * @param res - Réponse Express
 * @returns Liste de toutes les cartes triées par numéro Pokédex
 *
 * @remarks
 * Endpoint public (pas d'authentification requise).
 */
export const listCards = async (
    _req: ListCardsRequest,
    res: Response
): Promise<void> => {
    try {
        const cards = await prisma.card.findMany({
            orderBy: {
                pokedexNumber: 'asc'
            }
        });

        res.status(200).json(cards);
    } catch (error) {
        console.error("List cards error:", error);
        res.status(500).json({
            error: "Internal Server Error",
            message: "Failed to fetch cards"
        });
    }
};
