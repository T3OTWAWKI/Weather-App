const express = require('express');
const router = express.Router();
const Query = require('../models/Query');
const fetch = require('node-fetch');
const { Parser } = require('json2csv');

const API_KEY = process.env.VITE_OPENWEATHER_API_KEY;

// Helper: Get geocode data from location string
async function geocode(location) {
  const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${API_KEY}`;
  const res = await fetch(geoUrl);
  const data = await res.json();
  if (!data || data.length === 0) {
    throw new Error('Location not found');
  }
  return data[0];
}

// Helper: Fetch weather data for given lat/lon and date range
async function getWeatherData(lat, lon, startDate, endDate) {
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=imperial`;
  const res = await fetch(forecastUrl);
  const data = await res.json();
  if (!data || !data.list) throw new Error('Weather data fetch failed');

  // Filter entries by date range and 12:00 PM time
  const weatherRecords = data.list.filter(entry => {
    const date = new Date(entry.dt_txt);
    const inRange = date >= startDate && date <= endDate;
    const isNoon = entry.dt_txt.includes('12:00:00');
    return inRange && isNoon;
  }).map(entry => ({
    date: new Date(entry.dt_txt),
    temp: entry.main.temp,
    description: entry.weather[0].description,
  }));

  return weatherRecords;
}

// CREATE - Add new weather query
router.post('/', async (req, res) => {
  try {
    const { location, startDate: start, endDate: end } = req.body;

    if (!location || !start || !end) {
      return res.status(400).json({ error: 'Location and date range required' });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate) || isNaN(endDate) || startDate > endDate) {
      return res.status(400).json({ error: 'Invalid date range' });
    }

    const locData = await geocode(location);
    const weatherRecords = await getWeatherData(locData.lat, locData.lon, startDate, endDate);

    const query = new Query({
      location,
      locationData: {
        lat: locData.lat,
        lon: locData.lon,
        city: locData.name,
        country: locData.country,
      },
      dateRange: { startDate, endDate },
      weatherRecords,
    });

    await query.save();

    res.status(201).json(query);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// READ - Get all queries
router.get('/', async (req, res) => {
  try {
    const queries = await Query.find().sort({ createdAt: -1 });
    res.json(queries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get queries' });
  }
});

// EXPORT - Export all queries as CSV (moved before individual routes)
router.get('/export', async (req, res) => {
  try {
    const queries = await Query.find().sort({ createdAt: -1 });

    const csvData = [];
    queries.forEach(query => {
      const { location, dateRange, weatherRecords } = query;
      weatherRecords.forEach(record => {
        csvData.push({
          location,
          startDate: new Date(dateRange.startDate).toISOString().split('T')[0],
          endDate: new Date(dateRange.endDate).toISOString().split('T')[0],
          date: new Date(record.date).toISOString().split('T')[0],
          temp: record.temp,
          description: record.description,
        });
      });
    });

    const fields = ['location', 'startDate', 'endDate', 'date', 'temp', 'description'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(csvData);

    res.header('Content-Type', 'text/csv');
    res.attachment('weather_data.csv');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// READ - Get one query by ID
router.get('/:id', async (req, res) => {
  try {
    const query = await Query.findById(req.params.id);
    if (!query) return res.status(404).json({ error: 'Query not found' });
    res.json(query);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get query' });
  }
});

// EXPORT - Export specific query as CSV (NEW ROUTE)
router.get('/:id/export', async (req, res) => {
  try {
    const query = await Query.findById(req.params.id);
    if (!query) return res.status(404).json({ error: 'Query not found' });

    const { location, dateRange, weatherRecords } = query;
    const csvData = weatherRecords.map(record => ({
      location,
      startDate: new Date(dateRange.startDate).toISOString().split('T')[0],
      endDate: new Date(dateRange.endDate).toISOString().split('T')[0],
      date: new Date(record.date).toISOString().split('T')[0],
      temp: record.temp,
      description: record.description,
    }));

    const fields = ['location', 'startDate', 'endDate', 'date', 'temp', 'description'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(csvData);

    res.header('Content-Type', 'text/csv');
    res.attachment(`weather_query_${req.params.id}.csv`);
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to export query' });
  }
});

// UPDATE - Update a query by ID
router.put('/:id', async (req, res) => {
  try {
    const { location, startDate: start, endDate: end } = req.body;

    if (!location || !start || !end) {
      return res.status(400).json({ error: 'Location and date range required' });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate) || isNaN(endDate) || startDate > endDate) {
      return res.status(400).json({ error: 'Invalid date range' });
    }

    const locData = await geocode(location);
    const weatherRecords = await getWeatherData(locData.lat, locData.lon, startDate, endDate);

    const updatedQuery = await Query.findByIdAndUpdate(
      req.params.id,
      {
        location,
        locationData: {
          lat: locData.lat,
          lon: locData.lon,
          city: locData.name,
          country: locData.country,
        },
        dateRange: { startDate, endDate },
        weatherRecords,
      },
      { new: true, runValidators: true }
    );

    if (!updatedQuery) return res.status(404).json({ error: 'Query not found' });

    res.json(updatedQuery);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE - Delete a query by ID
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Query.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Query not found' });
    res.json({ message: 'Query deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete query' });
  }
});

module.exports = router;