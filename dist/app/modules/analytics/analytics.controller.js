"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsControllers = void 0;
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const analytics_service_1 = require("./analytics.service");
const getDashboardStats = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result =
      yield analytics_service_1.AnalyticsServices.getDashboardStats();
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Successfully retrieved dashboard stats",
      data: result,
    });
  }),
);
const getYearlyRevenueChart = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { year } = req.query;
    const result =
      yield analytics_service_1.AnalyticsServices.getYearlyRevenueChart(
        Number(year),
      );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Successfully retrieved yearly revenue chart",
      data: result,
    });
  }),
);
const getYearlyBookingAndUserChart = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { year } = req.query;
    const result =
      yield analytics_service_1.AnalyticsServices.getYearlyBookingAndUserChart(
        Number(year),
      );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Successfully retrieved yearly booking and user chart",
      data: result,
    });
  }),
);
const getUserStats = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result = yield analytics_service_1.AnalyticsServices.getUserStats();
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Successfully retrieved user stats",
      data: result,
    });
  }),
);
const getBookingSummary = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result =
      yield analytics_service_1.AnalyticsServices.getBookingSummary();
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Successfully retrieved booking summary",
      data: result,
    });
  }),
);
const getHostDashboardStats = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { id: hostId } = req.user;
    const result =
      yield analytics_service_1.AnalyticsServices.getHostDashboardStats(hostId);
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Successfully retrieved host dashboard stats",
      data: result,
    });
  }),
);
const getHostMonthlyEarnings = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { id: hostId } = req.user;
    const { year } = req.query;
    const result =
      yield analytics_service_1.AnalyticsServices.getHostMonthlyEarnings(
        hostId,
        Number(year),
      );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Successfully retrieved host monthly earnings",
      data: result,
    });
  }),
);
exports.AnalyticsControllers = {
  getDashboardStats,
  getYearlyRevenueChart,
  getYearlyBookingAndUserChart,
  getUserStats,
  getBookingSummary,
  getHostDashboardStats,
  getHostMonthlyEarnings,
};
