import {Router} from 'express';
import {authenticateToken} from '../middlewares/auth.middleware';
import {listCards} from '../controllers/card.controller';

const router = Router();

router.get('/', authenticateToken, listCards);

export default router;
