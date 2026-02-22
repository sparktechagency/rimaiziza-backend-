"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.FavoriteCarServices = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const http_status_codes_1 = require("http-status-codes");
const favoriteCar_model_1 = require("./favoriteCar.model");
const review_service_1 = require("../review/review.service");
const review_interface_1 = require("../review/review.interface");
const car_utils_1 = require("../car/car.utils");
const checkFavoriteCarStatus = (userId, referenceId) => __awaiter(void 0, void 0, void 0, function* () {
    const favorite = yield favoriteCar_model_1.FavoriteCar.findOne({ userId, referenceId });
    return { isFavorite: !!favorite };
});
const toggleFavorite = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, referenceId } = payload;
    const existing = yield favoriteCar_model_1.FavoriteCar.findOne({ userId, referenceId });
    if (existing) {
        yield favoriteCar_model_1.FavoriteCar.deleteOne({ _id: existing._id });
        return { message: "Favorite removed successfully", isFavorite: false };
    }
    const newFavorite = yield favoriteCar_model_1.FavoriteCar.create({
        userId,
        referenceId: new mongoose_1.default.Types.ObjectId(referenceId),
    });
    return {
        message: "Favorite added successfully",
        isFavorite: true,
        data: newFavorite,
    };
});
const getFavorite = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const favorites = yield favoriteCar_model_1.FavoriteCar.find({ userId })
        .populate({
        path: "referenceId", // Car
    })
        .populate({
        path: "userId",
        select: "_id firstName email lastName role profileImage",
    })
        .lean();
    if (!favorites.length)
        return favorites;
    // ---------- STEP 1: Extract carIds ----------
    const carIds = favorites
        .map((fav) => { var _a; return (_a = fav.referenceId) === null || _a === void 0 ? void 0 : _a._id; })
        .filter(Boolean)
        .map((id) => new mongoose_1.Types.ObjectId(id));
    // ---------- STEP 2: Get trip count map ----------
    const tripCountMap = yield (0, car_utils_1.getCarTripCountMap)(carIds);
    // ---------- STEP 3: Attach trips + rating ----------
    const finalFavorites = yield Promise.all(favorites.map((fav) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c;
        console.log(fav, "fav");
        const carId = (_b = (_a = fav.referenceId) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString();
        if (!carId)
            return fav;
        const hostId = ((_c = fav.referenceId) === null || _c === void 0 ? void 0 : _c.userId)
            ? fav.referenceId.userId.toString()
            : null;
        let reviewSummary = null;
        if (hostId) {
            reviewSummary = yield review_service_1.ReviewServices.getReviewSummary(hostId, review_interface_1.REVIEW_TARGET_TYPE.HOST);
        }
        return Object.assign(Object.assign({}, fav), { referenceId: Object.assign(Object.assign({}, fav.referenceId), { trips: tripCountMap[carId] || 0, averageRating: reviewSummary
                    ? reviewSummary.averageRating
                    : undefined, totalReviews: reviewSummary ? reviewSummary.totalReviews : undefined, starCounts: reviewSummary ? reviewSummary.starCounts : undefined, reviews: reviewSummary ? reviewSummary.reviews : undefined }) });
    })));
    return finalFavorites;
});
const getSingleFavorite = (userId, favoriteId) => __awaiter(void 0, void 0, void 0, function* () {
    const favorite = yield favoriteCar_model_1.FavoriteCar.findOne({
        _id: favoriteId,
        userId,
    })
        .populate({
        path: "referenceId",
    })
        .lean();
    if (!favorite) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "Favorite not found");
    }
    return favorite;
});
const deleteFavorite = (userId, referenceId) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield favoriteCar_model_1.FavoriteCar.deleteOne({ userId, referenceId });
    if (!result.deletedCount) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "Favorite not found");
    }
    return { message: "Favorite removed successfully" };
});
exports.FavoriteCarServices = {
    toggleFavorite,
    checkFavoriteCarStatus,
    getFavorite,
    getSingleFavorite,
    deleteFavorite,
};
