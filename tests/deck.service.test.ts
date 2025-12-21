import {beforeEach, describe, expect, it, vi} from 'vitest';
import {mockDeep, mockReset} from 'vitest-mock-extended';
import {PrismaClient} from '../src/generated/prisma/client';
import type {Request, Response} from 'express';
import {prisma} from '../src/database';
import {createDeck, deleteDeck, getDeckById, getUserDecks, updateDeck} from '../src/controllers/deck.controller';

// Mock Prisma AVANT d'importer le service
vi.mock('../src/database', () => ({
    prisma: mockDeep<PrismaClient>(),
}));

const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('Deck Service', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let jsonMock: ReturnType<typeof vi.fn>;
    let statusMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockReset(prismaMock);
        vi.clearAllMocks();

        jsonMock = vi.fn();
        statusMock = vi.fn().mockReturnValue({json: jsonMock});

        req = {
            body: {},
            params: {},
            user: {
                userId: 'user-123',
                email: 'test@example.com',
            },
        };
        res = {
            status: statusMock,
            json: jsonMock,
        };
    });

    describe('createDeck', () => {
        it('should create a new deck with 20 cards', async () => {
            const cardIds = Array.from({length: 20}, (_, i) => `card-${i + 1}`);
            const mockDeck = {
                id: 'deck-123',
                name: 'My Deck',
                userId: 'user-123',
                createdAt: new Date(),
                updatedAt: new Date(),
                cards: cardIds.map((cardId) => ({
                    id: `deck-card-${cardId}`,
                    deckId: 'deck-123',
                    cardId,
                })),
            };

            req.body = {
                name: 'My Deck',
                cards: cardIds,
            };

            prismaMock.card.count.mockResolvedValue(20);
            prismaMock.deck.create.mockResolvedValue(mockDeck as any);

            await createDeck(req as Request, res as Response);

            expect(prismaMock.card.count).toHaveBeenCalledWith({
                where: {
                    id: {in: cardIds},
                },
            });
            expect(prismaMock.deck.create).toHaveBeenCalledWith({
                data: {
                    userId: 'user-123',
                    name: 'My Deck',
                    cards: {
                        create: cardIds.map((cardId) => ({cardId})),
                    },
                },
                include: {
                    cards: true,
                },
            });
            expect(statusMock).toHaveBeenCalledWith(201);
            expect(jsonMock).toHaveBeenCalledWith(mockDeck);
        });

        it('should return 400 if name is missing', async () => {
            req.body = {
                cards: Array.from({length: 20}, (_, i) => `card-${i + 1}`),
            };

            await createDeck(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Bad Request',
                message: 'Name and cards are required',
            });
        });

        it('should return 400 if cards are missing', async () => {
            req.body = {
                name: 'My Deck',
            };

            await createDeck(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Bad Request',
                message: 'Name and cards are required',
            });
        });

        it('should return 400 if deck has less than 20 cards', async () => {
            req.body = {
                name: 'My Deck',
                cards: Array.from({length: 10}, (_, i) => `card-${i + 1}`),
            };

            await createDeck(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Bad Request',
                message: 'Deck must contain exactly 20 cards',
            });
        });

        it('should return 400 if deck has more than 20 cards', async () => {
            req.body = {
                name: 'My Deck',
                cards: Array.from({length: 25}, (_, i) => `card-${i + 1}`),
            };

            await createDeck(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Bad Request',
                message: 'Deck must contain exactly 20 cards',
            });
        });

        it('should return 400 if cards array is not an array', async () => {
            req.body = {
                name: 'My Deck',
                cards: 'not-an-array',
            };

            await createDeck(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Bad Request',
                message: 'Deck must contain exactly 20 cards',
            });
        });

        it('should return 400 if some card IDs are invalid', async () => {
            const cardIds = Array.from({length: 20}, (_, i) => `card-${i + 1}`);
            req.body = {
                name: 'My Deck',
                cards: cardIds,
            };

            prismaMock.card.count.mockResolvedValue(15); // Only 15 valid cards

            await createDeck(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Bad Request',
                message: 'Invalid card IDs in deck',
            });
        });

        it('should return 500 if database error occurs', async () => {
            const cardIds = Array.from({length: 20}, (_, i) => `card-${i + 1}`);
            req.body = {
                name: 'My Deck',
                cards: cardIds,
            };

            prismaMock.card.count.mockRejectedValue(new Error('Database error'));

            await createDeck(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Internal Server Error',
                message: 'Failed to create deck',
            });
        });
    });

    describe('getUserDecks', () => {
        it('should return all decks for authenticated user', async () => {
            const mockDecks = [
                {
                    id: 'deck-1',
                    name: 'Deck 1',
                    userId: 'user-123',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    cards: [],
                },
                {
                    id: 'deck-2',
                    name: 'Deck 2',
                    userId: 'user-123',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    cards: [],
                },
            ];

            prismaMock.deck.findMany.mockResolvedValue(mockDecks as any);

            await getUserDecks(req as Request, res as Response);

            expect(prismaMock.deck.findMany).toHaveBeenCalledWith({
                where: {userId: 'user-123'},
                include: {
                    cards: true,
                },
            });
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(mockDecks);
        });

        it('should return empty array if user has no decks', async () => {
            prismaMock.deck.findMany.mockResolvedValue([]);

            await getUserDecks(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith([]);
        });

        it('should return 500 if database error occurs', async () => {
            prismaMock.deck.findMany.mockRejectedValue(new Error('Database error'));

            await getUserDecks(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Internal Server Error',
                message: 'Failed to fetch decks',
            });
        });
    });

    describe('getDeckById', () => {
        it('should return deck by id', async () => {
            const mockDeck = {
                id: 'deck-123',
                name: 'My Deck',
                userId: 'user-123',
                createdAt: new Date(),
                updatedAt: new Date(),
                cards: [],
            };

            req.params = {id: 'deck-123'};
            prismaMock.deck.findUnique.mockResolvedValue(mockDeck as any);

            await getDeckById(req as Request, res as Response);

            expect(prismaMock.deck.findUnique).toHaveBeenCalledWith({
                where: {id: 'deck-123'},
                include: {
                    cards: true,
                },
            });
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(mockDeck);
        });

        it('should return 404 if deck not found', async () => {
            req.params = {id: 'non-existent-deck'};
            prismaMock.deck.findUnique.mockResolvedValue(null);

            await getDeckById(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Not Found',
                message: 'Deck not found',
            });
        });

        it('should return 500 if database error occurs', async () => {
            req.params = {id: 'deck-123'};
            prismaMock.deck.findUnique.mockRejectedValue(new Error('Database error'));

            await getDeckById(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Internal Server Error',
                message: 'Failed to fetch deck',
            });
        });
    });

    describe('updateDeck', () => {
        it('should update deck name', async () => {
            const existingDeck = {
                id: 'deck-123',
                name: 'Old Name',
                userId: 'user-123',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const updatedDeck = {
                ...existingDeck,
                name: 'New Name',
                cards: [],
            };

            req.params = {id: 'deck-123'};
            req.body = {name: 'New Name'};

            prismaMock.deck.findUnique.mockResolvedValue(existingDeck);
            prismaMock.deck.update.mockResolvedValue(updatedDeck as any);

            await updateDeck(req as Request, res as Response);

            expect(prismaMock.deck.findUnique).toHaveBeenCalledWith({
                where: {id: 'deck-123'},
            });
            expect(prismaMock.deck.update).toHaveBeenCalledWith({
                where: {id: 'deck-123'},
                data: {name: 'New Name'},
                include: {cards: true},
            });
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(updatedDeck);
        });

        it('should update deck cards', async () => {
            const existingDeck = {
                id: 'deck-123',
                name: 'My Deck',
                userId: 'user-123',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const newCardIds = Array.from({length: 20}, (_, i) => `new-card-${i + 1}`);
            const updatedDeck = {
                ...existingDeck,
                cards: newCardIds.map((cardId) => ({
                    id: `deck-card-${cardId}`,
                    deckId: 'deck-123',
                    cardId,
                })),
            };

            req.params = {id: 'deck-123'};
            req.body = {cards: newCardIds};

            prismaMock.deck.findUnique.mockResolvedValue(existingDeck);
            prismaMock.card.count.mockResolvedValue(20);
            prismaMock.deckCard.deleteMany.mockResolvedValue({count: 20});
            prismaMock.deckCard.createMany.mockResolvedValue({count: 20});
            prismaMock.deck.update.mockResolvedValue(updatedDeck as any);

            await updateDeck(req as Request, res as Response);

            expect(prismaMock.deckCard.deleteMany).toHaveBeenCalledWith({
                where: {deckId: 'deck-123'},
            });
            expect(prismaMock.deckCard.createMany).toHaveBeenCalledWith({
                data: newCardIds.map((cardId) => ({
                    deckId: 'deck-123',
                    cardId,
                })),
            });
            expect(statusMock).toHaveBeenCalledWith(200);
        });

        it('should return 404 if deck not found', async () => {
            req.params = {id: 'non-existent-deck'};
            req.body = {name: 'New Name'};

            prismaMock.deck.findUnique.mockResolvedValue(null);

            await updateDeck(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Not Found',
                message: 'Deck not found',
            });
        });

        it('should return 400 if cards are invalid', async () => {
            const existingDeck = {
                id: 'deck-123',
                name: 'My Deck',
                userId: 'user-123',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const invalidCardIds = Array.from({length: 20}, (_, i) => `invalid-card-${i + 1}`);

            req.params = {id: 'deck-123'};
            req.body = {cards: invalidCardIds};

            prismaMock.deck.findUnique.mockResolvedValue(existingDeck);
            prismaMock.card.count.mockResolvedValue(0); // No valid cards

            await updateDeck(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Bad Request',
                message: 'Invalid card IDs in deck',
            });
        });

        it('should return 500 if database error occurs', async () => {
            req.params = {id: 'deck-123'};
            req.body = {name: 'New Name'};

            prismaMock.deck.findUnique.mockRejectedValue(new Error('Database error'));

            await updateDeck(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Internal Server Error',
                message: 'Failed to update deck',
            });
        });
    });

    describe('deleteDeck', () => {
        it('should delete deck by id', async () => {
            const mockDeck = {
                id: 'deck-123',
                name: 'My Deck',
                userId: 'user-123',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            req.params = {id: 'deck-123'};

            prismaMock.deck.findUnique.mockResolvedValue(mockDeck);
            prismaMock.deck.delete.mockResolvedValue(mockDeck);

            await deleteDeck(req as Request, res as Response);

            expect(prismaMock.deck.findUnique).toHaveBeenCalledWith({
                where: {id: 'deck-123'},
            });
            expect(prismaMock.deck.delete).toHaveBeenCalledWith({
                where: {id: 'deck-123'},
            });
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({message: 'Deck deleted successfully'});
        });

        it('should return 404 if deck not found', async () => {
            req.params = {id: 'non-existent-deck'};
            prismaMock.deck.findUnique.mockResolvedValue(null);

            await deleteDeck(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Not Found',
                message: 'Deck not found',
            });
            expect(prismaMock.deck.delete).not.toHaveBeenCalled();
        });

        it('should return 500 if database error occurs', async () => {
            req.params = {id: 'deck-123'};
            prismaMock.deck.findUnique.mockRejectedValue(new Error('Database error'));

            await deleteDeck(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Internal Server Error',
                message: 'Failed to delete deck',
            });
        });
    });
});
