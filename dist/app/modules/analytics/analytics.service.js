"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsServices = void 0;
const booking_interface_1 = require("../booking/booking.interface");
const booking_model_1 = require("../booking/booking.model");
const car_model_1 = require("../car/car.model");
const transaction_interface_1 = require("../transaction/transaction.interface");
const user_model_1 = require("../user/user.model");
const user_1 = require("../../../enums/user");
const mongoose_1 = require("mongoose");
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const transaction_model_1 = require("../transaction/transaction.model");
const getDashboardStats = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Step 1: Aggregate bookings with transaction
        // total revenue calculate without admin commission, thats mean exclude admin commission from revenue
        const bookingAgg = yield booking_model_1.Booking.aggregate([
            {
                $match: {
                    bookingStatus: { $ne: booking_interface_1.BOOKING_STATUS.CANCELLED }, // exclude cancelled bookings
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
                        $subtract: [
                            "$transaction.amount",
                            { $ifNull: ["$transaction.charges.adminCommission", 0] },
                        ],
                    },
                },
            },
        ]);
        const totalRevenue = bookingAgg.reduce((acc, b) => acc + (b.revenue || 0), 0);
        const totalBookings = bookingAgg.length;
        // Step 2: Active vehicles
        const activeVehicles = yield car_model_1.Car.countDocuments({ isActive: true });
        // Step 3: Total unique customers
        const totalCustomers = yield booking_model_1.Booking.aggregate([
            {
                $match: {
                    bookingStatus: { $ne: booking_interface_1.BOOKING_STATUS.CANCELLED },
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
            totalCustomers: ((_a = totalCustomers[0]) === null || _a === void 0 ? void 0 : _a.totalCustomers) || 0,
        };
    }
    catch (error) {
        throw new Error(`Failed to fetch dashboard stats: ${error.message}`);
    }
});
const getYearlyRevenueChart = (year) => __awaiter(void 0, void 0, void 0, function* () {
    const currentYear = year || new Date().getUTCFullYear();
    const start = new Date(`${currentYear}-01-01T00:00:00.000Z`);
    const end = new Date(`${currentYear}-12-31T23:59:59.999Z`);
    const chartData = yield booking_model_1.Booking.aggregate([
        {
            $match: {
                bookingStatus: { $ne: booking_interface_1.BOOKING_STATUS.CANCELLED },
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
                "transaction.status": transaction_interface_1.TRANSACTION_STATUS.SUCCESS,
                "transaction.createdAt": { $gte: start, $lte: end },
            },
        },
        {
            $group: {
                _id: { $month: "$transaction.createdAt" },
                totalRevenue: { $sum: "$transaction.amount" },
                platformFee: {
                    $sum: { $ifNull: ["$transaction.charges.platformFee", 0] },
                },
                hostEarnings: {
                    $sum: { $ifNull: ["$transaction.charges.hostCommission", 0] },
                },
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
        const monthData = chartData.find((d) => d.month === i + 1);
        return {
            month: i + 1,
            totalRevenue: (monthData === null || monthData === void 0 ? void 0 : monthData.totalRevenue) || 0,
            platformFee: (monthData === null || monthData === void 0 ? void 0 : monthData.platformFee) || 0,
            hostEarnings: (monthData === null || monthData === void 0 ? void 0 : monthData.hostEarnings) || 0,
        };
    });
    return {
        year: currentYear,
        data: result,
    };
});
const getYearlyBookingAndUserChart = (year) => __awaiter(void 0, void 0, void 0, function* () {
    const targetYear = year || new Date().getUTCFullYear();
    const start = new Date(`${targetYear}-01-01T00:00:00.000Z`);
    const end = new Date(`${targetYear}-12-31T23:59:59.999Z`);
    // Pipeline for bookings (exclude cancelled + successful transaction only)
    const bookingPipeline = [
        {
            $match: {
                bookingStatus: { $ne: booking_interface_1.BOOKING_STATUS.CANCELLED },
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
                "transaction.status": transaction_interface_1.TRANSACTION_STATUS.SUCCESS,
                "transaction.createdAt": { $gte: start, $lte: end },
            },
        },
        {
            $group: {
                _id: { $month: "$transaction.createdAt" },
                totalBookings: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ];
    // Users pipeline (all created users)
    const userPipeline = [
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
        { $sort: { _id: 1 } },
    ];
    const [bookingResult, userResult] = yield Promise.all([
        booking_model_1.Booking.aggregate(bookingPipeline),
        user_model_1.User.aggregate(userPipeline),
    ]);
    // Map to 12 months (1-12) numeric
    const chartData = Array.from({ length: 12 }, (_, i) => {
        const monthIndex = i + 1;
        const bookingMonth = bookingResult.find((r) => r._id === monthIndex);
        const userMonth = userResult.find((r) => r._id === monthIndex);
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
});
const getUserStats = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Total Users
    const totalUsers = yield user_model_1.User.countDocuments({
        role: user_1.USER_ROLES.USER,
        status: user_1.STATUS.ACTIVE,
        verified: true,
    });
    // Total Hosts
    const totalHosts = yield user_model_1.User.countDocuments({
        role: user_1.USER_ROLES.HOST,
        status: user_1.STATUS.ACTIVE,
        verified: true,
    });
    // Total Customers (users with at least 1 successful booking)
    const customersAgg = yield booking_model_1.Booking.aggregate([
        {
            $match: {
                bookingStatus: { $ne: booking_interface_1.BOOKING_STATUS.CANCELLED },
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
        { $match: { "transaction.status": transaction_interface_1.TRANSACTION_STATUS.SUCCESS } },
        {
            $group: {
                _id: "$userId",
            },
        },
        { $count: "totalCustomers" },
    ]);
    const totalCustomers = ((_a = customersAgg[0]) === null || _a === void 0 ? void 0 : _a.totalCustomers) || 0;
    return {
        totalUsers,
        totalHosts,
        totalCustomers,
    };
});
const getBookingSummary = () => __awaiter(void 0, void 0, void 0, function* () {
    const bookingAgg = yield booking_model_1.Booking.aggregate([
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
                            {
                                $and: [
                                    { $ne: ["$bookingStatus", booking_interface_1.BOOKING_STATUS.CANCELLED] },
                                    { $eq: ["$transaction.status", transaction_interface_1.TRANSACTION_STATUS.SUCCESS] },
                                ],
                            },
                            1,
                            0,
                        ],
                    },
                },
                ongoingBookings: {
                    $sum: {
                        $cond: [{ $eq: ["$bookingStatus", booking_interface_1.BOOKING_STATUS.ONGOING] }, 1, 0],
                    },
                },
                cancelledBookings: {
                    $sum: {
                        $cond: [
                            { $eq: ["$bookingStatus", booking_interface_1.BOOKING_STATUS.CANCELLED] },
                            1,
                            0,
                        ],
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
});
const getHostDashboardStats = (hostId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    if (!hostId || !mongoose_1.Types.ObjectId.isValid(hostId)) {
        throw new ApiErrors_1.default(400, "Invalid hostId");
    }
    const objectHostId = new mongoose_1.Types.ObjectId(hostId);
    // ------------------ TOTAL EARNING ------------------
    const earningResult = yield transaction_model_1.Transaction.aggregate([
        {
            $match: {
                type: transaction_interface_1.TRANSACTION_TYPE.BOOKING,
                status: transaction_interface_1.TRANSACTION_STATUS.SUCCESS,
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
                "booking.bookingStatus": booking_interface_1.BOOKING_STATUS.COMPLETED,
            },
        },
        {
            $group: {
                _id: null,
                totalEarning: { $sum: "$charges.hostCommission" },
            },
        },
    ]);
    const totalEarning = (_b = (_a = earningResult[0]) === null || _a === void 0 ? void 0 : _a.totalEarning) !== null && _b !== void 0 ? _b : 0;
    // ------------------ TOTAL TRIPS ------------------
    const totalTrips = yield booking_model_1.Booking.countDocuments({
        hostId: objectHostId,
        bookingStatus: booking_interface_1.BOOKING_STATUS.COMPLETED,
    });
    // ------------------ YOUR VEHICLES ------------------
    const totalVehicles = yield car_model_1.Car.countDocuments({
        assignedHosts: hostId,
        isActive: true,
    });
    // ------------------ PENDING REQUEST ------------------
    const pendingRequests = yield booking_model_1.Booking.countDocuments({
        hostId: objectHostId,
        bookingStatus: booking_interface_1.BOOKING_STATUS.PENDING,
    });
    return {
        totalEarning,
        totalTrips,
        totalVehicles,
        pendingRequests,
    };
});
const getHostMonthlyEarnings = (hostId, year) => __awaiter(void 0, void 0, void 0, function* () {
    if (!hostId || !mongoose_1.Types.ObjectId.isValid(hostId)) {
        throw new ApiErrors_1.default(400, "Invalid hostId");
    }
    const objectHostId = new mongoose_1.Types.ObjectId(hostId);
    const selectedYear = year || new Date().getFullYear();
    const startDate = new Date(`${selectedYear}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${selectedYear + 1}-01-01T00:00:00.000Z`);
    const result = yield transaction_model_1.Transaction.aggregate([
        {
            $match: {
                type: transaction_interface_1.TRANSACTION_TYPE.BOOKING,
                status: transaction_interface_1.TRANSACTION_STATUS.SUCCESS,
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
                "booking.bookingStatus": booking_interface_1.BOOKING_STATUS.COMPLETED,
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
    const monthlyData = months.map((name, index) => {
        const found = result.find((r) => r.month === index + 1);
        return {
            month: name,
            total: found ? found.total : 0,
        };
    });
    return monthlyData;
});
exports.AnalyticsServices = {
    getDashboardStats,
    getYearlyRevenueChart,
    getYearlyBookingAndUserChart,
    getUserStats,
    getBookingSummary,
    getHostDashboardStats,
    getHostMonthlyEarnings,
};
