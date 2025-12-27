/**
 * Représente une room d'attente pour le matchmaking
 * Gère uniquement l'attente de joueurs, pas le gameplay
 */
export class Lobby {
    private readonly id: string;
    private readonly host: {
        socketId: string;
        userId: string;
        deckId: string;
    };
    private guest: {
        socketId: string;
        userId: string;
        deckId: string;
    } | null = null;

    constructor(
        id: string,
        hostSocketId: string,
        hostUserId: string,
        hostDeckId: string
    ) {
        this.id = id;
        this.host = {
            socketId: hostSocketId,
            userId: hostUserId,
            deckId: hostDeckId,
        };
    }

    /**
     * Retourne l'ID du lobby
     */
    public getId(): string {
        return this.id;
    }

    /**
     * Vérifie si le lobby est complet (2 joueurs)
     */
    public isFull(): boolean {
        return this.guest !== null;
    }

    /**
     * Ajoute un guest au lobby
     */
    public addGuest(
        socketId: string,
        userId: string,
        deckId: string
    ): boolean {
        if (this.isFull()) {
            return false;
        }
        this.guest = { socketId, userId, deckId };
        return true;
    }

    /**
     * Retourne les infos du host
     */
    public getHost() {
        return this.host;
    }

    /**
     * Retourne les infos du guest (null si pas encore rejoint)
     */
    public getGuest() {
        return this.guest;
    }

    /**
     * Vérifie si un socketId appartient à ce lobby
     */
    public hasPlayer(socketId: string): boolean {
        return (
            this.host.socketId === socketId ||
            this.guest?.socketId === socketId
        );
    }
}
