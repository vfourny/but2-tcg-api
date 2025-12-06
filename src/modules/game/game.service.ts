import {Card, PokemonType} from "../../generated/prisma/client";
import {GameState, PlayerBoard} from "./game.type";

/**
 * Service qui gère la logique d'une partie
 * Encapsule l'état du jeu et expose les actions possibles
 */
export class GameService {
    private state: GameState;

    constructor(
        roomId: string,
        hostSocketId: string,
        hostDeck: Card[],
        guestSocketId: string,
        guestDeck: Card[]
    ) {
        // Mélanger les decks
        const shuffledHostDeck = [...hostDeck].sort(() => Math.random() - 0.5);
        const shuffledGuestDeck = [...guestDeck].sort(() => Math.random() - 0.5);

        this.state = {
            roomId,
            hostSocketId,
            guestSocketId,
            currentTurn: hostSocketId,
            status: 'playing',
            host: {
                activeCard: null,
                hand: [],
                deck: shuffledHostDeck,
                score: 0,
            },
            guest: {
                activeCard: null,
                hand: [],
                deck: shuffledGuestDeck,
                score: 0,
            },
        };
    }

    /**
     * Pioche des cartes jusqu'à remplir la main (5 cartes max)
     */
    public drawCards(playerSocketId: string): { success: boolean; message: string } {
        const playerBoard = this.getPlayerBoard(playerSocketId);

        if (!playerBoard) {
            return {success: false, message: "Joueur non trouvé"};
        }

        // Piocher jusqu'à avoir 5 cartes en main
        while (playerBoard.hand.length < 5 && playerBoard.deck.length > 0) {
            const card = playerBoard.deck.pop();
            if (card) {
                playerBoard.hand.push(card);
            }
        }

        return {success: true, message: `Vous avez maintenant ${playerBoard.hand.length} cartes en main`};
    }

    /**
     * Joue une carte de la main sur le board
     */
    public playCard(playerSocketId: string, cardIndex: number): {
        success: boolean;
        message: string
    } {
        // Vérifier que c'est le tour du joueur
        if (this.state.currentTurn !== playerSocketId) {
            return {success: false, message: "Ce n'est pas votre tour"};
        }

        const playerBoard = this.getPlayerBoard(playerSocketId);

        if (!playerBoard) {
            return {success: false, message: "Joueur non trouvé"};
        }

        // Vérifier que l'index est valide
        if (cardIndex < 0 || cardIndex >= playerBoard.hand.length) {
            return {success: false, message: "Index de carte invalide"};
        }

        // Vérifier qu'il n'y a pas déjà une carte active
        if (playerBoard.activeCard !== null) {
            return {success: false, message: "Vous avez déjà une carte active sur le board"};
        }

        // Retirer la carte de la main et la placer sur le board
        const card = playerBoard.hand.splice(cardIndex, 1)[0];
        playerBoard.activeCard = {
            ...card,
            currentHp: card.hp,
        };

        return {success: true, message: `${card.name} a été placé sur le board !`};
    }

    /**
     * Attaque le Pokemon adverse
     */
    public attack(attackerSocketId: string): {
        success: boolean;
        message: string;
        cardDefeated?: boolean;
        gameWon?: boolean
    } {
        // Vérifier que c'est le tour du joueur
        if (this.state.currentTurn !== attackerSocketId) {
            return {success: false, message: "Ce n'est pas votre tour"};
        }

        const attackerBoard = this.getPlayerBoard(attackerSocketId);
        const defenderBoard = this.getOpponentBoard(attackerSocketId);

        if (!attackerBoard || !defenderBoard) {
            return {success: false, message: "Erreur lors de la récupération des joueurs"};
        }

        // Vérifier que l'attaquant a une carte active
        if (!attackerBoard.activeCard) {
            return {success: false, message: "Vous n'avez pas de carte active pour attaquer"};
        }

        // Vérifier que le défenseur a une carte active
        if (!defenderBoard.activeCard) {
            return {success: false, message: "L'adversaire n'a pas de carte active à attaquer"};
        }

        // Calculer les dégâts
        const damage = this.calculateDamage(
            attackerBoard.activeCard.attack,
            attackerBoard.activeCard.type,
            defenderBoard.activeCard.defense,
            defenderBoard.activeCard.type
        );

        // Appliquer les dégâts
        defenderBoard.activeCard.currentHp -= damage;

        const isDefeated = defenderBoard.activeCard.currentHp <= 0;
        let message = `${attackerBoard.activeCard.name} attaque ${defenderBoard.activeCard.name} et inflige ${damage} dégâts !`;

        // Si la carte adverse est KO
        if (isDefeated) {
            const defeatedCardName = defenderBoard.activeCard.name;
            defenderBoard.activeCard = null;
            attackerBoard.score += 1;

            message += ` ${defeatedCardName} est K.O. ! Vous gagnez 1 point.`;

            // Vérifier si le joueur a gagné (3 points)
            if (attackerBoard.score >= 3) {
                this.state.status = 'finished';
                this.state.winner = attackerSocketId;
                return {
                    success: true,
                    message: message + " Vous avez gagné la partie !",
                    cardDefeated: true,
                    gameWon: true,
                };
            }
        }

        // Changer de tour
        this.switchTurn();

        return {
            success: true,
            message,
            cardDefeated: isDefeated,
            gameWon: false,
        };
    }

