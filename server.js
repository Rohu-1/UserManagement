// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const authRoutes = require('./routes/authRoutes');


// Load environment variables
dotenv.config();

// Ensure the Supabase URL and Key are available
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Check if both are loaded correctly
if (!supabaseUrl || !supabaseKey) {
  throw new Error('supabaseUrl and supabaseKey are required.');
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize the Express app
const app = express();
app.use(cors());
app.use(express.json());

// Middleware to make Supabase client available in routes
app.use((req, res, next) => {
  res.locals.supabase = supabase; // Add the Supabase client to `res.locals`
  next();
});

// Use the routes
app.use('/api/auth', authRoutes)
app.use('/api', authRoutes);

// Define the port and start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
