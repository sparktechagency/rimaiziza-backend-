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
exports.ChargesControllers = void 0;
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const charges_service_1 = require("./charges.service");
const createCharges = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const chargesData = req.body;
    const result = yield charges_service_1.ChargesServices.createChargesToDB(chargesData);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: 'Charges is created successfully',
        data: result,
    });
}));
const getAllCharges = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield charges_service_1.ChargesServices.getAllChargesFromDB();
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: 'Charges data are retrieved successfully',
        data: result,
    });
}));
const deleteCharges = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield charges_service_1.ChargesServices.deleteChargesFromDB(id);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: 'Charges data is deleted successfully',
        data: result,
    });
}));
exports.ChargesControllers = {
    createCharges,
    getAllCharges,
    deleteCharges,
};
