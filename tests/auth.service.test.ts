import {beforeEach, describe, expect, it, vi} from 'vitest';
import {mockDeep, mockReset} from 'vitest-mock-extended';
import {PrismaClient} from '../src/generated/prisma/client';
import type {Request, Response} from 'express';
import {prisma} from '../src/config/database';
import {signIn, signUp} from '../src/modules/auth/auth.service';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock Prisma AVANT d'importer le service
vi.mock('../src/config/database', () => ({
    prisma: mockDeep<PrismaClient>(),
}));

// Mock bcrypt
vi.mock('bcryptjs', () => ({
    default: {
        hash: vi.fn(),
        compare: vi.fn(),
    },
}));

// Mock jsonwebtoken
vi.mock('jsonwebtoken', () => ({
    default: {
        sign: vi.fn(),
    },
}));

// Mock env
vi.mock('../src/config/env', () => ({
    env: {
        JWT_SECRET: 'test-secret',
    },
}));

const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('Auth Service', () => {
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
        };
        res = {
            status: statusMock,
            json: jsonMock,
        };
    });

    describe('signUp', () => {
        it('should create a new user and return a token', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                username: 'testuser',
                password: 'hashed-password',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            req.body = {
                email: 'test@example.com',
                password: 'password123',
                username: 'testuser',
            };

            prismaMock.user.findFirst.mockResolvedValue(null);
            prismaMock.user.create.mockResolvedValue(mockUser);
            vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
            vi.mocked(jwt.sign).mockReturnValue('mock-token' as never);

            await signUp(req as Request, res as Response);

            expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
                where: {
                    OR: [{email: 'test@example.com'}, {username: 'testuser'}],
                },
            });
            expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
            expect(prismaMock.user.create).toHaveBeenCalledWith({
                data: {
                    email: 'test@example.com',
                    password: 'hashed-password',
                    username: 'testuser',
                },
            });
            expect(statusMock).toHaveBeenCalledWith(201);
            expect(jsonMock).toHaveBeenCalledWith({
                token: 'mock-token',
                user: {
                    id: 'user-123',
                    email: 'test@example.com',
                    username: 'testuser',
                },
            });
        });

        it('should return 400 if required fields are missing', async () => {
            req.body = {
                email: 'test@example.com',
                // missing password and username
            };

            await signUp(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Bad Request',
                message: 'All fields are required',
            });
        });

        it('should return 409 if user with email already exists', async () => {
            const existingUser = {
                id: 'existing-user',
                email: 'test@example.com',
                username: 'existinguser',
                password: 'hashed',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            req.body = {
                email: 'test@example.com',
                password: 'password123',
                username: 'newuser',
            };

            prismaMock.user.findFirst.mockResolvedValue(existingUser);

            await signUp(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(409);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Conflict',
                message: 'User with this email or username already exists',
            });
        });

        it('should return 409 if user with username already exists', async () => {
            const existingUser = {
                id: 'existing-user',
                email: 'other@example.com',
                username: 'testuser',
                password: 'hashed',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            req.body = {
                email: 'test@example.com',
                password: 'password123',
                username: 'testuser',
            };

            prismaMock.user.findFirst.mockResolvedValue(existingUser);

            await signUp(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(409);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Conflict',
                message: 'User with this email or username already exists',
            });
        });

        it('should return 500 if database error occurs', async () => {
            req.body = {
                email: 'test@example.com',
                password: 'password123',
                username: 'testuser',
            };

            prismaMock.user.findFirst.mockRejectedValue(new Error('Database error'));

            await signUp(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Internal Server Error',
                message: 'Failed to sign up user',
            });
        });
    });

    describe('signIn', () => {
        it('should authenticate user and return a token', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                username: 'testuser',
                password: 'hashed-password',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            req.body = {
                email: 'test@example.com',
                password: 'password123',
            };

            prismaMock.user.findUnique.mockResolvedValue(mockUser);
            vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
            vi.mocked(jwt.sign).mockReturnValue('mock-token' as never);

            await signIn(req as Request, res as Response);

            expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
                where: {email: 'test@example.com'},
            });
            expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password');
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                token: 'mock-token',
                user: {
                    id: 'user-123',
                    email: 'test@example.com',
                    username: 'testuser',
                },
            });
        });

        it('should return 400 if email is missing', async () => {
            req.body = {
                password: 'password123',
            };

            await signIn(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Bad Request',
                message: 'Email and password are required',
            });
        });

        it('should return 400 if password is missing', async () => {
            req.body = {
                email: 'test@example.com',
            };

            await signIn(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Bad Request',
                message: 'Email and password are required',
            });
        });

        it('should return 401 if user does not exist', async () => {
            req.body = {
                email: 'nonexistent@example.com',
                password: 'password123',
            };

            prismaMock.user.findUnique.mockResolvedValue(null);

            await signIn(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Unauthorized',
                message: 'Invalid credentials',
            });
        });

        it('should return 401 if password is incorrect', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                username: 'testuser',
                password: 'hashed-password',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            req.body = {
                email: 'test@example.com',
                password: 'wrongpassword',
            };

            prismaMock.user.findUnique.mockResolvedValue(mockUser);
            vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

            await signIn(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Unauthorized',
                message: 'Invalid credentials',
            });
        });

        it('should return 500 if database error occurs', async () => {
            req.body = {
                email: 'test@example.com',
                password: 'password123',
            };

            prismaMock.user.findUnique.mockRejectedValue(new Error('Database error'));

            await signIn(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Internal Server Error',
                message: 'Failed to sign in',
            });
        });
    });
});
