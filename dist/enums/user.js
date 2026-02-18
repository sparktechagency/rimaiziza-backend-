"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HOST_STATUS = exports.STATUS = exports.GENDER = exports.USER_ROLES = void 0;
var USER_ROLES;
(function (USER_ROLES) {
    USER_ROLES["ADMIN"] = "ADMIN";
    USER_ROLES["SUPER_ADMIN"] = "SUPER_ADMIN";
    USER_ROLES["USER"] = "USER";
    USER_ROLES["HOST"] = "HOST";
})(USER_ROLES || (exports.USER_ROLES = USER_ROLES = {}));
var GENDER;
(function (GENDER) {
    GENDER["MALE"] = "MALE";
    GENDER["FEMALE"] = "FEMALE";
})(GENDER || (exports.GENDER = GENDER = {}));
var STATUS;
(function (STATUS) {
    STATUS["ACTIVE"] = "ACTIVE";
    STATUS["INACTIVE"] = "INACTIVE";
})(STATUS || (exports.STATUS = STATUS = {}));
var HOST_STATUS;
(function (HOST_STATUS) {
    HOST_STATUS["NONE"] = "NONE";
    HOST_STATUS["PENDING"] = "PENDING";
    HOST_STATUS["APPROVED"] = "APPROVED";
    HOST_STATUS["REJECTED"] = "REJECTED";
})(HOST_STATUS || (exports.HOST_STATUS = HOST_STATUS = {}));
