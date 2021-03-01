<?php

    ini_set('display_errors', 'On');

    error_reporting(E_ALL);

    // FUNC TO CONVERT LATLNG TO ISOCODE
    function latLngToIso() {
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

        
        // only grab isocode as other data is less likely to output anything useful
        return $decode['results'][0]['components']['ISO_3166-1_alpha-2'];
    };

    // FUNC TO GET REST COUNTRY DATA FOR OVERVIEW
    function getRestCountry($isocode) {

        // URL TO REST COUNTRIES
        $url='https://restcountries.eu/rest/v2/alpha/'. strtolower($isocode);
    
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
        $overviewData = json_decode($result, true);
        
        return $overviewData;
    };

    //['results'][0]['geometry']
    // FUNC TO RETURN WB DATA FROM COUNTRY ISO
    function getWorldBank($arr, $isocode) {

        // ARRAY TO ADD RETURNED WB COUNTRY DATA
        $outputArray = [];

        // LOOP WB ARRAYS AND JOIN AS SINGLE STRING
        foreach ($arr as $mainKey => $value) {
            $joinAsString = implode(";", $value);
            // CALLS WB API *3
            $result = callWorldBankApi($joinAsString, $isocode);
            // FORMAT USEFUL RESULT DATA
            for ($i=0; $i < count($result[1]); $i++) {
                $outputArray[$mainKey][$result[1][$i]['indicator']['value']][$result[1][$i]['date']] = $result[1][$i]['value'];
            };
        };

        return $outputArray;

    };

    // called inside getWorldBank func
    function callWorldBankApi($codesList, $isocode) {

        // COULD ADD DYNAMIC YEAR CHANGE FEATURE
        $endYear = date("Y");

        // WB URL
        // codesList should be a list of world bank codes separated by ;
        // source=2 seems to return data - WHY?
        // per_page 800 is large enough to return all data
        $url = 'https://api.worldbank.org/v2/country/'.strtolower($isocode).'/indicator/'.$codesList.'?per_page=800&source=2&date=1968:'.$endYear.'&format=json';
        
        $ch = curl_init();
        // CURL OPTIONS
        //
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        //returns the results as a string 
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        //sets url to be used
        curl_setopt($ch, CURLOPT_URL, $url);

        // EXECUTE CURL
        $result = curl_exec($ch);

        curl_close($ch);
        // DECODE DATA FOR MANIPULATION
        return json_decode($result, true);
    };

    // FUNC RETURNS COUNTRY BORDER AND CALLS API FUNCS
    function getCountry($isoCode) {

        $countryBorders = json_decode(file_get_contents("countryBorders.geo.json"), true);

        $border = null;
    
        foreach ($countryBorders['features'] as $feature) {
            if ($feature["properties"]["iso_a2"] ==  $isoCode) {
    
                $border = $feature;
    
                break;
            }
        }

        return $border;
    }


    // FUN RETURN ISO AND COUNTRY NAMES
    function getIsoCodes() {
        
        $executionStartTime = microtime(true);
        // FIRST CALL RETURNS NAMES AND ISOCODES
        $countryData = json_decode(file_get_contents("countryBorders.geo.json"), true);

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

        // EARTHQUAKE URL (USGS)
        $earthquakesUrl = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month.geojson";

        $ch = curl_init();
        // CURL OPTIONS
        //
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        //returns the results as a string 
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        //sets url to be used
        curl_setopt($ch, CURLOPT_URL, $earthquakesUrl);

        // EXECUTE CURL
        $earthquakesResult = curl_exec($ch);

        // PLATES GeoJSON URL FROM  FRAXEN'S GITHUB
        $plateBoundaries = "https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json";
        
        $ch = curl_init();
        // CURL OPTIONS
        //
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        //sets url to be used
        curl_setopt($ch, CURLOPT_URL, $plateBoundaries);

        // EXECUTE CURL
        $plateGeojsonResult = curl_exec($ch);

        $output['status']['code'] = "200";
        $output['status']['name'] = "ok";
        $output['status']['description'] = "success";
        $output['status']['executedIn'] = intval((microtime(true) - $executionStartTime) * 1000) . " ms";
        $output['data'] = $country;
        $output['earthquakes'] = json_decode($earthquakesResult, true);
        $output['plates'] = json_decode($plateGeojsonResult, true);

        return $output;
        
    }

    function getLargestCities($isoCode) {

        // no apikey needed

        $url='https://public.opendatasoft.com/api/records/1.0/search/?dataset=geonames-all-cities-with-a-population-1000&q=&sort=population&facet=timezone&facet=country&refine.country_code='. strtoupper($isoCode);
        //
        //https://public.opendatasoft.com/api/records/1.0/search/?dataset=worldcitiespop&q=&sort=population&facet=country&refine.country=
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_URL,$url);
    
        $result = curl_exec($ch);
    
        curl_close($ch);
    
        $cities = json_decode($result, true); 
        
        $cityArray = [];

        for ($i=0; $i < count($cities['records']); $i++) {
            $cityArray[$cities['records'][$i]['fields']['name']] = $cities['records'][$i]['fields'];
        };

        

        return $cityArray;
    }

    //second API call


    function getCapital($overviewData) {

        // GET CAPITAL LATLNG
        $apiKey = 'ceaf93ee5f1b4333b994ddeda2110d75';
        // URL TO REST COUNTRIES
        $capitalLatLng ='https://api.opencagedata.com/geocode/v1/json?q='.$overviewData['capital'].'&key='.$apiKey;

        $ch = curl_init();
        // CURL OPTIONS
        //
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        // returns the results as a string 
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        // sets url to be used
        curl_setopt($ch, CURLOPT_URL, $capitalLatLng);
        
        // EXECUTE CURL
        $capitalLatLngResult = curl_exec($ch);

        curl_close($ch);

        $filtertoLatLng =  json_decode($capitalLatLngResult, true);

        return $filtertoLatLng['results'][0]['geometry'];

    }

    function getWeather($cityArray) {

        // FORMAT THE ARRAY TO A STRING JOINED BY ,
        $formattedArray = implode(",", $cityArray);

        $apikey = '';

        //weather
        $url = 'https://api.openweathermap.org/data/2.5/group?id='.$formattedArray.'&units=metric&appid='.$apikey;

        // foreach ($cityArray as $city) {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_URL, $url);
        
            $result = curl_exec($ch);
        
            curl_close($ch);
        
            $decoded = json_decode($result,true); 
            
        // }

        return $decoded;
    }


    function getWebcam($countryCode) {
        $apikey= "";

        // webcam shown in country by popularity and limit 20
        $url = "https://api.windy.com/api/webcams/v2/list/country=".$countryCode."/orderby=popularity/limit=20?show=webcams:player,location&key=".$apikey;

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

        $output =  json_decode($result, true);

        return $output;
    }


    function getCityAttractions($lat, $lng) {

        $apikey = "";

        $url = "https://api.opentripmap.com/0.1/en/places/radius?radius=20000&lon=".$lng."&lat=".$lat."&limit=1000&rate=3&apikey=".$apikey;

        $ch = curl_init();
        // CURL OPTIONS
        // &kinds=unclassified_objects%2Cnatural%2Chistoric%2Carchitecture
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        // returns the results as a string 
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        // sets url to be used
        curl_setopt($ch, CURLOPT_URL, $url);
        
        // EXECUTE CURL
        $result = curl_exec($ch);

        curl_close($ch);

        $decoded =  json_decode($result, true);
        $attraction = $decoded['features'];

        $output = [];
        // shuffle($output['features'])
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
            // $attraction[$landmark['properties']['name']] = $landmark['properties']['kinds'];
        }

        return $output;
    }

    function getLandmarkData($placeCode) {

        $apikey = "";

        $url = "https://api.opentripmap.com/0.1/en/places/xid/".$placeCode."?apikey=".$apikey;

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

        $output =  json_decode($result, true);

        return $output;
    }

    function getAirports($countryCode) {

        // no apikey needed

        $url = "https://data.opendatasoft.com/api/records/1.0/search/?dataset=osm-world-airports%40babel&q=&rows=100&facet=source&facet=country&facet=country_code&refine.country_code=".strtolower($countryCode);

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

        $output =  json_decode($result, true);

        return $output['records'];
    }
    // TO ADD MORE CHARTS AMEND ARRAY
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

    // check what output to send back (5 types) 

    if (isset($_REQUEST['countryCode'])) {
        $executionStartTime = microtime(true);

        $restCountryData = getRestCountry($_REQUEST['countryCode']);
        $largeCities = getLargestCities($_REQUEST['countryCode']);

        $cityIdArray = [];

        // ids for countries for openweather api
        $cityIds = json_decode(file_get_contents("city.list.min.json"), true);

        // loop each city
        foreach ($largeCities as $city) {
            // and then loop large array to find its id
            foreach($cityIds as $id) {
                // check for match
                if ((strtolower($city['name']) === strtolower($id['name'])) and (strtolower($_REQUEST['countryCode'])  === strtolower($id['country']))) {
                    // append to array
                    $cityIdArray[] = $id['id'];
                    //only match with first id
                    break;
                }
            }
            
        }

        $cityWeather = getWeather($cityIdArray);

        $output['status']['code'] = "200";
        $output['status']['name'] = "ok";
        $output['status']['description'] = "success";
        $output['status']['executedIn'] = intval((microtime(true) - $executionStartTime) * 1000) . " ms";
        $output['data']['border'] = getCountry($_REQUEST['countryCode']);
        $output['data']['overview'] = $restCountryData;
        $output['data']['worldBank'] = getWorldBank($worldBankArray, $_REQUEST['countryCode']);
        $output['data']['border']['properties']['cities'] = $largeCities;
        $output['data']['border']['properties']['cityWeather'] = $cityWeather; 
        $output['data']['webcams'] = getWebcam($_REQUEST['countryCode']); 
        $output['data']['airports'] = getAirports($_REQUEST['countryCode']); 
        // $output['data']['border']['properties']['cityWeather'] = $cityIds;

        // $output['data']['cityIds'] = $cityIdArray;


    //  check to send converted lat lng to iso
    } elseif(isset($_REQUEST['lat']) and isset($_REQUEST['lng'])) {
        $output = latLngToIso();
    //  check to send city attractions
    } elseif(isset($_REQUEST['cityLat']) and isset($_REQUEST['cityLng'])) {
        $output = getCityAttractions($_REQUEST['cityLat'], $_REQUEST['cityLng']);
    //  check to send city landmark details
    } elseif(isset($_REQUEST['landmark'])) {
        $output = getLandmarkData($_REQUEST['landmark']);
    // check to send isocodes for dropdown
    } else {
        $output = getIsoCodes();
    }

    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($output);
    
?>