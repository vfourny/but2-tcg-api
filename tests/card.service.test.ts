import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { PrismaClient, PokemonType } from '../src/generated/prisma/client';
import type { Request, Response } from 'express';

// Mock Prisma AVANT d'importer le service
vi.mock('../src/database', () => ({
  prisma: mockDeep<PrismaClient>(),
}));

import { prisma } from '../src/database';
import { listCards } from '../src/controllers/card.controller';

const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('Card Service', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockReset(prismaMock);
    vi.clearAllMocks();

    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    req = {};
    res = {
      status: statusMock,
      json: jsonMock,
    };
  });

  describe('listCards', () => {
    it('should return all cards sorted by pokedex number', async () => {
      const mockCards = [
        {
          id: 'card-1',
          name: 'Bulbasaur',
          pokedexNumber: 1,
          type: PokemonType.Grass,
          hp: 45,
          attack: 49,
          defense: 49,
          imageUrl: 'https://example.com/bulbasaur.png',
        },
        {
          id: 'card-2',
          name: 'Ivysaur',
          pokedexNumber: 2,
          type: PokemonType.Grass,
          hp: 60,
          attack: 62,
          defense: 63,
          imageUrl: 'https://example.com/ivysaur.png',
        },
        {
          id: 'card-3',
          name: 'Venusaur',
          pokedexNumber: 3,
          type: PokemonType.Grass,
          hp: 80,
          attack: 82,
          defense: 83,
          imageUrl: 'https://example.com/venusaur.png',
        },
      ];

      prismaMock.card.findMany.mockResolvedValue(mockCards);

      await listCards(req as Request, res as Response);

      expect(prismaMock.card.findMany).toHaveBeenCalledWith({
        orderBy: {
          pokedexNumber: 'asc',
        },
      });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockCards);
    });

    it('should return empty array if no cards exist', async () => {
      prismaMock.card.findMany.mockResolvedValue([]);

      await listCards(req as Request, res as Response);

      expect(prismaMock.card.findMany).toHaveBeenCalledWith({
        orderBy: {
          pokedexNumber: 'asc',
        },
      });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith([]);
    });

    it('should return 500 if database error occurs', async () => {
      prismaMock.card.findMany.mockRejectedValue(new Error('Database connection failed'));

      await listCards(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Failed to fetch cards',
      });
    });

    it('should handle large number of cards', async () => {
      const mockCards = Array.from({ length: 151 }, (_, i) => ({
        id: `card-${i + 1}`,
        name: `Pokemon ${i + 1}`,
        pokedexNumber: i + 1,
        type: PokemonType.Normal,
        hp: 50 + i,
        attack: 50 + i,
        defense: 50 + i,
        imageUrl: `https://example.com/pokemon-${i + 1}.png`,
      }));

      prismaMock.card.findMany.mockResolvedValue(mockCards);

      await listCards(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockCards);
      expect(mockCards).toHaveLength(151);
    });
  });
});
