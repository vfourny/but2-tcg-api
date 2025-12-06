/**
 * Swagger/OpenAPI definitions for Deck module
 */
export const deckSwaggerDefinition = {
    tags: [
        {
            name: 'Decks',
            description: 'Deck management endpoints (requires authentication)',
        },
    ],
    schemas: {
        DeckCard: {
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    format: 'uuid',
                },
                deckId: {
                    type: 'string',
                    format: 'uuid',
                },
                cardId: {
                    type: 'string',
                    format: 'uuid',
                },
            },
        },
        Deck: {
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    format: 'uuid',
                },
                userId: {
                    type: 'string',
                    format: 'uuid',
                },
                name: {
                    type: 'string',
                    example: 'Fire Deck',
                },
                cards: {
                    type: 'array',
                    items: {
                        $ref: '#/components/schemas/DeckCard',
                    },
                },
            },
        },
    },
};
