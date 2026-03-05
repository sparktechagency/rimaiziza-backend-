"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generateOTP = () => {
    return Math.floor(1000 + Math.random() * 9000);
};
exports.default = generateOTP;
