"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Support = void 0;
const mongoose_1 = require("mongoose");
const supportSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
    },
    email: {
        type: String,
        required: true,
    },
    subject: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
    versionKey: false,
});
exports.Support = (0, mongoose_1.model)("Support", supportSchema);
