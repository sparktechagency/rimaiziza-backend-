import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { SMSLog } from "./smsLog.model";

export const smsCallback = catchAsync(async (req, res) => {
    // Logging for debugging
    console.log("SMS Callback Hit:", req.method, { query: req.query, body: req.body });

    // Handle both GET and POST parameters
    const resourceId = req.query.resourceId?.toString() || req.query.resource_id?.toString() || req.body.resourceId || req.body.resource_id;
    const code = req.query.code?.toString() || req.query.status_code?.toString() || req.body.code || req.body.status_code;
    const message = req.query.message?.toString() || req.body.message;

    if (!resourceId || !code) {
        console.warn("SMS Callback missing parameters:", { resourceId, code });
        return res.status(400).send("Invalid request parameters");
    }

    const sms = await SMSLog.findOne({ resourceId });

    if (!sms) {
        console.warn(`AfrikSMS callback received for unknown resourceId: ${resourceId}`);
        return res.status(404).send("SMS log not found");
    }

    // Update SMS status
    if (code === "000") sms.status = "DELIVERED";
    else sms.status = "FAILED";

    sms.providerCode = code.toString();
    sms.providerMessage = message || sms.providerMessage;

    await sms.save();

    console.log(`SMS log updated: ${sms._id} status -> ${sms.status}`);

    return res.send("OK");
});
