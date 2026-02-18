"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CarRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const user_1 = require("../../../enums/user");
const car_controller_1 = require("./car.controller");
const fileUploaderHandler_1 = __importDefault(require("../../middlewares/fileUploaderHandler"));
const parseAllFileData_1 = __importDefault(require("../../middlewares/parseAllFileData"));
const router = express_1.default.Router();
router
    .route("/nearby")
    .get((0, auth_1.default)(user_1.USER_ROLES.USER), car_controller_1.CarControllers.getNearbyCars);
router
    .route("/host")
    .get((0, auth_1.default)(user_1.USER_ROLES.HOST), car_controller_1.CarControllers.getCarsByHost);
router
    .route("/user/:id")
    .get((0, auth_1.default)(user_1.USER_ROLES.USER), car_controller_1.CarControllers.getCarByIdForUser);
router
    .route("/availability/:carId")
    .get((0, auth_1.default)(user_1.USER_ROLES.USER), car_controller_1.CarControllers.getAvailability);
router
    .route("/")
    .post((0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, fileUploaderHandler_1.default)(), (0, parseAllFileData_1.default)({ fieldName: "images", forceMultiple: true }, { fieldName: "coverImage", forceSingle: true }), car_controller_1.CarControllers.createCar)
    .get((0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), car_controller_1.CarControllers.getAllCars);
router
    .route("/:id")
    .get(car_controller_1.CarControllers.getCarById)
    .patch((0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, fileUploaderHandler_1.default)(), (0, parseAllFileData_1.default)({ fieldName: "images", forceMultiple: true }, { fieldName: "coverImage", forceSingle: true }), car_controller_1.CarControllers.updateCarById)
    .delete((0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), car_controller_1.CarControllers.deleteCarById);
exports.CarRoutes = router;
