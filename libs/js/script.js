// NOTIFICATION REMINDER

// alert("To view the map, turn on your device's location settings");

// CREATE DROPDOWN FROM SELECT2 PLUGIN
$(document).ready(function() {
    $('.js-example-basic-single').select2();
});

// LOADING SYMBOL ON PAGE LOAD
showLoading();
// CALL INITIAL DATA FOR COUNTRY DROPDOWN AND GLOBAL LAYERS
getDropdownData();

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//  ****   LEAFLET LAYERS, BUTTONS AND CONTROLS   ****

// FUNC TO PLACE LEAFLET BUTTONS
// function CheckScreenSize() {
//     return 'topright';
// };

// BASEMAPS
// NORMAL MAP VIEW
var CartoDB_Voyager = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    id: 'og',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    minZoom: 3,
    maxZoom: 19
});

// MORE LAYERS
// LANDMARKS
var landmarks = L.markerClusterGroup({
    maxClusterRadius: 150,
    spiderLegPolylineOptions:  {
        weight: 1.5, color: 'grey', opacity: 0.5 
    },
    spiderfyOnMaxZoom: false,
    disableClusteringAtZoom: 11
});
// LANDMARK MARKER ONCLICK EVENT
landmarks.on('click', function (e) {
	// console.log(e);
    // GET UNIQUE OPENTRIPMAP CODE
    var code = e.sourceTarget.options.icon.options.id[0];
    // GET NAME
    var name = e.sourceTarget.options.icon.options.id[1];
    // CALL SERVER TO RETURN DETAILED LANDMARK INFO
    $.ajax({
        url:"libs/php/getApis.php",
        type: 'POST',
        data: {
            landmark: code,
        },
        success: function(result) {
            // console.log(result);
            // MODAL TITLE
            $('#landmarkName').html(name);
            // MODAL BODY
            // LANDMARK IMG, WIKI EXTRACT AND LINK
            $('#cityBody').append(`
                <div class="container">
                    <div class="row p-1 justify-content-center">
                        <span><img style="height: 200px; border: 2px solid white;" class="featureImg" src="${result.preview.source}"></span>
                    </div>
                    <div class="row justify-content-center">
                        <h6>From Wikipedia:</h6>
                        <span class="featureDesc">${result.wikipedia_extracts.html}</span>
                    </div>
                    <div class="row justify-content-center">
                        <p>Wikipedia Link: </p>
                        <span class="featureLink"><a target="_blank"href="${result.wikipedia}">${name}<a/></span>
                    </div>
                </div>`
            );
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.log('landmark error')
        }
    });


    $('#cityBody').empty();

// // open modal
    $('#modalCity').modal('show');

});

