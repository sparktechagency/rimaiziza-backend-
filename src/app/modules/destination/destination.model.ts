import mongoose from "mongoose";

const destinationSchema = new mongoose.Schema({
    image: {
        type: String,
        required: true,
    },
    city: {
        type: String,
        required: true
    },
    pickupPoint: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point",
        },
        coordinates: {
            type: [Number],
            required: true,
        }, // [lng, lat]
        address: {
            type: String,
            default: "",
        },
    },

},
    {
        timestamps: true,
        versionKey: false
    }
)

export const Destination = mongoose.model("Destination", destinationSchema);