    /**
     * Formate l'état du jeu pour un joueur spécifique
     * (cache la main et le deck de l'adversaire)
     */
    public getStateForPlayer(playerSocketId: string): any {
        const isHost = this.state.hostSocketId === playerSocketId;

        return {
            roomId: this.state.roomId,
            status: this.state.status,
            winner: this.state.winner,
            currentTurn: this.state.currentTurn,
            isYourTurn: this.state.currentTurn === playerSocketId,
            yourBoard: {
                activeCard: isHost ? this.state.host.activeCard : this.state.guest.activeCard,
                hand: isHost ? this.state.host.hand : this.state.guest.hand,
                deckCount: isHost ? this.state.host.deck.length : this.state.guest.deck.length,
                score: isHost ? this.state.host.score : this.state.guest.score,
            },
            opponentBoard: {
                activeCard: isHost ? this.state.guest.activeCard : this.state.host.activeCard,
                handCount: isHost ? this.state.guest.hand.length : this.state.host.hand.length,
                deckCount: isHost ? this.state.guest.deck.length : this.state.host.deck.length,
                score: isHost ? this.state.guest.score : this.state.host.score,
            },
        };
    }

    /**
     * Retourne le statut de la partie
     */
    public getStatus(): 'waiting' | 'playing' | 'finished' {
        return this.state.status;
    }

    /**
     * Retourne le gagnant (si la partie est terminée)
     */
    public getWinner(): string | undefined {
        return this.state.winner;
    }

    /**
     * Retourne l'état interne du jeu (pour les tests)
     * @internal
     */
    public getState(): GameState {
        return this.state;
    }

    /**
     * Change le tour au joueur suivant
     */
    private switchTurn(): void {
        this.state.currentTurn = this.state.currentTurn === this.state.hostSocketId
            ? this.state.guestSocketId
            : this.state.hostSocketId;
    }

    /**
     * Récupère le board du joueur
     */
    private getPlayerBoard(playerSocketId: string): PlayerBoard | null {
        if (this.state.hostSocketId === playerSocketId) {
            return this.state.host;
        } else if (this.state.guestSocketId === playerSocketId) {
            return this.state.guest;
        }
        return null;
    }

    /**
     * Récupère le board de l'adversaire
     */
    private getOpponentBoard(playerSocketId: string): PlayerBoard | null {
        if (this.state.hostSocketId === playerSocketId) {
            return this.state.guest;
        } else if (this.state.guestSocketId === playerSocketId) {
            return this.state.host;
        }
        return null;
    }

    /**
     * Retourne la faiblesse principale d'un type Pokemon
     * Chaque type a une seule faiblesse pour simplifier le système de combat
     */
    private getWeakness(defenderType: PokemonType): PokemonType | null {
        switch (defenderType) {
            case PokemonType.Normal:
                return PokemonType.Fighting;
            case PokemonType.Fire:
                return PokemonType.Water;
            case PokemonType.Water:
                return PokemonType.Electric;
            case PokemonType.Electric:
                return PokemonType.Ground;
            case PokemonType.Grass:
                return PokemonType.Fire;
            case PokemonType.Ice:
                return PokemonType.Fire;
            case PokemonType.Fighting:
                return PokemonType.Psychic;
            case PokemonType.Poison:
                return PokemonType.Psychic;
            case PokemonType.Ground:
                return PokemonType.Water;
            case PokemonType.Flying:
                return PokemonType.Electric;
            case PokemonType.Psychic:
                return PokemonType.Dark;
            case PokemonType.Bug:
                return PokemonType.Fire;
            case PokemonType.Rock:
                return PokemonType.Water;
            case PokemonType.Ghost:
                return PokemonType.Dark;
            case PokemonType.Dragon:
                return PokemonType.Ice;
            case PokemonType.Dark:
                return PokemonType.Fighting;
            case PokemonType.Steel:
                return PokemonType.Fire;
            case PokemonType.Fairy:
                return PokemonType.Poison;
            default:
                return null;
        }
    }

    /**
     * Calcule le multiplicateur de dégâts selon les types
     */
    private getDamageMultiplier(attackerType: PokemonType, defenderType: PokemonType): number {
        const weakness = this.getWeakness(defenderType);

        // Si le type de l'attaquant correspond à la faiblesse du défenseur
        if (weakness === attackerType) {
            return 2.0; // Super efficace (x2 dégâts)
        }

        return 1.0; // Dégâts normaux
    }

    /**
     * Calcule les dégâts infligés lors d'une attaque
     */
    private calculateDamage(
        attackerAttack: number,
        attackerType: PokemonType,
        defenderDefense: number,
        defenderType: PokemonType
    ): number {
        const multiplier = this.getDamageMultiplier(attackerType, defenderType);

        // Formule: (Attaque - Défense) * Multiplicateur
        const baseDamage = attackerAttack - defenderDefense;
        const damage = Math.floor(baseDamage * multiplier);

        // Les dégâts minimum sont de 1 (même si défense > attaque)
        return Math.max(1, damage);
    }
}
