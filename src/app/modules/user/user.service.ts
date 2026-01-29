import { STATUS, USER_ROLES } from "../../../enums/user";
import { IUser } from "./user.interface";
import { JwtPayload, Secret } from "jsonwebtoken";
import { User } from "./user.model";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import unlinkFile from "../../../shared/unlinkFile";
import { jwtHelper } from "../../../helpers/jwtHelper";
import config from "../../../config";
import QueryBuilder from "../../builder/queryBuilder";
import generateOTP from "../../../util/generateOTP";
import { emailTemplate } from "../../../shared/emailTemplate";
import { emailHelper } from "../../../helpers/emailHelper";
import { generateMembershipId } from "../../../helpers/generateYearBasedId";

// --- ADMIN SERVICES ---
const createAdminToDB = async (payload: any): Promise<IUser> => {
  delete payload.phone;

  const isExistAdmin = await User.findOne({ email: payload.email });
  if (isExistAdmin) {
    throw new ApiError(StatusCodes.CONFLICT, "This Email already taken");
  }

  const adminPayload = {
    ...payload,
    verified: true,
    status: STATUS.ACTIVE,
    role: USER_ROLES.ADMIN,
  };

  const createAdmin = await User.create(adminPayload);

  return createAdmin;
};

const getAdminFromDB = async (query: any) => {
  const baseQuery = User.find({
    role: { $in: [USER_ROLES.ADMIN] },
    status: STATUS.ACTIVE,
    verified: true,
  }).select("name email role profileImage createdAt updatedAt status");

  const queryBuilder = new QueryBuilder<IUser>(baseQuery, query)
    .search(["name", "email"])
    .sort()
    .fields()
    .paginate();

  const admins = await queryBuilder.modelQuery;

  const meta = await queryBuilder.countTotal();

  return {
    data: admins,
    meta,
  };
};

const updateAdminStatusByIdToDB = async (
  id: string,
  status: STATUS.ACTIVE | STATUS.INACTIVE,
) => {
  if (![STATUS.ACTIVE, STATUS.INACTIVE].includes(status)) {
    throw new ApiError(400, "Status must be either 'ACTIVE' or 'INACTIVE'");
  }

  const user = await User.findOne({
    _id: id,
    role: USER_ROLES.ADMIN,
  });
  if (!user) {
    throw new ApiError(404, "No admin is found by this user ID");
  }

  const result = await User.findByIdAndUpdate(id, { status }, { new: true });
  if (!result) {
    throw new ApiError(400, "Failed to change status by this user ID");
  }

  return result;
};

const deleteAdminFromDB = async (id: any) => {
  const isExistAdmin = await User.findByIdAndDelete(id);

  if (!isExistAdmin) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to delete Admin");
  }

  return isExistAdmin;
};

// --- HOST SERVICES ---
const createHostToDB = async (payload: any) => {


  const isExistHost = await User.findOne({ email: payload.email });
  if (isExistHost) {
    throw new ApiError(StatusCodes.CONFLICT, "This Email already taken");
  }

  const membershipId = await generateMembershipId();

  const hostPayload = {
    ...payload,
    verified: true,
    status: STATUS.ACTIVE,
    role: USER_ROLES.HOST,
    membershipId,
  };

  const createHost = await User.create(hostPayload);

  return createHost;
};

const ghostLoginAsHost = async (superAdmin: JwtPayload, hostId: string) => {
  if (superAdmin.role !== USER_ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Unauthorized: Only SuperAdmin can use ghost mode');
  }

  const host = await User.findById(hostId);

  if (!host || host.role !== USER_ROLES.HOST) {
    throw new ApiError(404, 'Host not found');
  }

  // Generate JWT as host
  const token = jwtHelper.createToken(
    {
      id: host._id,
      email: host.email,
      role: USER_ROLES.HOST,
    },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string,
  );

  return {
    accessToken: token,
    host: {
      id: host._id,
      name: host.name,
      email: host.email,
      membershipId: host.membershipId,
    },
  };
};

const getAllHostFromDB = async (query: any) => {
  const baseQuery = User.find({
    role: USER_ROLES.HOST,
    status: STATUS.ACTIVE,
    verified: true,
  });

  const queryBuilder = new QueryBuilder(baseQuery, query)
    .search(["name", "email"])
    .sort()
    .fields()
    .filter()
    .paginate();

  const users = await queryBuilder.modelQuery;

  const meta = await queryBuilder.countTotal();

  if (!users) throw new ApiError(404, "No hosts are found in the database");

  return {
    data: users,
    meta,
  };
};

const getHostByIdFromDB = async (id: string) => {
  const result = await User.findOne({
    _id: id,
    role: USER_ROLES.HOST,
  });

  if (!result)
    throw new ApiError(404, "No host is found in the database by this ID");

  return result;
};

const updateHostStatusByIdToDB = async (
  id: string,
  status: STATUS.ACTIVE | STATUS.INACTIVE,
) => {
  if (![STATUS.ACTIVE, STATUS.INACTIVE].includes(status)) {
    throw new ApiError(400, "Status must be either 'ACTIVE' or 'INACTIVE'");
  }

  const user = await User.findOne({
    _id: id,
    role: USER_ROLES.HOST,
  });
  if (!user) {
    throw new ApiError(404, "No host is found by this host ID");
  }

  const result = await User.findByIdAndUpdate(id, { status }, { new: true });
  if (!result) {
    throw new ApiError(400, "Failed to change status by this host ID");
  }

  return result;
};

const deleteHostByIdFromD = async (id: string) => {
  const user = await User.findOne({
    _id: id,
    role: USER_ROLES.HOST,
  });

  if (!user) {
    throw new ApiError(404, "Host doest not exist in the database");
  }

  const result = await User.findByIdAndDelete(id);

  if (!result) {
    throw new ApiError(400, "Failed to delete user by this ID");
  }

  return result;
};

