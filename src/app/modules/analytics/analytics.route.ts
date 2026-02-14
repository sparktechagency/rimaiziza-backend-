import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { AnalyticsControllers } from "./analytics.controller";

const router = express.Router();

router.get(
  "/stat-counts",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AnalyticsControllers.getDashboardStats,
);



export const AnalyticsRoutes = router;
