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
  const result = await CarServices.getAllCarsFromDB();

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Successfully retrieved all cars",
    data: result,
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
  // default 10km, 20 limit

  const { id: userId } = req.user as any;

  console.log(userId);

  const { latitude, longitude, maxDistanceKm, limit } = req.query;

  const result = await CarServices.getNearbyCarsFromDB({
    latitude,
    longitude,
    userId,
    maxDistanceKm,
    limit,
  });

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Successfully retrieved nearby cars",
    data: result,
  });
});

export const CarControllers = {
  createCar,
  getAllCars,
  getCarById,
  updateCarById,
  deleteCarById,
  getNearbyCars,
};
