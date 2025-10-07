(function () {
    // ----- COUNTRY DATA & MAP -----
    const map = L.map('map').setView([20, 0], 4);
    const countriesByName = {}; // { name: {layer, continent} }
    const visitedCountries = {}; // { countryName: { from, to } }
    let countryDays = {}; // { countryName: totalDays }

    const continentList = [
        "Africa", "Antarctica", "Asia", "Europe", "North America", "Oceania", "South America"
    ];
    const countriesByContinent = {};
    continentList.forEach(cont => { countriesByContinent[cont] = []; });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    map.setMaxBounds([[-85, -180], [85, 180]]);
    map.setMinZoom(4);
    map.setMaxZoom(18);

    // Load from storage on startup
    loadVisitedCountries();
    Object.keys(countriesByName).forEach(updateCountryUI); // For previously loaded countries
    updateCountryDays();
    updateStats();

    // ----- LOAD GEOJSON COUNTRY BORDERS -----
    fetch('assets/countries.geo.json')
        .then(response => response.json())
        .then(data => {
            data.features.forEach(feature => {
                const cName = feature.properties.NAME;
                const cont = feature.properties.CONTINENT;
                if (continentList.includes(cont)) {
                    countriesByContinent[cont].push(cName);
                }
                countriesByName[cName] = { continent: cont, layer: null };
            });

            L.geoJSON(data, {
                style: function (feature) {
                    const countryName = feature.properties.NAME;
                    const visited = !!visitedCountries[countryName];
                    return {
                        fillColor: visited ? "#4CAF50" : "#aabbff",
                        fillOpacity: visited ? 0.5 : 0.2,
                        weight: 1,
                        color: visited ? "#2E7D32" : "#3388ff",
                        dashArray: visited ? "" : "5,4",
                        className: visited ? "country-polygon visited" : "country-polygon"
                    };
                },
                onEachFeature: function (feature, layer) {
                    const countryName = feature.properties.NAME;
                    countriesByName[countryName].layer = layer;
                    layer.on('click', function (e) {
                        layer.bindPopup(countryPopupHTML(countryName)).openPopup(e.latlng);
                        addPopupButtonListener(layer, countryName);
                    });
                }
            }).addTo(map);

            updateStats();
        });

    // ----- POPUP HTML GENERATOR FOR COUNTRY CLICKS-----
    function countryPopupHTML(countryName, editIndex = null, addMode = false) {
        const visits = visitedCountries[countryName] || [];
        let html = `<div class="travel-popup"><h3>${countryName}</h3>`;

        // Visit Editing Form ("editIndex" is the index of the visit being edited)
        if (editIndex !== null && visits[editIndex]) {
            const v = visits[editIndex];
            html += `
                <label>From: <input type="date" id="visit-from-date" value="${v.from}"></label><br>
                <label>To (optional): <input type="date" id="visit-to-date" value="${v.to}"></label><br>
                <div class="form-btn-row">    
                    <button id="save-visit-btn">Save Visit</button>
                    <button id="cancel-edit-btn">Cancel</button>
                </div>
            `;
        } else if (addMode) {
            // New Visit Form
            html += `
                <label>From: <input type="date" id="new-visit-from"></label>
                <label>To: <input type="date" id="new-visit-to"></label><br>
                <div class="form-btn-row">
                    <button id="save-new-visit-btn">Save</button>
                    <button id="cancel-new-visit-btn">Cancel</button>
                </div>
            `;
        } else {
            // List visits
            if (visits.length) {
                visits.forEach((v, i) => {
                    html += `<div class="visit-row">
                        <span class="visit-dates">${v.from}${v.to && v.to !== v.from ? " to " + v.to : ""}</span>
                        <button class="edit-visit-btn" data-index="${i}">Edit</button>
                        <button class="remove-visit-btn" data-index="${i}">Remove</button>
                    </div>`;
                });
            } else {
                html += "<p>No Visits Yet!</p>";
            }
            // Show add button
            html += `<button id="add-visit-btn">Add New Visit</button>`;
        }
        html += `</div>`;
        return html;
    }

    // ----- POPUP BUTTON HANDLERS FOR COUNTRY CLICKS -----
    function addPopupButtonListener(layer, countryName, editIndex = null, addMode = false) {
        setTimeout(() => {
            // Edit visit mode
            if (editIndex !== null) {
                const saveBtn = document.getElementById("save-visit-btn");
                const cancelBtn = document.getElementById("cancel-edit-btn");
                saveBtn.onclick = () => {
                    const from = document.getElementById("visit-from-date").value;
                    const to = document.getElementById("visit-to-date").value;
                    if (!from) { alert("Please select a start date!"); return; }
                    visitedCountries[countryName][editIndex] = { from, to: to || from };
                    saveVisitedCountries();
                    updateCountryUI(countryName);
                    updateCountryDays();
                    updateStats();
                    // Return to view list
                    const latlng = layer.getPopup().getLatLng();
                    layer.closePopup();
                    setTimeout(() => {
                        layer.bindPopup(countryPopupHTML(countryName)).openPopup(latlng);
                        addPopupButtonListener(layer, countryName);
                    }, 0);
                };
                cancelBtn.onclick = () => {
                    const latlng = layer.getPopup().getLatLng();
                    layer.closePopup();
                    setTimeout(() => {
                        layer.bindPopup(countryPopupHTML(countryName)).openPopup(latlng);
                        addPopupButtonListener(layer, countryName);
                    }, 0);
                };
                return;
            }
            // Add Visit Form
            if (addMode) {
                document.getElementById('save-new-visit-btn').onclick = () => {
                    const from = document.getElementById("new-visit-from").value;
                    const to = document.getElementById("new-visit-to").value;
                    if (!from) {
                        alert("Please select a start date!");
                        return;
                    }
                    const visit = { from, to: to || from };
                    if (!visitedCountries[countryName]) {
                        visitedCountries[countryName] = [];
                    }
                    visitedCountries[countryName].push(visit);
                    saveVisitedCountries();
                    updateCountryUI(countryName);
                    updateCountryDays();
                    updateStats();
                    const latlng = layer.getPopup().getLatLng();
                    layer.closePopup();
                    setTimeout(() => {
                        layer.bindPopup(countryPopupHTML(countryName)).openPopup(latlng);
                        addPopupButtonListener(layer, countryName);
                    }, 0);
                };
                document.getElementById('cancel-new-visit-btn').onclick = () => {
                    const latlng = layer.getPopup().getLatLng();
                    layer.closePopup();
                    setTimeout(() => {
                        layer.bindPopup(countryPopupHTML(countryName)).openPopup(latlng);
                        addPopupButtonListener(layer, countryName);
                    }, 0);
                };
                return;
            }
            // List view: Hook up edit/remove for each visit
            Array.from(document.getElementsByClassName("edit-visit-btn")).forEach(btn => {
                btn.onclick = (ev) => {
                    const idx = +btn.getAttribute("data-index");
                    const latlng = layer.getPopup().getLatLng();
                    layer.closePopup();
                    setTimeout(() => {
                        layer.bindPopup(countryPopupHTML(countryName, idx)).openPopup(latlng);
                        addPopupButtonListener(layer, countryName, idx);
                    }, 0);
                };
            });
            Array.from(document.getElementsByClassName("remove-visit-btn")).forEach(btn => {
                btn.onclick = (ev) => {
                    const idx = +btn.getAttribute("data-index");
                    visitedCountries[countryName].splice(idx, 1);
                    // If no visits remain, remove country from list
                    if (visitedCountries[countryName].length === 0) delete visitedCountries[countryName];
                    saveVisitedCountries();
                    updateCountryUI(countryName);
                    updateCountryDays();
                    updateStats();
                    layer.closePopup();
                };
            });
            const addBtn = document.getElementById("add-visit-btn");
            if (addBtn) addBtn.onclick = () => {
                const latlng = layer.getPopup().getLatLng();
                layer.closePopup();
                setTimeout(() => {
                    layer.bindPopup(countryPopupHTML(countryName, null, true)).openPopup(latlng);
                    addPopupButtonListener(layer, countryName, null, true);
                }, 0);
            };
        }, 10);
    }

    // ----- COUNTRY POLYGON STYLING & POPUP REFRESH -----
    function updateCountryUI(countryName) {
        const info = countriesByName[countryName];
        if (!info) return;
        const visited = !!visitedCountries[countryName];
        info.layer.setStyle({
            fillColor: visited ? "#4CAF50" : "#aabbff",
            fillOpacity: visited ? 0.5 : 0.2,
            weight: 1,
            color: visited ? "#2E7D32" : "#3388ff"
        });
        if (info.layer.isPopupOpen()) {
            info.layer.setPopupContent(countryPopupHTML(countryName));
            addPopupButtonListener(info.layer, countryName);
        }
    }

    // ----- STATS, CONTINENT DETAILS & LOCAL STORAGE -----
    function updateStats() {
        // This is for updating countries visited
        document.getElementById('countries-count').textContent = `${Object.keys(visitedCountries).length} of 209`;
        let visitedContinents = new Set();
        for (const countryName in visitedCountries) {
            const cont = countriesByName[countryName]?.continent;
            if (cont) visitedContinents.add(cont);
        }
        // This is for updating continents visited and the dropdown too
        document.getElementById('continents-count').textContent = `${visitedContinents.size} of 7`;
        if (document.getElementById('continents-details').style.display === 'block') {
            renderContinentsDetails();
        }

        // This is for updating earliest and latest trips -- could be moved into renderTripDetails at some point tho
        let info = getTripStats();
        if (info.minDate) {
            document.getElementById('first-visit').textContent =
                `${info.minDate.toLocaleDateString()} - ${info.firstCountry}`;
        }
        if (info.maxDate) {
            document.getElementById('last-visit').textContent = `${info.maxDate.toLocaleDateString()} - ${info.lastCountry}`;
        }
        if (info.maxTrips) {
            document.getElementById('most-visited').textContent = `${info.maxTrips} Visit${info.maxTrips > 1 ? 's' : ''} - ${info.mostVisited}`;
        }
        let maxCountry = null;
        let maxDays = 0;

        for (const [country, days] of Object.entries(countryDays)) {
            if (days > maxDays) {
                maxDays = days;
                maxCountry = country;
            }
        }

        if (maxDays > 0) {
            document.getElementById('most-days-spent').textContent = `${maxCountry} - You Spent ${maxDays} Day${maxDays > 1 ? 's!' : '!'}`;
        }

        // This is for updating the trip statistics drop down and header too
        document.getElementById('trip-count').textContent = info.numTrips ? `${info.numTrips} Trip${info.numTrips === 1 ? "" : "s"}` : "No Trips Yet!";
        if (document.getElementById('trip-details').style.display === 'block') {
            renderTripDetails();
        }
    }

    // This function is used to extract the date for presentation on screen otherswise using just toLocaleDateString() causes consistency issues to due timezone variations
    function parseLocalDate(inputValue) {
        // inputValue: "2024-08-01"
        const [year, month, day] = inputValue.split('-').map(Number);
        return new Date(year, month - 1, day); // month is 0-based!
    }

    function getVisitedByContinent() {
        const map = {};
        continentList.forEach(c => map[c] = new Set());
        for (const name in visitedCountries) {
            const cont = countriesByName[name]?.continent;
            if (cont) map[cont].add(name);
        }
        return map;
    }

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

    function renderTripDetails() {
        const info = getTripStats();
        const container = document.getElementById('trip-details');
        let html = "";
        html += `
        <div class="trip-row">
            <span>Total Days Abroad:</span>
            <span class="trip-count">${info.totalDays}</span>
        </div>
        <div class="trip-row">
            <span>Longest Trip:</span>
            <span class="trip-count">${info.longest || 0} day(s) ${info.maxCountry ? "to " + info.maxCountry : ""}</span>
        </div>
        <div class="trip-row">
            <span>Shortest Trip:</span>
            <span class="trip-count">${info.shortest !== null ? info.shortest : 0} day(s) ${info.minCountry ? "to " + info.minCountry : ""}</span>
        </div>
        `;
        container.innerHTML = html;
    }

    function saveVisitedCountries() {
        localStorage.setItem('visitedCountries', JSON.stringify(visitedCountries));
    }

    function loadVisitedCountries() {
        const saved = JSON.parse(localStorage.getItem('visitedCountries') || '{}');
        Object.assign(visitedCountries, saved);
    }

    // This is for getting the earliest/latest trips and will be paired with the country traveled to
    function getTripStats() {
        let minDate = null, maxDate = null;
        let firstCountry = null, lastCountry = null;
        let totalDays = 0, numTrips = 0, longest = 0, shortest = null;
        let maxCountry = null, minCountry = null;
        let maxTrips = 0, mostVisited = null;
        Object.entries(visitedCountries).forEach(([countryName, visits]) => {
            if (visits.length > maxTrips) {
                maxTrips = visits.length;
                mostVisited = countryName;
            }
            visits.forEach(info => {
                const from = parseLocalDate(info.from);
                const to = parseLocalDate(info.to);
                const days = Math.round((to - from) / 86400000) + 1;
                totalDays++;
                numTrips++;
                if (!minDate || from < minDate) {
                    minDate = from;
                    firstCountry = countryName;
                }
                if (!maxDate || to > maxDate) {
                    maxDate = to;
                    lastCountry = countryName;
                }
                if (days > longest) {
                    longest = days;
                    maxCountry = countryName;
                }
                if (shortest === null || days < shortest) {
                    shortest = days;
                    minCountry = countryName;
                }
            });
        });
        return { minDate, maxDate, firstCountry, lastCountry, shortest, longest, maxCountry, minCountry, numTrips, totalDays, maxTrips, mostVisited };
    }

    function updateCountryDays() {
        countryDays = {}; // Reset

        for (const [country, visits] of Object.entries(visitedCountries)) {
            let total = 0;
            for (const v of visits) {
                const from = parseLocalDate(v.from);
                const to = parseLocalDate(v.to || v.from);
                // Ensure valid dates
                if (from && to && !isNaN(from) && !isNaN(to)) {
                    total += Math.round((to - from) / 86400000) + 1;
                }
            }
            countryDays[country] = total;
        }
    }

    // This is for displaying the drop down of countries visited in each continent
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

    // This is for displaying the drop down of trip details
    document.getElementById('trip-dropdown-label').addEventListener('click', function () {
        const details = document.getElementById('trip-details');
        const label = document.getElementById('trip-dropdown-label');
        if (details.style.display === 'none' || !details.style.display) {
            details.style.display = 'block';
            label.classList.add('open');
            renderTripDetails();
        } else {
            details.style.display = 'none';
            label.classList.remove('open');
        }
    });

    // === Dynamic current year in footer ===
    const yearSpan = document.querySelector("#year");
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // Initial stats display on page load
    updateStats();
    console.log('Travel Tracker initialized successfully!');
})();