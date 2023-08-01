<?php
    // $url = $_GET['url'];

    // print_r($_GET);
    // header('Access-Control-Allow-Origin: *');
    // header('Content-Type: application/json; charset=utf-8');
    $url = "https://geo.jaraguadosul.sc.gov.br/gs/geoserver-main/PMJS/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=PMJS:vigepi_foco&maxFeatures=50&outputFormat=application/json";
    // $curl = curl_init();
    // $defaults = array(
    //     CURLOPT_URL => $url,
    //     CURLOPT_HEADER => false,
    //     CURLOPT_CUSTOMREQUEST => 'GET',
    //     CURLOPT_RETURNTRANSFER => true,
    //     CURLOPT_SSL_VERIFYHOST => false,
    //     CURLOPT_SSL_VERIFYPEER => false,
    //     CURLOPT_CONNECTTIMEOUT => 10
    // );
    
    // curl_setopt_array($curl, $defaults);
    // curl_exec($curl);

    // echo $url;


    // create curl resource
    $ch = curl_init();

    // set url
    curl_setopt($ch, CURLOPT_URL, $url);

    //return the transfer as a string
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);

    // $output contains the output string
    $output = curl_exec($ch);

    // close curl resource to free up system resources
    curl_close($ch);

    print $output;

?>