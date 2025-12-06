import {Router} from 'express';
import {signIn} from './auth.service';

const router = Router();

router.post('/sign-in', signIn);

export default router;
