<?php

    // CREATE THE CURL OBJECT
    $ch = curl_init();


    // FUNC TO CONVERT LATLNG TO ISOCODE
    function curlFunctionLocation($ch) {
        // APIKEY
        $apiKey = '';


        // OPENCAGE URL
        $url = 'https://api.opencagedata.com/geocode/v1/json?q='.strval($_REQUEST['lat']).'+'.strval($_REQUEST['lng']).'&key='.$apiKey;


        // CURL OPTIONS
        // returns the results as a string 
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        // sets url to be used
        curl_setopt($ch, CURLOPT_URL,$url);

        // EXECUTE CURL
        $result = curl_exec($ch);

        // DECODE DATA FOR MANIPULATION
        // TRUE RETURN ASSOCIATIVE ARRAY
        $decode = json_decode($result, true);
        // print_r($decode);

        
        // only grab isocode as other data is less likely to output anything useful
        return $decode['results'][0]['components']['ISO_3166-1_alpha-2'];
    };


    // FUNC TO GET WEATHER AT LATLNG
    function curlFunctionWeather($ch) {

        // APIKEY
        $apiKey = '';
        
        // OPENWEATHER URL
        $url='api.openweathermap.org/data/2.5/weather?lat='.$_REQUEST['markerLat'].'&lon='.$_REQUEST['markerLng'].'&units=metric&appid='. $apiKey;

        // CURL OPTIONS
        //returns the results as a string 
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        //sets url to be used
        curl_setopt($ch, CURLOPT_URL, $url);
        
        // EXECUTE CURL
        $result = curl_exec($ch);

        // DECODE DATA FOR MANIPULATION
        return json_decode($result, true);
    };

    // FUNC TO GET REST COUNTRY DATA FOR OVERVIEW
    function curlFunctionCountryOverview($isocode, $ch) {
    
        // URL TO REST COUNTRIES
        $url='https://restcountries.eu/rest/v2/alpha/'. strtolower($isocode);
    
    
        // CURL OPTIONS
        // returns the results as a string 
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        // sets url to be used
        curl_setopt($ch, CURLOPT_URL,$url);
        
        // EXECUTE CURL
        $result = curl_exec($ch);
        
        // DECODE DATA FOR MANIPULATION
        return json_decode($result, true);

    };


    // FUNC TO RETURN WB DATA FROM COUNTRY ISO
    function curlFunctionWorldBank($codesList, $isocode, $ch) {

        // COULD ADD DYNAMIC YEAR CHANGE FEATURE
        $endYear = date("Y");

        // WB URL
        // codesList should be a list of world bank codes separated by ;
        // source=2 seems to return data - WHY?
        // per_page 800 is large enough to return all data
        $url = 'https://api.worldbank.org/v2/country/'.strtolower($isocode).'/indicator/'.$codesList.'?per_page=800&source=2&date=1968:'.$endYear.'&format=json';
        
        
        // CURL OPTIONS
        //returns the results as a string 
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        //sets url to be used
        curl_setopt($ch, CURLOPT_URL, $url);

        // EXECUTE CURL
        $result = curl_exec($ch);

        // DECODE DATA FOR MANIPULATION
        return json_decode($result, true);

    };
    
    // FUNC TO CALL AND FORMAT ALL COUNTRY DATA
    // CALLS BOTH curlFunctionWorldBank AND curlFunctionCountryOverview
    function getData($isocode, $arr, $ch) {

        // ARRAY TO ADD RETURNED WB COUNTRY DATA
        $outputArray = [];

        // LOOP WB ARRAYS AND JOIN AS SINGLE STRING
        foreach ($arr as $mainKey => $value) {
            $joinAsString = implode(";", $value);
            // CALLS WB API *3
            $result = curlFunctionWorldBank($joinAsString, $isocode, $ch);
            // FORMAT USEFUL RESULT DATA
            for ($i=0; $i < count($result[1]); $i++) {
                $outputArray[$mainKey][$result[1][$i]['indicator']['value']][$result[1][$i]['date']] = $result[1][$i]['value'];
            };
        };

        // MERGE WB AND OVERVIEW
        $output = json_encode(array("CountryOverview" => curlFunctionCountryOverview($isocode, $ch),
        "WorldBankData" => $outputArray,
        ));

        return $output;
    };
    
    // FUNC TO GET GEOJSON AND DATA FORL MAP LAYERS
    function getMapsAndMarkers($ch) {
        $getGeojsonFile = file_get_contents("./countryBorders.geo.json");
        
        // Map Layers
        $code1 = "NY.GDP.MKTP.CD"; // gdp
        $code2 = "EN.ATM.CO2E.PC"; // co2 emisssions
        $code3 = "SP.POP.GROW"; // pop growth


        // get latest date with enough data for most countries
        // as of typing  2021 - 5 = 2016
        $date = date("Y") - 5;

        // WB URL
        $WBurl = 'http://api.worldbank.org/v2/country/indicator/'.$code1.';'.$code2.';'.$code3.'?per_page=800&source=2&date='.$date.'&format=json';
    
        // CURL OPTIONS
        //returns the results as a string 
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        //sets url to be used
        curl_setopt($ch, CURLOPT_URL, $WBurl);

        // EXECUTE CURL
        $countryValues = curl_exec($ch);

        // DECODE FOR MANIPULATION
        $countryDecode = json_decode($countryValues, true);

        // SHOULD REFACTOR THESE LOOPS
        $AllCountryGdpValues = [];
        $AllCountryCo2Values = [];
        $AllCountryGrowthValues = [];

        // LOOP WB DATA AND PUSH TO SPECIFIC ARRAY
        for($i = 0; $i < count($countryDecode[1]); $i++) {
            if ($countryDecode[1][$i]["indicator"]["id"] === $code1) {
                $AllCountryGdpValues[$countryDecode[1][$i]["country"]["id"]] = $countryDecode[1][$i]["value"];
            } elseif ($countryDecode[1][$i]["indicator"]["id"] === $code2) {
                $AllCountryCo2Values[$countryDecode[1][$i]["country"]["id"]] = $countryDecode[1][$i]["value"];
            } elseif ($countryDecode[1][$i]["indicator"]["id"] === $code3) {
                $AllCountryGrowthValues[$countryDecode[1][$i]["country"]["id"]] = $countryDecode[1][$i]["value"];
            } 
        }

        // DECODE GOEJSON FILE FOR MANIPULATION
        $decodedGeoJSON = json_decode($getGeojsonFile, true);

        // LOOP ARRAYS AND ADD TO GEOJSON
        foreach ($AllCountryGdpValues as $key => $result) {
            for($i = 0; $i < count($decodedGeoJSON["features"]); $i++) {
                // CHECK IF KEY EQUALS ISO CODE
                if ($decodedGeoJSON["features"][$i]["properties"]["iso_a2"] === $key) {
                    // CREATE NEW KEY VALUE PAIR
                    $decodedGeoJSON["features"][$i]["properties"]["gdp"] = $result;
                }
            }
        }

        foreach ($AllCountryCo2Values as $key => $result) {
            for($i = 0; $i < count($decodedGeoJSON["features"]); $i++) {
                // CHECK IF KEY EQUALS ISO CODE
                if ($decodedGeoJSON["features"][$i]["properties"]["iso_a2"] === $key) {
                    // CREATE NEW KEY VALUE PAIR
                    $decodedGeoJSON["features"][$i]["properties"]["co2"] = $result;
                }
            }
        }

        foreach ($AllCountryGrowthValues as $key => $result) {
            for($i = 0; $i < count($decodedGeoJSON["features"]); $i++) {
                // CHECK IF KEY EQUALS ISO CODE
                if ($decodedGeoJSON["features"][$i]["properties"]["iso_a2"] === $key) {
                    // CREATE NEW KEY VALUE PAIR
                    $decodedGeoJSON["features"][$i]["properties"]["growth"] = $result;
                }
            }
        }

        #################################################################################################################
        // EARTHQUAKE URL (USGS)
        $earthquakes = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month.geojson";

        // CURL OPTIONS
        //returns the results as a string 
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        //sets url to be used
        curl_setopt($ch, CURLOPT_URL, $earthquakes);

        // EXECUTE CURL
        $earthquakesResult = curl_exec($ch);
        #################################################################################################################
        // PLATES GeoJSON URL FROM  FRAXEN'S GITHUB
        $plateBoundaries = "https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json";
        // CURL OPTIONS
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        //sets url to be used
        curl_setopt($ch, CURLOPT_URL, $plateBoundaries);

        // EXECUTE CURL
        $plateGeojsonResult = curl_exec($ch);
        #################################################################################################################
        // FORMAT THE OUTPUT
        $output = json_encode(array("countryGeojson" => $decodedGeoJSON, 
        "plateGeojson" => json_decode($plateGeojsonResult, true),
        "earthquakes" => json_decode($earthquakesResult, true),
        ));

        return $output;

    };

    
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // CHECK WHICH DATA TO SEND BACK TO SITE

    if (isset($_REQUEST['firstCall'])) {
        // CALLS FOR GEOJSON AND MAP LAYER DATA
        print_r(getMapsAndMarkers($ch));

    } elseif (isset($_REQUEST['iso'])) {

        // CALLS FOR COUNTRY DATA
        $output1 = getData($_REQUEST['iso'], $worldBankArray, $ch);
        print_r($output1);
    
    } elseif (isset($_REQUEST['lat']) and isset($_REQUEST['lng'])) {

        // CALLS FOR LATLNG CONVERSION TO ISO
        // INSTEAD OF RETURNING THIS COULD USE ISO TO RETURN COUNTRY DATA
        $output2 = json_encode(curlFunctionLocation($ch));
        print_r($output2);

    } elseif (isset($_REQUEST['markerLat']) and isset($_REQUEST['markerLng'])) {

        // CALLS FOR WEATHER DATA
        $output3 = json_encode(curlFunctionWeather($ch));
        print_r($output3);

    };

    // END CURL
    curl_close($ch);

?>