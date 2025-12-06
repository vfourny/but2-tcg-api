import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';
import { authSwaggerDefinition } from '../modules/auth/auth.swagger';
import { cardSwaggerDefinition } from '../modules/card/card.swagger';
import { deckSwaggerDefinition } from '../modules/deck/deck.swagger';

/**
 * Swagger/OpenAPI configuration for TCG API documentation
 */
const swaggerOptions: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Pokemon TCG API',
            version: '1.0.0',
            description: `
                Trading Card Game (TCG) backend server built with Express, TypeScript, and Prisma.
                Provides REST APIs for user authentication, card management, and deck building.
            `,
            contact: {
                name: 'API Support',
            },
            license: {
                name: 'MIT',
            },
        },
        servers: [
            {
                url: `http://localhost:${env.PORT}`,
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: `
**Test Credentials:**
- Email: \`red@example.com\` or \`blue@example.com\`
- Password: \`password123\`

**Quick Start:**
1. Call POST /api/auth/sign-in with test credentials
2. Copy the token from the response
3. Click "Authorize" and paste the token
4. Or use the GET /api/auth/demo endpoint to get a token directly
                    `,
                },
            },
            schemas: {
                // Common schemas used across modules
                Error: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string',
                            example: 'Bad Request',
                        },
                        message: {
                            type: 'string',
                            example: 'Validation error message',
                        },
                    },
                },
                // Module-specific schemas
                ...authSwaggerDefinition.schemas,
                ...cardSwaggerDefinition.schemas,
                ...deckSwaggerDefinition.schemas,
            },
        },
        tags: [
            ...authSwaggerDefinition.tags,
            ...cardSwaggerDefinition.tags,
            ...deckSwaggerDefinition.tags,
        ],
    },
    apis: ['./src/modules/**/*.service.ts', './src/modules/**/*.route.ts'],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
