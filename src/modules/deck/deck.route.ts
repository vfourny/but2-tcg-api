import {Router} from 'express';
import {createDeck, deleteDeck, getDeckById, getUserDecks, updateDeck} from './deck.service';
import {authenticateToken} from '../auth/auth.middleware';

const router = Router();

router.post('/', authenticateToken, createDeck);
router.get('/mine', authenticateToken, getUserDecks);
router.get('/:id', authenticateToken, getDeckById);
router.patch('/:id', authenticateToken, updateDeck);
router.delete('/:id', authenticateToken, deleteDeck);

export default router;
