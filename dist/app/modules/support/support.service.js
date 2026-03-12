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
exports.SupportServices = void 0;
const mongoose_1 = require("mongoose");
const config_1 = __importDefault(require("../../../config"));
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const emailHelper_1 = require("../../../helpers/emailHelper");
const user_model_1 = require("../user/user.model");
const support_model_1 = require("./support.model");
const queryBuilder_1 = __importDefault(require("../../builder/queryBuilder"));
const support = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.User.isExistUserById(id);
    if (!user) {
        throw new ApiErrors_1.default(404, "No user is found in the database");
    }
    payload.userId = new mongoose_1.Types.ObjectId(id);
    const supportEntry = yield support_model_1.Support.create(payload);
    const emailPayload = {
        to: config_1.default.support_receiver_email || "support@gogreenmatrix.com",
        subject: `GoGreenMatrix Support Request: ${payload.subject}`,
        html: `
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;background:#ffffff;">
    <tr>
      <td align="center">

        <table width="100%" cellpadding="0" cellspacing="0"
          style="max-width:600px;background:#ffffff;border-radius:12px;
          box-shadow:0 8px 24px rgba(0,0,0,0.06);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding:30px 20px;background:#a90707;color:#ffffff;">
              <h1 style="margin:0;font-size:22px;font-weight:600;letter-spacing:1px;">
                GoGreenMatrix
              </h1>
              <p style="margin:5px 0 0 0;font-size:13px;opacity:0.9;">
                Support Request Notification
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:35px 30px;color:#363636;font-size:15px;line-height:1.6;">

              <p style="margin-bottom:10px;">
                A new support request has been submitted from the platform.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                <tr>
                  <td style="padding:8px 0;font-weight:bold;width:150px;">Requester Name:</td>
                  <td style="padding:8px 0;">${payload.name || "Unknown"}</td>
                </tr>

                <tr>
                  <td style="padding:8px 0;font-weight:bold;">Requester Email:</td>
                  <td style="padding:8px 0;">${payload.email}</td>
                </tr>

                <tr>
                  <td style="padding:8px 0;font-weight:bold;">Subject:</td>
                  <td style="padding:8px 0;">${payload.subject}</td>
                </tr>
              </table>

              <div style="margin-top:25px;">
                <p style="margin-bottom:6px;font-weight:bold;">Message:</p>

                <div style="
                  background:#f8f8f8;
                  padding:18px;
                  border-left:4px solid #a90707;
                  border-radius:4px;
                  font-size:14px;
                  line-height:1.6;
                ">
                  ${payload.message}
                </div>
              </div>

              <div style="text-align:center;margin-top:35px;">
                <a
                  href="mailto:${payload.email}"
                  style="
                    background:#a90707;
                    color:#ffffff;
                    padding:14px 24px;
                    border-radius:6px;
                    text-decoration:none;
                    font-size:15px;
                    display:inline-block;
                    font-weight:600;
                  "
                >
                  Reply to ${payload.name || "Unknown"}
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center"
              style="padding:20px;font-size:12px;color:#888;background:#f7f7f7;">
              © ${new Date().getFullYear()} GoGreenMatrix. All rights reserved.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
`,
    };
    yield emailHelper_1.emailHelper.sendEmail(emailPayload);
    return supportEntry;
});
const getAllSupportsFromDB = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const baseQuery = support_model_1.Support.find().populate({
        path: "userId",
        select: "_id firstName lastName email phone role profileImage",
    });
    const queryBuilder = new queryBuilder_1.default(baseQuery, query)
        .search(["name email subject userId"])
        .sort()
        .fields()
        .filter()
        .paginate();
    const supports = yield queryBuilder.modelQuery;
    const meta = yield queryBuilder.countTotal();
    if (!supports || supports.length === 0) {
        throw new ApiErrors_1.default(404, "Supports data are not found in the database");
    }
    return {
        data: supports,
        meta,
    };
});
const getSupportByIdFromDB = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const support = yield support_model_1.Support.findById(id).populate({
        path: "userId",
        select: "firstName lastName role profileImage email _id phone",
    });
    if (!support) {
        throw new ApiErrors_1.default(404, "No support is found by this ID");
    }
    return support;
});
const deleteSupportByIdFromDB = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const support = yield support_model_1.Support.findByIdAndDelete(id);
    if (!support) {
        throw new ApiErrors_1.default(400, "Failed to delete this support by this ID");
    }
    return support;
});
exports.SupportServices = {
    support,
    getAllSupportsFromDB,
    getSupportByIdFromDB,
    deleteSupportByIdFromDB,
};
