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
exports.ChargesServices = exports.getDynamicCharges = void 0;
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const charges_model_1 = require("./charges.model");
const createChargesToDB = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield charges_model_1.Charges.findOneAndUpdate({}, Object.assign({}, payload), { upsert: true, new: true, overwrite: true }).lean();
    return result;
});
const getAllChargesFromDB = () => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield charges_model_1.Charges.findOne();
    if (!result) {
        throw new ApiErrors_1.default(404, "There are no charges is available in database");
    }
    return result;
});
const deleteChargesFromDB = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield charges_model_1.Charges.findByIdAndDelete(id);
    if (!result) {
        throw new ApiErrors_1.default(400, "Failed to delete charges by this ID");
    }
    return result;
});
const getDynamicCharges = (_a) => __awaiter(void 0, [_a], void 0, function* ({ totalAmount }) {
    const charges = yield getAllChargesFromDB();
    if (!charges) {
        throw new ApiErrors_1.default(404, "Charges configuration not found");
    }
    const normalize = (percent) => percent > 1 ? percent / 100 : percent;
    const platformPercent = normalize(charges.platformFee);
    const hostPercent = normalize(charges.hostCommission);
    const adminPercent = normalize(charges.adminCommission);
    // validate total percent
    const totalPercent = platformPercent + hostPercent + adminPercent;
    if (Math.abs(totalPercent - 1) > 0.0001) {
        throw new ApiErrors_1.default(400, "Invalid commission configuration");
    }
    const platformFee = +(totalAmount * platformPercent).toFixed(2);
    const hostCommission = +(totalAmount * hostPercent).toFixed(2);
    const adminCommission = +(totalAmount - platformFee - hostCommission).toFixed(2);
    return { platformFee, hostCommission, adminCommission };
});
exports.getDynamicCharges = getDynamicCharges;
exports.ChargesServices = {
    createChargesToDB,
    getAllChargesFromDB,
    deleteChargesFromDB,
};
