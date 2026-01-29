import { Types } from "mongoose";
import { STATUS, USER_ROLES } from "../../../enums/user";
import ApiError from "../../../errors/ApiErrors";
import { User } from "../user/user.model";
import { ICar } from "./car.interface";
import { Car } from "./car.model";
import { sendNotifications } from "../../../helpers/notificationsHelper";
import { NOTIFICATION_TYPE } from "../notification/notification.constant";
import { generateVehicleId } from "../../../helpers/generateYearBasedId";

const createCarToDB = async (payload: ICar) => {

    const carId = await generateVehicleId();

    payload.vehicleId = carId;

    if (payload.facilities?.length) {
        payload.facilities.forEach(facility => {
            if (!facility.label || !facility.value) {
                throw new ApiError(400, "Each facility must have label and value");
            }
        });
    }

    try {
        const result = await Car.create(payload);
        return result;
    } catch (error: any) {
        if (error.code === 11000) {
            throw new ApiError(400, "Car with this license plate already exists");
        }
        throw new ApiError(error.statusCode || 500, error.message || "Failed to create a car");
    }
};

const getAllCarsFromDB = async () => {
    const result = await Car.find();
    if (!result.length) {
        throw new ApiError(404, "No cars found");
    }
    return result;
}

const getCarByIdFromDB = async (id: string) => {
    const result = await Car.findById(id);
    if (!result) {
        throw new ApiError(404, "Car not found");
    }
    return result;
}

export enum ACTION {
    ADD = "ADD",
    DELETE = "DELETE",
}

export type ArrayActionValue =
    | string
    | Types.ObjectId
    | {
        label: string;
        value: string;
        icon?: string;
    };

export interface IArrayAction {
    field: "images" | "availableDays" | "facilities" | "assignedHosts";
    action: ACTION;
    value: ArrayActionValue;
}

// -------------------------- Utility --------------------------
const removeUndefined = <T extends Record<string, any>>(obj: T): Partial<T> =>
    Object.fromEntries(
        Object.entries(obj).filter(([_, v]) => v !== undefined && v !== null)
    ) as Partial<T>;

// -------------------------- Main Update Function --------------------------
const updateCarByIdToDB = async (
    carId: string,
    payload: Partial<ICar> & { arrayAction?: IArrayAction }
) => {
    // -------------------------- Check user --------------------------
    const user = await User.findOne({
        role: { $in: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] },
        verified: true,
        status: STATUS.ACTIVE,
    });

    if (!user) {
        throw new ApiError(404, "No approved host found by this ID");
    }

    // -------------------------- Handle array actions --------------------------
    if (payload.arrayAction) {
        const { field, action, value } = payload.arrayAction;

        const allowedFields = ["images", "availableDays", "facilities", "assignedHosts"];

        if (!allowedFields.includes(field)) {
            throw new ApiError(400, "Invalid array field");
        }

        let updateQuery: any = {};

        // -------------------------- Facilities --------------------------
        if (field === "facilities") {
            const isFacilityPayload = (val: ArrayActionValue): val is { label: string; value: string; icon?: string } =>
                typeof val === "object" && val !== null && "label" in val && "value" in val;

            if (action === ACTION.ADD) {
                if (!isFacilityPayload(value)) {
                    throw new ApiError(400, "Invalid facility payload");
                }
                updateQuery = {
                    $addToSet: {
                        facilities: {
                            label: value.label,
                            value: value.value.toLowerCase(),
                            icon: value.icon,
                        },
                    },
                };
            }

            if (action === ACTION.DELETE) {
                if (typeof value !== "string") {
                    throw new ApiError(400, "Facility value must be string");
                }
                updateQuery = { $pull: { facilities: { value } } };
            }
        }
        // -------------------------- Assigned Hosts --------------------------
        else if (field === "assignedHosts") {
            if (!(value instanceof Types.ObjectId) && typeof value !== "string") {
                throw new ApiError(400, "assignedHosts value must be ObjectId or string");
            }
            const hostId = value instanceof Types.ObjectId ? value : new Types.ObjectId(value);

            if (action === ACTION.ADD) {
                updateQuery = { $addToSet: { assignedHosts: hostId } };
            }

            if (action === ACTION.DELETE) {
                updateQuery = { $pull: { assignedHosts: hostId } };
            }
        }
        // -------------------------- Images & Available Days --------------------------
        else {
            if (action === ACTION.ADD) {
                updateQuery = { $addToSet: { [field]: value } };
            }
            if (action === ACTION.DELETE) {
                updateQuery = { $pull: { [field]: value } };
            }
        }

        delete payload.arrayAction;

        const updated = await Car.findOneAndUpdate({ _id: carId }, updateQuery, { new: true });

        if (!updated) {
            throw new ApiError(404, "Car not found or not owned by user");
        }

        return updated;
    }

    // -------------------------- Handle normal updates --------------------------
    const cleanPayload = removeUndefined(payload);
    delete (cleanPayload as any).userId;

    const updated = await Car.findOneAndUpdate({ _id: carId }, cleanPayload, { new: true });

    if (!updated) {
        throw new ApiError(404, "Car not found or not owned by user");
    }

    return updated;
};

const deleteCarByIdFromDB = async (id: string) => {
    // -------------------------- Check host --------------------------
    const result = await Car.findByIdAndDelete(id);

    if (!result) {
        throw new ApiError(400, "Failed to delete car by this ID");
    }

    // -------------------------- NOTIFICATIONS --------------------------

    const admin = await User.findOne({ role: USER_ROLES.SUPER_ADMIN }).select("_id");

    if (admin) {
        await sendNotifications({
            text: `Car deleted successfully by admin (${admin.phone || admin._id})`,
            receiver: admin._id.toString(),
            type: NOTIFICATION_TYPE.ADMIN,
            referenceId: result._id.toString(),
        });
    }

    return result;
};

export const CarServices = {
    createCarToDB,
    getAllCarsFromDB,
    getCarByIdFromDB,
    updateCarByIdToDB,
    deleteCarByIdFromDB,
};