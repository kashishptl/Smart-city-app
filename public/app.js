app.controller('MainController', ['$scope', '$http', '$timeout', function($scope, $http, $timeout) {
  // ... existing code ...
  
  // Updated map initialization
  function initMap() {
    $scope.mapLoading = true;
    $scope.mapError = null;
    
    $http.get('/api/config')
      .then(function(response) {
        const mapApiKey = response.data.mapApiKey;
        
        // Create script with better error handling
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${mapApiKey}&callback=initializeMap`;
        script.async = true;
        script.defer = true;
        
        // Add timeout to detect loading failures
        const timeoutPromise = $timeout(function() {
          if (!window.google || !window.google.maps) {
            $scope.mapError = "Map failed to load - timeout";
            $scope.mapLoading = false;
          }
        }, 10000); // 10 second timeout
        
        // Error handler
        script.onerror = function() {
          $timeout.cancel(timeoutPromise);
          $scope.mapError = "Failed to load Google Maps";
          $scope.mapLoading = false;
        };
        
        // Success handler
        window.initializeMap = function() {
          $timeout.cancel(timeoutPromise);
          $scope.mapLoading = false;
          
          try {
            $scope.map = new google.maps.Map(document.getElementById('map'), {
              center: { lat: 20, lng: 0 },
              zoom: 2
            });
            
            // Load markers for existing cities
            $scope.cities.forEach(city => {
              addMarker(city);
            });
          } catch (e) {
            console.error('Map initialization error:', e);
            $scope.mapError = "Error initializing map: " + e.message;
          }
        };
        
        document.head.appendChild(script);
      })
      .catch(function(error) {
        $scope.mapLoading = false;
        $scope.mapError = "Error loading map configuration";
        console.error('Error getting map API key:', error);
      });
  }
  
  // 2. Improved city addition with form validation
  $scope.addCity = function() {
    // Reset validation errors
    $scope.formErrors = {};
    
    // Validate fields
    if (!$scope.newCity.name) {
      $scope.formErrors.name = "City name is required";
    }
    
    if (!$scope.newCity.country) {
      $scope.formErrors.country = "Country is required";
    }
    
    if (!$scope.newCity.latitude) {
      $scope.formErrors.latitude = "Latitude is required";
    } else if (isNaN($scope.newCity.latitude) || 
              $scope.newCity.latitude < -90 || 
              $scope.newCity.latitude > 90) {
      $scope.formErrors.latitude = "Latitude must be between -90 and 90";
    }
    
    if (!$scope.newCity.longitude) {
      $scope.formErrors.longitude = "Longitude is required";
    } else if (isNaN($scope.newCity.longitude) || 
              $scope.newCity.longitude < -180 || 
              $scope.newCity.longitude > 180) {
      $scope.formErrors.longitude = "Longitude must be between -180 and 180";
    }
    
    // Check if we have errors
    if (Object.keys($scope.formErrors).length > 0) {
      return;
    }
    
    // Proceed with API call
    $http.post('/api/cities', $scope.newCity)
      .then(function(response) {
        $scope.cities.push(response.data);
        $scope.newCity = {};
        addMarker(response.data);
        $scope.addSuccess = "City added successfully!";
        
        // Clear success message after 3 seconds
        $timeout(function() {
          $scope.addSuccess = null;
        }, 3000);
      })
      .catch(function(error) {
        console.error('Error adding city:', error);
        $scope.addError = error.data?.message || "Error adding city";
      });
  };
  
  // 3. Improved weather display with loading state and error handling
  $scope.showWeather = function(city) {
    $scope.selectedCity = city;
    $scope.weatherLoading = true;
    $scope.weatherError = null;
    $scope.weatherData = null;
    
    $http.get(`/api/weather/${encodeURIComponent(city.name)}`)
      .then(function(response) {
        $scope.weatherData = response.data;
        $scope.weatherLoading = false;
      })
      .catch(function(error) {
        $scope.weatherLoading = false;
        $scope.weatherError = error.data?.message || "Failed to load weather data";
        console.error('Error fetching weather data:', error);
      });
  };
}]);
