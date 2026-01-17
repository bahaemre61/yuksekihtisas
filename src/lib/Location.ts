import mongoose from 'mongoose';

const LocationSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true
  }
}, { 
  collection: 'locations' 
});

const Location = mongoose.models.Location || mongoose.model('Location', LocationSchema);

export default Location;