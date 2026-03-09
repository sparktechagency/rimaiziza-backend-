"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const user_1 = require("../../../enums/user");
const analytics_controller_1 = require("./analytics.controller");
const router = express_1.default.Router();
router.get(
  "/stat-counts",
  (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN),
  analytics_controller_1.AnalyticsControllers.getDashboardStats,
);
router.get(
  "/yearly-revenue-chart",
  (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN),
  analytics_controller_1.AnalyticsControllers.getYearlyRevenueChart,
);
router.get(
  "/yearly-booking-user-chart",
  (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN),
  analytics_controller_1.AnalyticsControllers.getYearlyBookingAndUserChart,
);
router.get(
  "/user-stats",
  (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN),
  analytics_controller_1.AnalyticsControllers.getUserStats,
);
router.get(
  "/booking-summary",
  (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN),
  analytics_controller_1.AnalyticsControllers.getBookingSummary,
);
router.get(
  "/host-dashboard-stats",
  (0, auth_1.default)(user_1.USER_ROLES.HOST),
  analytics_controller_1.AnalyticsControllers.getHostDashboardStats,
);
router.get(
  "/host-monthly-earnings",
  (0, auth_1.default)(user_1.USER_ROLES.HOST),
  analytics_controller_1.AnalyticsControllers.getHostMonthlyEarnings,
);
exports.AnalyticsRoutes = router;
