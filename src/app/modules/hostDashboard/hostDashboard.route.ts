import express from 'express';
import { HostDashboardController } from './hostDashboard.controller';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';

const router = express.Router();

// Only authenticated host can access their own dashboard
router.get(
  '/',
  auth(USER_ROLES.HOST), 
  HostDashboardController.getHostDashboard
);

export const HostDashboardRoutes = router;