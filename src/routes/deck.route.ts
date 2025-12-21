import {Router} from 'express';
import {authenticateToken} from '../middlewares/auth.middleware';
import {createDeck, deleteDeck, getDeckById, getUserDecks, updateDeck} from '../controllers/deck.controller';

const router = Router();

router.post('/', authenticateToken, createDeck);
router.get('/mine', authenticateToken, getUserDecks);
router.get('/:id', authenticateToken, getDeckById as any);
router.patch('/:id', authenticateToken, updateDeck as any);
router.delete('/:id', authenticateToken, deleteDeck as any);

export default router;
