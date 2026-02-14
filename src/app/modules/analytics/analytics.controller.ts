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

export const AnalyticsControllers = {
  getDashboardStats,
  getYearlyRevenueChart,
}