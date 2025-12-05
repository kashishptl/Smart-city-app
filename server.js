app.get('/api/config', (req, res) => {
  res.json({
    mapApiKey: process.env.MAP_API_KEY 
    // Only expose what's needed by frontend
  });
});

// 2. Fix fetch API (for Node.js < 18)
// Add this near the top of server.js, after the other requires
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// 3. Improved weather API endpoint with error handling
app.get('/api/weather/:city', async (req, res) => {
  try {
    const cityName = req.params.city;
    if (!cityName) {
      return res.status(400).json({ message: "City name is required" });
    }
    
    const apiKey = process.env.WEATHER_API_KEY;
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&appid=${apiKey}&units=metric`
    );
    
    if (!response.ok) {
      // Handle weather API errors
      if (response.status === 404) {
        return res.status(404).json({ message: "City not found in weather service" });
      }
      return res.status(response.status).json({ 
        message: `Weather service error: ${response.status}` 
      });
    }
    
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Weather API error:", err);
    res.status(500).json({ message: "Failed to fetch weather data" });
  }
});

// 4. Add validation middleware for city creation
const validateCity = (req, res, next) => {
  const { name, country, latitude, longitude } = req.body;
  
  if (!name || !country) {
    return res.status(400).json({ message: "City name and country are required" });
  }
  
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({ message: "Latitude and longitude must be numbers" });
  }
  
  if (latitude < -90 || latitude > 90) {
    return res.status(400).json({ message: "Latitude must be between -90 and 90" });
  }
  
  if (longitude < -180 || longitude > 180) {
    return res.status(400).json({ message: "Longitude must be between -180 and 180" });
  }
  
  next();
};

// 5. Apply validation to POST endpoint
// Replace the existing post endpoint with this
app.post('/api/cities', validateCity, async (req, res) => {
  try {
    const newCity = new City(req.body);
    await newCity.save();
    res.status(201).json(newCity);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 6. Central error handler (add at the end, before app.listen)
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ 
    message: 'An unexpected error occurred',
    error: process.env.NODE_ENV === 'production' ? {} : err.message
  });
});