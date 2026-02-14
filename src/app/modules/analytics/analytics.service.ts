import { BOOKING_STATUS } from "../booking/booking.interface";
import { Booking } from "../booking/booking.model";
import { Car } from "../car/car.model";

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

export const AnalyticsServices={
    getDashboardStats,
}