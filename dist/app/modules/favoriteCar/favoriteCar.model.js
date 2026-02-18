"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FavoriteCar = void 0;
const mongoose_1 = require("mongoose");
const favoriteCarSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    referenceId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: "Car",
    },
}, {
    timestamps: true,
    versionKey: false,
});
exports.FavoriteCar = (0, mongoose_1.model)("FavoriteCar", favoriteCarSchema);
