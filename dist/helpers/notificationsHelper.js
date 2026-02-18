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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotifications = void 0;
const notification_model_1 = require("../app/modules/notification/notification.model");
const sendNotifications = (data) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield notification_model_1.Notification.create(data);
    //@ts-ignore
    const socketIo = global.io;
    if (socketIo) {
        socketIo.emit(`get-notification::${data === null || data === void 0 ? void 0 : data.receiver}`, result);
    }
    return result;
});
exports.sendNotifications = sendNotifications;
