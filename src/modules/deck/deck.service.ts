import {Request, Response} from "express";
import {prisma} from "../../config";
import {
    CreateDeckRequestBody,
    DeleteDeckParams,
    DeleteDeckResponseBody,
    GetDeckByIdParams,
    UpdateDeckParams,
    UpdateDeckRequestBody,
    UpdateDeckResponseBody
} from "./deck.type";
import {DeckModel} from "../../generated/prisma/models/Deck";

/**
 * Valide qu'un deck contient exactement 20 cartes valides.
 *
 * @param cards - Liste des IDs de cartes à valider
 * @param res - Objet response Express pour envoyer les erreurs
 * @returns true si valide, false sinon
 */
const validateCards = async (cards: string[], res: Response): Promise<boolean> => {
    if (!Array.isArray(cards) || cards.length !== 20) {
        res.status(400).json({
            error: "Bad Request",
            message: "Deck must contain exactly 20 cards"
        });
        return false;
    }

    const validCardsCount = await prisma.card.count({
        where: {
            id: {in: cards}
        }
    });

    if (validCardsCount !== 20) {
        res.status(400).json({
            error: "Bad Request",
            message: "Invalid card IDs in deck"
        });
        return false;
    }

    return true;
};

/**
 * Récupère un deck par son ID ou envoie une erreur 404.
 *
 * @param id - ID du deck à rechercher
 * @param res - Objet response Express pour envoyer les erreurs
 * @returns Le deck trouvé ou null
 */
const findDeckOrFail = async (id: string, res: Response) => {
    const deck = await prisma.deck.findUnique({
        where: {id},
    });

    if (!deck) {
        res.status(404).json({
            error: "Not Found",
            message: "Deck not found"
        });
        return null;
    }

    return deck;
};

/**
 * Crée un nouveau deck pour l'utilisateur authentifié.
 *
 * @param req - Requête Express contenant name et cards (20 IDs de cartes)
 * @param res - Réponse Express
 * @returns Le deck créé avec ses cartes
 *
 * @remarks
 * Nécessite une authentification. Valide que les 20 IDs de cartes existent en base.
 */
export const createDeck = async (
    req: Request<{}, DeckModel, CreateDeckRequestBody>,
    res: Response
) => {
    try {
        const {name, cards} = req.body;
        const userId = req.user!.userId;

        if (!name || !cards) {
            res.status(400).json({
                error: "Bad Request",
                message: "Name and cards are required"
            });
            return;
        }

        const isValid = await validateCards(cards, res);
        if (!isValid) return;

        const deck = await prisma.deck.create({
            data: {
                userId,
                name,
                cards: {
                    create: cards.map((cardId) => ({cardId})),
                },
            },
            include: {
                cards: true,
            },
        });

        res.status(201).json(deck);
    } catch (error) {
        console.error("Create deck error:", error);
        res.status(500).json({
            error: "Internal Server Error",
            message: "Failed to create deck"
        });
    }
};

/**
 * Récupère tous les decks de l'utilisateur authentifié.
 *
 * @param req - Requête Express (userId extrait du JWT)
 * @param res - Réponse Express
 * @returns Liste des decks de l'utilisateur avec leurs cartes
 */
export const getUserDecks = async (
    req: Request<{}, DeckModel>,
    res: Response
) => {
    try {
        const userId = req.user!.userId;

        const decks = await prisma.deck.findMany({
            where: {userId},
            include: {
                cards: true,
            },
        });

        res.status(200).json(decks);
    } catch (error) {
        console.error("Get user decks error:", error);
        res.status(500).json({
            error: "Internal Server Error",
            message: "Failed to fetch decks"
        });
    }
};

/**
 * Récupère un deck spécifique par son ID.
 *
 * @param req - Requête Express contenant l'ID du deck dans params
 * @param res - Réponse Express
 * @returns Le deck avec ses cartes, ou erreur 404 si non trouvé
 */
export const getDeckById = async (
    req: Request<GetDeckByIdParams, DeckModel>,
    res: Response
) => {
    try {
        const {id} = req.params;

        const deck = await prisma.deck.findUnique({
            where: {id},
            include: {
                cards: true,
            },
        });

        if (!deck) {
            res.status(404).json({
                error: "Not Found",
                message: "Deck not found"
            });
            return;
        }

        res.status(200).json(deck);
    } catch (error) {
        console.error("Get deck by id error:", error);
        res.status(500).json({
            error: "Internal Server Error",
            message: "Failed to fetch deck"
        });
    }
};

/**
 * Met à jour le nom et/ou les cartes d'un deck.
 *
 * @param req - Requête Express contenant l'ID du deck et les données à mettre à jour
 * @param res - Réponse Express
 * @returns Le deck mis à jour avec ses cartes
 *
 * @remarks
 * Si des cartes sont fournies, elles doivent être exactement 20 IDs valides.
 * Les anciennes cartes sont entièrement remplacées si un tableau de cartes est fourni.
 */
export const updateDeck = async (
    req: Request<UpdateDeckParams, UpdateDeckResponseBody, UpdateDeckRequestBody>,
    res: Response
) => {
    try {
        const {id} = req.params;
        const {name, cards} = req.body;

        const deck = await findDeckOrFail(id, res);
        if (!deck) return;

        if (cards) {
            const isValid = await validateCards(cards, res);
            if (!isValid) return;

            await prisma.deckCard.deleteMany({
                where: {deckId: id},
            });

            await prisma.deckCard.createMany({
                data: cards.map((cardId) => ({
                    deckId: id,
                    cardId,
                })),
            });
        }

        const updatedDeck = await prisma.deck.update({
            where: {id},
            data: {
                ...(name && {name}),
            },
            include: {
                cards: true,
            },
        });

        res.status(200).json(updatedDeck);
    } catch (error) {
        console.error("Update deck error:", error);
        res.status(500).json({
            error: "Internal Server Error",
            message: "Failed to update deck"
        });
    }
};

/**
 * Supprime un deck par son ID.
 *
 * @param req - Requête Express contenant l'ID du deck dans params
 * @param res - Réponse Express
 * @returns Message de confirmation de suppression
 *
 * @remarks
 * Supprime définitivement le deck et toutes ses cartes associées (cascade).
 */
export const deleteDeck = async (
    req: Request<DeleteDeckParams, DeleteDeckResponseBody>,
    res: Response
) => {
    try {
        const {id} = req.params;

        // Vérifier que le deck existe
        const deck = await findDeckOrFail(id, res);
        if (!deck) return;

        await prisma.deck.delete({
            where: {id},
        });

        res.status(200).json({message: "Deck deleted successfully"});
    } catch (error) {
        console.error("Delete deck error:", error);
        res.status(500).json({
            error: "Internal Server Error",
            message: "Failed to delete deck"
        });
    }
};
