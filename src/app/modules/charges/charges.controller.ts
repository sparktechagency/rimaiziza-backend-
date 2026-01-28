import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { ChargesServices } from './charges.service';


const createCharges = catchAsync(async (req, res) => {
     const chargesData = req.body;
     const result = await ChargesServices.createChargesToDB(chargesData);
     sendResponse(res, {
          success: true,
          statusCode: 200,
          message: 'Charges is created successfully',
          data: result,
     });
});

const getAllCharges = catchAsync(async (req, res) => {
     const result = await ChargesServices.getAllChargesFromDB();
     sendResponse(res, {
          success: true,
          statusCode: 200,
          message: 'Charges data are retrieved successfully',
          data: result,
     });
});

const deleteCharges = catchAsync(async (req, res) => {
     const { id } = req.params;
     const result = await ChargesServices.deleteChargesFromDB(id);
     sendResponse(res, {
          success: true,
          statusCode: 200,
          message: 'Charges data is deleted successfully',
          data: result,
     });
});

export const ChargesControllers = {
     createCharges,
     getAllCharges,
     deleteCharges,
};
