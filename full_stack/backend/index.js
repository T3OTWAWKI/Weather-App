// backend/index.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./db/connect');

dotenv.config();
const app = express();

app.use(cors({
  origin: 'http://localhost:5173', // your Vite dev server
  credentials: true,
}));
app.use(express.json());

// Connect to DB
connectDB();

// Routes
app.use('/api/queries', require('./routes/queries'));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
