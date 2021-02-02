// NOTIFICATION REMINDER

// alert("To view the map, turn on your device's location settings");

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// LEAFLET MAPS

// NORMAL MAP VIEW
var CartoDB_Voyager = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    id: 'og',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    minZoom: 3,
    maxZoom: 19
});

// DARK MAP VIEW
var CartoDB_DarkMatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
	subdomains: 'abcd',
    minZoom: 3,
    maxZoom: 19
});

// TOGGLE BETWEEN THE TWO
// no point in adding unless grouplayer plugin works
// takes up too much vh

// var baseMaps = {
//     "Light Theme": CartoDB_Voyager,
//     "Dark Theme": CartoDB_DarkMatter
// };

// CREATING MYMAP VARIABLE
var mymap = L.map('map', {
    // attributionControl: false,
    layers: [CartoDB_Voyager]
});

// L.control.layers(baseMaps).addTo(mymap);

// GETTING MAP BOUNDS
var southWest = L.latLng(-89.98155760646617, -180),
northEast = L.latLng(89.99346179538875, 180);
var bounds = L.latLngBounds(southWest, northEast);

// SETTING MAP BOUNDS
mymap.setMaxBounds(bounds);
mymap.on('drag', function() {
    mymap.panInsideBounds(bounds, { animate: false });
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// MAIN CODE FLOW


// WILL CONTAIN COUNTRY DATA FROM API CALLS
// SO NO NEED TO CALL API TWICE FOR SAME COUNTRY
var countryOverviewList = [];
// WILL CONTAIN ALL COUNTRY EXCHANGE RATES


// FIRST CALL TO SERVER
// CALL TO GET GEOJSON FOR MYMAP
// PASSES TRUE FOR FIRST CALL TO SERVER
// PASSES BASEMAPS TO BE ALTERED AND ADDED TO MYMAP
geoData(true);


// DROPDOWN CHANGE CALLS LIST ABOVE OR SERVER VIA AJAX FUNC
$('#countriesDropdown').change(function() {
    // way for user to go back to original location
    if ($('#countriesDropdown').val() === "YourLocation") {
        navigator.geolocation.getCurrentPosition(function (position) {
            myLat = position.coords.latitude;
            myLong = position.coords.longitude;
            mymap.setView([myLat, myLong], 10);
        });
    } else {

        var layer = mymap._layers[$('#countriesDropdown').val()];
        mymap.fitBounds(layer.getBounds());
        // FIND COUNTRY IN LIST
        if ($('#countriesDropdown').val() in countryOverviewList) {
            // CALL TO CREATE OVERVIEW
            createOverview(countryOverviewList[$('#countriesDropdown').val()]);
            // console.log(countryOverviewList);
            // CALL TO RESET CHARTS
            resetCharts();
            // CALL TO LOAD ALL NEW HTML AND CHARTS
            loadHtmlAndCharts(countryOverviewList[$('#countriesDropdown').val()]);
            
            // SIMULATE MODAL OPENING
            $("#countryData").click();
            $("#showOverview").click();
        } else {
            // CALL LOADING
            showLoading();
            // GET COUNTRY DATA  FROM APIS (CALL TO SERVER)
            countryData($('#countriesDropdown').val(), countryOverviewList, "2000");
        }
    }
});


// MODAL TOOLTIP
$(function () {
    $('[data-toggle="tooltip"]').tooltip();
})


// WILL SHOW AND HIDE MODAL CHARTS AND DATA
$("#showOverview").click(function(){
    $("#economy").hide();
    $("#social").hide();
    $("#environment").hide();
    $('[data-toggle="tooltip"]').tooltip('hide');
    $("#overview").show();
});


$("#showEconomy").click(function(){
    $("#social").hide();
    $("#environment").hide();
    $("#overview").hide();
    $('[data-toggle="tooltip"]').tooltip('hide');
    $("#economy").show();
});

$("#showSocial").click(function(){
    $("#economy").hide();
    $("#environment").hide();
    $("#overview").hide();
    $('[data-toggle="tooltip"]').tooltip('hide');
    $("#social").show();
});

$("#showEnvironment").click(function(){
    $("#economy").hide();
    $("#social").hide();
    $("#overview").hide();
    $('[data-toggle="tooltip"]').tooltip('hide');
    $("#environment").show();
});


// GET LOCATION AND PLACE MARKER ON IT
function gettingYourLocation() {
    navigator.geolocation.getCurrentPosition(function (position) {
        myLat = position.coords.latitude;
        myLong = position.coords.longitude;
        mymap.setView([myLat, myLong], 3);
        // adding the marker divIcon for html
        var markerPerson = L.divIcon({
            html: '<i class="fas fa-street-view fa-2x" style="color: #007bff;"></i>',
            iconSize: [20, 20],
            iconAnchor: [10, 20],
            popupAnchor: [15, -10],
            className: 'myDivIcon'
        })

        firstMarker = L.marker([myLat, myLong], {icon: markerPerson, draggable: true}).addTo(mymap);

        firstMarker.bindTooltip("<b>Select and Drag Marker for Weather</b>", {
            permanent: false,
            className: 'leaflet-tooltip',
            offset: [0, 10],
            opacity: 0.75, 
            direction: 'bottom',
        })
        
        // FIRST CALL TO GET WEATHER ON SITE LOAD
        getWeather(firstMarker.getLatLng().lat,firstMarker.getLatLng().lng);

        // EVERY CALL AFTER
        firstMarker.on('dragend', function (e) {
            getWeather(firstMarker.getLatLng().lat,firstMarker.getLatLng().lng);
        });

        // get country data for your location
        latLngToIso(myLat, myLong);
    });
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// AJAX CALLS TO PHP (SERVER)

// RETURNS GEOJSON OVERLAYS
function geoData(firstCall) {
    $.ajax({
        url:"php/getAllApi.php",
        type: 'POST',
        data: {
            firstCall: firstCall
        },
        success: function(result) {
            // console.log(result);
            // parse result from php to ensure json format
            var parse = JSON.parse(result);
            console.log(parse);

            // SPLIT RETURNED JSON
            var countryGeojson = parse.countryGeojson;
            var earthquakes = parse.earthquakes;
            var plateGeojson = parse.plateGeojson;

            // CALL LOOPS TO ADD JSON COUNTRY ISO CODE TO DROPDOWN LIST
            loop1(loop2);
        

            // CALL LOCATION FUNCTION
            gettingYourLocation();

            // LOOPS TO ADD COUNTRY TO DROPDOWN LIST
            function loop1() {
                arr = [];
                // list keeps all the overviews of the countries from the api countryData

                for(i = 0; i < countryGeojson.features.length; i++) {
                    // passing both iso code and country name to the array from the geojson file
                    // countryData(parse.features[i].properties.iso_a2, countryOverviewList, false);
                    
                        // pass iso code to api to begin all api calls
                    arr.push({label:countryGeojson.features[i].properties.name, value: countryGeojson.features[i].properties.iso_a2});
                }
                var sorted = arr.sort(function(a, b){
                    var labelA=a.label.toLowerCase(), labelB=b.label.toLowerCase()
                    if (labelA < labelB) // sort string ascending
                        return -1 
                    if (labelA > labelB)
                        return 1
                    return 0 
                })
                loop2(sorted);
            }
    
            function loop2(arr) {
                for(i = 0; i < arr.length; i++) {
                    var select = document.getElementById("countriesDropdown"); 
                    var opt = arr[i].label;
                    var el = document.createElement("option");
                    el.textContent = opt;
                    el.value = arr[i].value;
                    select.appendChild(el);
                }
            }


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

            // EARTHQUAKE MARKERS
            
            // get plate lat, lng (format output = (lng, lat))
            var plateCoordinates = [];
            for (var j = 0; j < plateGeojson.features.length; j++) {
            var latLngPairs = [];
            for (var k = 0; k < plateGeojson.features[j].geometry.coordinates.length; k++) {
                latLngPairs.push([plateGeojson.features[j].geometry.coordinates[k][1], plateGeojson.features[j].geometry.coordinates[k][0]])
            }
            plateCoordinates.push(latLngPairs)
            }


            // SCALE OF EARTHQUAKE
            function markerSize(earthquake_mag) {
                return earthquake_mag * 15000;
            }
        
            var magMarkers = [];
        
            for (var i = 0; i < earthquakes.features.length; i++) {
                magMarkers.push(
                    L.circle([+earthquakes.features[i].geometry.coordinates[1], +earthquakes.features[i].geometry.coordinates[0]], {
                        fillOpacity: 0.6,
                        color: getColorQuake(+earthquakes.features[i].properties.mag),
                        fillColor: getColorQuake(+earthquakes.features[i].properties.mag),
                        radius: markerSize(+earthquakes.features[i].properties.mag)
                    }).bindPopup(
                        `<div style="text-align:center;">
                            <h6> ${earthquakes.features[i].properties.place} </h6> 
                            <hr style="margin-top: 0; margin-bottom: 0;">
                            <div class="row d-block mb-1 mt-1">
                                <span class="text-primary">Earthquake Magnitude</span>
                            </div>
                            <div class="row d-block mb-1 mt-1">
                                <span>${earthquakes.features[i].properties.mag}</span>
                            </div>
                            <hr style="margin-top: 0; margin-bottom: 0;">  
                            <div class="row d-block mb-1 mt-1">
                                <span class="text-primary">Earthquake Depth (km)</span>
                            </div> 
                            <div class="row d-block mb-1 mt-1">
                                <span>${earthquakes.features[i].geometry.coordinates[2]}</span>
                            </div>  
                            <hr style="margin-top: 0; margin-bottom: 0;"> 
                            <div class="row d-block mb-1 mt-1">
                                <span class="text-primary">Significance Rating</span>
                            </div>  
                            <div class="row d-block mb-1 mt-1">
                                <span>${earthquakes.features[i].properties.sig}</span>
                            </div>  
                            <hr style="margin-top: 0; margin-bottom: 0;"> 
                            <div class="row d-block mb-1 mt-1">
                                <span class="text-primary">Time</span>
                            </div>  
                            <div class="row d-block mb-1 mt-1">
                                <span>${new Date(earthquakes.features[i].properties.time)}</span>
                            </div>
                        </div>`)
                );
            }
        
            var faultMarkers = [];

        
            for (var m = 0; m < plateCoordinates.length; m++) {
                faultMarkers.push(
                    L.polyline(plateCoordinates[m], {
                        color: "#0060d6",
                    }).bindPopup("<h4>" + plateGeojson.features[m].properties.Name + "</h4>")
                );
            }

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

            // MAP LAYERS

            // LAYER GROUPS
            var earthquakeMag = L.layerGroup(magMarkers);
            var faults  = L.layerGroup(faultMarkers);
            var gdpColours = L.geoJSON(countryGeojson, {style: gdpStyle, onEachFeature: onEachFeatureGDP}); // style based on GDP
            var growthColours = L.geoJSON(countryGeojson, {style: growthStyle, onEachFeature: onEachFeatureGrowth}); // style based on Growth
            var carbonColours = L.geoJSON(countryGeojson, {style: carbonStyle, onEachFeature: onEachFeatureCarbon});// style based on Carbon
            var noLayer = L.geoJSON(countryGeojson, {style: style, onEachFeature: onEachFeatureMain}).addTo(mymap); // normal styling 

        
            // TOGGLE BETWEEN LAYERS
            var baseMaps2 = {
                ["<span>Normal Map View</span>"]: noLayer,
                [`<span>Earthquake Actvity</span>`]: earthquakeMag,
                [`<span>Population Growth</span>`]: growthColours,
                [`<span>CO2 Emissions</span>`]: carbonColours,
                [`<span>GDP</span>`]: gdpColours,
            };
        
            var overlayMaps = {
                "Plate Boundaries": faults,
            }

            // Would be better way of implementing layer control
            // but doesnt work atm

            // var groupedOverlays = {
            //     "World Bank": {
            //       "Population Growth": growthColours,
            //       "CO2 Emissions": carbonColours,
            //       "GDP": gdpColours,
            //     },
            //     "Earthquakes": {
            //         "Earthquake Actvity": earthquakeMag,
            //         "Plate Boundaries": faults,
            //     }
            // };

            
            // var options = {
            //     // Make the "Landmarks" group exclusive (use radio inputs)
            //     exclusiveGroups: ["World Bank"],
            //     // Show a checkbox next to non-exclusive group labels for toggling all
            //     groupCheckboxes: true
            // };
              
            // L.control.groupedLayers(baseMaps, groupedOverlays, options).addTo(mymap);
            
            // ADD MAPS AND LAYERS TO MYMAP
            L.control.layers(baseMaps2, overlayMaps).addTo(mymap);
            
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

            // LEGENDS

            // FUNC TO CREATE LEGEND
            function createLegend(name, label, scaleArray, colorScheme) {

                name = L.control({position: 'bottomright'});
        
                name.onAdd = function () {
            
                var div = L.DomUtil.create('div', `${label} legend`);
                // TITLE
                div.innerHTML += `<h6 id="legendTitle">${label}</h6>`;
                // COLOUR
                for (var i = 0; i < scaleArray.length; i++) {
                    div.innerHTML +=
                        '<span style="background:' + colorScheme(scaleArray[i]) + '"></span> ';
                }
            
                // BREAK
                div.innerHTML += '<br>';
            
                // SCALE
                for (var i = 0; i < scaleArray.length; i++) {
                    if (i === 0) {
                        div.innerHTML +=
                        '<label>&le; ' + roundLarge(scaleArray[i]) + '</label>';
                    } else if (i === scaleArray.length - 1) {
                        div.innerHTML +=
                        '<label>' + roundLarge(scaleArray[i]) + ' &le;</label>';
                    } else {
                        div.innerHTML +=
                        '<label>' + roundLarge(scaleArray[i]) + '</label>';
                    }
                }
                return div;
                };
                return name;
            }

            // LEGEND SCALES
            var earthquakeLegend,
                mags = [2, 3, 4, 5, 6];
            var gdpLegend,
                gdps = [1.0e+9, 50.0e+9, 100.0e+9, 500.0e+9, 1.0e+12, 2.0e+12, 10.0e+12];
            var growthLegend,
                percent = [-2, -1, 0, 1, 2, 3, 4];
            var co2Legend,
                carbon = [0.5, 1, 5, 10, 15, 20, 30];
                // [0.5, 1, 5, 10, 15, 20, 30];

            // php returns latest data which covers most countries 
            // as of typing  2021 - 5 = 2016
            var currentYear = new Date().getFullYear() - 5;

            // CALL FUNC TO CREATE LEGENDS
            var earthLeg = createLegend(earthquakeLegend, `Magnitude (Past Month)`, mags, getColorQuake);
            var gdpLeg = createLegend(gdpLegend, `GDP (US$) (${currentYear})`, gdps, getColorGdp);
            var growthLeg = createLegend(growthLegend, `Annual Growth % (${currentYear})`, percent, getColorGrowth);
            var co2Leg = createLegend(co2Legend, `Metric tons per capita (MT) (${currentYear})`, carbon, getColorCarbon);


            // TOGGLE WHEN TO SHOW LEGEND
            mymap.on('baselayerchange', function (eventLayer) {
                // adds legend
                if (eventLayer.name === `<span>Earthquake Actvity</span>`) {
                    earthLeg.addTo(this);
                    gdpLeg.remove();
                    growthLeg.remove();
                    co2Leg.remove();
                    $('#countriesDropdown').prop('disabled', true);
                } else if (eventLayer.name === `<span>GDP</span>`) {
                    gdpLeg.addTo(this);
                    earthLeg.remove();
                    growthLeg.remove();
                    co2Leg.remove();
                    $('#countriesDropdown').prop('disabled', true);
                } else if (eventLayer.name === `<span>Population Growth</span>`) {
                    growthLeg.addTo(this);
                    earthLeg.remove();
                    gdpLeg.remove();
                    co2Leg.remove();
                    $('#countriesDropdown').prop('disabled', true);
                } else if (eventLayer.name === `<span>CO2 Emissions</span>`) {
                    co2Leg.addTo(this);
                    earthLeg.remove();
                    gdpLeg.remove();
                    growthLeg.remove();
                    $('#countriesDropdown').prop('disabled', true);
                } else if (eventLayer.name === '<span>Normal Map View</span>') {
                    co2Leg.remove();
                    earthLeg.remove();
                    gdpLeg.remove();
                    growthLeg.remove();
                    $('#countriesDropdown').prop('disabled', false);
                }
            });

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

            // ONEACHFEATURE

            // MAIN ONEACHFEATURE
            function onEachFeatureMain(feature, layer) {
                // give each layer a unique id so iso code matches when selecting dropdown list
                layer._leaflet_id = feature.properties.iso_a2;
                
                layer.on({
                    mouseover: highlight,
                    mouseout: resetHighlight,
                    click: onMapClick,
                });
            }
            
            function onMapClick(e) {
                // call api to convert latlng to iso code
                latLngToIso(e.latlng.lat, e.latlng.lng);
                
            }

            // highlight will change country styling when mouse moves over
            function highlight(e) {
            
                var layer = e.target;
            
                layer.setStyle({
                    weight: 3,
                    color: '#3d81b5',
                    dashArray: '5',
                    opacity: 1,
                });
            
                if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                    layer.bringToFront();
                }
            }

            // in order to reset style must declare geojson again? - NO
            // var geojson;
            
            function resetHighlight(e) {
                noLayer.resetStyle(e.target);
            }


            // GDP ONEACHFEATURE
            function onEachFeatureGDP(feature, layer) {
                // console.log(feature);
                // POPUP WITH COUNTRY DATA
                layer.bindPopup(`
                <p>${feature.properties.name} GDP (US$): ${roundLarge(feature.properties.gdp)}</p>`);
            }

             // GROWTH ONEACHFEATURE
            function onEachFeatureGrowth(feature, layer) {

                // POPUP WITH COUNTRY DATA
                layer.bindPopup(`
                <p>${feature.properties.name} Growth (%): ${roundLarge(feature.properties.growth)}</p>`);
            }

             // CARBON ONEACHFEATURE
            function onEachFeatureCarbon(feature, layer) {

                // POPUP WITH COUNTRY DATA
                layer.bindPopup(`
                <p>${feature.properties.name} Emissions (MT): ${roundLarge(feature.properties.co2)}</p>`);
            }

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

            // STYLES

            // COLOUR SCHEME FOR EARTHQUAKES AND LEGEND
            function getColorQuake(d) {
                return d >= 6 ? '#bd0026' :
                    d >= 5 ? '#f03b20' :
                    d >= 4 ? '#fd8d3c' :
                    d >= 3 ? '#feb24c' :
                    d >= 2 ? '#fed976' :
                            '#ffffb2';
            }
            
            // COLOUR SCHEME FOR GDP AND LEGEND
            function getColorGdp(d) {
                return d >= 10.0e+12 ? '#005a32' :
                d >= 2.0e+12 ? '#238443' :
                d >= 1.0e+12 ? '#41ab5d' :
                d >= 500.0e+9 ? '#78c679' :
                d >= 100.0e+9 ? '#addd8e' :
                d >= 50.0e+9 ? '#d9f0a3' :
                d >= 1.0e+9 ? '#f7fcb9' :
                        '#ffffe5';
            }

            function getColorGrowth(d) {
                return d > 4 ? '#7a0177' :
                d > 3 ? '#ae017e' :
                d > 2 ? '#dd3497' :
                d > 1 ? '#f768a1' :
                d > 0 ? '#fa9fb5' :
                d > -1 ? '#fcc5c0' :
                d > -2 ? '#fde0dd' :
                        '#fff7f3';
            }

            function getColorCarbon(d) {
                return d > 30 ? '#b10026' :
                d > 20 ? '#e31a1c' :
                d > 15 ? '#fc4e2a' :
                d > 10 ? '#fd8d3c' :
                d > 5 ? '#feb24c' :
                d > 1 ? '#fed976' :
                d > 0.5 ? '#ffeda0' :
                        '#ffffcc';
            }

            // MAIN STYLING
            function style(feature) {
                return {
                    weight: 1,
                    opacity: 0,
                    color: '#ff7800',
                    dashArray: '1',
                    fillOpacity: 0
                };
            }

            // GDP STYLING
            function gdpStyle(feature) {
                return {
                    fillColor: getColorGdp(feature.properties.gdp), // func to get colour based on GDP - wb api
                    weight: 2,
                    opacity: 1,
                    color: 'white',
                    dashArray: '3',
                    fillOpacity: 0.7
                };
            }

            // GROWTH STYLING
            function growthStyle(feature) {
                return {
                    fillColor: getColorGrowth(feature.properties.growth), // func to get colour based on GROWTH - wb api
                    weight: 2,
                    opacity: 1,
                    color: 'white',
                    dashArray: '3',
                    fillOpacity: 0.7
                };
            }

            // CARBON STYLING
            function carbonStyle(feature) {
                return {
                    fillColor: getColorCarbon(feature.properties.co2), // func to get colour based on CO2 - wb api
                    weight: 2,
                    opacity: 1,
                    color: 'white',
                    dashArray: '3',
                    fillOpacity: 0.7
                };
            }
        }
    });
};


// CHANGE LATLNG TO ISO CODE (CALL TO SERVER)
function latLngToIso(latitude, longitude) {
    $.ajax({
        url:"php/getAllApi.php",
        type: 'POST',
        data: {
            lat: latitude,
            lng: longitude,
        },
        success: function(result) {
            // console.log(result);
            // parse result from php to ensure json format
            var json = JSON.parse(result);
            // console.log(json);

            // CHANGE DROPDOWN VALUE
            $('#countriesDropdown').val(json).change();

        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.log('latLngToIso error')
        }
    });
}


// GET COUNTRY DATA (CALL TO SERVER)
function countryData(isoCode, countryOverviewList, startYear) {

    $.ajax({
        url:"php/getAllApi.php",
        type: 'POST',
        data: {
            iso: isoCode,
            startYear: startYear,
        },
        success: function(result) {

            // parse result from php to ensure json format
            var json = JSON.parse(result);
            console.log(json);
            // console.log(result);
            countryOverviewList[isoCode] = (json);

            // console.log(json);

            console.log(countryOverviewList);
            createOverview(json);

            resetCharts();
            // loadCanvas();

            loadHtmlAndCharts(json);

            hideLoading();

            $("#countryData").click();
            $("#showOverview").click();


        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.log('countryData error')
        }
    });
};


// GET WEATHER FROM API (CALL TO SERVER)
function getWeather(markerLat, markerLng) {

    $.ajax({
        url:"php/getAllApi.php",
        type: 'POST',
        data: {
            markerLat: markerLat,
            markerLng: markerLng
        },
        success: function(result) {
            // console.log(result);
            // parse result from php to ensure json format
            var json = JSON.parse(result);
            // console.log(json);

            if (json.name === "") {
                var title = "N/A";
            } else {
                var title = json.name + ", " + json.sys.country;
            }

            firstMarker.bindPopup(
                `<div style="text-align:center;">
                    <h6>${title}</h6>
                    <div id="icon" style="margin-bottom:5px; border-radius:12px;
                    background-color:#008effb8;">
                        <img id="wicon" src="https://openweathermap.org/img/wn/${json.weather[0].icon}.png" alt="Weather icon">
                    </div>
                    <hr style="margin-top: 0; margin-bottom: 0;">
                    <div class="row d-block mb-1 mt-1">
                        <span class="text-primary">Description</span>
                    </div>
                    <div class="row d-block ">
                        <span id="summary">${json.weather[0].description}</span>
                    </div>
                    <hr style="margin-top: 0; margin-bottom: 0;">
                    <div class="row d-block mb-1 mt-1">
                        <span class="text-primary">Temperature</span>
                    </div>
                    <div class="row d-block ">
                        <span id="temperature">${json.main.temp + " °C"}</span>
                    </div>
                    <hr style="margin-top: 0; margin-bottom: 0;">
                    <div class="row d-block mb-1 mt-1">
                        <span class="text-primary">Pressure</span>
                    </div>
                    <div class="row d-block ">
                        <span id="pressure">${json.main.pressure + " Pa"}</span>
                    </div>
                    <hr style="margin-top: 0; margin-bottom: 0;">
                    <div class="row d-block mb-1 mt-1">
                        <span class="text-primary">Humidity</span>
                    </div>
                    <div class="row d-block ">
                        <span id="humidity">${json.main.humidity + " %"}</span>
                    </div>
                    <hr style="margin-top: 0; margin-bottom: 0;">
                    <div class="row d-block mb-1 mt-1">
                        <span class="text-primary">Wind Speed</span>
                    </div>
                    <div class="row d-block ">
                        <span id="windSpeed">${json.wind.speed + " m/s"}</span>
                    </div>
                </div>`
            );
            
            firstMarker.openPopup();


        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.log('latLngToIso error')
        }
    });
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// HELPER FUNCTIONS

// ROUNDING LARGE DATA
function roundLarge(x) {
    // catch neg numbers
    if (x < 0) {
        return x.toFixed(3);
    } else {
        let number = Math.abs(x);
        if (Number(number) >= 1.0e+12) {
            return (number/1.0e+12).toFixed(1) + " T";
        }
        if (Number(number) >= 1.0e+9) {
            return (number/1.0e+9).toFixed(1) + " B";
        }
        if (Number(number) >= 1.0e+6) {
            return (number/1.0e+6).toFixed(1) + " M";
        }
        if (Number(number) >= 1.0e+4) {
            return number.toLocaleString();
        }
        return number.toFixed(3);
    }
}

// LOADING GIF SHOW
function showLoading() {
    $("#loading").show();
    // console.log('loading');
}

// LOADING GIF HIDE
function hideLoading() {
    $("#loading").hide();
}


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


// CREATE FUNCTIONS

// CREATES COUNTRY OVERVIEW
function createOverview(country) {
    //countryOverview
    $('#countryData').html("Review " + country.CountryOverview.name)
    $('#countrySelect').html(country.CountryOverview.name);
    // Country Overview table data
    $('.countryTitle').html(country.CountryOverview.name);
    $('.flag').attr("src", country.CountryOverview.flag);
    $('#capital').html(country.CountryOverview.capital);
    $('#currency').html(country.CountryOverview.currencies[0].name);
    $('#population').html(country.CountryOverview.population.toLocaleString());
    $('#size').html(country.CountryOverview.area.toLocaleString()+' km<sup>2</sup>');
    $('#wikiLink').html(country.CountryOverview.name);
    languagesList = [];
    if (country.CountryOverview.languages.length > 1) {
        for (i = 0; i < country.CountryOverview.languages.length; i++) {
            languagesList.push(country.CountryOverview.languages[i].name);
        }
        $('#languages').html(languagesList.join(", "));
    } else {
        $('#languages').html(country.CountryOverview.languages[0].name);
    }
    $('#wikiLink').attr("href", "https://en.wikipedia.org/wiki/"+ country.CountryOverview.name);
}

// CREATES COUNTRY GRAPHS (E.G. ECONOMIC)
function createGraphs(jsonToLoop, category, charts, section, collapseArray, color) {
    index = 0;

    $.each(jsonToLoop, function (demographic, year) {
        // create arrays for all demographics
        //y-axis
        var dataArray = [];
        //x-axis
        var yearArray = [];
        //push data into
        $.each(year, function (key, data) {

            if (data != null) {
                dataArray.push(Number(data).toFixed(3));  
            } else {
                dataArray.push(data);
            };
            
            yearArray.push(key);
        })

        //creating html for each chart
        $(section).append(addhtml(category[index], collapseArray[index], demographic, color));
        //creating chart for each demographic
        create(charts[index], category[index], dataArray, yearArray, demographic, color);
        index++;
        // console.log(demographicArray);
        // console.log(dataArray);
});
};

// CREATE CHART FOR A DEMOGRAPHIC
function create(chart, category, data, years, title, color) {
    
    if (color === "danger") {
        var label = "#ff0000"; //red
    } else if (color === "success") {
        var label = "#00ff00"; //green
    } else {
        var label = "#0000ff"; //blue
    }
    if (chart != undefined) {
        chart.destroy();
    } else {
        var ctx = document.getElementById(category).getContext("2d");
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,//xlabels
                datasets: [{
                    data: data, //data list
                    spanGaps: true,
                    fill: false,
                    backgroundColor: label,
                    borderColor: '#000000',
                    borderWidth: 1,
                }]
            },
            options: {
                tooltips: {
                    callbacks: {
                        label: function(tooltipItem, data) {
                            return roundLarge(tooltipItem.yLabel);
                        }
                    }
                },
                legend: {
                    display: false,
                },
                title: {
                    display: true,
                    text: title,
                },
                
                //responsive: true,
                // means that collapse will be smooth
                // size will be readable on mobile
                maintainAspectRatio: false,
                // skipNull: true,
                // drawNull: false,
                scales: {
                    yAxes: [{
                        ticks: {
                            beginAtZero: false,
                            callback: function(label, index, values) {
                                return roundLarge(label);
                                // return roundLarge(values);
                            },
                        }
                    }]
                }
            }
        })
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


// RESET FUNCTION FOR COUNTRY CHARTS
function resetCharts() {
    $('.emptyViaJS').empty();
};


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


// LOADER FUNCTIONS

// LOADER FUNCTION FOR HTML
function addhtml(graph, collapseNumber, text, color) {

    var javaToAdd = 
    `<a class='btn btn-${color} btn-block mb-1 mb-1' role='button' 
    data-toggle='collapse'  href='#${collapseNumber}' aria-expanded='false'
    aria-controls='${collapseNumber}'>
    ${text} <i class="fas fa-sort-down fa-1x" style="position: absolute; right: 10px;"></i>
    </a>
    <div class="collapse" id='${collapseNumber}'>
        <div class='card-body p-0'>
            <canvas id='${graph}' style='height: 300px width=80%'></canvas>
        </div>
    </div>`
    return javaToAdd;
}

// TO ADD MORE CHARTS AMEND THIS FUNC
// better way of doing this with classes?
// LOADER FUNCTION FOR CHART CANVAS
function loadCanvas() {
    $('#ecoOne').append("<canvas id='ecoGraph1' style='height: 300px width=80%'></canvas>");
    $('#ecoTwo').append("<canvas id='ecoGraph2' style='height: 300px width=80%'></canvas>");
    $('#ecoThree').append("<canvas id='ecoGraph3' style='height: 300px width=80%'></canvas>");
    $('#ecoFour').append("<canvas id='ecoGraph4' style='height: 300px width=80%'></canvas>");
    $('#ecoFive').append("<canvas id='ecoGraph5' style='height: 300px width=80%'></canvas>");
    $('#ecoSix').append("<canvas id='ecoGraph6' style='height: 300px width=80%'></canvas>");
    $('#ecoSeven').append("<canvas id='ecoGraph7' style='height: 300px width=80%'></canvas>");
    
    $('#socOne').append("<canvas id='socGraph1' style='height: 300px width=80%'></canvas>");
    $('#socTwo').append("<canvas id='socGraph2' style='height: 300px width=80%'></canvas>");
    $('#socThree').append("<canvas id='socGraph3' style='height: 300px width=80%'></canvas>");
    $('#socFour').append("<canvas id='socGraph4' style='height: 300px width=80%'></canvas>");
    $('#socFive').append("<canvas id='socGraph5' style='height: 300px width=80%'></canvas>");
    $('#socSix').append("<canvas id='socGraph6' style='height: 300px width=80%'></canvas>");
    $('#socSeven').append("<canvas id='socGraph7' style='height: 300px width=80%'></canvas>");

    
    $('#envOne').append("<canvas id='envGraph1' style='height: 300px width=80%'></canvas>");
    $('#envTwo').append("<canvas id='envGraph2' style='height: 300px width=80%'></canvas>");
    $('#envThree').append("<canvas id='envGraph3' style='height: 300px width=80%'></canvas>");
    $('#envFour').append("<canvas id='envGraph4' style='height: 300px width=80%'></canvas>");
    $('#envFive').append("<canvas id='envGraph5' style='height: 300px width=80%'></canvas>");
    $('#envSix').append("<canvas id='envGraph6' style='height: 300px width=80%'></canvas>");
    $('#envSeven').append("<canvas id='envGraph7' style='height: 300px width=80%'></canvas>");
};

// TO ADD MORE CHARTS AMEND THIS FUNC
// LOADER FUNCTION FOR COUNTRY CHARTS
function loadHtmlAndCharts(json) {

    var ecoChart1,
        ecoChart2,
        ecoChart3,
        ecoChart4,
        ecoChart5,
        ecoChart6,
        ecoChart7;

    var socChart1,
        socChart2,
        socChart3,
        socChart4,
        socChart5,
        socChart6,
        socChart7;

    var envChart1,
        envChart2,
        envChart3,
        envChart4,
        envChart5,
        envChart6,
        envChart7;


    var ecoCharts = [ecoChart1, ecoChart2, ecoChart3, ecoChart4, ecoChart5, ecoChart6, ecoChart7];
    var socCharts = [socChart1, socChart2, socChart3, socChart4, socChart5, socChart6, socChart7];
    var envCharts = [envChart1, envChart2, envChart3, envChart4, envChart5, envChart6, envChart7];

    var ecoGraphs = ["ecoGraph1", "ecoGraph2", "ecoGraph3", "ecoGraph4", "ecoGraph5", "ecoGraph6", "ecoGraph7"];
    var socGraphs = ["socGraph1", "socGraph2", "socGraph3", "socGraph4", "socGraph5", "socGraph6", "socGraph7"];
    var envGraphs = ["envGraph1", "envGraph2", "envGraph3", "envGraph4", "envGraph5", "envGraph6", "envGraph7"];

    var collapseArray1 = ["ecoCollapse1", "ecoCollapse2", "ecoCollapse3", "ecoCollapse4", "ecoCollapse5", "ecoCollapse6", "ecoCollapse7"];
    var collapseArray2 = ["socCollapse1", "socCollapse2", "socCollapse3", "socCollapse4", "socCollapse5", "socCollapse6", "socCollapse7"];
    var collapseArray3 = ["envCollapse1", "envCollapse2", "envCollapse3", "envCollapse4", "envCollapse5", "envCollapse6", "envCollapse7"];
    
    // CREATE ECONOMIC GRAPHS
    createGraphs(json.WorldBankData.economicArray, ecoGraphs, ecoCharts, "#ecoAddViaJS", collapseArray1, "primary");
    // CREATE SOCIAL GRAPHS
    createGraphs(json.WorldBankData.socialArray, socGraphs, socCharts, "#socAddViaJS", collapseArray2, "danger");
    // CREATE ENVIRONMENT GRAPHS
    createGraphs(json.WorldBankData.environmentArray, envGraphs, envCharts, "#envAddViaJS", collapseArray3, "success");

}

