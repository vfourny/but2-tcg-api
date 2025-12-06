import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// Mock jsonwebtoken
vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}));

// Mock env
vi.mock('../src/config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret',
  },
}));

import { authenticateToken } from '../src/modules/auth/auth.middleware';
import jwt from 'jsonwebtoken';

describe('Auth Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    next = vi.fn();

    req = {
      headers: {},
      user: undefined,
    };
    res = {
      status: statusMock,
      json: jsonMock,
    };
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token and call next', () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      req.headers = {
        authorization: 'Bearer valid-token',
      };

      vi.mocked(jwt.verify).mockReturnValue(mockPayload as never);

      authenticateToken(req as Request, res as Response, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
      expect(req.user).toEqual(mockPayload);
      expect(next).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should return 401 if no authorization header is provided', () => {
      req.headers = {};

      authenticateToken(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'No token provided',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header has no token', () => {
      req.headers = {
        authorization: 'Bearer',
      };

      authenticateToken(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'No token provided',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header does not start with Bearer', () => {
      req.headers = {
        authorization: 'invalid-token',
      };

      authenticateToken(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'No token provided',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if token is invalid', () => {
      req.headers = {
        authorization: 'Bearer invalid-token',
      };

      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      authenticateToken(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Invalid or expired token',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if token is expired', () => {
      req.headers = {
        authorization: 'Bearer expired-token',
      };

      const expiredError = new Error('jwt expired');
      expiredError.name = 'TokenExpiredError';
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw expiredError;
      });

      authenticateToken(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Invalid or expired token',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle malformed JWT token', () => {
      req.headers = {
        authorization: 'Bearer malformed.token',
      };

      const malformedError = new Error('jwt malformed');
      malformedError.name = 'JsonWebTokenError';
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw malformedError;
      });

      authenticateToken(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Invalid or expired token',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
