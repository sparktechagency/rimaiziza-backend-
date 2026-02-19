import { PipelineStage } from "mongoose";
import { BOOKING_STATUS } from "../booking/booking.interface";
import { Booking } from "../booking/booking.model";
import { Car } from "../car/car.model";
import { TRANSACTION_STATUS, TRANSACTION_TYPE } from "../transaction/transaction.interface";
import { User } from "../user/user.model";
import { STATUS, USER_ROLES } from "../../../enums/user";
import { Types } from "mongoose";
import ApiError from "../../../errors/ApiErrors";
import { Transaction } from "../transaction/transaction.model";

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

const getBookingSummary = async () => {
  
    const bookingAgg = await Booking.aggregate([
      {
        $lookup: {
          from: "transactions",
          localField: "transactionId",
          foreignField: "_id",
          as: "transaction",
        },
      },
      { $unwind: { path: "$transaction", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          totalBookings: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ["$bookingStatus", BOOKING_STATUS.CANCELLED] }, { $eq: ["$transaction.status", TRANSACTION_STATUS.SUCCESS] }] },
                1,
                0,
              ],
            },
          },
          ongoingBookings: {
            $sum: {
              $cond: [{ $eq: ["$bookingStatus", BOOKING_STATUS.ONGOING] }, 1, 0],
            },
          },
          cancelledBookings: {
            $sum: {
              $cond: [{ $eq: ["$bookingStatus", BOOKING_STATUS.CANCELLED] }, 1, 0],
            },
          },
        },
      },
    ]);

    const stats = bookingAgg[0] || {
      totalBookings: 0,
      ongoingBookings: 0,
      cancelledBookings: 0,
    };

    return {
        totalBookings: stats.totalBookings,
        ongoingBookings: stats.ongoingBookings,
        cancelledBookings: stats.cancelledBookings,
    };

};


const getHostDashboardStats = async (hostId: string) => {
  if (!hostId || !Types.ObjectId.isValid(hostId)) {
    throw new ApiError(400, "Invalid hostId");
  }

  const objectHostId = new Types.ObjectId(hostId);

  // ------------------ TOTAL EARNING ------------------
  const earningResult = await Transaction.aggregate([
    {
      $match: {
        type: TRANSACTION_TYPE.BOOKING,
        status: TRANSACTION_STATUS.SUCCESS,
      },
    },
    {
      $lookup: {
        from: "bookings",
        localField: "bookingId",
        foreignField: "_id",
        as: "booking",
      },
    },
    { $unwind: "$booking" },
    {
      $match: {
        "booking.hostId": objectHostId,
        "booking.bookingStatus": BOOKING_STATUS.COMPLETED,
      },
    },
    {
      $group: {
        _id: null,
        totalEarning: { $sum: "$charges.hostCommission" },
      },
    },
  ]);

  const totalEarning = earningResult[0]?.totalEarning ?? 0;

  // ------------------ TOTAL TRIPS ------------------
  const totalTrips = await Booking.countDocuments({
    hostId: objectHostId,
    bookingStatus: BOOKING_STATUS.COMPLETED,
  });

  // ------------------ YOUR VEHICLES ------------------
  const totalVehicles = await Car.countDocuments({
    assignedHosts: hostId,
    isActive: true,
  });

  // ------------------ PENDING REQUEST ------------------
  const pendingRequests = await Booking.countDocuments({
    hostId: objectHostId,
    bookingStatus: BOOKING_STATUS.PENDING,
  });

  return {
    totalEarning,
    totalTrips,
    totalVehicles,
    pendingRequests,
  };
};

const getHostMonthlyEarnings = async (hostId: string, year?: number) => {
  if (!hostId || !Types.ObjectId.isValid(hostId)) {
    throw new ApiError(400, "Invalid hostId");
  }

  const objectHostId = new Types.ObjectId(hostId);
  const selectedYear = year || new Date().getFullYear();

  const startDate = new Date(`${selectedYear}-01-01T00:00:00.000Z`);
  const endDate = new Date(`${selectedYear + 1}-01-01T00:00:00.000Z`);

  const result = await Transaction.aggregate([
    {
      $match: {
        type: TRANSACTION_TYPE.BOOKING,
        status: TRANSACTION_STATUS.SUCCESS,
        createdAt: { $gte: startDate, $lt: endDate },
      },
    },
    {
      $lookup: {
        from: "bookings",
        localField: "bookingId",
        foreignField: "_id",
        as: "booking",
      },
    },
    { $unwind: "$booking" },
    {
      $match: {
        "booking.hostId": objectHostId,
        "booking.bookingStatus": BOOKING_STATUS.COMPLETED,
      },
    },
    {
      $group: {
        _id: { $month: "$createdAt" },
        total: { $sum: "$charges.hostCommission" },
      },
    },
    {
      $project: {
        month: "$_id",
        total: 1,
        _id: 0,
      },
    },
  ]);

  // Initialize all 12 months with 0
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const monthlyData = months.map((name, index) => {
    const found = result.find(r => r.month === index + 1);
    return {
      month: name,
      total: found ? found.total : 0,
    };
  });

  return monthlyData;
};



export const AnalyticsServices={
    getDashboardStats,
    getYearlyRevenueChart,
    getYearlyBookingAndUserChart,
    getUserStats,
    getBookingSummary,
    getHostDashboardStats,
    getHostMonthlyEarnings,
}