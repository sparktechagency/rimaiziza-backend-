import { Types } from "mongoose";
import { TDestination } from "./destination.interface";
import { Destination } from "./destination.model";


const createDestination = async (payload: TDestination) => {
    const destination = await Destination.create(payload);
    if (!destination) {
        throw new Error("Failed to create destination");
    }
    return destination;
}

const getDestinationsFromDB = async () => {
    const result = await Destination.find();
    if (!result || result.length === 0) {
        return []
    }
    return result;
}


const updateDestinationById = async (
  destinationId: string,
  payload: Partial<TDestination>
) => {
  if (!Types.ObjectId.isValid(destinationId)) {
    throw new Error("Invalid destination ID");
  }

  const updatedDestination = await Destination.findByIdAndUpdate(
    destinationId,
    payload,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedDestination) {
    throw new Error("Destination not found");
  }

  return updatedDestination;
};

const deleteDestinationById = async (destinationId: string) => {
  if (!Types.ObjectId.isValid(destinationId)) {
    throw new Error("Invalid destination ID");
  }

  const deletedDestination = await Destination.findByIdAndDelete(destinationId);

  if (!deletedDestination) {
    throw new Error("Destination not found");
  }

  return deletedDestination;
};

export const DestinationServices = {
    createDestination,
    getDestinationsFromDB,
    updateDestinationById,
    deleteDestinationById,
}