/**
 * Swagger/OpenAPI definitions for Auth module
 */
export const authSwaggerDefinition = {
    tags: [
        {
            name: 'Auth',
            description: 'Authentication endpoints for user registration and login',
        },
    ],
    schemas: {
        User: {
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    format: 'uuid',
                },
                email: {
                    type: 'string',
                    format: 'email',
                },
                username: {
                    type: 'string',
                },
            },
        },
    },
};
