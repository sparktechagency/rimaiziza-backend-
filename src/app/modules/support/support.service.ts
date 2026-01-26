import { Types } from "mongoose";
import config from "../../../config";
import ApiError from "../../../errors/ApiErrors";
import { emailHelper } from "../../../helpers/emailHelper";
import { ISendEmail } from "../../../types/email";
import { User } from "../user/user.model";
import { TSupport } from "./support.interface";
import { Support } from "./support.model";
import QueryBuilder from "../../builder/queryBuilder";

const support = async (id: string, payload: TSupport) => {
  const user = await User.isExistUserById(id);

  if (!user) {
    throw new ApiError(404, "No user is found in the database");
  }

  payload.userId = new Types.ObjectId(id);

  const supportEntry = await Support.create(payload);

  const emailPayload: ISendEmail = {
    to: config.support_receiver_email || "support@yourdomain.com", // Admin email
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

  await emailHelper.sendEmail(emailPayload);

  return supportEntry;
};

const getAllSupportsFromDB = async (query: any) => {
  const baseQuery = Support.find().populate({
    path: "userId",
    select: "_id firstName lastName email phone role profileImage",
  });

  const queryBuilder = new QueryBuilder(baseQuery, query)
    .search(["name email subject userId"])
    .sort()
    .fields()
    .filter()
    .paginate();

  const supports = await queryBuilder.modelQuery;

  const meta = await queryBuilder.countTotal();

  if (!supports || supports.length === 0) {
    throw new ApiError(404, "Supports data are not found in the database");
  }

  return {
    data: supports,
    meta,
  };
};

const getSupportByIdFromDB = async (id: string) => {
  const support = await Support.findById(id).populate({
    path: "userId",
    select: "firstName lastName role profileImage email _id phone",
  });

  if (!support) {
    throw new ApiError(404, "No support is found by this ID");
  }

  return support;
};

const deleteSupportByIdFromDB = async (id: string) => {
  const support = await Support.findByIdAndDelete(id);
  if (!support) {
    throw new ApiError(400, "Failed to delete this support by this ID");
  }

  return support;
};

export const SupportServices = {
  support,
  getAllSupportsFromDB,
  getSupportByIdFromDB,
  deleteSupportByIdFromDB,
};
