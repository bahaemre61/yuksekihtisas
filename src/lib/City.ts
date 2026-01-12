import mongoose, { mongo } from "mongoose";

const CitySchema = new mongoose.Schema({
    name : String,
    plate : String,
    districts : [
        {
            name : String
        }
    ]

}, {
    collection: 'cities'
});

const City = mongoose.models.City || mongoose.model('City', CitySchema);

export default City;