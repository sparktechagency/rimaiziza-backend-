import ApiError from "../../../errors/ApiErrors";
import { ICar } from "./car.interface";
import { Car } from "./car.model";

const createCarToDB = async (payload: ICar) => {

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

export const CarServices = {
    createCarToDB,
    getAllCarsFromDB,
    getCarByIdFromDB,
};