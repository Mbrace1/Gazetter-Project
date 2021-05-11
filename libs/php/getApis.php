<?php

    ini_set('display_errors', 'On');

    error_reporting(E_ALL);

    $apiKeys = include('./config.php');
    // TO ADD MORE CHARTS AMEND ARRAY
    // will also have to amend js func: loadHtmlAndCharts()
    // WORLD BANK (WB) CODES
    $worldBankArray = array(
        "socialArray" => array(
            "lifeExpectancy" => "SP.DYN.LE00.IN",
            "popGrowth"=> "SP.POP.GROW",
            "govEducationSpending" => "SE.XPD.TOTL.GB.ZS",
            "femaleLabourForce" => "SL.TLF.TOTL.FE.ZS",
            "unemployment" => "SL.UEM.TOTL.ZS",
            "ageDependancy" => "SP.POP.DPND",
            "schoolenroll" => "SE.SEC.NENR"),
    
        "economicArray" => array(
            "gdp" =>  "NY.GDP.MKTP.CD",
            "gdpGrowth" => "NY.GDP.MKTP.KD.ZG",
            "gdpPerCapita" => "NY.GDP.PCAP.CD",
            "gdpPerCapitaGrowth" => "NY.GDP.PCAP.KD.ZG",
            "inflation" => "FP.CPI.TOTL.ZG",
            "imports" => "NE.IMP.GNFS.ZS",
            "exports" => "NE.EXP.GNFS.ZS"),
            
        "environmentArray" => array(
            "co2Emission" => "EN.ATM.CO2E.PC",
            "forestArea" => "AG.LND.FRST.ZS",
            "forestAreaTotal" => "AG.LND.FRST.K2",
            "urbanPop" => "SP.URB.TOTL.IN.ZS",
            "urbanGrowth" => "SP.URB.GROW",
            "ruralPop" => "SP.RUR.TOTL.ZS",
            "ruralGrowth" => "SP.RUR.TOTL.ZG")
    );

    // curl workflow
    function apiCall($url) {

        //  START CURL
        $ch = curl_init();

        // CURL OPTIONS
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        // RETURNS RESULT AS STRING
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        // SET URL TO BE USED
        curl_setopt($ch, CURLOPT_URL, $url);
        
        // EXECUTE CURL
        $result = curl_exec($ch);

        // CLOSE CURL
        curl_close($ch);

        // DECODE DATA FOR MANIPULATION
        $decode = json_decode($result, true);

        // RETURN DATA
        return $decode;
    }


    // MORE COMPLEX FUNCS BELOW
    // FUNC TO RETURN WB DATA FROM COUNTRY ISO
    function getWorldBank($arr, $isocode) {

        // DATA WILL GO TO LATEST YEAR
        $endYear = date("Y");
        // ARRAY TO ADD RETURNED WB COUNTRY DATA
        $outputArray = [];

        // LOOP EACH WB ARRAY (3 in total)
        foreach ($arr as $mainKey => $value) {
            // JOIN AS SINGLE STRING (3 strings)
            $joinAsString = implode(";", $value);
            // CALLS WB API *3 WITH EACH STRING
            $url = 'https://api.worldbank.org/v2/country/'.strtolower($isocode).'/indicator/'.$joinAsString.'?per_page=800&source=2&date=1968:'.$endYear.'&format=json';
            $result = apiCall($url);
            // FORMAT USEFUL RESULT DATA
            for ($i=0; $i < count($result[1]); $i++) {
                // json looks like this:
                // Category ($mainKey) -> demographic ([$result[1][$i]['indicator']['value'])-> year ($result[1][$i]['date']) -> value ($result[1][$i]['value'])
                //  eg economic -> gdp -> 2012 -> 250000
                $outputArray[$mainKey][$result[1][$i]['indicator']['value']][$result[1][$i]['date']] = $result[1][$i]['value'];
            };
        };

        return $outputArray;

    };


    // FUNC RETURNS COUNTRY BORDER AND CALLS API FUNCS
    function getCountry($isoCode) {

        $countryBorders = json_decode(file_get_contents("../../vendor/js/json/countryBorders.geo.json"), true);

        $border = null;
    
        foreach ($countryBorders['features'] as $feature) {
            if ($feature["properties"]["iso_a2"] ==  $isoCode) {
    
                $border = $feature;
    
                break;
            }
        }

        return $border;
    }


    // FUNC RETURNS ISO AND COUNTRY NAMES
    function getIsoCodes() {
        
        $executionStartTime = microtime(true);
        // FIRST CALL RETURNS NAMES AND ISOCODES
        $countryData = json_decode(file_get_contents("../../vendor/js/json/countryBorders.geo.json"), true);

        $country = [];

        foreach ($countryData['features'] as $feature) {

            $temp = null;
            $temp['code'] = $feature["properties"]['iso_a2'];
            $temp['name'] = $feature["properties"]['name'];

            array_push($country, $temp);

        }

        usort($country, function ($item1, $item2) {

            return $item1['name'] <=> $item2['name'];

        });

        $output['status']['code'] = "200";
        $output['status']['name'] = "ok";
        $output['status']['description'] = "success";
        $output['status']['executedIn'] = intval((microtime(true) - $executionStartTime) * 1000) . " ms";
        $output['data'] = $country;

        return $output;
        
    }


    // check what output to send back
    if (isset($_REQUEST['countryCode'])) {
        
        // COUNTRY CODE 
        $CC = $_REQUEST['countryCode'];
        $executionStartTime = microtime(true);

        /////////////////////////////////////////////////////////////////////////////////////////////////
        // large cities url
        $largeCitiesUrl='https://public.opendatasoft.com/api/records/1.0/search/?dataset=geonames-all-cities-with-a-population-1000&q=&sort=population&facet=timezone&facet=country&refine.country_code='. strtoupper($CC);
        // call curl func for largest cities
        $largeCities = apiCall($largeCitiesUrl);
        
        $largeCitiesArray = [];
        // loop curl returned object and put into array
        for ($i=0; $i < count($largeCities['records']); $i++) {
            $largeCitiesArray[$largeCities['records'][$i]['fields']['name']] = $largeCities['records'][$i]['fields'];
        };
        /////////////////////////////////////////////////////////////////////////////////////////////////
        // this will be used for filtering cities from the citylist json file
        $cityIdArray = [];

        // ids for countries for weather api
        $cityIds = json_decode(file_get_contents("../../vendor/js/json/city.list.min.json"), true);

        // loop each city
        foreach ($largeCitiesArray as $city) {
            // and then loop large array to find its id
            foreach($cityIds as $id) {
                // check for match, both same city and country

                if ((strtolower($city['name']) === strtolower($id['name'])) and (strtolower($CC)  === strtolower($id['country']))) {
                    // append to array
                    // $cityIdArray[] = $id['id'];
                    $cityIdArray[] = $id;
                }
            }
        }

        // array will be used to get weather for cities
        $idForWeather = [];

        // loop to remove re-occuring cities in the country
        // ie two Houstons in America, only Houston with lat lng value will be used for weather api
        foreach($largeCitiesArray as $city) {
            foreach ($cityIdArray as $id) {
                // to match exact city with code
                // lat lng value must fall inside a range of
                // 0.02 either side
                // ($min <= $value) && ($value <= $max)
                $valueLat = $city['coordinates'][0];
                $inRangeLatLower = $id['coord']['lat'] - 0.02;
                $inRangeLatUpper = $id['coord']['lat'] + 0.02;

                $valueLon = $city['coordinates'][1];
                $inRangeLonLower = $id['coord']['lon'] - 0.02;
                $inRangeLonUpper = $id['coord']['lon'] + 0.02;
                
                if((($inRangeLatLower <= $valueLat) && ($valueLat <= $inRangeLatUpper)) and (($inRangeLonLower <= $valueLon) && ($valueLon <= $inRangeLonUpper))) {
                    // append weather id array for use in weather api
                    $idForWeather[] = $id['id'];
                    break;
                }
            }
        }

        /////////////////////////////////////////////////////////////////////////////////////////////////
        // weather
        // apiKey
        $weatherApiKey = $apiKeys['weatherApi'];
        // use cityArray from before
        $formattedArray = implode(",", $idForWeather);
        // weather url
        $cityWeatherUrl = 'https://api.openweathermap.org/data/2.5/group?id='.$formattedArray.'&units=metric&appid='.$weatherApiKey;
        // call curl func for city weather
        $cityWeather = apiCall($cityWeatherUrl);
        /////////////////////////////////////////////////////////////////////////////////////////////////
        //  OUTPUTS
        $output['status']['code'] = "200";
        $output['status']['name'] = "ok";
        $output['status']['description'] = "success";
        $output['status']['executedIn'] = intval((microtime(true) - $executionStartTime) * 1000) . " ms";

        // MORE COMPLEX
        $output['data']['border'] = getCountry($CC);
        $output['data']['worldBank'] = getWorldBank($worldBankArray, $CC);
        // $output['data']['cities'] = $cityIds;
        // $output['data']['citiesformatted'] = $cityIdArrayFurtherFormat;
        $output['data']['citiesweather'] = $cityIdArray;

        $output['data']['border']['properties']['cities'] = $largeCitiesArray;
        $output['data']['border']['properties']['cityWeather'] = $cityWeather; 
        
        // LESS COMPLEX
        // rest country url
        $restCountryUrl='https://restcountries.eu/rest/v2/alpha/'. strtolower($CC);
        // call curl func for city overview data
        $output['data']['overview'] = apiCall($restCountryUrl);

        // webcam apikey
        $webcamApiKey= $apiKeys['webcamApi'];
        // webcam url showing country webcams by popularity - limited to 20
        $webcamUrl = "https://api.windy.com/api/webcams/v2/list/country=".$CC."/orderby=popularity/limit=20?show=webcams:player,location&key=".$webcamApiKey;
        // call curl func for city webcam data
        $output['data']['webcams'] = apiCall($webcamUrl);

        // airport url
        $airportUrl = "https://data.opendatasoft.com/api/records/1.0/search/?dataset=osm-world-airports%40babel&q=&rows=100&facet=source&facet=country&facet=country_code&refine.country_code=".strtolower($CC);
        // call curl func for city airport data
        $formatted = apiCall($airportUrl); 
        $output['data']['airports'] = $formatted['records']; 



    //  check to send converted lat lng to iso
    } elseif(isset($_REQUEST['lat']) and isset($_REQUEST['lng'])) {
        // apiKey
        $apiKey = $apiKeys['openCageApi'];
        // specific url
        $url = 'https://api.opencagedata.com/geocode/v1/json?q='.strval($_REQUEST['lat']).'+'.strval($_REQUEST['lng']).'&key='.$apiKey;
        // call generic curl func
        $apiData = apiCall($url);
        // data we want
        if (array_key_exists('ISO_3166-1_alpha-2', $apiData['results'][0]['components'])) {
            $output = $apiData['results'][0]['components']['ISO_3166-1_alpha-2'];
        } else {
            $output = "Not A Country";
        }

    //  check to send city attractions
    } elseif(isset($_REQUEST['cityLat']) and isset($_REQUEST['cityLng'])) {
        // apiKey
        $apiKey = $apiKeys['opentripmapApi'];
        // specific url
        $url = "https://api.opentripmap.com/0.1/en/places/radius?radius=20000&lon=".$_REQUEST['cityLng']."&lat=".$_REQUEST['cityLat']."&limit=1000&rate=3&apikey=".$apiKey;
        // call generic curl func
        $apiData = apiCall($url);
        // data we want
        $attraction = $apiData['features'];

        $output = [];
        // loop to add landmark into specific group
        foreach($attraction as $landmark) {
            if (preg_match('/historic/',$landmark['properties']['kinds'])) {
                $output['historic'][] = $landmark;
            } else if (preg_match('/natural/',$landmark['properties']['kinds'])) {
                $output['natural'][] = $landmark;
            } else if (preg_match('/religion/',$landmark['properties']['kinds'])) {
                $output['religious'][] = $landmark;
            } else {
                $output['other'][] = $landmark;
            }
        }

    //  check to send city landmark details
    } elseif(isset($_REQUEST['landmark'])) {
        // apiKey
        $apiKey = $apiKeys['opentripmapApi'];
        // specific url
        $url = "https://api.opentripmap.com/0.1/en/places/xid/".$_REQUEST['landmark']."?apikey=".$apiKey;
        // call generic curl func
        $apiData = apiCall($url);
        // data we want
        $output = $apiData;

    // check to send isocodes for dropdown
    } else {
        $output = getIsoCodes();
    }

    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($output);
    
?>