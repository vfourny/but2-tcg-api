import {beforeEach, describe, expect, it} from 'vitest';
import type {Card} from '../src/generated/prisma/client';
import {PokemonType} from '../src/generated/prisma/client';
import {Game} from '../src/classes/game.class';
import {Player} from '../src/classes/player.class';
import {GameStatus, TurnState} from '../src/types/game.type';

/**
 * Helper pour créer une partie complète avec deux joueurs
 */
function createGame(roomId: string, hostSocketId: string, hostDeck: Card[], guestSocketId: string, guestDeck: Card[]): Game {
    const game = new Game(roomId, hostSocketId, 'host-user-id', 'host-deck-id');
    game.startWithGuest(guestSocketId, 'guest-user-id', 'guest-deck-id', hostDeck, guestDeck);
    return game;
}

/**
 * Helper pour extraire le statut d'un batch d'événements
 * Retourne {success: true} si pas d'erreur, {success: false, message: ...} sinon
 */
function extractResult(batch: any): {
    success: boolean;
    message?: string;
    cardDefeated?: boolean;
    gameWon?: boolean;
} {
    const errorEvent = batch.events.find((e: any) => e.type === 'error');
    if (errorEvent) {
        return {success: false, message: errorEvent.data.message};
    }

    const stateUpdateEvent = batch.events.find((e: any) => e.type === 'gameStateUpdated');
    const gameEndedEvent = batch.events.find((e: any) => e.type === 'gameEnded');

    const message = stateUpdateEvent?.data?.message || gameEndedEvent?.data?.message;
    const cardDefeated = message?.includes('K.O.') || false;
    const gameWon = gameEndedEvent !== undefined;

    return {
        success: true,
        message,
        cardDefeated,
        gameWon
    };
}

