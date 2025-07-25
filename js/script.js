// Initialize the map
const map = L.map('map').setView([20, 0], 2); // Center on world view
const countryLayers = [];

// Add tile layer (the actual map images)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18
}).addTo(map);

// Add the border data for each country
fetch('assets/countries.geo.json')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            // This style code is for the polygon initilization when they are added
            style: function (feature) {
                const countryName = feature.properties.NAME;
                const visited = visitedCountries.has(countryName);
                return {
                    fillColor: visited ? "#4CAF50" : "#3388ff",
                    fillOpacity: visited ? 0.7 : 0.2,
                    weight: 1,
                    color: visited ? "#2E7D32" : "#3388ff"
                };
            },
            // This function is called for each country polygon
            onEachFeature: function (feature, layer) {
                const countryName = feature.properties.NAME;
                const continent = feature.properties.CONTINENT || "Unknown";

                countryLayers.push({ name: countryName, continent: continent, layer: layer });

                // Bind a popup to the polygon with country name and a button
                layer.bindPopup(`
                <div>
                    <h3>${countryName}</h3>
                    <button onclick="toggleVisited('${countryName}')">
                        Mark as Visited
                    </button>
                </div>
                `);

                // Optional: add click event if you want popup to open on click
                layer.on('click', () => {
                    layer.openPopup();
                });
            }
        }).addTo(map);
    });

// Sets to store visited countries and continents
let visitedCountries = new Set();
let visitedContinents = new Set();

// Function to toggle visited status
function toggleVisited(countryName) {
    const country = countryLayers.find(c => c.name === countryName);
    if (!country) return;
    // This is when you remove a country from the list of visited countries
    if (visitedCountries.has(countryName)) {
        // Delete the country from the visited list
        visitedCountries.delete(countryName);

        // Check if any other visited country shares the same continent
        let stillHasSameContinent = false;
        visitedCountries.forEach(name => {
            const other = countryLayers.find(c => c.name === name);
            if (other && other.continent === country.continent) {
                stillHasSameContinent = true;
            }
        });

        if (!stillHasSameContinent) {
            visitedContinents.delete(country.continent);
        }
    } else {
        visitedCountries.add(countryName);
        visitedContinents.add(country.continent);
    }

    updateStats();
    updateCountryPopup(countryName);
    updateCountryStyle(countryName);
}

// Function to update statistics display
function updateStats() {
    document.getElementById('countries-count').textContent = visitedCountries.size;
    document.getElementById('continents-count').textContent = visitedContinents.size;
}


// Initialize stats on page load
updateStats();

/*These are some extra functions*/

// Update popup content based on visit status
function updateCountryPopup(countryName) {
    const country = countryLayers.find(c => c.name === countryName);
    if (!country) return;

    const visited = visitedCountries.has(countryName);

    const buttonText = visited ? "Remove from Visited" : "Mark as Visited";

    country.layer.setPopupContent(`
        <div>
            <h3>${countryName}</h3>
            <button onclick="toggleVisited('${countryName}')">${buttonText}</button>
        </div>
    `);
}

// Updates the polygon border around each country based on the visit status
function updateCountryStyle(countryName) {
    const country = countryLayers.find(c => c.name === countryName);
    if (!country) return;

    const visited = visitedCountries.has(countryName);

    country.layer.setStyle({
        fillColor: visited ? "#4CAF50" : "#3388ff", // green if visited, blue default
        fillOpacity: visited ? 0.7 : 0.2,
        weight: 1,
        color: visited ? "#2E7D32" : "#3388ff"
    });
}

console.log('Travel Tracker initialized successfully!');