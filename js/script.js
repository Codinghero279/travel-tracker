(function () {
    // Initialize the map
    const map = L.map('map').setView([20, 0], 4); // Center on world view

    // Map to store country information for instant lookup by name
    const countriesByName = {}; // { name: {layer, continent} }

    // Sets to store visited countries
    const visitedCountries = new Set();

    // List and mapping for continents and their countries
    const continentList = [
        "Africa", "Antarctica", "Asia", "Europe", "North America", "Oceania", "South America"
    ];
    const countriesByContinent = {};
    continentList.forEach(cont => { countriesByContinent[cont] = []; });

    // Add tile layer (the actual map images)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // This sets the max bounds from about [-85, -180] to [85, 180] (the entire "real" world)
    map.setMaxBounds([
        [-85, -180],
        [85, 180]
    ]);

    // Sets min and max zoom for the map
    map.setMinZoom(4);
    map.setMaxZoom(18);

    // Fetch and add the border data for each country
    fetch('assets/countries.geo.json')
        .then(response => response.json())
        .then(data => {
            // Build lookups for country and continent on data load
            data.features.forEach(feature => {
                const cName = feature.properties.NAME;
                const cont = feature.properties.CONTINENT;
                if (continentList.includes(cont)) {
                    countriesByContinent[cont].push(cName);
                }
                countriesByName[cName] = { continent: cont, layer: null }; // The layer will be added next
            });

            // Add the geoJson countries
            L.geoJSON(data, {
                // Style each country polygon based on visited status
                style: function (feature) {
                    const countryName = feature.properties.NAME;
                    const visited = visitedCountries.has(countryName);
                    return {
                        fillColor: visited ? "#4CAF50" : "#aabbff",
                        fillOpacity: visited ? 0.5 : 0.2,
                        weight: 1,
                        color: visited ? "#2E7D32" : "#3388ff",
                        dashArray: visited ? "" : "5,4",
                        className: visited ? "country-polygon visited" : "country-polygon"
                    };
                },
                // This function is called for each country polygon
                onEachFeature: function (feature, layer) {
                    const countryName = feature.properties.NAME;

                    // Store reference for later fast updating
                    countriesByName[countryName].layer = layer;

                    // Setup popup using helper, ensure it can toggle visited status
                    layer.on('click', function (e) {
                        layer.bindPopup(countryPopupHTML(countryName)).openPopup(e.latlng);
                        addPopupButtonListener(layer, countryName);
                    });
                }
            }).addTo(map);

            updateStats();
        });

    // Generates the popup HTML depending on visited status
    function countryPopupHTML(countryName) {
        const visited = visitedCountries.has(countryName);
        const buttonText = visited ? "Remove from Visited" : "Mark as Visited";
        // Use sanitized ID for unique button in DOM
        const buttonId = `popup-btn-${countryName.replace(/[^a-z0-9]/ig, '')}`;
        return `
            <div>
                <h3>${countryName}</h3>
                <button class="popup-btn" id="${buttonId}">${buttonText}</button>
            </div>
        `;
    }

    // Attach the popup button handler after popup opens
    function addPopupButtonListener(layer, countryName) {
        setTimeout(() => {
            const buttonId = `popup-btn-${countryName.replace(/[^a-z0-9]/ig, '')}`;
            const btn = document.getElementById(buttonId);
            if (btn) btn.onclick = () => toggleVisited(countryName);
        }, 10); // Needs short delay for popup to be in DOM
    }

    // Toggle visited status for a country and update relevant UI
    function toggleVisited(countryName) {
        if (visitedCountries.has(countryName)) {
            visitedCountries.delete(countryName);
        } else {
            visitedCountries.add(countryName);
        }
        updateCountryUI(countryName);
        updateStats();
    }

    // Update both the polygon style and popup for a specific country
    function updateCountryUI(countryName) {
        const info = countriesByName[countryName];
        if (!info) return;

        // Update polygon coloring
        const visited = visitedCountries.has(countryName);
        info.layer.setStyle({
            fillColor: visited ? "#4CAF50" : "#aabbff",
            fillOpacity: visited ? 0.5 : 0.2,
            weight: 1,
            color: visited ? "#2E7D32" : "#3388ff"
        });
        // Update popup content if it's open
        if (info.layer.isPopupOpen()) {
            info.layer.setPopupContent(countryPopupHTML(countryName));
            addPopupButtonListener(info.layer, countryName);
        }
    }

    // Update travel statistics for countries and continents
    function updateStats() {
        document.getElementById('countries-count').textContent = `${visitedCountries.size} of 209`;
        // Compute number of distinct visited continents based on visitedCountries
        let visitedContinents = new Set();
        for (const countryName of visitedCountries) {
            const cont = countriesByName[countryName]?.continent;
            if (cont) visitedContinents.add(cont);
        }
        document.getElementById('continents-count').textContent = `${visitedContinents.size} of 7`;
        // If dropdown is open, also update continent details
        if (document.getElementById('continents-details').style.display === 'block') {
            renderContinentsDetails();
        }
    }

    // Compute breakdown of visited countries by continent for the details dropdown
    function getVisitedByContinent() {
        const map = {};
        continentList.forEach(c => map[c] = new Set());
        for (const name of visitedCountries) {
            const cont = countriesByName[name]?.continent;
            if (cont) map[cont].add(name);
        }
        return map;
    }

    // Render the continents breakdown in the interactive dropdown
    function renderContinentsDetails() {
        const byCont = getVisitedByContinent();
        const container = document.getElementById('continents-details');
        let html = "";
        continentList.forEach(cont => {
            const visitedCount = byCont[cont].size;
            const totalCount = countriesByContinent[cont].length;
            if (totalCount > 0) {
                html += `
                <div class="continent-row">
                    <span class="continent-name">${cont}</span>
                    <span class="continent-count">${visitedCount} of ${totalCount}</span>
                </div>`;
            }
        });
        container.innerHTML = html;
    }

    // Setup dropdown for continent details (shows/hides with stat update)
    document.getElementById('continents-dropdown-label').addEventListener('click', function () {
        const details = document.getElementById('continents-details');
        const label = document.getElementById('continents-dropdown-label');
        if (details.style.display === 'none' || !details.style.display) {
            details.style.display = 'block';
            label.classList.add('open');
            renderContinentsDetails();
        } else {
            details.style.display = 'none';
            label.classList.remove('open');
        }
    });

    // Initial stats display on page load
    updateStats();

    console.log('Travel Tracker initialized successfully!');
})();