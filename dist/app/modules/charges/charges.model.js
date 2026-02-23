"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Charges = exports.chargesSchema = void 0;
const mongoose_1 = require("mongoose");
exports.chargesSchema = new mongoose_1.Schema({
    platformFee: {
        type: Number,
        required: true,
    },
    hostCommission: {
        type: Number,
        required: true,
    },
    adminCommission: {
        type: Number,
        required: true,
    },
}, {
    timestamps: true,
    versionKey: false,
});
exports.Charges = (0, mongoose_1.model)("Charges", exports.chargesSchema);
