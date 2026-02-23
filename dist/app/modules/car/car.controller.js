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
exports.CarControllers = void 0;
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const car_service_1 = require("./car.service");
const createCar = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const carData = req.body;
    const result = yield car_service_1.CarServices.createCarToDB(carData);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: "Successfully created a car",
        data: result,
    });
}));
const getAllCars = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield car_service_1.CarServices.getAllCarsFromDB(req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: "Successfully retrieved all cars",
        data: result.cars,
        meta: result.meta,
    });
}));
const getCarById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    const result = yield car_service_1.CarServices.getCarByIdFromDB(id);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: "Successfully retrieved car by id",
        data: result,
    });
}));
const updateCarById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    const carData = req.body;
    console.log(carData);
    const result = yield car_service_1.CarServices.updateCarByIdToDB(id, carData);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: "Successfully updated car by id",
        data: result,
    });
}));
const deleteCarById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    const result = yield car_service_1.CarServices.deleteCarByIdFromDB(id);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: "Successfully deleted car by id",
        data: result,
    });
}));
const getNearbyCars = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b._id) || null;
    const result = yield car_service_1.CarServices.getNearbyCarsFromDB(Object.assign(Object.assign({}, req.query), { userId }));
    (0, sendResponse_1.default)(res, {
        statusCode: 200,
        success: true,
        message: "Cars retrieved successfully",
        data: result,
    });
}));
const getCarByIdForUser = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id: userId } = req.user;
    const { id } = req.params;
    const result = yield car_service_1.CarServices.getCarByIdForUserFromDB(id, userId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: "Successfully retrieved car by id for user",
        data: result,
    });
}));
const getAvailability = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { carId } = req.params;
    const { date } = req.query;
    // Validation
    if (!carId) {
        throw new ApiErrors_1.default(400, "Car ID is required");
    }
    if (!date || typeof date !== "string") {
        throw new ApiErrors_1.default(400, "Date query parameter is required (e.g., ?date=2025-12-12)");
    }
    // YYYY-MM-DD format check
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new ApiErrors_1.default(400, "Invalid date format. Use YYYY-MM-DD");
    }
    const availability = yield car_service_1.CarServices.getAvailability(carId, date);
    (0, sendResponse_1.default)(res, {
        statusCode: 200,
        success: true,
        message: "Car availability fetched successfully",
        data: Object.assign({ carId }, availability),
    });
}));
const getCarsByHost = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id: hostId } = req.user;
    const result = yield car_service_1.CarServices.getCarsByHostFromDB(hostId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: "Successfully retrieved cars by host",
        data: result,
    });
}));
exports.CarControllers = {
    createCar,
    getAllCars,
    getCarById,
    getCarByIdForUser,
    getAvailability,
    updateCarById,
    deleteCarById,
    getNearbyCars,
    getCarsByHost,
};
