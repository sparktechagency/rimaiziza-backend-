import ApiError from "../../../errors/ApiErrors";
import { TCharges } from "./charges.interface";
import { Charges } from "./charges.model";


const createChargesToDB = async (payload: TCharges) => {
     const result = await Charges.findOneAndUpdate({}, { ...payload }, { upsert: true, new: true, overwrite: true }).lean();

     return result;
};

const getAllChargesFromDB = async () => {
     const result = await Charges.findOne();
     if (!result) {
          throw new ApiError(404, 'There are no charges is available in database');
     }
     return result;
};

const deleteChargesFromDB = async (id: string) => {
     const result = await Charges.findByIdAndDelete(id);
     if (!result) {
          throw new ApiError(400, 'Failed to delete charges by this ID');
     }
     return result;
};

export const ChargesServices = {
     createChargesToDB,
     getAllChargesFromDB,
     deleteChargesFromDB,
};
