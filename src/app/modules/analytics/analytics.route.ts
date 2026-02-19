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

router.get(
  "/yearly-revenue-chart",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AnalyticsControllers.getYearlyRevenueChart,
);

router.get(
  "/yearly-booking-user-chart",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AnalyticsControllers.getYearlyBookingAndUserChart,
);

router.get(
  "/user-stats",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AnalyticsControllers.getUserStats,
);

router.get(
  "/booking-summary",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AnalyticsControllers.getBookingSummary,
);

router.get(
  "/host-dashboard-stats",
  auth(USER_ROLES.HOST),
  AnalyticsControllers.getHostDashboardStats,
);



export const AnalyticsRoutes = router;
