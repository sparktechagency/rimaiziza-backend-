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
exports.UserService = void 0;
const user_1 = require("../../../enums/user");
const user_model_1 = require("./user.model");
const http_status_codes_1 = require("http-status-codes");
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const unlinkFile_1 = __importDefault(require("../../../shared/unlinkFile"));
const jwtHelper_1 = require("../../../helpers/jwtHelper");
const config_1 = __importDefault(require("../../../config"));
const queryBuilder_1 = __importDefault(require("../../builder/queryBuilder"));
const generateOTP_1 = __importDefault(require("../../../util/generateOTP"));
const emailTemplate_1 = require("../../../shared/emailTemplate");
const emailHelper_1 = require("../../../helpers/emailHelper");
const generateYearBasedId_1 = require("../../../helpers/generateYearBasedId");
const mongoose_1 = require("mongoose");
const booking_model_1 = require("../booking/booking.model");
const booking_interface_1 = require("../booking/booking.interface");
const transaction_interface_1 = require("../transaction/transaction.interface");
const review_service_1 = require("../review/review.service");
const review_interface_1 = require("../review/review.interface");
const car_model_1 = require("../car/car.model");
const car_utils_1 = require("../car/car.utils");
const bcrypt_1 = __importDefault(require("bcrypt"));
const notificationsHelper_1 = require("../../../helpers/notificationsHelper");
const notification_constant_1 = require("../notification/notification.constant");
// --- ADMIN SERVICES ---
const createAdminToDB = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    delete payload.phone;
    const isExistAdmin = yield user_model_1.User.findOne({ email: payload.email });
    if (isExistAdmin) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.CONFLICT, "This Email already taken");
    }
    const adminPayload = Object.assign(Object.assign({}, payload), { verified: true, status: user_1.STATUS.ACTIVE, role: user_1.USER_ROLES.ADMIN });
    const createAdmin = yield user_model_1.User.create(adminPayload);
    return createAdmin;
});
const getAdminFromDB = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const baseQuery = user_model_1.User.find({
        role: { $in: [user_1.USER_ROLES.ADMIN] },
        status: user_1.STATUS.ACTIVE,
        verified: true,
    }).select("name email role profileImage createdAt updatedAt status");
    const queryBuilder = new queryBuilder_1.default(baseQuery, query)
        .search(["name", "email"])
        .sort()
        .fields()
        .paginate();
    const admins = yield queryBuilder.modelQuery;
    const meta = yield queryBuilder.countTotal();
    return {
        data: admins,
        meta,
    };
});
const updateAdminStatusByIdToDB = (id, status) => __awaiter(void 0, void 0, void 0, function* () {
    if (![user_1.STATUS.ACTIVE, user_1.STATUS.INACTIVE].includes(status)) {
        throw new ApiErrors_1.default(400, "Status must be either 'ACTIVE' or 'INACTIVE'");
    }
    const user = yield user_model_1.User.findOne({
        _id: id,
        role: user_1.USER_ROLES.ADMIN,
    });
    if (!user) {
        throw new ApiErrors_1.default(404, "No admin is found by this user ID");
    }
    const result = yield user_model_1.User.findByIdAndUpdate(id, { status }, { new: true });
    if (!result) {
        throw new ApiErrors_1.default(400, "Failed to change status by this user ID");
    }
    return result;
});
const deleteAdminFromDB = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const isExistAdmin = yield user_model_1.User.findByIdAndDelete(id);
    if (!isExistAdmin) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "Failed to delete Admin");
    }
    return isExistAdmin;
});
// --- HOST SERVICES ---
const createHostToDB = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const isExistHost = yield user_model_1.User.findOne({ email: payload.email });
    if (isExistHost) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.CONFLICT, "This Email already taken");
    }
    const membershipId = yield (0, generateYearBasedId_1.generateMembershipId)();
    const hostPayload = Object.assign(Object.assign({}, payload), { verified: true, status: user_1.STATUS.ACTIVE, role: user_1.USER_ROLES.HOST, membershipId });
    const createHost = yield user_model_1.User.create(hostPayload);
    // notify admin
    const admin = yield user_model_1.User.findOne({ role: user_1.USER_ROLES.SUPER_ADMIN }).select("_id name");
    if (admin) {
        yield (0, notificationsHelper_1.sendNotifications)({
            text: `New host account created successfully by admin (${admin.name || admin._id})`,
            receiver: admin._id.toString(),
            type: notification_constant_1.NOTIFICATION_TYPE.ADMIN,
            referenceId: createHost._id.toString(),
        });
    }
    return createHost;
});
const ghostLoginAsHost = (superAdmin, hostId) => __awaiter(void 0, void 0, void 0, function* () {
    if (superAdmin.role !== user_1.USER_ROLES.SUPER_ADMIN) {
        throw new ApiErrors_1.default(403, "Unauthorized: Only SuperAdmin can use ghost mode");
    }
    const host = yield user_model_1.User.findById(hostId);
    if (!host || host.role !== user_1.USER_ROLES.HOST) {
        throw new ApiErrors_1.default(404, "Host not found");
    }
    // Generate JWT as host
    const token = jwtHelper_1.jwtHelper.createToken({
        id: host._id,
        email: host.email,
        role: user_1.USER_ROLES.HOST,
    }, config_1.default.jwt.jwt_secret, config_1.default.jwt.jwt_expire_in);
    return {
        accessToken: token,
        host: {
            id: host._id,
            name: host.name,
            email: host.email,
            membershipId: host.membershipId,
        },
    };
});
// const getAllHostFromDB = async (query: any) => {
//   //  Fetch hosts using QueryBuilder
//   const baseQuery = User.find({
//     role: USER_ROLES.HOST,
//     status: STATUS.ACTIVE,
//     verified: true,
//   });
//   const queryBuilder = new QueryBuilder(baseQuery, query)
//     .search(["name", "email", "membershipId"])
//     .sort()
//     .fields()
//     .filter()
//     .paginate();
//   const hosts = await queryBuilder.modelQuery;
//   const meta = await queryBuilder.countTotal();
//   if (!hosts || hosts.length === 0) throw new ApiError(404, "No hosts found");
//   const hostIds = hosts.map(h => h._id);
//   // Aggregate hosts with full vehicle data and count
//   const hostsWithVehicles = await User.aggregate([
//     { $match: { _id: { $in: hostIds } } },
//     {
//       $lookup: {
//         from: "cars",
//         let: { hostId: "$_id" },
//         pipeline: [
//           {
//             $match: {
//               $expr: { $eq: ["$assignedHost", "$$hostId"] },
//             },
//           },
//         ],
//         as: "vehicles",
//       },
//     },
//     {
//       $addFields: {
//         vehicleCount: { $size: "$vehicles" },
//       },
//     },
//   ]);
//   return {
//     data: hostsWithVehicles,
//     meta,
//   };
// };
const getAllHostFromDB = (query) => __awaiter(void 0, void 0, void 0, function* () {
    // Fetch hosts using QueryBuilder
    const baseQuery = user_model_1.User.find({
        role: user_1.USER_ROLES.HOST,
        status: user_1.STATUS.ACTIVE,
        verified: true,
    });
    const queryBuilder = new queryBuilder_1.default(baseQuery, query)
        .search(["name", "email", "membershipId"])
        .sort()
        .fields()
        .filter()
        .paginate();
    const hosts = yield queryBuilder.modelQuery;
    const meta = yield queryBuilder.countTotal();
    if (!hosts || hosts.length === 0)
        throw new ApiErrors_1.default(404, "No hosts found");
    const hostIds = hosts.map((h) => h._id);
    // Aggregate hosts with vehicles
    const hostsWithVehicles = yield user_model_1.User.aggregate([
        { $match: { _id: { $in: hostIds } } },
        {
            $lookup: {
                from: "cars",
                let: { hostId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ["$assignedHost", "$$hostId"] },
                        },
                    },
                ],
                as: "vehicles",
            },
        },
        {
            $addFields: {
                vehicleCount: { $size: "$vehicles" },
            },
        },
    ]);
    // -------------------- Trips --------------------
    // Collect all carIds first for bulk trip aggregation
    const allCarIds = hostsWithVehicles.flatMap((host) => host.vehicles.map((v) => v._id));
    const tripMap = yield (0, car_utils_1.getCarTripCountMap)(allCarIds);
    // -------------------- Revenue & Attach trips --------------------
    yield Promise.all(hostsWithVehicles.map((host) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        const vehicleIds = host.vehicles.map((v) => v._id);
        // Trips: sum from map
        host.totalTrips = vehicleIds.reduce((acc, carId) => {
            return acc + (tripMap[carId.toString()] || 0);
        }, 0);
        // Revenue
        let totalRevenue = 0;
        if (vehicleIds.length) {
            const revenueBookings = yield booking_model_1.Booking.aggregate([
                {
                    $match: {
                        carId: { $in: vehicleIds },
                        bookingStatus: { $ne: booking_interface_1.BOOKING_STATUS.CANCELLED },
                        transactionId: { $exists: true, $ne: null },
                        isCanceledByHost: { $ne: true },
                        isCanceledByUser: { $ne: true },
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
                        "transaction.status": "SUCCESS",
                    },
                },
                {
                    $group: {
                        _id: null,
                        revenue: { $sum: "$transaction.charges.hostCommission" },
                    },
                },
            ]);
            totalRevenue = (_b = (_a = revenueBookings[0]) === null || _a === void 0 ? void 0 : _a.revenue) !== null && _b !== void 0 ? _b : 0;
        }
        host.totalRevenue = totalRevenue;
    })));
    return {
        data: hostsWithVehicles,
        meta,
    };
});
const getHostByIdFromDB = (id) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const result = yield user_model_1.User.aggregate([
        {
            $match: {
                _id: new mongoose_1.Types.ObjectId(id),
                role: user_1.USER_ROLES.HOST,
            },
        },
        {
            $lookup: {
                from: "cars",
                let: { hostId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ["$$hostId", "$assignedHosts"] }, // single host
                        },
                    },
                    { $project: { assignedHosts: 0 } },
                ],
                as: "vehicles",
            },
        },
        {
            $addFields: {
                vehicleCount: { $size: "$vehicles" },
            },
        },
    ]);
    if (!result.length)
        throw new ApiErrors_1.default(404, "No host is found in the database by this ID");
    const host = result[0];
    // -------------------- Trips --------------------
    let totalTrips = 0;
    const vehicleIds = host.vehicles.map((v) => v._id);
    for (const carId of vehicleIds) {
        totalTrips += yield (0, car_utils_1.getCarTripCount)(carId);
    }
    // -------------------- Revenue --------------------
    // -------------------- Revenue (safe calculation) --------------------
    let totalRevenue = 0;
    if (vehicleIds.length) {
        const revenueBookings = yield booking_model_1.Booking.aggregate([
            {
                $match: {
                    carId: { $in: vehicleIds },
                    bookingStatus: { $ne: booking_interface_1.BOOKING_STATUS.CANCELLED },
                    transactionId: { $exists: true, $ne: null },
                    isCanceledByHost: { $ne: true },
                    isCanceledByUser: { $ne: true },
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
                },
            },
            {
                $group: {
                    _id: null,
                    revenue: { $sum: "$transaction.charges.hostCommission" },
                },
            },
        ]);
        totalRevenue = (_b = (_a = revenueBookings[0]) === null || _a === void 0 ? void 0 : _a.revenue) !== null && _b !== void 0 ? _b : 0;
    }
    // Attach trips and revenue
    host.totalTrips = totalTrips;
    host.totalRevenue = totalRevenue;
    return host;
});
const updateHostStatusByIdToDB = (id, status) => __awaiter(void 0, void 0, void 0, function* () {
    if (![user_1.STATUS.ACTIVE, user_1.STATUS.INACTIVE].includes(status)) {
        throw new ApiErrors_1.default(400, "Status must be either 'ACTIVE' or 'INACTIVE'");
    }
    const user = yield user_model_1.User.findOne({
        _id: id,
        role: user_1.USER_ROLES.HOST,
    });
    if (!user) {
        throw new ApiErrors_1.default(404, "No host is found by this host ID");
    }
    const result = yield user_model_1.User.findByIdAndUpdate(id, { status }, { new: true });
    if (!result) {
        throw new ApiErrors_1.default(400, "Failed to change status by this host ID");
    }
    return result;
});
const deleteHostByIdFromD = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.User.findOne({
        _id: id,
        role: user_1.USER_ROLES.HOST,
    });
    if (!user) {
        throw new ApiErrors_1.default(404, "Host doest not exist in the database");
    }
    const result = yield user_model_1.User.findByIdAndDelete(id);
    if (!result) {
        throw new ApiErrors_1.default(400, "Failed to delete user by this ID");
    }
    // notify admin
    const admin = yield user_model_1.User.findOne({ role: user_1.USER_ROLES.SUPER_ADMIN }).select("_id name");
    if (admin) {
        yield (0, notificationsHelper_1.sendNotifications)({
            text: `Host deleted successfully by admin (${admin.name || admin._id})`,
            receiver: admin._id.toString(),
            type: notification_constant_1.NOTIFICATION_TYPE.ADMIN,
            referenceId: result._id.toString(),
        });
    }
    return result;
});
const getTotalUsersAndHostsFromDB = () => __awaiter(void 0, void 0, void 0, function* () {
    const [totalUsers, totalHosts] = yield Promise.all([
        user_model_1.User.countDocuments({
            role: user_1.USER_ROLES.USER,
            status: user_1.STATUS.ACTIVE,
            verified: true,
        }),
        user_model_1.User.countDocuments({
            role: user_1.USER_ROLES.HOST,
            status: user_1.STATUS.ACTIVE,
            verified: true,
        }),
    ]);
    return { totalUsers, totalHosts };
});
// --- USER SERVICES ---
const createUserToDB = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const isExistUser = yield user_model_1.User.findOne({ email: payload.email });
    if (isExistUser) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.CONFLICT, "This Email already taken");
    }
    const createUser = yield user_model_1.User.create(payload);
    if (!createUser) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "Failed to create user");
    }
    //send email
    const otp = (0, generateOTP_1.default)();
    const values = {
        name: createUser.name,
        otp: otp,
        email: createUser.email,
    };
    const createAccountTemplate = emailTemplate_1.emailTemplate.createAccount(values);
    emailHelper_1.emailHelper.sendEmail(createAccountTemplate);
    //save to DB
    const authentication = {
        oneTimeCode: otp,
        expireAt: new Date(Date.now() + 3 * 60000),
    };
    yield user_model_1.User.findOneAndUpdate({ _id: createUser._id }, { $set: { authentication } });
    const createToken = jwtHelper_1.jwtHelper.createToken({
        id: createUser._id,
        email: createUser.email,
        role: createUser.role,
    }, config_1.default.jwt.jwt_secret, config_1.default.jwt.jwt_expire_in);
    const result = {
        token: createToken,
        user: createUser,
    };
    // notify admin
    const admin = yield user_model_1.User.findOne({ role: user_1.USER_ROLES.SUPER_ADMIN }).select("_id name");
    if (admin) {
        yield (0, notificationsHelper_1.sendNotifications)({
            text: `New user signed up successfully by admin (${admin.name || admin._id})`,
            receiver: admin._id.toString(),
            type: notification_constant_1.NOTIFICATION_TYPE.ADMIN,
            referenceId: result.user._id.toString(),
        });
    }
    return result;
});
// const getUserProfileFromDB = async (
//   user: JwtPayload,
// ): Promise<Partial<IUser>> => {
//   const { id } = user;
//   const isExistUser: any = await User.isExistUserById(id);
//   if (!isExistUser) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
//   }
//   return isExistUser;
// };
const getUserProfileFromDB = (user) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = user;
    const isExistUser = yield user_model_1.User.isExistUserById(id);
    if (!isExistUser) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "User doesn't exist!");
    }
    const profile = Object.assign({}, isExistUser.toObject());
    // যদি host হয়, extra stats
    if (profile.role === user_1.USER_ROLES.HOST) {
        // Total bookings
        const totalBookings = yield booking_model_1.Booking.countDocuments({ hostId: id });
        // Confirmed/Completed bookings
        const completedBookings = yield booking_model_1.Booking.countDocuments({
            hostId: id,
            bookingStatus: { $in: [booking_interface_1.BOOKING_STATUS.COMPLETED] },
        });
        // Success rate %
        const successRate = totalBookings > 0
            ? Math.round((completedBookings / totalBookings) * 100)
            : 0;
        const hostCar = yield car_model_1.Car.findOne({ assignedHosts: id }, { _id: 1 });
        if (!hostCar)
            throw new ApiErrors_1.default(404, "Host does not have any car");
        const trips = yield (0, car_utils_1.getCarTripCount)(hostCar === null || hostCar === void 0 ? void 0 : hostCar._id);
        // Review summary
        const reviewSummary = yield review_service_1.ReviewServices.getReviewSummary(id, review_interface_1.REVIEW_TARGET_TYPE.HOST);
        profile.totalBookings = totalBookings;
        // profile.completedBookings = completedBookings;
        profile.successRate = successRate;
        profile.averageRating = reviewSummary.averageRating;
        // profile.totalReviews = reviewSummary.totalReviews;
        // profile.starCounts = reviewSummary.starCounts;
        // profile.reviews = reviewSummary.reviews;
        profile.trips = trips;
    }
    return profile;
});
const updateProfileToDB = (user, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = user;
    const isExistUser = yield user_model_1.User.isExistUserById(id);
    if (!isExistUser) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "User doesn't exist!");
    }
    //unlink file here
    if (payload.profileImage && isExistUser.profileImage) {
        (0, unlinkFile_1.default)(isExistUser.profileImage);
    }
    const updateDoc = yield user_model_1.User.findOneAndUpdate({ _id: id }, payload, {
        new: true,
    });
    return updateDoc;
});
const switchProfileToDB = (userId, role) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.User.findById(userId);
    if (!user)
        throw new ApiErrors_1.default(404, "This user is not found in the database");
    if (![user_1.USER_ROLES.USER, user_1.USER_ROLES.HOST].includes(role))
        throw new ApiErrors_1.default(400, "Role is must be either 'USER' or 'HOST'");
    const updatedUser = yield user_model_1.User.findByIdAndUpdate(userId, { role }, { new: true });
    if (!updatedUser)
        throw new ApiErrors_1.default(400, "Failed to update role");
    const createToken = jwtHelper_1.jwtHelper.createToken({
        id: updatedUser._id,
        email: updatedUser.email,
        role: updatedUser.role,
    }, config_1.default.jwt.jwt_secret, config_1.default.jwt.jwt_expire_in);
    const result = {
        token: createToken,
        user: updatedUser,
    };
    return result;
});
const getAllUsersFromDB = (query) => __awaiter(void 0, void 0, void 0, function* () {
    // Base user query
    const baseQuery = user_model_1.User.find({
        role: user_1.USER_ROLES.USER,
        status: user_1.STATUS.ACTIVE,
        verified: true,
    });
    const queryBuilder = new queryBuilder_1.default(baseQuery, query)
        .search(["name", "email"])
        .sort()
        .fields()
        .filter()
        .paginate();
    // Fetch paginated users
    const users = yield queryBuilder.modelQuery;
    const meta = yield queryBuilder.countTotal();
    if (!users || users.length === 0)
        throw new ApiErrors_1.default(404, "No users are found in the database");
    // Convert users to plain objects for aggregation join
    const userIds = users.map((u) => u._id);
    // Aggregate bookings per user
    const bookingStats = yield booking_model_1.Booking.aggregate([
        {
            $match: {
                userId: { $in: userIds },
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
            },
        },
        {
            $group: {
                _id: "$userId",
                totalBookings: { $sum: 1 },
                totalSpent: { $sum: "$transaction.amount" },
            },
        },
    ]);
    // Map booking stats to users
    const usersWithStats = users.map((user) => {
        const stats = bookingStats.find((b) => b._id.equals(user._id));
        return Object.assign(Object.assign({}, user.toObject()), { bookingCount: (stats === null || stats === void 0 ? void 0 : stats.totalBookings) || 0, totalSpent: (stats === null || stats === void 0 ? void 0 : stats.totalSpent) || 0 });
    });
    return {
        data: usersWithStats,
        meta,
    };
});
const getUserByIdFromDB = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield user_model_1.User.findOne({
        _id: id,
        role: user_1.USER_ROLES.USER,
    });
    if (!result)
        throw new ApiErrors_1.default(404, "No user is found in the database by this ID");
    return result;
});
const updateUserStatusByIdToDB = (id, status) => __awaiter(void 0, void 0, void 0, function* () {
    if (![user_1.STATUS.ACTIVE, user_1.STATUS.INACTIVE].includes(status)) {
        throw new ApiErrors_1.default(400, "Status must be either 'ACTIVE' or 'INACTIVE'");
    }
    const user = yield user_model_1.User.findOne({
        _id: id,
        role: user_1.USER_ROLES.USER,
    });
    if (!user) {
        throw new ApiErrors_1.default(404, "No user is found by this user ID");
    }
    const result = yield user_model_1.User.findByIdAndUpdate(id, { status }, { new: true });
    if (!result) {
        throw new ApiErrors_1.default(400, "Failed to change status by this user ID");
    }
    return result;
});
const deleteUserByIdFromD = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.User.findOne({
        _id: id,
        role: user_1.USER_ROLES.USER,
    });
    if (!user) {
        throw new ApiErrors_1.default(404, "User doest not exist in the database");
    }
    const result = yield user_model_1.User.findByIdAndDelete(id);
    if (!result) {
        throw new ApiErrors_1.default(400, "Failed to delete user by this ID");
    }
    return result;
});
const deleteProfileFromDB = (id, password) => __awaiter(void 0, void 0, void 0, function* () {
    // user exists?
    const user = yield user_model_1.User.findById(id).select("+password");
    if (!user) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "User doesn't exist!");
    }
    // check password
    const isPasswordMatch = yield bcrypt_1.default.compare(password, user.password);
    if (!isPasswordMatch) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, "Password is incorrect!");
    }
    // delete user
    const result = yield user_model_1.User.findByIdAndDelete(id);
    if (!result) {
        throw new ApiErrors_1.default(400, "Failed to delete this user");
    }
    return result;
});
exports.UserService = {
    createUserToDB,
    getAdminFromDB,
    deleteAdminFromDB,
    getUserProfileFromDB,
    getAllUsersFromDB,
    getUserByIdFromDB,
    updateProfileToDB,
    createHostToDB,
    ghostLoginAsHost,
    getAllHostFromDB,
    getHostByIdFromDB,
    updateHostStatusByIdToDB,
    deleteHostByIdFromD,
    getTotalUsersAndHostsFromDB,
    createAdminToDB,
    switchProfileToDB,
    updateUserStatusByIdToDB,
    updateAdminStatusByIdToDB,
    deleteUserByIdFromD,
    deleteProfileFromDB,
};
