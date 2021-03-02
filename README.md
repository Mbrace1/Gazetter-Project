# GAZETTER
> A "mobile first" website. It makes use of third party APIs, which provide profiling for all countries through the presentation of demographic, climatic, geographical and other data.

## Table of contents
* [General info](#general-info)
* [Screenshots](#screenshots)
* [Technologies Used](#technologies-used)
* [APIs Used](#apis-used)
* [API Call Example](#api-call-example)
* [Newest Features](#newest-features)
* [Status](#status)
* [Demo](#demo)
* [Contact](#contact)

## General info
The program works so that every time you choose a country in the dropdown menu, it will update the map with the country border, and provide the user with detailed country information through the use of modals and map markers.

## Screenshots
![Example screenshot](./img/screenshot1.png)
![Example screenshot](./img/screenshot2.png)
![Example screenshot](./img/screenshot3.png)
![Example screenshot](./img/screenshot4.png)

## Technologies Used
* Html 5 and CSS
* Bootstrap 4.5.3
* JQuery 3.5.1
* PHP 7.4.12 and cURL
* Font Awesome [link](https://fontawesome.com/)
* Leaflet Maps 1.7.1 [link](https://leafletjs.com/)
* Leaflet Plugins
    * Easy Button [link](https://github.com/CliffCloud/Leaflet.EasyButton)
    * Marker Cluster [link](https://github.com/Leaflet/Leaflet.markercluster)
    * Grouped Layer Control [link](https://github.com/ismyrnow/leaflet-groupedlayercontrol)
* Other plugins
    * Chart JS 2.9.4 [link](https://www.chartjs.org/)
    * Select2 4.1.0 [link](https://select2.org/)
    * Google Translate Tutotrial [link](https://www.w3schools.com/howto/howto_google_translate.asp)

## APIs Used
* Rest Countries [link](https://restcountries.eu/)
* OpenCage [link](https://opencagedata.com/)
* OpenWeather [link](https://openweathermap.org/api)
* World Bank [link](https://data.worldbank.org/)
* Windy Webcams [link](https://api.windy.com/webcams)
* Opentripmap [link](https://opentripmap.io/)
* USGS Earthquakes [link](https://earthquake.usgs.gov/fdsnws/event/1/)
* OSM-world-airports [link](https://babel.opendatasoft.com/explore/dataset/osm-world-airports/information/)
* Geonames Cities [link](https://public.opendatasoft.com/explore/dataset/geonames-all-cities-with-a-population-1000/information/?disjunctive.country)

## API Call Example
* JS:
    Via and ajax call to the PHP server, data (in this case the latitude and longitude) is sent to retrieve API data (isocode), which in turn calls a function (changes the country in the dropdown menu).
    `function latLngToIso(latitude, longitude) {
        $.ajax({
            url:"php/getApis.php",
            type: 'POST',
            data: {
                lat: latitude,
                lng: longitude,
            },
            success: function(result) {
                console.log(result);

                // CHANGE DROPDOWN VALUE
                $('#countriesDropdown').val(result).change();

            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.log('latLngToIso error')
            }
        });
    }`
    
* PHP:
    Each API call I have put into it's own separate function, so it is more readable.
    The following shows a call to convert LatLng values to an isocode.
    This workflow is generally repeated for each API, and then finally returned to the user as json.
    `function latLngToIso() {
        // APIKEY
        $apiKey = '';


        // OPENCAGE URL
        $url = 'https://api.opencagedata.com/geocode/v1/json?q='.strval($_REQUEST['lat']).'+'.strval($_REQUEST['lng']).'&key='.$apiKey;


        $ch = curl_init();
        // CURL OPTIONS
        //
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        // returns the results as a string 
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        // sets url to be used
        curl_setopt($ch, CURLOPT_URL, $url);

        // EXECUTE CURL
        $result = curl_exec($ch);

        curl_close($ch);
        // DECODE DATA FOR MANIPULATION
        // TRUE RETURN ASSOCIATIVE ARRAY
        $decode = json_decode($result, true);
        // print_r($decode);


        // only grab isocode
        return $decode['results'][0]['components']['ISO_3166-1_alpha-2'];
        };
    
    $output = latLngToIso();
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($output);`

## Newest Features
* Expanded the map layer feature to show many more markers
* Markers for Webcams
* Markers for Landmarks

## Status
Project is: _In Progress_, 

## Demo
Available to view at: [michaelbracey.co.uk](michaelbracey.co.uk)

## Contact
Created by [@Mbrace1](michaelbracey24@gmail.com)