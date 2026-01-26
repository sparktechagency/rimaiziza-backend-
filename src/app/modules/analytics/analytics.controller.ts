import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { AnalyticsServices } from "./analytics.service";

const statCounts = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.statCountsFromDB();
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Successfully retrieved stat counts",
    data: result,
  });
});

const getYearlyGuestHostChart = catchAsync(async (req, res) => {
  const year = req.query.year
    ? Number(req.query.year)
    : new Date().getUTCFullYear();
  const data = await AnalyticsServices.getGuestHostYearlyChart(year);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Yearly Guest and Host charts are retrieved successfully",
    data,
  });
});

export const AnalyticsControllers = {
  statCounts,
  getYearlyGuestHostChart,
};
