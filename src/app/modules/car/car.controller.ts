import ApiError from "../../../errors/ApiErrors";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { CarServices } from "./car.service";
import { normalizeCarVerificationStatus } from "./car.utils";

const createCar = catchAsync(async (req, res) => {
  const { id: userId } = req.user;

  const carData = req.body;

  const result = await CarServices.createCarToDB(userId, carData);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Successfully created a car",
    data: result,
  });
});

const getAllCars = catchAsync(async (req, res) => {
  const { id: userId } = req.user;

  const {
    brand,
    model,
    transmission,
    fuelType,
    color,
    city,
    minPrice,
    maxPrice,
    rating,
    latitude,
    longitude,
    withDriver,
    maxDistance,
    date,
    time,
    sort,
    page,
    limit,
    searchTerm,
  } = req.query;

  const query = {
    brand,
    model,
    transmission,
    fuelType,
    color,
    city,
    minPrice,
    maxPrice,
    rating,
    latitude,
    longitude,
    withDriver,
    maxDistance,
    date,
    time,
    sort,
    page,
    limit,
    searchTerm,
  };

  const result = await CarServices.getAllCarsFromDB(query, userId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Cars data are retrieved successfully",
    data: result,
  });
});

const getRecentCars = catchAsync(
  async (req, res) => {
    const userId = req.user?.id;

    const result = await CarServices.getRecentCarsFromDB(userId);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Recent cars retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  }
);


const getOwnCars = catchAsync(async (req, res) => {
  const { verificationStatus } = req.query;

  const result = await CarServices.getOwnCarsFromDB({
    userId: req.user.id,
    verificationStatus: normalizeCarVerificationStatus(
      verificationStatus as string
    ),
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Cars retrieved successfully",
    data: result,
  });
});

const getAllCarsForVerifications = catchAsync(async (req, res) => {
  const result = await CarServices.getAllCarsForVerificationsFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Car verifications data are retrieved successfully",
    data: result,
  });
});

const getCarById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const { id: userId } = req.user;

  const result = await CarServices.getCarByIdFromDB(id, userId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Car data is retrieved successfully",
    data: result,
  });
});

const updateCarById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const { id: userId } = req.user;

  const updatedPayload = req.body;

  const result = await CarServices.updateCarByIdToDB(
    userId,
    id,
    updatedPayload,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Car data is updated successfully",
    data: result,
  });
});

const deleteCarById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { id: userId } = req.user;

  const result = await CarServices.deleteCarByIdFromDB(userId, id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Car data is deleted successfully",
    data: result,
  });
});

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

const createCarBlockedDates = catchAsync(async (req, res) => {
  const { carId } = req.params;

  const { id: userId } = req.user;

  const { blockedDates } = req.body;

  const result = await CarServices.createCarBlockedDatesToDB(
    carId,
    userId,
    blockedDates,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Successfully blocked the car",
    data: result,
  });
});

const updateCarVerificationStatusById = catchAsync(async (req, res) => {
  const { verificationStatus } = req.body;
  const { carId } = req.params;

  const result = await CarServices.updateCarVerificationStatusByIdToDB(
    carId,
    verificationStatus,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Car verification status is updated successfully",
    data: result,
  });
});

const getSuggestedCars = catchAsync(async (req, res) => {
  const { id: userId } = req.user;

  const limit = parseInt(req.query.limit as string) || 10;

  const cars = await CarServices.getSuggestedCarsFromDB(userId, limit);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Suggested cars fetched successfully",
    data: cars,
  });
});

const getCarsByDestination = catchAsync(
  async (req, res) => {
    const { destinationId } = req.params;

    if (!destinationId) {
      return sendResponse(res, {
        statusCode: 400,
        success: false,
        message: "Destination ID is required",
      });
    }

    // fetch destination & cars
    const result = await CarServices.getCarsByDestinationFromDB(destinationId);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Cars fetched successfully by destination",
      data: result,
    });
  }
);



export const CarControllers = {
  createCar,
  getAllCars,
  getOwnCars,
  getCarById,
  updateCarById,
  deleteCarById,
  getAvailability,
  createCarBlockedDates,
  getAllCarsForVerifications,
  updateCarVerificationStatusById,
  getSuggestedCars,
  getRecentCars,
  getCarsByDestination,
};
