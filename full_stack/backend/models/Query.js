const mongoose = require('mongoose');

const WeatherRecordSchema = new mongoose.Schema({
  date: Date,
  temp: Number,           // daily average temp or temp at noon
  description: String,    // weather description (sunny, cloudy, etc)
});

const QuerySchema = new mongoose.Schema({
  location: {
    type: String,         // user input for location (e.g. "New York", "90210", "38.9,-77.0")
    required: true,
  },
  locationData: {
    lat: Number,
    lon: Number,
    city: String,
    country: String,
  },
  dateRange: {
    startDate: Date,
    endDate: Date,
  },
  weatherRecords: [WeatherRecordSchema], // array of weather data objects for the date range
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Query', QuerySchema);
