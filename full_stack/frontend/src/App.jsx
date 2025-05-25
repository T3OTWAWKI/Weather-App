import { useState, useEffect } from 'react';
import {
  createWeatherQuery,
  getAllQueries,
  updateQuery,
  deleteQuery,
  exportQueryCSV,
} from './api/weatherAPI';

function App() {
  const [inputType, setInputType] = useState('city');
  const [inputValue, setInputValue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [weatherData, setWeatherData] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedQueries, setSavedQueries] = useState([]);
  const [selectedQueryId, setSelectedQueryId] = useState('');

  // Get API key from environment variables
  const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;

  useEffect(() => {
    loadSavedQueries();
  }, []);

  const loadSavedQueries = async () => {
    try {
      const queries = await getAllQueries();
      setSavedQueries(queries);
    } catch (err) {
      setError('Failed to load saved queries: ' + err.message);
    }
  };

  const validateInputs = () => {
    if (!inputValue.trim()) {
      setError('Please enter a location.');
      return false;
    }
    return true;
  };

  const validateDateRange = () => {
    if (!startDate || !endDate) {
      setError('Please select a valid date range.');
      return false;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date must be before end date.');
      return false;
    }
    return true;
  };

  const handleInputTypeChange = (e) => {
    setInputType(e.target.value);
    setInputValue('');
    setWeatherData([]);
    setError('');
    setSelectedQueryId('');
  };

  const handleBackendWeatherRequest = async () => {
    if (!validateInputs() || !validateDateRange()) return;

    setLoading(true);
    setError('');

    try {
      const response = await createWeatherQuery(
        inputValue.trim(), 
        startDate, 
        endDate
      );
      
      setWeatherData(response.weatherRecords || []);
      await loadSavedQueries(); // Refresh saved queries
      
    } catch (err) {
      console.error('Backend weather request failed:', err);
      setError(err.message || 'Could not fetch weather from backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuery = async () => {
    if (!selectedQueryId) {
      setError('Please select a query to update.');
      return;
    }
    if (!validateInputs() || !validateDateRange()) return;

    setLoading(true);
    setError('');

    try {
      await updateQuery(
        selectedQueryId, 
        inputValue.trim(), 
        startDate, 
        endDate
      );

      setSavedQueries(prev =>
        prev.map(q =>
          q._id === selectedQueryId
            ? { ...q, location: inputValue.trim(), startDate, endDate }
            : q
        )
      );

      alert('Query updated successfully!');
    } catch (err) {
      console.error('Update failed:', err);
      setError(err.message || 'Failed to update query.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuery = async () => {
    if (!selectedQueryId) {
      setError('Please select a query to delete.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this query?')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await deleteQuery(selectedQueryId);
      
      setSavedQueries(prev => prev.filter(q => q._id !== selectedQueryId));
      setSelectedQueryId('');
      setInputValue('');
      setStartDate('');
      setEndDate('');
      setWeatherData([]);
      
      alert('Query deleted successfully!');
    } catch (err) {
      console.error('Delete failed:', err);
      setError(err.message || 'Failed to delete query.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    if (!selectedQueryId) {
      setError('Please select a saved query before exporting.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const csvBlob = await exportQueryCSV(selectedQueryId);
      const url = URL.createObjectURL(csvBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `weather_query_${selectedQueryId}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      setError(err.message || 'Export failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCurrentWeather = async () => {
    if (!validateInputs()) return;
    if (!apiKey) {
      setError('API key not configured. Please set VITE_WEATHER_API_KEY in your environment.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(inputValue.trim())}&appid=${apiKey}&units=imperial`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.cod !== 200) {
        throw new Error(data.message || 'Failed to fetch current weather.');
      }

      setWeatherData([{
        date: new Date().toISOString().split('T')[0],
        temp: Math.round(data.main.temp),
        description: data.weather[0].description
      }]);

    } catch (err) {
      console.error('Current weather request failed:', err);
      setError(err.message || 'Failed to fetch current weather.');
    } finally {
      setLoading(false);
    }
  };

  const handle5DayForecast = async () => {
    if (!validateInputs()) return;
    if (!apiKey) {
      setError('API key not configured. Please set VITE_WEATHER_API_KEY in your environment.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(inputValue.trim())}&appid=${apiKey}&units=imperial`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.cod !== "200") {
        throw new Error(data.message || 'Failed to fetch forecast.');
      }

      // Filter to get one forecast per day (every 8th entry, as API returns 3-hour intervals)
      const filteredData = data.list.filter((_, index) => index % 8 === 0);
      const formatted = filteredData.slice(0, 5).map(entry => ({
        date: entry.dt_txt.split(' ')[0],
        temp: Math.round(entry.main.temp),
        description: entry.weather[0].description
      }));

      setWeatherData(formatted);

    } catch (err) {
      console.error('5-day forecast request failed:', err);
      setError(err.message || 'Failed to fetch 5-day forecast.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuerySelection = (e) => {
    const id = e.target.value;
    setSelectedQueryId(id);
    
    if (id) {
      const query = savedQueries.find(q => q._id === id);
      if (query) {
        setInputValue(query.location || '');
        setStartDate(query.startDate || query.start_date || '');
        setEndDate(query.endDate || query.end_date || '');
        setError('');
        setWeatherData(query.weatherRecords || []);
      }
    } else {
      setInputValue('');
      setStartDate('');
      setEndDate('');
      setWeatherData([]);
    }
  };

  const getPlaceholderText = () => {
    switch (inputType) {
      case 'city': return 'Enter city name (e.g., New York, London)';
      case 'zip': return 'Enter zip/postal code (e.g., 10001, SW1A 1AA)';
      case 'gps': return 'Enter coordinates (e.g., 40.7128,-74.0060)';
      case 'landmark': return 'Enter landmark (e.g., Statue of Liberty)';
      default: return 'Enter location...';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-center text-blue-600">
        🌤️ Weather App
      </h1>

      {/* Input Type Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select input type:
        </label>
        <select
          value={inputType}
          onChange={handleInputTypeChange}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="city">City/Town</option>
          <option value="zip">Zip Code/Postal Code</option>
          <option value="gps">GPS Coordinates (lat, lon)</option>
          <option value="landmark">Landmark</option>
        </select>
      </div>

      {/* Location Input */}
      <div className="mb-4">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={getPlaceholderText()}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={loading}
        />
      </div>

      {/* Date Range Selection */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date:
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            End Date:
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          />
        </div>
      </div>

      {/* Saved Queries Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select saved query to update/delete:
        </label>
        <select
          value={selectedQueryId}
          onChange={handleQuerySelection}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={loading}
        >
          <option value="">-- Select Query --</option>
          {savedQueries.map(q => (
            <option key={q.id} value={q._id}>
              {q.location} ({q.startDate || q.start_date} to {q.endDate || q.end_date})
            </option>
          ))}
        </select>
      </div>

      {/* Action Buttons */}
      <div className="space-y-4 mb-6">
        {/* Database Operations */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleBackendWeatherRequest}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Get & Save Weather'}
          </button>

          {selectedQueryId && (
            <>
              <button
                onClick={handleUpdateQuery}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Update Selected Query
              </button>
              <button
                onClick={handleDeleteQuery}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Selected Query
              </button>
            </>
          )}

          <button
            onClick={handleExportCSV}
            disabled={loading || !selectedQueryId}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export CSV
          </button>
        </div>

        {/* API-Only Operations */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCurrentWeather}
            disabled={loading}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Get Current Weather (No Save)
          </button>
          <button
            onClick={handle5DayForecast}
            disabled={loading}
            className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Get 5-Day Forecast (No Save)
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="mb-4 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded-md">
          Loading weather data...
        </div>
      )}

      {/* Weather Data Display */}
      {weatherData.length > 0 && (
        <div className="mt-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            Weather Data
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {weatherData.map((entry, index) => (
              <div
                key={index}
                className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg shadow-sm"
              >
                <div className="text-lg font-semibold text-blue-900">
                  {entry.date}
                </div>
                <div className="text-2xl font-bold text-blue-700">
                  {entry.temp}°F
                </div>
                <div className="text-sm text-blue-600 capitalize">
                  {entry.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;