const getTotalUsersAndHostsFromDB = async () => {
  const [totalUsers, totalHosts] = await Promise.all([
    User.countDocuments({ role: USER_ROLES.USER, status: STATUS.ACTIVE, verified: true }),
    User.countDocuments({ role: USER_ROLES.HOST, status: STATUS.ACTIVE, verified: true }),
  ]);

  return { totalUsers, totalHosts };
};



// --- USER SERVICES ---
const createUserToDB = async (payload: any) => {

  const isExistUser = await User.findOne({ email: payload.email });
  if (isExistUser) {
    throw new ApiError(StatusCodes.CONFLICT, "This Email already taken");
  }

  const createUser = await User.create(payload);
  if (!createUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create user');
  }

  //send email
  const otp = generateOTP();
  const values = {
    name: createUser.name,
    otp: otp,
    email: createUser.email!,
  };

  const createAccountTemplate = emailTemplate.createAccount(values);
  emailHelper.sendEmail(createAccountTemplate);

  //save to DB
  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 3 * 60000),
  };

  await User.findOneAndUpdate(
    { _id: createUser._id },
    { $set: { authentication } },
  );

  const createToken = jwtHelper.createToken(
    {
      id: createUser._id,
      email: createUser.email,
      role: createUser.role,
    },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string,
  );

  const result = {
    token: createToken,
    user: createUser,
  };

  return result;
};

const getUserProfileFromDB = async (
  user: JwtPayload,
): Promise<Partial<IUser>> => {
  const { id } = user;
  const isExistUser: any = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }
  return isExistUser;
};

const updateProfileToDB = async (
  user: JwtPayload,
  payload: Partial<IUser>,
): Promise<Partial<IUser | null>> => {
  const { id } = user;
  const isExistUser = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  //unlink file here
  if (payload.profileImage && isExistUser.profileImage) {
    unlinkFile(isExistUser.profileImage);
  }

  const updateDoc = await User.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });
  return updateDoc;
};

const switchProfileToDB = async (
  userId: string,
  role: USER_ROLES.USER | USER_ROLES.HOST,
) => {
  const user = await User.findById(userId);

  if (!user) throw new ApiError(404, "This user is not found in the database");

  if (![USER_ROLES.USER, USER_ROLES.HOST].includes(role))
    throw new ApiError(400, "Role is must be either 'USER' or 'HOST'");

  const updatedUser = await User.findByIdAndUpdate(userId, { role }, { new: true });

  if (!updatedUser) throw new ApiError(400, "Failed to update role");

  const createToken = jwtHelper.createToken(
    {
      id: updatedUser._id,
      email: updatedUser.email,
      role: updatedUser.role,
    },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string,
  );

  const result = {
    token: createToken,
    user: updatedUser,
  };

  return result;
};

const getAllUsersFromDB = async (query: any) => {
  const baseQuery = User.find({
    role: USER_ROLES.USER,
    status: STATUS.ACTIVE,
    verified: true,
  });

  const queryBuilder = new QueryBuilder(baseQuery, query)
    .search(["name", "email"])
    .sort()
    .fields()
    .filter()
    .paginate();

  const users = await queryBuilder.modelQuery;

  const meta = await queryBuilder.countTotal();

  if (!users) throw new ApiError(404, "No users are found in the database");

  return {
    data: users,
    meta,
  };
};

const getUserByIdFromDB = async (id: string) => {
  const result = await User.findOne({
    _id: id,
    role: USER_ROLES.USER,
  });

  if (!result)
    throw new ApiError(404, "No user is found in the database by this ID");

  return result;
};

const updateUserStatusByIdToDB = async (
  id: string,
  status: STATUS.ACTIVE | STATUS.INACTIVE,
) => {
  if (![STATUS.ACTIVE, STATUS.INACTIVE].includes(status)) {
    throw new ApiError(400, "Status must be either 'ACTIVE' or 'INACTIVE'");
  }

  const user = await User.findOne({
    _id: id,
    role: USER_ROLES.USER,
  });
  if (!user) {
    throw new ApiError(404, "No user is found by this user ID");
  }

  const result = await User.findByIdAndUpdate(id, { status }, { new: true });
  if (!result) {
    throw new ApiError(400, "Failed to change status by this user ID");
  }

  return result;
};

const deleteUserByIdFromD = async (id: string) => {
  const user = await User.findOne({
    _id: id,
    role: USER_ROLES.USER,
  });

  if (!user) {
    throw new ApiError(404, "User doest not exist in the database");
  }

  const result = await User.findByIdAndDelete(id);

  if (!result) {
    throw new ApiError(400, "Failed to delete user by this ID");
  }

  return result;
};

const deleteProfileFromDB = async (id: string) => {
  const isExistUser = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  const result = await User.findByIdAndDelete(id);

  if (!result) {
    throw new ApiError(400, "Failed to delete this user");
  }
  return result;
};



export const UserService = {
  createUserToDB,
  getAdminFromDB,
  deleteAdminFromDB,
  getUserProfileFromDB,
  getAllUsersFromDB,
  getUserByIdFromDB,
  updateProfileToDB,
  createHostToDB,
  ghostLoginAsHost,
  getAllHostFromDB,
  getHostByIdFromDB,
  updateHostStatusByIdToDB,
  deleteHostByIdFromD,
  getTotalUsersAndHostsFromDB,
  createAdminToDB,
  switchProfileToDB,
  updateUserStatusByIdToDB,
  updateAdminStatusByIdToDB,
  deleteUserByIdFromD,
  deleteProfileFromDB,
};
