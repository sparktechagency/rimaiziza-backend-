import { PipelineStage } from "mongoose";
import { BOOKING_STATUS } from "../booking/booking.interface";
import { Booking } from "../booking/booking.model";
import { Car } from "../car/car.model";
import { TRANSACTION_STATUS } from "../transaction/transaction.interface";
import { User } from "../user/user.model";
import { STATUS, USER_ROLES } from "../../../enums/user";

const getDashboardStats = async () => {
  try {
    // Step 1: Aggregate bookings with transaction
    // total revenue calculate without admin commission, thats mean exclude admin commission from revenue
    const bookingAgg = await Booking.aggregate([
      {
        $match: {
          bookingStatus: { $ne: BOOKING_STATUS.CANCELLED }, // exclude cancelled bookings
          transactionId: { $exists: true, $ne: null },
        },
      },
      {
        $lookup: {
          from: "transactions",
          localField: "transactionId",
          foreignField: "_id",
          as: "transaction",
        },
      },
      { $unwind: "$transaction" },
      {
        $match: {
          "transaction.status": "SUCCESS", // only successful payments
        },
      },
      {
        $addFields: {
          revenue: {
            $subtract: ["$transaction.amount", { $ifNull: ["$transaction.charges.adminCommission", 0] }],
          },
        },
      },
    ]);

    const totalRevenue = bookingAgg.reduce((acc, b) => acc + (b.revenue || 0), 0);
    const totalBookings = bookingAgg.length;

    // Step 2: Active vehicles
    const activeVehicles = await Car.countDocuments({ isActive: true });

    // Step 3: Total unique customers
    const totalCustomers = await Booking.aggregate([
      {
        $match: {
          bookingStatus: { $ne: BOOKING_STATUS.CANCELLED },
          transactionId: { $exists: true, $ne: null },
        },
      },
      {
        $lookup: {
          from: "transactions",
          localField: "transactionId",
          foreignField: "_id",
          as: "transaction",
        },
      },
      { $unwind: "$transaction" },
      { $match: { "transaction.status": "SUCCESS" } },
      { $group: { _id: "$userId" } },
      { $count: "totalCustomers" },
    ]);

    return {
 
        totalRevenue,
        totalBookings,
        activeVehicles,
        totalCustomers: totalCustomers[0]?.totalCustomers || 0,
    };
  } catch (error: any) {
    throw new Error(`Failed to fetch dashboard stats: ${error.message}`);
  }
};

 const getYearlyRevenueChart = async (year?: number) => {
 
    const currentYear = year || new Date().getUTCFullYear();

    const start = new Date(`${currentYear}-01-01T00:00:00.000Z`);
    const end = new Date(`${currentYear}-12-31T23:59:59.999Z`);

    const chartData = await Booking.aggregate([
      {
        $match: {
          bookingStatus: { $ne: BOOKING_STATUS.CANCELLED },
          transactionId: { $exists: true, $ne: null },
        },
      },
      {
        $lookup: {
          from: "transactions",
          localField: "transactionId",
          foreignField: "_id",
          as: "transaction",
        },
      },
      { $unwind: "$transaction" },
      {
        $match: {
          "transaction.status": TRANSACTION_STATUS.SUCCESS,
          "transaction.createdAt": { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: { $month: "$transaction.createdAt" },
          totalRevenue: { $sum: "$transaction.amount" },
          platformFee: { $sum: { $ifNull: ["$transaction.charges.platformFee", 0] } },
          hostEarnings: { $sum: { $ifNull: ["$transaction.charges.hostCommission", 0] } },
        },
      },
      {
        $project: {
          month: "$_id",
          totalRevenue: 1,
          platformFee: 1,
          hostEarnings: 1,
          _id: 0,
        },
      },
      { $sort: { month: 1 } },
    ]);

    // Fill missing months with 0
    const result = Array.from({ length: 12 }, (_, i) => {
      const monthData = chartData.find(d => d.month === i + 1);
      return {
        month: i + 1,
        totalRevenue: monthData?.totalRevenue || 0,
        platformFee: monthData?.platformFee || 0,
        hostEarnings: monthData?.hostEarnings || 0,
      };
    });

    return {
      year: currentYear,
      data: result,
    };
  
};


const getYearlyBookingAndUserChart = async (year?: number) => {
  const targetYear = year || new Date().getUTCFullYear();
  const start = new Date(`${targetYear}-01-01T00:00:00.000Z`);
  const end = new Date(`${targetYear}-12-31T23:59:59.999Z`);

  // Pipeline for bookings (exclude cancelled + successful transaction only)
  const bookingPipeline: PipelineStage[] = [
    {
      $match: {
        bookingStatus: { $ne: BOOKING_STATUS.CANCELLED },
        transactionId: { $exists: true, $ne: null },
      },
    },
    {
      $lookup: {
        from: "transactions",
        localField: "transactionId",
        foreignField: "_id",
        as: "transaction",
      },
    },
    { $unwind: "$transaction" },
    {
      $match: {
        "transaction.status": TRANSACTION_STATUS.SUCCESS,
        "transaction.createdAt": { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: { $month: "$transaction.createdAt" },
        totalBookings: { $sum: 1 },
      },
    },
    { $sort: { "_id": 1 as const } },
  ];

  // Users pipeline (all created users)
  const userPipeline: PipelineStage[] = [
    {
      $match: {
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: { $month: "$createdAt" },
        totalUsers: { $sum: 1 },
      },
    },
    { $sort: { "_id": 1 as const } },
  ];

  const [bookingResult, userResult] = await Promise.all([
    Booking.aggregate(bookingPipeline),
    User.aggregate(userPipeline),
  ]);

  // Map to 12 months (1-12) numeric
  const chartData = Array.from({ length: 12 }, (_, i) => {
    const monthIndex = i + 1;
    const bookingMonth = bookingResult.find(r => r._id === monthIndex);
    const userMonth = userResult.find(r => r._id === monthIndex);

    return {
      month: monthIndex,
      bookings: bookingMonth ? bookingMonth.totalBookings : 0,
      users: userMonth ? userMonth.totalUsers : 0,
    };
  });

  return {
    year: targetYear,
    data: chartData,
  };
};

const getUserStats = async () => {
 
    // Total Users
    const totalUsers = await User.countDocuments({
      role: USER_ROLES.USER,
      status: STATUS.ACTIVE,
      verified: true,
    });

      // Total Hosts
    const totalHosts = await User.countDocuments({
      role: USER_ROLES.HOST,
      status: STATUS.ACTIVE,
      verified: true,
    });

    // Total Customers (users with at least 1 successful booking)
    const customersAgg = await Booking.aggregate([
      {
        $match: {
          bookingStatus: { $ne: BOOKING_STATUS.CANCELLED },
          transactionId: { $exists: true, $ne: null },
        },
      },
      {
        $lookup: {
          from: "transactions",
          localField: "transactionId",
          foreignField: "_id",
          as: "transaction",
        },
      },
      { $unwind: "$transaction" },
      { $match: { "transaction.status": TRANSACTION_STATUS.SUCCESS } },
      {
        $group: {
          _id: "$userId",
        },
      },
      { $count: "totalCustomers" },
    ]);

    const totalCustomers = customersAgg[0]?.totalCustomers || 0;

    return {
        totalUsers,
        totalHosts,
        totalCustomers,
    };
  
};

export const AnalyticsServices={
    getDashboardStats,
    getYearlyRevenueChart,
    getYearlyBookingAndUserChart,
    getUserStats,
}