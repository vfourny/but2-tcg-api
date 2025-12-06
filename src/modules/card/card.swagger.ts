/**
 * Swagger/OpenAPI definitions for Card module
 */
export const cardSwaggerDefinition = {
    tags: [
        {
            name: 'Cards',
            description: 'Card catalog endpoints',
        },
    ],
    schemas: {
        Card: {
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    format: 'uuid',
                },
                name: {
                    type: 'string',
                    example: 'Pikachu',
                },
                pokedexNumber: {
                    type: 'integer',
                    example: 25,
                },
                type: {
                    type: 'string',
                    enum: [
                        'NORMAL', 'FIRE', 'WATER', 'ELECTRIC', 'GRASS',
                        'ICE', 'FIGHTING', 'POISON', 'GROUND', 'FLYING',
                        'PSYCHIC', 'BUG', 'ROCK', 'GHOST', 'DRAGON',
                        'DARK', 'STEEL', 'FAIRY'
                    ],
                    example: 'ELECTRIC',
                },
                hp: {
                    type: 'integer',
                    example: 60,
                },
                attack: {
                    type: 'integer',
                    example: 55,
                },
                imageUrl: {
                    type: 'string',
                    format: 'uri',
                },
            },
        },
    },
};
