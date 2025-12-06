import {Router} from 'express';
import {authenticateToken} from '../auth/auth.middleware';
import {listCards} from "./card.service";

const router = Router();

router.get('/', authenticateToken, listCards);

export default router;
