import ApiError from "../../../errors/ApiErrors";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { Car } from "./car.model";
import { CarServices } from "./car.service";


const createCar = catchAsync(async (req, res) => {

  const carData = req.body;

  const result = await CarServices.createCarToDB(carData);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Successfully created a car",
    data: result,
  });
});

const getAllCars = catchAsync(async (req, res) => {
  const result = await CarServices.getAllCarsFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Successfully retrieved all cars",
    data: result.cars,
    meta: result.meta,
  });
});

const getCarById = catchAsync(async (req, res) => {
  const id = req.params.id;
  const result = await CarServices.getCarByIdFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Successfully retrieved car by id",
    data: result,
  });
});

const updateCarById = catchAsync(async (req, res) => {
  const id = req.params.id;
  const carData = req.body;
  console.log(carData);

  const result = await CarServices.updateCarByIdToDB(id, carData);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Successfully updated car by id",
    data: result,
  });
});

const deleteCarById = catchAsync(async (req, res) => {
  const id = req.params.id;

  const result = await CarServices.deleteCarByIdFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Successfully deleted car by id",
    data: result,
  });
});

const getNearbyCars = catchAsync(async (req, res) => {
  const userId = req.user?.id || req.user?._id || null;

  const result = await CarServices.getNearbyCarsFromDB({
    ...req.query,
    userId,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Cars retrieved successfully",
    data: result,
  });
});

const getCarByIdForUser = catchAsync(async (req, res) => {
  const { id: userId } = req.user as any;
  const { id } = req.params;
  const result = await CarServices.getCarByIdForUserFromDB(id, userId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Successfully retrieved car by id for user",
    data: result,
  });
})

const getAvailability = catchAsync(async (req, res) => {
  const { carId } = req.params;
  const { date } = req.query;

  // Validation
  if (!carId) {
    throw new ApiError(400, "Car ID is required");
  }

  if (!date || typeof date !== "string") {
    throw new ApiError(
      400,
      "Date query parameter is required (e.g., ?date=2025-12-12)",
    );
  }

  // YYYY-MM-DD format check
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ApiError(400, "Invalid date format. Use YYYY-MM-DD");
  }

  const availability = await CarServices.getAvailability(carId, date);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Car availability fetched successfully",
    data: {
      carId,
      ...availability,
    },
  });
});

const getCarsByHost = catchAsync(async (req, res) => {
  const { id: hostId } = req.user as any;

  const result = await CarServices.getCarsByHostFromDB(hostId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Successfully retrieved cars by host",
    data: result,
  });
});



export const CarControllers = {
  createCar,
  getAllCars,
  getCarById,
  getCarByIdForUser,
  getAvailability,
  updateCarById,
  deleteCarById,
  getNearbyCars,
  getCarsByHost,
};
