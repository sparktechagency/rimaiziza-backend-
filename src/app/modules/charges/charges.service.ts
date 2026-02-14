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


export const getDynamicCharges = async ({
     totalAmount,
}: any) => {

     const charges = await getAllChargesFromDB();

     if (!charges) {
          throw new ApiError(404, "Charges configuration not found");
     }

     const normalize = (percent: number) =>
          percent > 1 ? percent / 100 : percent;

     const platformPercent = normalize(charges.platformFee);
     const hostPercent = normalize(charges.hostCommission);
     const adminPercent = normalize(charges.adminCommission);

     // Validate total percent
     const totalPercent = platformPercent + hostPercent + adminPercent;

     if (Math.abs(totalPercent - 1) > 0.0001) {
          throw new ApiError(400, "Invalid commission configuration");
     }

     const platformFee = +(totalAmount * platformPercent).toFixed(2);
     const hostCommission = +(totalAmount * hostPercent).toFixed(2);
     const adminCommission =
          +(totalAmount - platformFee - hostCommission).toFixed(2);


     return { platformFee, hostCommission, adminCommission };
};


export const ChargesServices = {
     createChargesToDB,
     getAllChargesFromDB,
     deleteChargesFromDB,
};