// CITIES
var cityLayer = new L.featureGroup().on('click', function(e) {
    // CLEAR LANDMARKS LAYER
    landmarks.clearLayers();
    // GO TO CITY
    mymap.flyTo([e.latlng.lat,e.latlng.lng], 10);
    // console.log(e);
    // console.log(e.latlng.lng);
    // CALL SERVER TO RETURN ALL LANDMARKS IN CITY AREA
    $.ajax({
        url:"libs/php/getApis.php",
        type: 'POST',
        data: {
            cityLat: e.latlng.lat,
            cityLng: e.latlng.lng,
        },
        success: function(result) {
            // console.log(result);
            // SPLIT RESULT INTO CATEGORIES
            var historic = result.historic;
            var natural = result.natural;
            var religious = result.religious;
            var other = result.other;
            // CALL FUNC TO ADD CUSTOM CATEGORY MARKER
            addMarkerToLandmarks(historic, '<i class="fas fa-monument" style="color: red;"></i>');
            addMarkerToLandmarks(natural, '<i class="fas fa-tree" style="color: green;"></i>');
            addMarkerToLandmarks(religious, '<i class="fas fa-place-of-worship" style="color: blue;"></i>');
            addMarkerToLandmarks(other, '<i class="fas fa-landmark" style="color: gold;"></i>');

            // FUNC GIVES EACH CATEGORY A CUSTOM MARKER
            function addMarkerToLandmarks(category, symbol) {
                // SET MARKER
                $.each(category, function() {
                    // ICON
                    var landmarkIcon = L.divIcon({
                        html: `${symbol}`,
                        iconSize: [10, 10],
                        iconAnchor: [5, 10],
                        popupAnchor: [15, -10],
                        className: 'landmarkIcon',
                        id: [this.properties.xid, this.properties.name]
                    });

                    var lat = this.geometry.coordinates[1];
                    var lng = this.geometry.coordinates[0];
            
                    var marker = L.marker([lat, lng], {icon: landmarkIcon})
                
                    // ADD TO LANDMARKS LAYER
                    marker.addTo(landmarks);
                });
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.log('city layer error')
        }
    });
});

// WEBCAMS
var webcamLayer = new L.featureGroup().on('click', function (e) {
    // console.log(e);
    // GET DATA FROM MARKER ID
    var id = e.layer.options.icon.options.id;
    var idSliced = id.slice(0, 2);
    var idJoined = idSliced.join(', ')

    // TITLE
    $('#webcamName').html(idJoined);
    // VIDEO
    $('#webcamVid').attr("src", id[4]);
    // LINK
    if (id[3] != undefined) {
        $('#webcamWiki').html(`<a style="color:black;" href="${id[3]}">${id[3]}</a>`);
    } else {
        $('#webcamWiki').html('No Wikipedia Page Available');
    }
    // OPEN MODAL
    $('#modalWebcam').modal('show');
});

//  EVEN MORE LAYERS
var weatherLayer = new L.LayerGroup();
var airportLayer = new L.LayerGroup();
var popLayer = new L.LayerGroup();

// CREATING MYMAP VARIABLE
var mymap = L.map('map', {
    // attributionControl: false,
    layers: [CartoDB_Voyager, weatherLayer, webcamLayer, airportLayer], // LAYERS ON MAP LOAD
    // zoomControl: false,
});

// LAYER CONTROL CATEGORIES
// var basemaps = {
//     "Light": CartoDB_Voyager,
//     // "Dark": CartoDB_DarkMatter,
// }
var overlayMaps = {
    // City Layers
    "<b>Largest Cities</b>": {
        [`<span style="color: #00a1ff; line-height: 1em;" class="fa-stack fa-lg">
            <i style="text-shadow: 0px 4px 4px black;" class="fas fa-map-marker fa-stack-2x" aria-hidden="true"></i>
            <i class="fa-stack-1x fa-inverse">
                <img class="weatherImg" src="https://openweathermap.org/img/wn/04d.png" height="25px" width="25px" alt="Weather icon">
            </i>
        </span>
        Weather`]: weatherLayer,
        [`<span style="color: #2b36e8;" class="fa-stack fa-lg">
            <i style="text-shadow: 0px 4px 4px black;" class="fas fa-map-marker fa-stack-2x" aria-hidden="true"></i>
            <i style="font-size: 0.75em;" class="fas fa-city fa-stack-1x fa-inverse" aria-hidden="true"></i>
        </span>
        Landmarks`]: cityLayer,
        [`<i class="far fa-circle fa-2x" style="color: black;background-color: #ff00009e;border-radius: 100px; margin-left: 8px; margin-right: 7px;"></i> Population`]: popLayer,
    },
    "<b>Other</b>": {
        [`<span style="color: grey; opacity: 0.9;" class="fa-stack fa-sm">
            <i style="text-shadow: 0px 4px 4px black;" class="fas fa-map-marker fa-stack-2x" aria-hidden="true"></i>
            <i style="color: white; font-size: 0.75em;" class="fas fa-video fa-stack-1x" aria-hidden="true"></i>
        </span>
        Popular Webcams`]: webcamLayer,
        [`<span style="color: orange; opacity: 0.9;" class="fa-stack fa-sm">
            <i style="text-shadow: 0px 4px 4px black;" class="fas fa-map-marker fa-stack-2x"></i>
            <i style="color: red; font-size: 0.75em;" class="fas fa-plane fa-stack-1x"></i>
        </span>
        Airports`]: airportLayer
    }
};


// ADD ZOOM CONTROL TO MYMAP - FIRST BUTTON TO BE ADDED
// L.control.zoom({
//      position: CheckScreenSize(),
// }).addTo(mymap);
// L.control.layers(baseMaps).addTo(mymap);

// GETTING MYMAP BOUNDS
var southWest = L.latLng(-89.98155760646617, -180),
northEast = L.latLng(89.99346179538875, 180);
var bounds = L.latLngBounds(southWest, northEast);

// SETTING MYMAP BOUNDS - PREVENTS INFINITE VERSIONS OF MYMAP
mymap.setMaxBounds(bounds);
mymap.on('drag', function() {
    mymap.panInsideBounds(bounds, { animate: false });
});


// EASYBUTTONS PLUGIN

// BUTTONS
var buttonEconomy = L.easyButton({
    id: 'button-economy',
    type: 'replace',          
    leafletClasses: true,     
    states:[{                 
      stateName: 'get-eco',
      onClick: function(button, map){
        $('#modalCountryEconomy').modal('show'); // SHOW SPECIFIC MODAL
      },
      title: 'Economy Data',
      icon: '<i class="fas fa-hand-holding-usd" style="font-size:1.5em;"></i>'
    }]
})


var buttonEnviron = L.easyButton({
    id: 'button-environ', 
    type: 'replace',         
    leafletClasses: true,     
    states:[{                 
      stateName: 'get-env',
      onClick: function(button, map){
        $('#modalCountryEnvironment').modal('show'); // SHOW SPECIFIC MODAL
      },
      title: 'Environment Data',
      icon: '<i class="fab fa-envira" style="font-size:1.5em;"></i>'
    }]
})

var buttonSocial = L.easyButton({
    id: 'button-social',
    type: 'replace',          
    leafletClasses: true,     
    states:[{                 
      stateName: 'get-soc',
      onClick: function(button, map){
        $('#modalCountrySocial').modal('show'); // SHOW SPECIFIC MODAL
      },
      title: 'Social Data',
      icon: '<i class="fas fa-users" style="font-size:1.5em;"></i>'
    }]
})


var buttonOverview = L.easyButton({
    id: 'button-overview',  
    type: 'replace',          
    leafletClasses: true,     
    states:[{                 
      stateName: 'get-overview',
      onClick: function(button, map){
        $('#modalCountryOverview').modal('show'); // SHOW SPECIFIC MODAL
      },
      title: 'Country Overview',
      icon: '<i class="fas fa-info-circle" style="font-size:1.5em;"></i>'
    }]
})

var editBar = L.easyBar([
    buttonOverview,
    buttonEconomy,
    buttonSocial,
    buttonEnviron,
    
]);


// EASYBUTTON CONTROL - SECOND BUTTON TO BE ADDED
editBar.addTo(mymap);

// LAYER CONTROL OPTIONS
var options = {
    // Make the "Landmarks" group exclusive (use radio inputs)
    exclusiveGroups: ["<b>Largest Cities</b>"],
  };

// ADD LAYER CONTROL TO MYMAP - THIRD BUTTON TO BE ADDED
var layerControl = L.control.groupedLayers(null, overlayMaps, options);
mymap.addControl(layerControl);

// LANDMARK LAYER POSITION
var landmarkLeg = L.control({position: 'bottomright'});

// LANDMARK LEGEND
landmarkLeg.onAdd = function (map) {

    var div = L.DomUtil.create('div', 'info legend');
        div.innerHTML +=
        (`<p> <i style="color: red;" class="fas fa-monument"></i> Historic</p>
        <p> <i style="color: green;" class="fas fa-tree"></i> Natural</p>
        <p> <i style="color: blue;" class="fas fa-place-of-worship"></i> Religious</p>
        <p> <i style="color: gold;" class="fas fa-landmark"></i> Other</p>`);

    return div;
};

// CHECKS FOR ZOOM LEVEL
mymap.on('zoomend', function () {
    // REMOVES CITY LAYER IF ZOOMED IN CLOSE
    // ADDS LANDMARKS AND LANDMARK LEG
    if (mymap.getZoom() > 9 && mymap.hasLayer(cityLayer)) {
        mymap.removeLayer(cityLayer);
        mymap.addLayer(landmarks);
        landmarkLeg.addTo(mymap);
    }
    // ADD CITY LAYER BACK ON ZOOM OUT
    if (mymap.getZoom() < 9 && mymap.hasLayer(cityLayer) == false) {
        // ONLY ADD IT BACK IF CITY LAYER IS SELECTED
        if (mymap.hasLayer(weatherLayer) == false && mymap.hasLayer(popLayer) == false) {
            mymap.addLayer(cityLayer);
        }
        // REMOVE LANDMARK LAYER AND LEG
        mymap.removeLayer(landmarks);
        landmarkLeg.remove();
    }   
});

mymap.on('dblclick', function(e) {
    // call latlng converter func
    latLngToIso(e.latlng.lat, e.latlng.lng);
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//  **** MAIN GEOJSON ****
var geoJSON = L.geoJSON(null, {onEachFeature: onEachFeature}).addTo(mymap);

// ADDS FLY TO COUNTRY EVENT
function onEachFeature(feature, layer) {
    // give each layer a unique id so iso code matches when selecting dropdown list
    layer._leaflet_id = feature.properties.iso_a2;


    if(feature.properties.iso_a2 === $('#countriesDropdown').val()) {
        // console.log(layer.getBounds());
        mymap.flyToBounds(layer.getBounds(), {duration: 5.0});
        
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// *** DROPDOWN INTERACTION ****

// DROPDOWN CHANGE CALLS FUNC WHICH IN TURN CALLS SERVER
$('#countriesDropdown').change(function() {

    // CLEAR PREVIOUS COUNTRY MARKERS AND STYLE
    geoJSON.clearLayers();
    cityLayer.clearLayers();
    weatherLayer.clearLayers();
    webcamLayer.clearLayers();
    airportLayer.clearLayers();
    popLayer.clearLayers();

    // SHOW LOADING IMG
    showLoading();

    // CALL TO SERVER WITH COUNTRY ISO CODE
    getCountry($('#countriesDropdown').val(), geoJSON, airportLayer, webcamLayer, cityLayer, weatherLayer, popLayer);

    
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//  FUNC TO GET ISOCODES FOR DROPDOWN
function getDropdownData() {
    $.ajax({
        url:"libs/php/getApis.php",
        type: 'POST',
        success: function(result) {
            console.log(result);
            // LOOP RESULT AND ADD TO DROPDOWN
            for(i = 0; i < result.data.length; i++) {
                // FORMAT DROPDOWN
                $('#countriesDropdown').append(`<option value="${result.data[i].code}">${result.data[i].name}</option>`);
    
            }

            //  GET USERS CURRENT COUNTRY VIA GEOLOCATION
            try {
                navigator.geolocation.getCurrentPosition(function (position) {
                myLat = position.coords.latitude;
                myLong = position.coords.longitude;
                mymap.setView([myLat, myLong], 10);
                // CALL TO SERVER TO CONVERT LATLNG TO ISOCODE
                latLngToIso(myLat, myLong);
            
                });
            } catch {
                mymap.setView([53, 1], 10);
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.log('Could not get dropdown data');
            alert('Could not get countries for dropdown');
            hideLoading();
        }
    });
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// **** FUNC TO GET COUNTRY DATA FROM SERVER ****

// RETURNS COUNTRY FROM DROPDOWN SELECT OR MAP CLICK
function getCountry(countryCode, geoJSON, airportLayer, webcamLayer, cityLayer, weatherLayer, popLayer) {
    $.ajax({
        url:"libs/php/getApis.php",
        type: 'POST',
        dataType: "json",
        data: {
            countryCode: countryCode,
        },
        success: function(result) {
            hideLoading();
            console.log(result);
            // console.log(result.data.border.geometry.coordinates[0].getBounds())
            // console.log('got server data')

            // ADD GEOJSON
            var countryGeojson = result.data.border;
            geoJSON.addData(countryGeojson);

            // SET STYLE FOR COUNTRY
            mymap._layers[$('#countriesDropdown').val()].setStyle({
                weight: 3,
                fillColor: 'blue',
                color: 'gold',
                // dashArray: '5',
                opacity: 0.5,
                fillOpacity: 0.2
            });

            // OVERVIEW MODAL
            createOverview(result.data.overview);

            // RESET
            resetCharts();

            // LOAD
            loadHtmlAndCharts(result.data.worldBank);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            //  MARKERS

            //  AIRPORT MARKERS
            loadAirports(result.data.airports, airportLayer);

            //  WEBCAMS MARKERS
            loadWebcam(result.data.webcams.result.webcams, webcamLayer);

            //  CITY MARKERS
            var cities = result.data.border.properties.cities
            var capital = result.data.overview.capital;
            loadCities(cities, capital, cityLayer);

            //  POP MARKERS
            loadPop(cities, capital, popLayer);
           
            //  WEATHER MARKERS
            loadWeather(result.data.border.properties.cityWeather.list, weatherLayer);
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

            // MODAL INTERACTIONS

            // OPEN OVERVIEW MODAL
            $('#button-overview').click();

            // AUTO SCROLL TO CHART
            $('.collapse').on('shown.bs.collapse', function(e) {
                document.getElementById(e.target.id).scrollIntoView({
                    // behavior: 'smooth', not working
                  });
            });
        },
        error: function(jqXHR, textStatus, errorThrown) {
            // console.log('Country unavailable at this time');
            alert('Country unavailable at this time');
            // console.log(jqXHR);
            // console.log(textStatus);
            // console.log(errorThrown);
            hideLoading();
        }
    });
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//  **** LATLNG TO ISO CODE FUNC ****

function latLngToIso(latitude, longitude) {
    $.ajax({
        url:"libs/php/getApis.php",
        type: 'POST',
        data: {
            lat: latitude,
            lng: longitude,
        },
        success: function(result) {
            console.log(result);
            if (result === "Not A Country") {
                alert("Not A Country");
            } else {
                // CHANGE DROPDOWN VALUE
                $('#countriesDropdown').val(result).change();
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.log('latLngToIso error');
            alert('Not a country');
            hideLoading();
        }
    });
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//  **** FUNCS TO ADD MARKERS TO LAYERS ****

//  AIRPORT FUNC
function loadAirports(airports, airportLayer) {

    var airportIcon = L.divIcon({
        // html: '<i class="fas fa-plane" style="color:orange; text-shadow: 0 0 5px #2b36e8;"></i>',
        html: `<span style="color: orange; opacity: 0.9;"class="fa-stack fa-sm">
                    <i style="text-shadow: 0px 4px 4px black;" class="fas fa-map-marker fa-stack-2x"></i>
                    <i style="color: red; font-size: 0.75em;" class="fas fa-plane fa-stack-1x"></i>
                </span>`,
        iconSize: [10, 10],
        iconAnchor: [15, 25],
        popupAnchor: [0, -20],
        className: 'planeIcon'
    });

    $.each(airports, function() {
        var lat = this.geometry.coordinates[1];
        var lng = this.geometry.coordinates[0];
        if (this.fields.website === undefined) {
            var website = "N/A";
        } else {
            var website = `<a style ="font-color: grey" href="${this.fields.website}" target="_blank">${this.fields.website}`
        }

        var marker = L.marker([lat, lng], {icon: airportIcon}).bindPopup(`
            <table class="table table-sm table-light">
                <thead>
                    <tr>
                        <th colspan="2" class="table-dark">${this.fields.name}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Website </td>
                        <td>${website}</td>
                    </tr>
                    <tr>
                        <td>API </td>
                        <td><a href="https://babel.opendatasoft.com/explore/dataset/osm-world-airports/information/" target="_blank">osm-world-airports</a></td>
                    </tr>
                </tbody>
            </table>
        `);

        // add to global layer
        marker.addTo(airportLayer);
    })
}


//  WEBCAM FUNC
function loadWebcam(webcams, webcamLayer) {

    $.each(webcams, function() {

        var webcamIcon = L.divIcon({
            html: `<span style="color: grey; opacity: 0.9;"class="fa-stack fa-sm">
                        <i style="text-shadow: 0px 4px 4px black;" class="fas fa-map-marker fa-stack-2x"></i>
                        <i style="color: white; font-size: 0.75em;" class="fas fa-video fa-stack-1x"></i>
                    </span>`,
            iconSize: [10, 10],
            iconAnchor: [15, 25],
            popupAnchor: [15, -10],
            className: 'webcamIcon',
            id: [this.location.city, this.location.region, this.location.country, this.location.wikipedia, this.player.day.embed]
        });


        var lat = this.location.latitude;
        var lng = this.location.longitude;

        var marker = L.marker([lat, lng], {icon: webcamIcon})
    
        // add to global layer
        marker.addTo(webcamLayer);
    });
}


//  CITY FUNC
function loadCities(cities, capital, cityLayer) {

    // loop city and create markers
    $.each(cities, function() {
        // console.log(this);
        var lat = this.latitude;
        var lng = this.longitude;
        var pop = this.population;

        // city marker styles
        var starIcon = L.divIcon({
            html: `<span style="color: #2b36e8;"class="fa-stack fa-lg">
                        <i style="text-shadow: 0px 4px 4px black;" class="fas fa-map-marker fa-stack-2x"></i>
                        <i style="color: #ffc107;" class="fas fa-star fa-stack-1x fa-inverse"></i>
                    </span>`,
            iconSize: [10, 10],
            iconAnchor: [15, 25],
            popupAnchor: [15, -10],
            className: 'capitalIcon',
            id: `${this.name}`
        });
        // <i class="fas fa-map-marker"><i class="fas fa-city" style="opacity: 0.8; color: white; text-shadow: 0 0 5px #000;"></i></i>
        var cityIcon = L.divIcon({
            html: `<span style="color: #2b36e8;"class="fa-stack fa-lg">
                        <i style="text-shadow: 0px 4px 4px black;" class="fas fa-map-marker fa-stack-2x"></i>
                        <i style="font-size: 0.75em;" class="fas fa-city fa-stack-1x fa-inverse"></i>
                    </span>`,
            iconSize: [10, 10],
            iconAnchor: [15, 25],
            popupAnchor: [15, -10],
            className: 'cityIcon',
            id: `${this.name}`
        });

        if (capital.toLowerCase() === this.name.toLowerCase()) {
            var marker = L.marker([lat, lng], {icon: starIcon});
        } else {
            var marker = L.marker([lat, lng], {icon: cityIcon});
        }

        marker.addTo(cityLayer);
    });
}


//  POP FUNC
function loadPop(cities, capital, popLayer) {

    // loop city pop and create markers
    $.each(cities, function() {
        // console.log(this);
        var lat = this.latitude;
        var lng = this.longitude;
        var pop = this.population;

        function markerSize(pop) {
            return pop * 0.01;
        }
        
        var marker = L.circle([+lat, +lng], {
            fillOpacity: 0.6,
            color: 'black',
            fillColor: 'red',
            radius: markerSize(pop),
            weight: 2,
        }).bindPopup(
            `<table class="table table-sm table-light">
                <thead>
                    <tr>
                        <th colspan="2" class="table-dark">${this.name}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Population </td>
                        <td>${pop.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td>API </td>
                        <td colspan="2"><a href="https://public.opendatasoft.com/explore/dataset/geonames-all-cities-with-a-population-1000/information/?disjunctive.country" target="_blank">Geonames Cities</a></td>
                    </tr>
                </tbody>
            </table>`
        );

        marker.addTo(popLayer);
    });

}


//  WEATHER FUNC
function loadWeather(weather, weatherLayer) {

    // loop city weather and create markers
    $.each(weather, function() {
        // console.log(this);
        var lat = this.coord.lat;
        var lng = this.coord.lon;
        var icon = this.weather[0].icon;
        var title = this.name;
        var temperature = this.main.temp;
        var clouds = this.clouds.all;
        var humidity = this.main.humidity;
        var pressure = this.main.pressure;
        var windDirection = this.wind.deg;
        var windSpeed = this.wind.speed;
        // <div class="weatherIcon">
        // <img class="weatherImg" src="https://openweathermap.org/img/wn/${icon}.png" height="25px" width="25px"alt="Weather icon">
        // </div>
        var weatherIcon = L.divIcon({
            html: `<span style="color: #00a1ff; line-height: 1em;"class="fa-stack fa-lg">
                        <i style="text-shadow: 0px 4px 4px black;" class="fas fa-map-marker fa-stack-2x"></i>
                        <i class="fa-stack-1x fa-inverse">
                            <img class="weatherImg" src="https://openweathermap.org/img/wn/${icon}.png" height="25px" width="25px"alt="Weather icon">
                        </i>
                    </span>`,
            iconSize: [10, 10],
            iconAnchor: [15, 25],
            popupAnchor: [5, -20],
            className: 'iconWeather'
        });

        var marker = L.marker([lat, lng], {icon: weatherIcon}).bindPopup(
            `<table class="table table-sm table-light table-striped">
                <thead>
                    <tr>
                        <th colspan="2" class="table-dark">${title}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Temperature</td>
                        <td>${temperature}ºC</td>
                    </tr>
                    <tr>
                        <td>Clouds</td>
                        <td>${clouds}%</td>
                    </tr>
                    <tr>
                        <td>Humidity</td>
                        <td>${humidity}%</td>
                    </tr>
                    <tr>
                        <td>Pressure</td>
                        <td>${pressure}Pa</td>
                    </tr>
                    <tr>
                        <td>Wind Direction</td>
                        <td>${windDirection}°</td>
                    </tr>
                    <tr>
                        <td>Wind Speed</td>
                        <td>${windSpeed}m/s</td>
                    </tr>
                    <tr>
                        <td colspan="2"><a href="https://openweathermap.org/">https://openweathermap.org/</a></td>
                    </tr>
                </tbody>
            </table>`
        );
        
        // ADD TO LAYER
        marker.addTo(weatherLayer);
    });
}


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// **** HELPER FUNCTIONS ****

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
        if (Number(number) >= 1.0e+5) {
            return (number/1.0e+6).toFixed(1) + " K";
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


// **** CREATE FUNCTIONS ****

// CREATES COUNTRY OVERVIEW
function createOverview(country) {
    // Country Overview table data
    $('.countryTitle').html(country.name);
    $('.flag').attr("src", country.flag);
    $('#capital').html(country.capital);
    $('#currency').html(country.currencies[0].name);
    $('#population').html(country.population.toLocaleString());
    $('#size').html(country.area.toLocaleString()+' km<sup>2</sup>');
    $('#wikiLink').html(country.name);
    languagesList = [];
    if (country.languages.length > 1) {
        for (i = 0; i < country.languages.length; i++) {
            languagesList.push(country.languages[i].name);
        }
        $('#languages').html(languagesList.join(", "));
    } else {
        $('#languages').html(country.languages[0].name);
    }
    $('#wikiLink').attr("href", "https://en.wikipedia.org/wiki/"+ country.name);
}

// CREATES COUNTRY GRAPHS
function createGraphs(jsonToLoop, category, charts, section, collapseArray, color) {
    index = 0;

    $.each(jsonToLoop, function (demographic, year) {
        // create arrays for all demographics
        // y-axis
        var dataArray = [];
        // x-axis
        var yearArray = [];
        // push data into array
        $.each(year, function (key, data) {

            if (data != null) {
                dataArray.push(Number(data).toFixed(3));  
            } else {
                dataArray.push(data);
            };
            
            yearArray.push(key);
        })

        // creating html for each chart
        $(section).append(addhtml(category[index], collapseArray[index], section, demographic, color));
        // creating chart for each demographic
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
        var label = "orange"; //orange
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
                plugins: {
                    legend: {
                        display: false,
                    },
                    title: {
                        display: true,
                        text: title,
                    },
                    tooltip: {
                        callbacks: {
                            label: function(tooltipItem, data) {
                                return roundLarge(tooltipItem.parsed.y);
                            }
                        }
                    },
                },
                // means that collapse will be smooth
                maintainAspectRatio: false,
                scales: {
                    y: {
                        ticks: {
                            // Include a dollar sign in the ticks
                            callback: function(value, index, values) {
                                return roundLarge(value);
                            }
                        }
                    }
                }
            }
        })
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


// RESET FUNCTION FOR COUNTRY CHARTS
function resetCharts() {
    // $('.emptyViaJS').empty();
    $('.accordion').empty();
};


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


// **** LOADER FUNCTIONS FOR CHARTS ****

// LOADER FUNCTION FOR HTML
function addhtml(graph, collapseNumber, section, text, color) {

    var htmlToAdd = 

    `<div class="card my-1 px-2">
            <button class="btn btn-${color} btn-block my-2" type="button" data-toggle="collapse" data-target="#${collapseNumber}" aria-expanded="false" aria-controls="${collapseNumber}">
            ${text} <i class="fas fa-sort-down fa-1x" style="position: absolute; right: 20px;"></i>
            </button>

        <div id="${collapseNumber}" class="collapse" data-parent="${section}">
        <div class="card-body p-0">
            <canvas id='${graph}' style='height: 300px width=80%'></canvas>
        </div>
        </div>
    </div>`
    
    return htmlToAdd;
}

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
    createGraphs(json.economicArray, ecoGraphs, ecoCharts, "#ecoAccordion", collapseArray1, "warning");
    // CREATE SOCIAL GRAPHS
    createGraphs(json.socialArray, socGraphs, socCharts, "#socAccordion", collapseArray2, "danger");
    // CREATE ENVIRONMENT GRAPHS
    createGraphs(json.environmentArray, envGraphs, envCharts, "#envAccordion", collapseArray3, "success");

}

