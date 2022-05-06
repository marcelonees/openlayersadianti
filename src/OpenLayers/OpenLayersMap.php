<?php
namespace MarceloNees\Plugins\OpenLayers;

use Adianti\Widget\Base\TElement;
use Adianti\Widget\Base\TScript;
use Adianti\Widget\Base\TStyle;
use Exception;
use GeoEngine;
use GeoImoveis;

/**
 * OpenLayersMap Container
 */
class OpenLayersMap extends TElement
{
    protected $elements, $javascript;

    private $height = '500px'; 
    private $width  = '500px';
    private $return;
    private $olmapjs = 'vendor/marcelonees/plugins/src/OpenLayers/olmap.js';

    // Jaraguá do Sul
    //$lat = "-26.5064867";
    //$lng = "-49.0904928";

    private $lat = -49.0904928; 
    private $lng = -26.5064867;
    private $z   = 18;

    private $locations_to_center = array();


    /**
     * Class Constructor
     */
    public function __construct($lat, $lng, $z, $tile = 'osm')
    {
        try {

            parent::__construct('div');

            if (!$this->id) {
                //$this->id = 'openlayersmap';
                $this->id = 'openlayersmap' . uniqid();
                $this->elements = array();

                if(!empty($lat))
                    $this->lat = $lat;

                if(!empty($lng))
                    $this->lng = $lng;

                if(!empty($z))
                    $this->z   = $z;

                /*
                if(!empty($tile))
                    $this->tileLayer($tile);
                */

                //TStyle::importFromFile('vendor/marcelonees/plugins/src/OpenLayers/ol.css');
                //TScript::importFromFile('vendor/marcelonees/plugins/src/OpenLayers/ol.js');

                $style = new TElement('style');
                $style->add('#'.$this->id.'{ height:'.$this->height.';  width: '.$this->width.'; }');

                //echo "<pre>"; print_r($this->height); echo "</pre>";
                //echo "<pre>"; print_r($this->width);  echo "</pre>";
                //$style->add('#'.$this->id.'{ height: 100px;  width: 100px; color: red; }');

                $script          = new TElement('script');
                $script->type    = 'text/javascript';
                $script->src     = 'vendor/marcelonees/plugins/src/OpenLayers/ol.js';
        
                $this->createMap();
        
                $mapa_div        = new TElement('div');
                $mapa_div->id    = $this->id;
                $mapa_div->class = 'openlayers';
                
                parent::add( $style );
                parent::add( $script );
                parent::add( $mapa_div );
            }

        }
        catch (Exception $e)
        {
            //new TMessage('error', $e->getMessage());
            throw new Exception($e->getMessage());
        }

    }

    public function setWidth($width = '100px') {
        $this->width = $width;

        $style = new TElement('style');
        $style->add('#'.$this->id.'{ height:'.$this->height.';  width: '.$this->width.'; }');       

        parent::add($style);        
    }

    public function setHeight($height = '100px') {
        $this->height = $height;

        $style = new TElement('style');
        $style->add('#'.$this->id.'{ height:'.$this->height.';  width: '.$this->width.'; }');       

        parent::add($style);        
    }


