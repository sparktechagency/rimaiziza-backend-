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
// transaction success and booking status completed
const getDashboardStats = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const transactionAgg = yield transaction_model_1.Transaction.aggregate([
            {
                $match: {
                    status: transaction_interface_1.TRANSACTION_STATUS.SUCCESS,
                    type: { $in: [transaction_interface_1.TRANSACTION_TYPE.BOOKING, transaction_interface_1.TRANSACTION_TYPE.EXTEND] },
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
                    "booking.bookingStatus": booking_interface_1.BOOKING_STATUS.COMPLETED, // শুধু COMPLETED
                },
            },
            {
                $addFields: {
                    revenue: {
                        $add: [
                            { $ifNull: ["$charges.platformFee", 0] },
                            { $ifNull: ["$charges.adminCommission", 0] },
                        ],
                    },
                },
            },
        ]);
        const totalRevenue = transactionAgg.reduce((acc, t) => acc + (t.revenue || 0), 0);
        const totalBookings = transactionAgg.length;
        const activeVehicles = yield car_model_1.Car.countDocuments({ isActive: true });
        const totalCustomers = [
            ...new Set(transactionAgg.map((t) => t.userId.toString())),
        ].length;
        return {
            totalRevenue,
            totalBookings,
            activeVehicles,
            totalCustomers,
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
    const chartData = yield transaction_model_1.Transaction.aggregate([
        {
            $match: {
                status: transaction_interface_1.TRANSACTION_STATUS.SUCCESS,
                type: { $in: [transaction_interface_1.TRANSACTION_TYPE.BOOKING, transaction_interface_1.TRANSACTION_TYPE.EXTEND] },
                createdAt: { $gte: start, $lte: end },
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
                "booking.bookingStatus": booking_interface_1.BOOKING_STATUS.COMPLETED, // শুধু COMPLETED
            },
        },
        {
            $group: {
                _id: { $month: "$createdAt" },
                totalRevenue: {
                    $sum: {
                        $add: [
                            { $ifNull: ["$charges.platformFee", 0] },
                            { $ifNull: ["$charges.adminCommission", 0] },
                        ],
                    },
                },
                platformFee: {
                    $sum: { $ifNull: ["$charges.platformFee", 0] },
                },
                adminCommission: {
                    $sum: { $ifNull: ["$charges.adminCommission", 0] },
                },
                hostEarnings: {
                    $sum: { $ifNull: ["$charges.hostCommission", 0] },
                },
                grossRevenue: {
                    $sum: "$amount",
                },
            },
        },
        {
            $project: {
                month: "$_id",
                totalRevenue: 1,
                platformFee: 1,
                adminCommission: 1,
                hostEarnings: 1,
                grossRevenue: 1,
                _id: 0,
            },
        },
        { $sort: { month: 1 } },
    ]);
    const result = Array.from({ length: 12 }, (_, i) => {
        const monthData = chartData.find((d) => d.month === i + 1);
        return {
            month: i + 1,
            totalRevenue: (monthData === null || monthData === void 0 ? void 0 : monthData.totalRevenue) || 0,
            platformFee: (monthData === null || monthData === void 0 ? void 0 : monthData.platformFee) || 0,
            adminCommission: (monthData === null || monthData === void 0 ? void 0 : monthData.adminCommission) || 0,
            hostEarnings: (monthData === null || monthData === void 0 ? void 0 : monthData.hostEarnings) || 0,
            grossRevenue: (monthData === null || monthData === void 0 ? void 0 : monthData.grossRevenue) || 0,
        };
    });
    return { year: currentYear, data: result };
});
const getYearlyBookingAndUserChart = (year) => __awaiter(void 0, void 0, void 0, function* () {
    const targetYear = year || new Date().getUTCFullYear();
    const start = new Date(`${targetYear}-01-01T00:00:00.000Z`);
    const end = new Date(`${targetYear}-12-31T23:59:59.999Z`);
    const bookingPipeline = [
        {
            $match: {
                status: transaction_interface_1.TRANSACTION_STATUS.SUCCESS,
                type: { $in: [transaction_interface_1.TRANSACTION_TYPE.BOOKING, transaction_interface_1.TRANSACTION_TYPE.EXTEND] },
                createdAt: { $gte: start, $lte: end },
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
                "booking.bookingStatus": booking_interface_1.BOOKING_STATUS.COMPLETED, // শুধু COMPLETED
            },
        },
        {
            $group: {
                _id: { $month: "$createdAt" },
                totalBookings: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ];
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
        transaction_model_1.Transaction.aggregate(bookingPipeline),
        user_model_1.User.aggregate(userPipeline),
    ]);
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
    // Total Customers (unique users with at least 1 successful COMPLETED BOOKING or EXTEND)
    const customersAgg = yield transaction_model_1.Transaction.aggregate([
        {
            $match: {
                status: transaction_interface_1.TRANSACTION_STATUS.SUCCESS,
                type: { $in: [transaction_interface_1.TRANSACTION_TYPE.BOOKING, transaction_interface_1.TRANSACTION_TYPE.EXTEND] },
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
                "booking.bookingStatus": booking_interface_1.BOOKING_STATUS.COMPLETED, // শুধু COMPLETED
            },
        },
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
    var _a;
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
    // totalBookings = BOOKING + EXTEND — শুধু COMPLETED
    const transactionAgg = yield transaction_model_1.Transaction.aggregate([
        {
            $match: {
                status: transaction_interface_1.TRANSACTION_STATUS.SUCCESS,
                type: { $in: [transaction_interface_1.TRANSACTION_TYPE.BOOKING, transaction_interface_1.TRANSACTION_TYPE.EXTEND] },
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
                "booking.bookingStatus": booking_interface_1.BOOKING_STATUS.COMPLETED, // শুধু COMPLETED
            },
        },
        {
            $count: "totalBookings",
        },
    ]);
    const stats = bookingAgg[0] || {
        ongoingBookings: 0,
        cancelledBookings: 0,
    };
    return {
        totalBookings: ((_a = transactionAgg[0]) === null || _a === void 0 ? void 0 : _a.totalBookings) || 0,
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
                type: { $in: [transaction_interface_1.TRANSACTION_TYPE.BOOKING, transaction_interface_1.TRANSACTION_TYPE.EXTEND] }, // BOOKING + EXTEND
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
                type: { $in: [transaction_interface_1.TRANSACTION_TYPE.BOOKING, transaction_interface_1.TRANSACTION_TYPE.EXTEND] }, // BOOKING + EXTEND
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
                "booking.bookingStatus": booking_interface_1.BOOKING_STATUS.COMPLETED, // শুধু COMPLETED
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
    const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
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