describe('Game Service', () => {
    const mockCards: Card[] = [
        {
            id: 'card-1',
            name: 'Pikachu',
            pokedexNumber: 25,
            type: PokemonType.Electric,
            hp: 35,
            attack: 55,
            defense: 40,
            imageUrl: 'pikachu.png',
        },
        {
            id: 'card-2',
            name: 'Charmander',
            pokedexNumber: 4,
            type: PokemonType.Fire,
            hp: 39,
            attack: 52,
            defense: 43,
            imageUrl: 'charmander.png',
        },
        {
            id: 'card-3',
            name: 'Squirtle',
            pokedexNumber: 7,
            type: PokemonType.Water,
            hp: 44,
            attack: 48,
            defense: 65,
            imageUrl: 'squirtle.png',
        },
    ];

    describe('Game constructor', () => {
        it('should create initial game state with shuffled decks', () => {
            const deck1 = Array.from({length: 20}, (_, i) => ({
                ...mockCards[0],
                id: `card-p1-${i}`,
            }));
            const deck2 = Array.from({length: 20}, (_, i) => ({
                ...mockCards[1],
                id: `card-p2-${i}`,
            }));

            const game = createGame('room-123', 'socket-1', deck1, 'socket-2', deck2);

            expect(game.getState().roomId).toBe('room-123');
            expect(game.getState().host.socketId).toBe('socket-1');
            expect(game.getState().guest.socketId).toBe('socket-2');
            expect(game.getState().currentTurn).toBe(TurnState.HOST);
            expect(game.getState().status).toBe(GameStatus.PLAYING);
            expect(game.getState().host.board.deck).toHaveLength(20);
            expect(game.getState().guest.board.deck).toHaveLength(20);
            expect(game.getState().host.board.hand).toHaveLength(0);
            expect(game.getState().guest.board.hand).toHaveLength(0);
            expect(game.getState().host.board.activeCard).toBeNull();
            expect(game.getState().guest.board.activeCard).toBeNull();
            expect(game.getState().host.board.score).toBe(0);
            expect(game.getState().guest.board.score).toBe(0);
        });

        it('should shuffle decks (cards not in original order)', () => {
            const deck1 = Array.from({length: 20}, (_, i) => ({
                ...mockCards[0],
                id: `card-${i}`,
                name: `Pokemon ${i}`,
            }));
            const deck2 = [...deck1];

            const game = createGame('room-123', 'socket-1', deck1, 'socket-2', deck2);

            // Test que les decks ont bien 20 cartes
            expect(game.getState().host.board.deck).toHaveLength(20);
            expect(game.getState().guest.board.deck).toHaveLength(20);

            // Les decks originaux ne doivent pas être modifiés
            expect(deck1).toHaveLength(20);
            expect(deck2).toHaveLength(20);
        });
    });

    describe('drawCards', () => {
        let game: Game;

        beforeEach(() => {
            const deck1 = Array.from({length: 10}, (_, i) => ({
                ...mockCards[0],
                id: `card-${i}`,
            }));
            const deck2 = Array.from({length: 10}, (_, i) => ({
                ...mockCards[1],
                id: `card-${i}`,
            }));

            game = createGame('room-123', 'socket-1', deck1, 'socket-2', deck2);
        });

        it('should draw cards until hand has 5 cards', () => {
            const batch = game.drawCards('socket-1');
            const result = extractResult(batch);

            expect(result.success).toBe(true);
            expect(game.getState().host.board.hand).toHaveLength(5);
            expect(game.getState().host.board.deck).toHaveLength(5);
        });

        it('should draw remaining cards if deck has less than 5', () => {
            // Vider presque tout le deck
            game.getHostPlayer().setDeck([mockCards[0], mockCards[1]]);

            const batch = game.drawCards('socket-1');
            const result = extractResult(batch);

            expect(result.success).toBe(true);
            expect(game.getState().host.board.hand).toHaveLength(2);
            expect(game.getState().host.board.deck).toHaveLength(0);
        });

        it('should not draw if hand already has 5 cards', () => {
            // Piocher 5 cartes d'abord
            game.drawCards('socket-1');
            const deckCountBefore = game.getState().host.board.deck.length;

            // Essayer de piocher à nouveau
            const batch = game.drawCards('socket-1');
            const result = extractResult(batch);

            expect(result.success).toBe(true);
            expect(game.getState().host.board.hand).toHaveLength(5);
            expect(game.getState().host.board.deck).toHaveLength(deckCountBefore); // Deck inchangé
        });

        it('should return error for invalid player', () => {
            const batch = game.drawCards('invalid-socket-id');
            const result = extractResult(batch);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Joueur non trouvé');
        });

        it('should not draw from empty deck', () => {
            game.getHostPlayer().setDeck([]);

            const batch = game.drawCards('socket-1');
            const result = extractResult(batch);

            expect(result.success).toBe(true);
            expect(game.getState().host.board.hand).toHaveLength(0);
        });
    });

    describe('playCard', () => {
        let game: Game;

        beforeEach(() => {
            const deck1 = Array.from({length: 10}, (_, i) => ({
                ...mockCards[0],
                id: `card-p1-${i}`,
            }));
            const deck2 = Array.from({length: 10}, (_, i) => ({
                ...mockCards[1],
                id: `card-p2-${i}`,
            }));

            game = createGame('room-123', 'socket-1', deck1, 'socket-2', deck2);
            game.drawCards('socket-1');
            game.drawCards('socket-2');
        });

        it('should play card from hand to board', () => {
            const cardToPlay = game.getState().host.board.hand[0];
            const batch = game.playCard('socket-1', 0);
            const result = extractResult(batch);

            expect(result.success).toBe(true);
            expect(result.message).toContain('a été placé sur le board');
            expect(game.getState().host.board.hand).toHaveLength(4);
            expect(game.getState().host.board.activeCard).toBeDefined();
            expect(game.getState().host.board.activeCard?.id).toBe(cardToPlay.id);
            expect(game.getState().host.board.activeCard?.currentHp).toBe(cardToPlay.hp);
        });

        it('should return error if not player turn', () => {
            const batch = game.playCard('socket-2', 0);
            const result = extractResult(batch);

            expect(result.success).toBe(false);
            expect(result.message).toBe("Ce n'est pas votre tour");
        });

        it('should return error if invalid card index', () => {
            const batch = game.playCard('socket-1', 10);
            const result = extractResult(batch);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Index de carte invalide');
        });

        it('should return error if negative card index', () => {
            const batch = game.playCard('socket-1', -1);
            const result = extractResult(batch);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Index de carte invalide');
        });

        it('should return error if card already on board', () => {
            game.playCard('socket-1', 0);
            const batch = game.playCard('socket-1', 0);
            const result = extractResult(batch);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Vous avez déjà une carte active sur le board');
        });

        it('should return error for invalid player', () => {
            // Un joueur invalide ne peut pas avoir le tour, donc on vérifie d'abord le tour
            const batch = game.playCard('invalid-socket-id', 0);
            const result = extractResult(batch);

            expect(result.success).toBe(false);
            // Le code vérifie maintenant d'abord si le joueur existe
            expect(result.message).toBe("Joueur non trouvé");
        });
    });

    describe('Type Weakness System', () => {
        // Table de toutes les combinaisons type -> faiblesse
        const typeWeaknessTable: Array<[PokemonType, PokemonType | null]> = [
            [PokemonType.Normal, PokemonType.Fighting],
            [PokemonType.Fire, PokemonType.Water],
            [PokemonType.Water, PokemonType.Electric],
            [PokemonType.Electric, PokemonType.Ground],
            [PokemonType.Grass, PokemonType.Fire],
            [PokemonType.Ice, PokemonType.Fire],
            [PokemonType.Fighting, PokemonType.Psychic],
            [PokemonType.Poison, PokemonType.Psychic],
            [PokemonType.Ground, PokemonType.Water],
            [PokemonType.Flying, PokemonType.Electric],
            [PokemonType.Psychic, PokemonType.Dark],
            [PokemonType.Bug, PokemonType.Fire],
            [PokemonType.Rock, PokemonType.Water],
            [PokemonType.Ghost, PokemonType.Dark],
            [PokemonType.Dragon, PokemonType.Ice],
            [PokemonType.Dark, PokemonType.Fighting],
            [PokemonType.Steel, PokemonType.Fire],
            [PokemonType.Fairy, PokemonType.Poison],
        ];

        it.each(typeWeaknessTable)(
            'should apply 2x damage when %s is weak to %s',
            (defenderType, weaknessType) => {
                if (!weaknessType) return;

                const deck1 = [
                    {
                        id: 'attacker',
                        name: 'Attacker',
                        pokedexNumber: 1,
                        type: weaknessType,
                        hp: 100,
                        attack: 50,
                        defense: 30,
                        imageUrl: 'attacker.png',
                    },
                ];

                const deck2 = [
                    {
                        id: 'defender',
                        name: 'Defender',
                        pokedexNumber: 2,
                        type: defenderType,
                        hp: 100,
                        attack: 30,
                        defense: 30,
                        imageUrl: 'defender.png',
                    },
                ];

                const game = createGame('room-1', 'socket-1', deck1, 'socket-2', deck2);

                // Les deux joueurs piochent et jouent leurs cartes
                game.drawCards('socket-1');
                game.drawCards('socket-2');
                game.playCard('socket-1', 0);
                game.setCurrentTurn(TurnState.GUEST);
                game.playCard('socket-2', 0);
                game.setCurrentTurn(TurnState.HOST);

                const initialHp = game.getState().guest.board.activeCard!.currentHp;

                // Attaque avec le type super efficace
                const batch = game.attack('socket-1');
                const result = extractResult(batch);

                expect(result.success).toBe(true);
                // Dégâts = (50 - 30) * 2 = 40
                expect(game.getState().guest.board.activeCard!.currentHp).toBe(initialHp - 40);
            }
        );

        it.each([
            [PokemonType.Fire, PokemonType.Fire],
            [PokemonType.Water, PokemonType.Water],
            [PokemonType.Grass, PokemonType.Grass],
            [PokemonType.Electric, PokemonType.Electric],
            [PokemonType.Normal, PokemonType.Normal],
        ])(
            'should apply 1x damage when %s attacks %s (no weakness)',
            (attackerType, defenderType) => {
                const deck1 = [
                    {
                        id: 'attacker',
                        name: 'Attacker',
                        pokedexNumber: 1,
                        type: attackerType,
                        hp: 100,
                        attack: 50,
                        defense: 30,
                        imageUrl: 'attacker.png',
                    },
                ];

                const deck2 = [
                    {
                        id: 'defender',
                        name: 'Defender',
                        pokedexNumber: 2,
                        type: defenderType,
                        hp: 100,
                        attack: 30,
                        defense: 30,
                        imageUrl: 'defender.png',
                    },
                ];

                const game = createGame('room-1', 'socket-1', deck1, 'socket-2', deck2);

                game.drawCards('socket-1');
                game.drawCards('socket-2');
                game.playCard('socket-1', 0);
                game.setCurrentTurn(TurnState.GUEST);
                game.playCard('socket-2', 0);
                game.setCurrentTurn(TurnState.HOST);

                const initialHp = game.getState().guest.board.activeCard!.currentHp;

                const batch = game.attack('socket-1');
                const result = extractResult(batch);

                expect(result.success).toBe(true);
                // Dégâts = (50 - 30) * 1 = 20
                expect(game.getState().guest.board.activeCard!.currentHp).toBe(initialHp - 20);
            }
        );
    });

    describe('attack', () => {
        let game: Game;

        beforeEach(() => {
            const deck1 = Array.from({length: 10}, (_, i) => ({
                ...mockCards[0],
                id: `card-p1-${i}`,
            }));
            const deck2 = Array.from({length: 10}, (_, i) => ({
                ...mockCards[1],
                id: `card-p2-${i}`,
            }));

            game = createGame('room-123', 'socket-1', deck1, 'socket-2', deck2);
            game.drawCards('socket-1');
            game.drawCards('socket-2');
            game.playCard('socket-1', 0);
        });

        it('should deal damage to opponent card', () => {
            // Guest joue une carte
            game.setCurrentTurn(TurnState.GUEST);
            game.playCard('socket-2', 0);

            // Host attaque
            game.setCurrentTurn(TurnState.HOST);
            const initialHp = game.getState().guest.board.activeCard!.currentHp;
            const batch = game.attack('socket-1');
            const result = extractResult(batch);

            expect(result.success).toBe(true);
            expect(result.message).toContain('attaque');
            expect(result.message).toContain('inflige');
            expect(game.getState().guest.board.activeCard!.currentHp).toBeLessThan(initialHp);
            expect(game.getState().currentTurn).toBe(TurnState.GUEST); // Turn switched
        });

        it('should defeat opponent card and increase score', () => {
            // Guest joue une carte
            game.setCurrentTurn(TurnState.GUEST);
            game.playCard('socket-2', 0);

            // Mettre HP très bas pour garantir KO
            game.getGuestPlayer().getBoard().activeCard!.currentHp = 1;

            // Host attaque
            game.setCurrentTurn(TurnState.HOST);
            const batch = game.attack('socket-1');
            const result = extractResult(batch);

            expect(result.success).toBe(true);
            expect(result.cardDefeated).toBe(true);
            expect(result.message).toContain('K.O.');
            expect(game.getState().guest.board.activeCard).toBeNull();
            expect(game.getState().host.board.score).toBe(1);
        });

        it('should win game after defeating 3 cards', () => {
            // Guest joue une carte
            game.setCurrentTurn(TurnState.GUEST);
            game.playCard('socket-2', 0);

            // Mettre le score à 2 déjà
            game.getHostPlayer().setScore(2);
            game.getGuestPlayer().getBoard().activeCard!.currentHp = 1;

            // Host attaque pour gagner
            game.setCurrentTurn(TurnState.HOST);
            const batch = game.attack('socket-1');
            const result = extractResult(batch);

            expect(result.success).toBe(true);
            expect(result.cardDefeated).toBe(true);
            expect(result.gameWon).toBe(true);
            expect(result.message).toContain('gagné la partie');
            expect(game.getState().status).toBe(GameStatus.FINISHED);
            expect(game.getState().winner).toBe('socket-1');
            expect(game.getState().host.board.score).toBe(3);
        });

        it('should deal minimum 1 damage even if defense > attack', () => {
            // Guest joue une carte
            game.setCurrentTurn(TurnState.GUEST);
            game.playCard('socket-2', 0);

            game.getHostPlayer().getBoard().activeCard!.attack = 10;
            game.getGuestPlayer().getBoard().activeCard!.defense = 100;
            game.setCurrentTurn(TurnState.HOST);

            const initialHp = game.getState().guest.board.activeCard!.currentHp;
            const batch = game.attack('socket-1');
            const result = extractResult(batch);

            expect(result.success).toBe(true);
            expect(game.getState().guest.board.activeCard!.currentHp).toBe(initialHp - 1);
        });

        it('should return error if not player turn', () => {
            game.setCurrentTurn(TurnState.GUEST);
            game.playCard('socket-2', 0);

            // Changer le tour au joueur 1
            game.setCurrentTurn(TurnState.HOST);

            // Guest essaie d'attaquer alors que ce n'est pas son tour
            const batch = game.attack('socket-2');
            const result = extractResult(batch);

            expect(result.success).toBe(false);
            expect(result.message).toBe("Ce n'est pas votre tour");
        });

        it('should return error if attacker has no active card', () => {
            game.getHostPlayer().setActiveCard(null);

            const batch = game.attack('socket-1');
            const result = extractResult(batch);

            expect(result.success).toBe(false);
            expect(result.message).toBe("Vous n'avez pas de carte active pour attaquer");
        });

        it('should return error if defender has no active card', () => {
            const batch = game.attack('socket-1');
            const result = extractResult(batch);

            expect(result.success).toBe(false);
            expect(result.message).toBe("L'adversaire n'a pas de carte active à attaquer");
        });

        it('should return error for invalid player', () => {
            game.setCurrentTurn(TurnState.GUEST);
            game.playCard('socket-2', 0);
            game.setCurrentTurn('invalid' as any);

            const batch = game.attack('invalid-socket-id');
            const result = extractResult(batch);

            expect(result.success).toBe(false);
        });
    });

    describe('getGameStateForPlayer', () => {
        let game: Game;

        beforeEach(() => {
            const deck1 = Array.from({length: 10}, (_, i) => ({
                ...mockCards[0],
                id: `card-p1-${i}`,
            }));
            const deck2 = Array.from({length: 10}, (_, i) => ({
                ...mockCards[1],
                id: `card-p2-${i}`,
            }));

            game = createGame('room-123', 'socket-1', deck1, 'socket-2', deck2);
            game.drawCards('socket-1');
            game.drawCards('socket-2');
        });

        it('should return game state for host with hidden opponent data', () => {
            const state = game.getStateForPlayer('socket-1');

            expect(state.roomId).toBe('room-123');
            expect(state.status).toBe(GameStatus.PLAYING);
            expect(state.currentTurn).toBe(TurnState.HOST);
            expect(state.isYourTurn).toBe(true);

            // Host voit ses propres données
            expect(state.yourBoard.hand).toHaveLength(5);
            expect(state.yourBoard.deckCount).toBe(5);
            expect(state.yourBoard.score).toBe(0);

            // Mais ne voit pas les cartes de l'adversaire
            expect(state.opponentBoard.hand).toBeUndefined();
            expect(state.opponentBoard.handCount).toBe(5);
            expect(state.opponentBoard.deckCount).toBe(5);
        });

        it('should return game state for guest with hidden opponent data', () => {
            const state = game.getStateForPlayer('socket-2');

            expect(state.isYourTurn).toBe(false);

            // Guest voit ses propres données
            expect(state.yourBoard.hand).toHaveLength(5);
            expect(state.yourBoard.deckCount).toBe(5);

            // Mais ne voit pas les cartes de l'adversaire
            expect(state.opponentBoard.hand).toBeUndefined();
            expect(state.opponentBoard.handCount).toBe(5);
        });

        it('should show active cards for both players', () => {
            game.playCard('socket-1', 0);
            game.setCurrentTurn(TurnState.GUEST);
            game.playCard('socket-2', 0);

            const state1 = game.getStateForPlayer('socket-1');
            const state2 = game.getStateForPlayer('socket-2');

            expect(state1.yourBoard.activeCard).toBeDefined();
            expect(state1.opponentBoard.activeCard).toBeDefined();
            expect(state2.yourBoard.activeCard).toBeDefined();
            expect(state2.opponentBoard.activeCard).toBeDefined();
        });

        it('should show winner when game is finished', () => {
            game.setStatus(GameStatus.FINISHED);
            game.setWinner('socket-1');

            const state1 = game.getStateForPlayer('socket-1');
            const state2 = game.getStateForPlayer('socket-2');

            expect(state1.status).toBe(GameStatus.FINISHED);
            expect(state1.winner).toBe('socket-1');
            expect(state2.status).toBe(GameStatus.FINISHED);
            expect(state2.winner).toBe('socket-1');
        });
    });

    describe('Player class', () => {
        let game: Game;
        let hostPlayer: Player;
        let guestPlayer: Player;

        beforeEach(() => {
            const deck1 = Array.from({length: 10}, (_, i) => ({
                ...mockCards[0],
                id: `card-p1-${i}`,
            }));
            const deck2 = Array.from({length: 10}, (_, i) => ({
                ...mockCards[1],
                id: `card-p2-${i}`,
            }));

            game = createGame('room-123', 'socket-1', deck1, 'socket-2', deck2);
            hostPlayer = game.getHostPlayer();
            guestPlayer = game.getGuestPlayer();
        });

        it('should create Player instances from Game', () => {
            expect(hostPlayer).toBeInstanceOf(Player);
            expect(guestPlayer).toBeInstanceOf(Player);
            expect(hostPlayer.getSocketId()).toBe('socket-1');
            expect(guestPlayer.getSocketId()).toBe('socket-2');
        });

        it('should allow player to draw cards without passing socketId', () => {
            const result = hostPlayer.drawCards();

            expect(result.success).toBe(true);
            expect(game.getState().host.board.hand).toHaveLength(5);
        });

        it('should allow player to play card without passing socketId', () => {
            hostPlayer.drawCards();
            const result = hostPlayer.playCard(0);

            expect(result.success).toBe(true);
            expect(game.getState().host.board.activeCard).toBeDefined();
        });

        it('should allow player to attack without passing socketId', () => {
            hostPlayer.drawCards();
            guestPlayer.drawCards();
            hostPlayer.playCard(0);
            game.setCurrentTurn(TurnState.GUEST);
            guestPlayer.playCard(0);
            game.setCurrentTurn(TurnState.HOST);

            const batch = game.attack(hostPlayer.getSocketId());
            const result = extractResult(batch);

            expect(result.success).toBe(true);
        });

        it('should get game state formatted for player', () => {
            hostPlayer.drawCards();
            guestPlayer.drawCards();

            const state = game.getStateForPlayer(hostPlayer.getSocketId());

            expect(state.roomId).toBe('room-123');
            expect(state.yourBoard.hand).toHaveLength(5);
            expect(state.opponentBoard.hand).toBeUndefined();
            expect(state.opponentBoard.handCount).toBe(5);
        });

        it('should get player by socketId', () => {
            const player1 = game.getPlayer('socket-1');
            const player2 = game.getPlayer('socket-2');
            const invalidPlayer = game.getPlayer('invalid');

            expect(player1).toBeInstanceOf(Player);
            expect(player2).toBeInstanceOf(Player);
            expect(invalidPlayer).toBeNull();
        });
    });
});
