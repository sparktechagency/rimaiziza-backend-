import { Router } from 'express';
import { StripeControllers } from './stripeCEA.controller';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
const router = Router();

router.post(
  '/',
  auth(USER_ROLES.HOST),
  StripeControllers.createStripeAccount
);
export const stripeCEARoutes = router;