    /**
     * createMap
     */
    public function createMap()
    {

        // Mapa
        TScript::create("

            $(document).ready(function() {
                
                $.getScript('app/resources/geo/js/turf.min.js').done(function() {});
                $.getScript('$this->olmapjs').done(function() {});

                lng = $this->lng;
                lat = $this->lat;
                z   = $this->z;

                map = new ol.Map({
                    target: $this->id,
                    layers: [

                        new ol.layer.Tile({
                            source: new ol.source.OSM()
                        })

                    ],
                    view: new ol.View({
                        projection: 'EPSG:3857',
                        center: ol.proj.fromLonLat(
                            [ $this->lng, $this->lat ]
                        ), 
                        zoom: $this->z
                    }),
                    controls: ol.control.defaults().extend([
                            new ol.control.ScaleLine(),
                    ])
                    
                });

            });

        ");

    }



    /**
     * Highlight and fly to a Geom on the Map
     * @param $geom Geom
     * @param $z    Zoom (default: 10 )
     */
    public function HighlightAndFlyToGeom($geom, $z = 10)
    {
        try {
            TScript::create("
                $.getScript('app/resources/geo/js/turf.min.js').done(function() {
                    $.getScript('$this->olmapjs').done(function() {

                        HighlightAndFlyToGeom(jQuery.parseJSON($geom), $z);

                    });
                });
            ");
        }
        catch (Exception $e)
        {
            new TMessage('error', $e->getMessage());
        }
        
    }


    /**
     * Add a page to the accordion
     * @param $title  Title
     * @param $object Content
     */
    public function addContent($title, $object)
    {
        $this->elements[] = array($title, $object);
    }



    /**
     * addJsonMarker
     */
    public function addJsonMarker($json)
    {
        $points = json_decode($json);
        foreach($points as $point)
        {
             $description = '';

             if(!empty($point->lng))        $lng = $point->lng;
             if(!empty($point->longitude))  $lng = $point->longitude;

             if(!empty($point->lat))        $lat = $point->lat;
             if(!empty($point->latitude))   $lat = $point->latitude;

             if(!empty($point->description)) $description = $point->description;

             if(!empty($lat) && !empty($lng) ) 
                 $this->addMarker($lat, $lng, $description);
            }
    }


    /**
     * setSize
     */
    public function setSize($width, $height)
    {
        $this->width  = (is_numeric($width))  ? $width.'px'  : $width;
        $this->height = (is_numeric($height)) ? $height.'px' : $height;

        $style = new TElement('style');
        $style->add('#'.$this->id.'{ height:'.$this->height.';  width: '.$this->width.'; }');       
        parent::add($style);

    }


    /**
     * __set
     */
    public function __set($atrib, $value)
    {
        $this->$atrib = $value;
    }
    
    
    /**
     * addMarker - Add a point on the map
     */
    /*
    public function addMarker($lat, $lng, $popup, $icon = null)
    {
        if(!empty($lat) && !empty($lng))
        {  
            $popup = (!empty($popup)) ? '.bindPopup("'.$popup.'")' : '';
            $icon   = (empty($icon))  ?  'vendor/marcelonees/plugins/src/OpenLayers/marker-icon.png' : $icon ;

            $this->locations_to_center['point'][] = ['lat'=>$lat, 'lng'=>$lng];

            $this->javascript .= "
                L.marker(
                    [ $lng, $lat ], 
                    {
                        icon:  new OpenLayersIcon({
                            iconUrl: '$icon'
                        })
                    })$popup.addTo(map);
                ";
        }
    }
    */


    /**
     * center
     */
    /*
    public function center()
    {
        if(!empty($this->locations_to_center['point']))
        {
            $points_to_center = '';
            foreach( $this->locations_to_center['point'] as $point)
                $points_to_center .= '['.$point['lat'].', '.$point['lng'].'],';
    
            $this->javascript .= ' map.fitBounds(['.$points_to_center.']); ';
        }
    }
    */


    /**
     * myLocation
     */
    /*
    public function myLocation($show_precision = false)
    {
        $popup = ($show_precision == true) ? ".bindPopup('Precisão: ' + radius + '  metros' ).openPopup()" : '';

        $this->javascript .= "
            map.on('locationfound', function(e){
                var radius = e.accuracy / 2;
                L.marker(e.latlng, {icon:  Licon}).addTo(map)".$popup.";
                L.circle(e.latlng, radius).addTo(map);
            });
            map.locate({setView: true, maxZoom: 16});
        ";
    }
    */


    /**
     * tileLayer
     */
    /*
    public function tileLayer($tile = 'google')
    {
        if($tile == 'google')
            $this->javascript .= "L.tileLayer('https://www.google.com/maps/vt?lyrs=s@189&gl=cn&x={x}&y={y}&z={z}', {  attribution: 'André | Google' }).addTo(map);";
        elseif($tile == 'osm')
            $this->javascript .= "L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; André | OSM' }).addTo(map);";
    }
    */


    /**
     * enableAddPoints
     */
    /*
    public function enableAddPoints($return)
    {
        $this->return = $return;
        $this->javascript .= "
        map.on('click', function (e) {

            var marker = L.marker(
                e.latlng,{
                    icon:  Licon, 
                    draggable:'true'
                }
            ).addTo(Group".$this->id.");

            allPointsJson();

            message('Inserido','Alfinete inserido!', 'success');
        });
        ";
    }
    */


    /**
     * enableAddOnePoint
     */
    /*
    public function enableAddOnePoint($return)
    {
        $this->return = $return;
        $this->javascript .= "
            var point".$this->id.";

            map.on('click', function (e) {

                if(point".$this->id.")
                    map.removeLayer(point".$this->id.");
                
                point".$this->id." = L.marker(
                    e.latlng, {
                        icon:  Licon,
                        draggable:'true'
                    }).addTo(Group".$this->id.");

                allPointsJson();

                message('Inserido','Alfinete inserido!', 'success');
            });
            ";
    }
    */



    /**
     * searchAddress
     */
    /*
    public function searchAddress($return, $addMarker = false)
    {
        if( $addMarker )
            $addmarker = "
            point".$this->id."location = L.marker(
                coordinates, {
                    icon:  Licon,
                    draggable:'true'
                }).addTo(Group".$this->id.");

            allPointsJson();

            message('Inserido','Alfinete inserido!', 'success');
            ";
        else  $addmarker = "";
            
        $this->javascript .= "
        $('[name=\"".$return."\"]').select2({
            minimumInputLength: 2,
            tags: [],
            ajax: {
                url: 'vendor/marcelonees/plugins/src/OpenLayers/apiAddress.php?method=SearchAddress',
                dataType: 'json',
                type: 'GET',
                delay: 200,
                data: function (term) {
                    return {
                        term: term
                    };
                },
                processResults: function (data) {
                    return {
                        results: $.map(data, function (value, key) {
                            return {
                                id: value.id,
                                text: value.text
                            }
                        })
                    };
                }
            }
        }).on('select2:select', function (e) {                   
            var latlng = e.params.data.id.split(',');
            var coordinates = [];
            coordinates.push(latlng[0]);
            coordinates.push(latlng[1]);
            ".$addmarker."
            map.setView(coordinates, '16');
        });
        ";
    }
    */

    /*
    public function createMapLeaflet()
    {
        $javascript = (!empty($this->javascript)) ? $this->javascript : '';

        TScript::create("
            var map = '';
            $(function() {  
                var map = L.map('".$this->id."').setView([".$this->lat.", ".$this->lng."], ".$this->z."); 
                var OpenLayersIcon = L.Icon.extend({
                    options: { iconSize: [25, 40], iconAnchor: [9, 40], popupAnchor: [4, -37] }
                });  
                var Group".$this->id." = L.featureGroup().addTo(map).on('click', groupClick);
                var Licon = new OpenLayersIcon({iconUrl: 'vendor/marcelonees/plugins/src/OpenLayers/marker-icon.png'});
                ".$javascript."
                function allPointsJson()
                { 
                    JsonGeom = '';
                    map.eachLayer((layer) => {
                        if(layer instanceof L.Marker){
                            JsonGeom += JSON.stringify(layer.getLatLng())+', ';  
                        }
                    });
                    $('[name=\"".$this->return."\"]').val('['+JsonGeom+']');
                }
                function groupClick(event) {
                    event.layer.remove();
                    allPointsJson();
                }
                function message(title, message, type){
                   if(type == 'success')
                        iziToast.success({
                            title: title,
                            message: message,
                            position: 'topRight',
                            timeout: 3000
                        });
                }
            });
        ");
    }
    */


}