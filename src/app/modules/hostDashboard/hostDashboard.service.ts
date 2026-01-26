import { Types } from "mongoose";
import { Booking } from "../booking/booking.model";
import { Car } from "../car/car.model";
import { User } from "../user/user.model";
import Transaction from "../payment/transaction.model";

const getHostDashboardData = async (hostId: string, year: number) => {
  const objectHostId = new Types.ObjectId(hostId);

  const currentDate = new Date();
  const currentMonthStart = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );

  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  // Parallel execution for performance
  const [
    profile,
    totalEarnings,
    thisMonthEarnings,
    totalBookings,
    totalVehicles,
    activeVehicles,
    monthlyRevenue,
    recentPayouts,
    upcomingPayouts,
  ] = await Promise.all([
    // 1. Profile (name + location)
User.findById(
  objectHostId,
  {
    firstName: 1,
    lastName: 1,
    profileImage: 1,
    location: {
      "location.city": 1,
      "location.country": 1,
    }
  }
).lean()
,

    // 2. Total Earnings (all time succeeded hostReceiptAmount)
    Transaction.aggregate<{ total: number }>([
      {
        $lookup: {
          from: "bookings",
          localField: "bookingId",
          foreignField: "_id",
          as: "booking",
        },
      },
      { $unwind: "$booking" },
      { $match: { "booking.hostId": objectHostId, payoutStatus: "succeeded" } },
      { $group: { _id: null, total: { $sum: "$hostReceiptAmount" } } },
    ]),

    // 3. This month earnings
    Transaction.aggregate<{ total: number }>([
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
          payoutStatus: "succeeded",
          createdAt: { $gte: currentMonthStart },
        },
      },
      { $group: { _id: null, total: { $sum: "$hostReceiptAmount" } } },
    ]),

    // 4. Total bookings for host's cars
    Booking.countDocuments({ hostId: objectHostId }),

    // 5. Total vehicles owned by host
    Car.countDocuments({ userId: objectHostId }),

    // 6. Active vehicles
    Car.countDocuments({ userId: objectHostId, isActive: true }),

    // 7. Monthly revenue for bar chart
    Transaction.aggregate([
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
          payoutStatus: "succeeded",
          createdAt: { $gte: yearStart, $lt: yearEnd },
        },
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          earnings: { $sum: "$hostReceiptAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // 8. Recent Payouts (completed)
    getPayouts(objectHostId, "succeeded"),

    // 9. Upcoming Payouts (pending)
    getPayouts(objectHostId, "pending"),
  ]);

  // Fill 12 months with 0 if no data
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const revenueStatistics = months.map((month, index) => {
    const found = monthlyRevenue.find((m: any) => m._id === index + 1);
    return { month, earnings: found?.earnings || 0 };
  });
  console.log(profile);


  return {
profile: {
  name: profile
    ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || "Unknown"
    : "Unknown",
  location: profile?.location?.city && profile?.location?.country
    ? `${profile.location.city}, ${profile.location.country}`
    : "Unknown",
    profileImage: profile?.profileImage || null,
},
    summary: {
      totalEarnings: totalEarnings[0]?.total || 0,
      earningsThisMonth: thisMonthEarnings[0]?.total || 0,
      totalBookings,
      totalVehicles,
      activeVehicles,
    },
    revenueStatistics,
    recentPayouts,
    upcomingPayouts,
  };
};

// Helper: Recent & Upcoming Payouts
const getPayouts = async (
  hostId: Types.ObjectId,
  payoutStatus: "succeeded" | "pending"
) => {
  return await Transaction.aggregate([
    {
      $lookup: {
        from: "bookings",
        localField: "bookingId",
        foreignField: "_id",
        as: "booking",
      },
    },
    { $unwind: "$booking" },
    { $match: { "booking.hostId": hostId, payoutStatus } },
    { $sort: { createdAt: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: "users",
        localField: "booking.userId",
        foreignField: "_id",
        as: "renter",
      },
    },
    { $unwind: "$renter" },
    {
      $lookup: {
        from: "cars",
        localField: "booking.carId",
        foreignField: "_id",
        as: "car",
      },
    },
    { $unwind: "$car" },
    {
      $project: {
        renterName: "$renter.name",
        car: "$car.model",
        amount: "$hostReceiptAmount",
        date: { $dateToString: { format: "%b %d, %Y", date: "$createdAt" } },
        status: payoutStatus === "succeeded" ? "completed" : "pending",
      },
    },
  ]);
};

export const HostDashboardService = {
  getHostDashboardData,
};
