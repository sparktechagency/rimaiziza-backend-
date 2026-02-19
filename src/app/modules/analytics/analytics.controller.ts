import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { AnalyticsServices } from "./analytics.service";

const getDashboardStats = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getDashboardStats();
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Successfully retrieved dashboard stats",
    data: result,
  });
});

const getYearlyRevenueChart = catchAsync(async (req, res) => {
  const { year } = req.query;
  const result = await AnalyticsServices.getYearlyRevenueChart(Number(year));
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Successfully retrieved yearly revenue chart",
    data: result,
  });
});

const getYearlyBookingAndUserChart = catchAsync(async (req, res) => {
  const { year } = req.query;
  const result = await AnalyticsServices.getYearlyBookingAndUserChart(Number(year));
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Successfully retrieved yearly booking and user chart",
    data: result,
  });
});

const getUserStats = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getUserStats();
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Successfully retrieved user stats",
    data: result,
  });
});

const getBookingSummary = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getBookingSummary();
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Successfully retrieved booking summary",
    data: result,
  });
});

const getHostDashboardStats = catchAsync(async (req, res) => {
  const { id: hostId } = req.user as any;
  const result = await AnalyticsServices.getHostDashboardStats(hostId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Successfully retrieved host dashboard stats",
    data: result,
  });
});

const getHostMonthlyEarnings = catchAsync(async (req, res) => {
  const { id: hostId } = req.user as any;
  const { year } = req.query;
  const result = await AnalyticsServices.getHostMonthlyEarnings(hostId, Number(year));
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Successfully retrieved host monthly earnings",
    data: result,
  });
});

export const AnalyticsControllers = {
  getDashboardStats,
  getYearlyRevenueChart,
  getYearlyBookingAndUserChart,
  getUserStats,
  getBookingSummary,
  getHostDashboardStats,
  getHostMonthlyEarnings,
}