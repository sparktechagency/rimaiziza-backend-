"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
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
const support = (id, payload) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.User.isExistUserById(id);
    if (!user) {
      throw new ApiErrors_1.default(404, "No user is found in the database");
    }
    payload.userId = new mongoose_1.Types.ObjectId(id);
    const supportEntry = yield support_model_1.Support.create(payload);
    const emailPayload = {
      to: config_1.default.support_receiver_email || "support@yourdomain.com", // Admin email
      subject: `Support Request: ${payload.subject}`,
      html: `
  <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;
  border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;
  background-color:#ffffff;box-shadow:0 4px 12px rgba(0,0,0,0.06)">

    <!-- Header -->
    <div style="background-color:#009e99;padding:25px 20px;color:white;text-align:center">
      <img 
        src="https://res.cloudinary.com/dphkhbunv/image/upload/v1764838083/E4E36157-7B0A-426F-A544-52A5091A7DEB_eueode.jpg" 
        alt="GO CONNECTE Logo"
        style="width:90px;height:auto;margin-bottom:10px;border-radius:8px;"
      />
      <h2 style="margin:0;font-size:24px;font-weight:600;letter-spacing:1px;">
        GO CONNECTE – Support Request
      </h2>
    </div>

    <!-- Body -->
    <div style="padding:25px;background-color:#ffffff">
      <p style="font-size:16px;margin-bottom:12px;">
        <strong>Requester Name:</strong> ${user.fullName}
      </p>

      <p style="font-size:16px;margin-bottom:12px;">
        <strong>Requester Email:</strong> ${payload.email}
      </p>

      <p style="font-size:16px;margin-bottom:12px;">
        <strong>Subject:</strong> ${payload.subject}
      </p>

      <div style="margin-top:22px">
        <p style="font-size:16px;margin-bottom:6px;"><strong>Message:</strong></p>

        <div style="background-color:#f8fdfd;padding:18px;border-left:4px solid #009e99;
        border-radius:4px;font-size:15px;line-height:1.6">
          ${payload.message}
        </div>
      </div>

      <div style="text-align:center;margin-top:35px">
        <a 
          href="mailto:${payload.email}" 
          style="background-color:#009e99;color:#ffffff;padding:14px 24px;
          border-radius:6px;text-decoration:none;font-size:16px;display:inline-block;
          font-weight:600;letter-spacing:0.3px"
        >
          Reply to ${user.fullName}
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color:#f5f5f5;padding:18px;text-align:center;
    font-size:12px;color:#666;">
      © ${new Date().getFullYear()} GO CONNECTE. All rights reserved.
    </div>

  </div>
`,
    };
    yield emailHelper_1.emailHelper.sendEmail(emailPayload);
    return supportEntry;
  });
const getAllSupportsFromDB = (query) =>
  __awaiter(void 0, void 0, void 0, function* () {
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
      throw new ApiErrors_1.default(
        404,
        "Supports data are not found in the database",
      );
    }
    return {
      data: supports,
      meta,
    };
  });
const getSupportByIdFromDB = (id) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const support = yield support_model_1.Support.findById(id).populate({
      path: "userId",
      select: "firstName lastName role profileImage email _id phone",
    });
    if (!support) {
      throw new ApiErrors_1.default(404, "No support is found by this ID");
    }
    return support;
  });
const deleteSupportByIdFromDB = (id) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const support = yield support_model_1.Support.findByIdAndDelete(id);
    if (!support) {
      throw new ApiErrors_1.default(
        400,
        "Failed to delete this support by this ID",
      );
    }
    return support;
  });
exports.SupportServices = {
  support,
  getAllSupportsFromDB,
  getSupportByIdFromDB,
  deleteSupportByIdFromDB,
};
