<?php

namespace MarceloNees\Plugins\OpenLayers;

use Adianti\Widget\Base\TElement;
use Adianti\Widget\Base\TScript;
use Adianti\Widget\Base\TStyle;
use Exception;

/**
 * OpenLayersMap Container
 */
class OpenLayersMap extends TElement
{
    protected $javascript;

    /*
    private $height = '500px'; 
    private $width  = '500px';
    */

    // Jaraguá do Sul
    private $lng = -49.0904928;
    private $lat = -26.504104;
    private $z   = 15;

    /**
     * Class Constructor
     */
    public function __construct($lat = -26.504104, $lng = -49.089554, $z = 15, $tile = 'osm')
    {
        try {

            if (!$this->id) {

                parent::__construct('div');

                $this->id = 'openlayersmap' . uniqid();

                if (!empty($lat))
                    $this->lat = $lat;

                if (!empty($lng))
                    $this->lng = $lng;

                if (!empty($z))
                    $this->z   = $z;
            }
        } catch (Exception $e) {

            new TMessage('error', $e->getMessage());
            //throw new Exception($e->getMessage());
        }
    }


    /**
     * createMap
     */
    public function createMap()
    {
        try {

            $javascript = (!empty($this->javascript)) ? $this->javascript : '';

            // Mapa
            TScript::create("
                var map = '';

                var vectorLayer;
                var features = [];               
                var sourceFeatures;
                var layerFeatures;

                var exportPNGElement = document.getElementById('export-png');

                var strokeColor = 'rgba(149,31,212,1)';
                var fillColor = 'rgba(149,31,212,0.20)';

                /*var useStreetView = new Boolean(false);*/
                var useStreetView = false;

                $(document).ready(function() {
    
                    $('<link/>',{
                        rel: 'stylesheet',
                        type: 'text/css',
                        href: 'vendor/marcelonees/plugins/src/OpenLayers/ol.css'
                    }).appendTo('head');

                    $('<link/>',{
                        rel: 'stylesheet',
                        type: 'text/css',
                        href: 'vendor/marcelonees/plugins/src/OpenLayers/ol-popup.css'
                    }).appendTo('head');

                    $.getScript('vendor/marcelonees/plugins/src/OpenLayers/ol.js', {'crossOrigin': 'anonymous', 'crossDomain': 'true',}).done(function() {

                        $.getScript('vendor/marcelonees/plugins/src/OpenLayers/turf.min.js').done(function() {});

                        $.getScript('vendor/marcelonees/plugins/src/OpenLayers/ol-popup.js').done(function() {});

                        lng = $this->lng;
                        lat = $this->lat;
                        z   = $this->z;

                        var attribution = new ol.control.Attribution({
                            collapsible: false
                        });

                        var baseLayer = new ol.layer.Tile({
                            source: new ol.source.OSM({
                                crossOrigin: null
                            })
                        });

                        var ortomosaico = new ol.layer.Tile({
                            source: new ol.source.XYZ({
                                attributions: '<br/><span>Prefeitura Municipal de Jaraguá do Sul, Março de 2020</span>',
                                url: 'https://www.jaraguadosul.sc.gov.br/geo/ortomosaico2020/{z}/{x}/{y}.png',
                                maxZoom: 19
                            }),
                        });

                        var limite_municipal = new ol.layer.Tile({
                            name: 'limite_municipal',
                            source: new ol.source.TileWMS({
                                url: 'https://geo.jaraguadosul.sc.gov.br/gs/geoserver-hive/PMJS/wms?',
                                params: {
                                    'layers': 'lim_municipal',
                                    'TILED': true,
                                    'tiled': true,
                                    'TRANSPARENT': true,
                                    'srs': 'EPGS:3857',
                                    'STYLES': ''
                                },
                                serverType: 'geoserver',
                                crossOrigin: 'anonymous'
                            })
                        });

                        var limite_bairros = new ol.layer.Tile({
                            name: 'limite_bairros',
                            source: new ol.source.TileWMS({
                                url: 'https://geo.jaraguadosul.sc.gov.br/gs/geoserver-hive/PMJS/wms?',
                                params: {
                                    'layers': 'lim_bairros',
                                    'TILED': true,
                                    'tiled': true,
                                    'TRANSPARENT': true,
                                    'srs': 'EPGS:3857',
                                    'STYLES': ''
                                },
                                serverType: 'geoserver',
                                crossOrigin: 'anonymous'
                            })
                        });                      

                        map = new ol.Map({
                            target: $this->id,

                            loadTilesWhileAnimating:    true,
                            loadTilesWhileInteracting:  true,
                            renderer: 'canvas',

                            layers: [
                                baseLayer, 
                                limite_municipal, 
                                limite_bairros /* , ortomosaico, layerFeatures, */
                            ],

                            view: new ol.View({
                                projection: 'EPSG:3857',
                                center: ol.proj.fromLonLat(
                                    [ $this->lng, $this->lat ]
                                ), 
                                zoom: $this->z
                            }),

                            controls: ol.control.defaults({attribution: false}).extend(
                                [
                                    attribution,
                                    new ol.control.ScaleLine(),

                                    /*new ol.control.ZoomSlider(),*/
                                    new ol.control.FullScreen()
                                ]
                            ),

                            multiWorld: true,
                        });

                        /**
                         * Geolocalização
                         **/
                        
                        if (useStreetView) {

                            var geolocation = new ol.Geolocation({
                                projection: map.getView().getProjection(),
                                tracking: true,
                                trackingOptions: {
                                    enableHighAccuracy: true,
                                    maximumAge: 2000  
                                }
                            });
                            
                            var streetViewIconStyle = new ol.style.Style({
                                image: new ol.style.Icon({
                                    anchor: [0.5, 46],
                                    anchorXUnits: 'fraction',
                                    anchorYUnits: 'pixels',
                                    opacity: 0.75,
                                    src: 'vendor/marcelonees/plugins/src/OpenLayers/street-view.png'
                                })
                            });
                            
                            /* add an empty streetViewIconFeature to the source of the layer */
                            var streetViewIconFeature = new ol.Feature();   
                            var streetViewIconSource = new ol.source.Vector({
                                features: [streetViewIconFeature]
                            });    
                            var streetViewIconLayer = new ol.layer.Vector({
                                source: streetViewIconSource,
                                style : streetViewIconStyle
                            });
                            
                            map.addLayer(streetViewIconLayer);
                            streetViewIconLayer.setZIndex(8);

                            /* Update the position of the marker dynamically and zoom to position */
                            geolocation.on('change', function(evt) {
                                var pos = geolocation.getPosition();
                                map.getView().setCenter(pos);
                                /*map.getView().setZoom(18);*/
                                streetViewIconFeature.setGeometry(new ol.geom.Point(pos));
                            });
                        }

                        $.getScript('vendor/marcelonees/plugins/src/OpenLayers/olmap.js').done(function()    {

                            $javascript

                        });

                    });

                });
                
            ");
        } catch (Exception $e) {
            new TMessage('error', $e->getMessage());
        }
    }

    /**
     * show
     */
    public function show()
    {
        $style = new TElement('style');
        $style->add('#' . $this->id . '{ height:' . $this->height . ';  width: ' . $this->width . '; }');

        $this->createMap();

        $script = new TElement('script');
        $script->type = 'text/javascript';
        $script->src  = 'vendor/marcelonees/plugins/src/OpenLayers/ol.js';

        $content = new TElement('div');
        $content->id = $this->id;
        $content->class = 'openlayers';

        parent::add($content);
        parent::show();
    }

    /**
     * remStreetView
     */
    public function remStreetView()
    {
        $this->javascript .= "
            useStreetView = false;
        ";
        TScript::create("$this->javascript");
    }

    /**
     * addStreetView
     */
    public function addStreetView()
    {
        $this->javascript .= "
            useStreetView = true;
        ";
        TScript::create("$this->javascript");
    }



    /**
     * addLayer
     */
    public function addLayer($layerName, $sourceType = "OSM", $attributions = NULL, $sourceUrl = NULL, $minZoom = 8, $maxZoom = 19)
    {
        /*
        
        var baseLayer = new ol.layer.Tile({
            source: new ol.source.OSM()
        });

        var PMJSLayer = new ol.layer.Tile({
            source: new ol.source.XYZ({
                attributions: '<br/><span>Prefeitura Municipal de Jaraguá do Sul, Março de 2020</span>',
                url: 'https://www.jaraguadosul.sc.gov.br/geo/ortomosaico2020/{z}/{x}/{y}.png',
                maxZoom: 19
            }),
        });
        */

        /*
        $this->javascript .= "
            var $layerName = new ol.layer.Tile({
                source: new ol.source.$sourceType({
                    ";

        if ($attributions)  {$this->javascript .= "attributions: '$attributions',"; }
        if ($sourceUrl)     {$this->javascript .= "url:          '$sourceUrl',";    }
        if ($minZoom)       {$this->javascript .= "minZoom:      '$minZoom',";      }
        if ($maxZoom)       {$this->javascript .= "maxZoom:      '$maxZoom',";      }

        $this->javascript .= "
                }),
            });

            map.addLayer($layerName);
        ";
        */

        //$this->javascript .= "addLayer($layerName, $sourceType, $attributions, $sourceUrl, $minZoom, $maxZoom);";
        $this->javascript .= "addLayer('$layerName', '$sourceType', '$attributions', '$sourceUrl', '$minZoom', '$maxZoom');";
        TScript::create("$this->javascript");
    }

    /**
     * DrawCircleOnLonLat on the Map
     * @param $lon      Longitude
     * @param $lat      Latitude
     * @param $radius   Radius ('in meters', default: 300 )
     */
    public function DrawCircleOnLonLat($lon, $lat, $radius = 300)
    {
        try {
            $this->javascript .= "DrawCircleOnLonLat($lon, $lat, $radius);";
            TScript::create("$this->javascript");
        } catch (Exception $e) {
            new TMessage('error', $e->getMessage());
        }
    }

    /**
     * Highlight and fly to a Geom on the Map
     * @param $geom Geom
     * @param $z    Zoom (default: 10 )
     */
    public function HighlightAndFlyToGeom($geom, $z = 10)
    {
        try {
            $this->javascript .= "HighlightAndFlyToGeom(jQuery.parseJSON($geom), $z);";
            TScript::create("$this->javascript");
        } catch (Exception $e) {
            new TMessage('error', $e->getMessage());
        }
    }


    /**
     * Clear all Geom on the Map
     */
    public function clearGeomSource()
    {
        try {
            $this->javascript .= "clearGeomSource();";
            TScript::create("$this->javascript");
        } catch (Exception $e) {
            new TMessage('error', $e->getMessage());
        }
    }

    /**
     * Highlight a Geom on the Map
     * @param $geom Geom
     * @param $z    Zoom (default: 10 )
     */
    public function HighlightGeom($geom, $z = 10)
    {
        try {
            $this->javascript .= "HighlightGeom(jQuery.parseJSON($geom), $z);";
            TScript::create("$this->javascript");
        } catch (Exception $e) {
            new TMessage('error', $e->getMessage());
        }
    }

    /**
     * configStroke a Geom on the Map
     * @param $strokeColor (default: 'rgba(149,31,212,1)')
     * @param $fillColor   (default: 'rgba(149,31,212,0.20)')
     */
    public function configStroke($strokeColor, $fillColor)
    {
        try {
            $this->javascript .= "configStroke('$strokeColor', '$fillColor');";
            TScript::create("$this->javascript");
        } catch (Exception $e) {
            new TMessage('error', $e->getMessage());
        }
    }


    /**
     * setSize
     */
    public function setSize($width, $height)
    {
        $this->width  = (is_numeric($width))  ? $width  . 'px' : $width;
        $this->height = (is_numeric($height)) ? $height . 'px' : $height;

        $style = new TElement('style');
        $style->add('#' . $this->id . '{ height:' . $this->height . ';  width: ' . $this->width . '; }');
        parent::add($style);
    }


    /**
     * setWidth
     */
    public function setWidth($width = '100px')
    {
        $this->width = $width;

        $style = new TElement('style');
        $style->add('#' . $this->id . '{ height:' . $this->height . ';  width: ' . $this->width . '; }');

        parent::add($style);
    }


    /**
     * setHeight
     */
    public function setHeight($height = '100px')
    {
        $this->height = $height;

        $style = new TElement('style');
        $style->add('#' . $this->id . '{ height:' . $this->height . ';  width: ' . $this->width . '; }');

        parent::add($style);
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
        foreach ($points as $point) {
            $description = '';

            if (!empty($point->lng))        $lng = $point->lng;
            if (!empty($point->longitude))  $lng = $point->longitude;

            if (!empty($point->lat))        $lat = $point->lat;
            if (!empty($point->latitude))   $lat = $point->latitude;

            if (!empty($point->description)) $description = $point->description;

            if (!empty($lat) && !empty($lng))
                $this->addMarker($lat, $lng, $description);
        }
    }



    /**
     * __set
     */
    public function __set($atrib, $value)
    {
        $this->$atrib = $value;
    }

    public function centroidOfGeom($geom)
    {
        try {
            $this->javascript .= "
                const centroid = centroidOfGeom($geom);
                console.log(centroid);
            ";
            $this->centroid;

            TScript::create("$this->javascript");
        } catch (Exception $e) {
            new TMessage('error', $e->getMessage());
        }
    }

    /**
     * showPopup
     */
    public function showPopup($text)
    {

        $this->javascript .= "
            
            var popup = new ol.Overlay.Popup();
            map.addOverlay(popup);
            
            map.on('click', function(evt) {
                var prettyCoord = ol.coordinate.toStringHDMS(
                    ol.proj.transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326'), 2
                );

                /*console.log(evt.coordinate);*/

                popup.show(evt.coordinate, 
                    '
                        <div>
                            $text
                        </div>
                    '
                );
            });
        ";

        TScript::create("$this->javascript");
    }


    /**
     * addMarker - Add a point on the map
     */
    public function addMarker($lng, $lat, $label = '')
    {
        if (!empty($lng) && !empty($lat)) {
            $this->javascript .= "
                console.log('addMarker($lng, $lat, $label)');
                var Markers = {lat: $lat, lng: $lng, label: '$label'};
                addPin(Markers);
            ";

            TScript::create("$this->javascript");
        }
    }
}
