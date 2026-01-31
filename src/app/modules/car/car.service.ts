import { Types } from "mongoose";
import { STATUS, USER_ROLES } from "../../../enums/user";
import ApiError from "../../../errors/ApiErrors";
import { User } from "../user/user.model";
import { ICar } from "./car.interface";
import { Car } from "./car.model";
import { sendNotifications } from "../../../helpers/notificationsHelper";
import { NOTIFICATION_TYPE } from "../notification/notification.constant";
import { generateVehicleId } from "../../../helpers/generateYearBasedId";
import { getTargetLocation } from "./car.utils";
import { FavoriteCar } from "../favoriteCar/favoriteCar.model";

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

        const allowedFields = ["images", "availableDays", "facilities"];

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

// ---APP---
const getNearbyCarsFromDB = async ({
    lat,
    lng,
    userId,
    maxDistanceKm = 10,
    limit = 20,
}: any) => {
    const targetLocation = await getTargetLocation(lat, lng, userId);

    console.log(targetLocation);

    if (!targetLocation.lat || !targetLocation.lng) {
        throw new ApiError(400, "Unable to resolve target location");
    }

    const safeLimit = Number(limit) || 20;
    const safeMaxDistanceKm = Number(maxDistanceKm) || 10;

    const cars = await Car.aggregate([
        {
            $geoNear: {
                near: {
                    type: "Point",
                    coordinates: [targetLocation.lng, targetLocation.lat],
                },
                distanceField: "distanceInMeters",
                maxDistance: safeMaxDistanceKm * 1000,
                spherical: true,
                query: {
                    isActive: true,
                    // optional filters
                    blockedDates: { $not: { $elemMatch: { date: new Date() } } }
                },
            },
        },
        {
            $addFields: {
                distanceInKm: {
                    $round: [{ $divide: ["$distanceInMeters", 1000] }, 2],
                },
            },
        },
        {
            $project: {
                distanceInMeters: 0,
                assignedHosts: 0,
            },
        },
        { $sort: { distanceInKm: 1 } },
        { $limit: safeLimit },
    ]);

    // Attach isFavorite for each car
    if (userId && cars.length > 0) {
        const carIds = cars.map(car => car._id);

        const favorites = await FavoriteCar.find({
            userId,
            referenceId: { $in: carIds },
        }).select("referenceId");

        const favMap = new Map(favorites.map(f => [f.referenceId.toString(), true]));

        cars.forEach(car => {
            car.isFavorite = !!favMap.get(car._id.toString()); // true / false
        });
    } else {
        // If no userId, all false
        cars.forEach(car => (car.isFavorite = false));
    }

    return cars;
};

const getCarsByHostFromDB = async (hostId: string) => {
    if (!hostId || !Types.ObjectId.isValid(hostId)) {
        throw new ApiError(400, "Invalid hostId");
    }

    const cars = await Car.find({
        assignedHosts: hostId,
        isActive: true,
    }).lean();

    // favorite cars
    await Promise.all(cars.map(async car => {
        const isBookmarked = await FavoriteCar.exists({
            userId: new Types.ObjectId(hostId),
            referenceId: car._id,
        });
        isBookmarked ? car.isFavorite = true : car.isFavorite = false;
    }));

    if (!cars.length) {
        throw new ApiError(404, "No cars found for this host");
    }

    return cars;
};



export const CarServices = {
    createCarToDB,
    getAllCarsFromDB,
    getCarByIdFromDB,
    updateCarByIdToDB,
    deleteCarByIdFromDB,
    getNearbyCarsFromDB,
    getCarsByHostFromDB,
};