// Initialize the map
const map = L.map('map').setView([20, 0], 2); // Center on world view

// Add tile layer (the actual map images)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18
}).addTo(map);

// Array to store visited countries
let visitedCountries = [];

// Sample country data (we'll expand this later)
const countries = [
    { name: 'United States', lat: 39.8283, lng: -98.5795, continent: 'North America' },
    { name: 'Canada', lat: 56.1304, lng: -106.3468, continent: 'North America' },
    { name: 'United Kingdom', lat: 55.3781, lng: -3.4360, continent: 'Europe' },
    { name: 'France', lat: 46.6034, lng: 1.8883, continent: 'Europe' },
    { name: 'Germany', lat: 51.1657, lng: 10.4515, continent: 'Europe' },
    { name: 'Japan', lat: 36.2048, lng: 138.2529, continent: 'Asia' },
    { name: 'Australia', lat: -25.2744, lng: 133.7751, continent: 'Australia' },
    { name: 'Brazil', lat: -14.2350, lng: -51.9253, continent: 'South America' },
    { name: 'Egypt', lat: 30.0444, lng: 31.2357, continent: 'Africa' },
    { name: 'India', lat: 20.5937, lng: 78.9629, continent: 'Asia' }
];

// Add markers for each country
countries.forEach(country => {
    // Create a marker for each country
    const marker = L.marker([country.lat, country.lng])
        .addTo(map)
        .bindPopup(`
            <div>
                <h3>${country.name}</h3>
                <p><strong>Continent:</strong> ${country.continent}</p>
                <button onclick="toggleVisited('${country.name}')">
                    Mark as Visited
                </button>
            </div>
        `);

    // Store reference to marker for later use
    country.marker = marker;
});

// Function to toggle visited status
function toggleVisited(countryName) {
    const country = countries.find(c => c.name === countryName);

    if (visitedCountries.includes(countryName)) {
        // Remove from visited list
        visitedCountries = visitedCountries.filter(name => name !== countryName);

        // Change marker back to default (blue)
        country.marker.setIcon(new L.Icon.Default());

        // Update popup button text
        country.marker.setPopupContent(`
            <div>
                <h3>${country.name}</h3>
                <p><strong>Continent:</strong> ${country.continent}</p>
                <button onclick="toggleVisited('${country.name}')">
                    Mark as Visited
                </button>
            </div>
        `);
    } else {
        // Add to visited list
        visitedCountries.push(countryName);

        // Change marker to green
        const greenIcon = new L.Icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        country.marker.setIcon(greenIcon);

        // Update popup button text
        country.marker.setPopupContent(`
            <div>
                <h3>${country.name}</h3>
                <p><strong>Continent:</strong> ${country.continent}</p>
                <button onclick="toggleVisited('${country.name}')">
                    Remove from Visited
                </button>
            </div>
        `);
    }

    // Update statistics
    updateStats();
}

// Function to update statistics display
function updateStats() {
    // Update countries count
    document.getElementById('countries-count').textContent = visitedCountries.length;

    // Calculate continents visited
    const visitedContinents = new Set();
    visitedCountries.forEach(countryName => {
        const country = countries.find(c => c.name === countryName);
        if (country) {
            visitedContinents.add(country.continent);
        }
    });

    document.getElementById('continents-count').textContent = visitedContinents.size;
}

// Initialize stats on page load
updateStats();

console.log('Travel Tracker initialized successfully!');