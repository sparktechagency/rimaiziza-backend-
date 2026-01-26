import { Request, Response } from 'express';
 
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { HostDashboardService } from './hostDashboard.service';

const getHostDashboard = catchAsync(async (req: Request, res: Response) => {
  const hostId = req.user?.id; // auth middleware থেকে আসবে
  const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();

  const result = await HostDashboardService.getHostDashboardData(hostId, year);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Host dashboard data retrieved successfully',
    data: result,
  });
});

export const HostDashboardController = {
  getHostDashboard,
};