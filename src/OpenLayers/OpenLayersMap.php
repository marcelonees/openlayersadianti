<?php

namespace MarceloNees\Plugins\OpenLayers;

use Adianti\Widget\Base\TElement;
use Adianti\Widget\Base\TScript;
use Adianti\Widget\Base\TStyle;
use Adianti\Widget\Dialog\TMessage;
use Exception;
use stdClass;

/**
 * OpenLayersMap Container
 * @version 1.5
 * @author Marcelo Barreto Nees
 * @copyright Copyright (c) 2025 Marcelo Barreto Nees <marcelo.linux@gmail.com>
 * @license MIT
 * @package widget
 */
class OpenLayersMap extends TElement
{
    protected $javascript;
    protected $id;
    protected $width = '100%';
    protected $height = '500px';
    protected $lng = -49.0904928;
    protected $lat = -26.504104;
    protected $z = 15;
    protected $popupClassName;
    protected $popupMethod = 'generatePopupStructure';
    protected $shouldUpdateCoords = true;
    protected $shouldAddPin = true;
    protected $shouldShowPopup = false;

    /* ======================================== */
    /* PROPRIEDADES PARA CONFIGURAÇÃO          */
    /* ======================================== */
    protected $configFieldId = null;
    protected $showLayerControl = true;
    protected $restoreConfigData = null;

    /* ======================================== */
    /* CORES PARA DESTAQUE                     */
    /* ======================================== */
    protected $highlightStrokeColor = 'rgba(149,31,212,1)';
    protected $highlightFillColor = 'rgba(149,31,212,0.20)';

    /* ======================================== */
    /* NOVAS PROPRIEDADES PARA HIGHLIGHT       */
    /* ======================================== */
    protected $highlightEnabled = true;
    protected $highlightLayerName = 'view_territorio_censo';
    protected $highlightMinZoom = 15;
    protected $highlightWfsUrl = 'https://geo.jaraguadosul.sc.gov.br/gs/geoserver-main/PMJS/wms';

    /**
     * Class Constructor
     */
    public function __construct($lat = null, $lng = null, $z = null, $tile = 'osm')
    {
        parent::__construct('div');
        $this->id = 'openlayersmap_' . uniqid();

        if (!empty($lat)) $this->lat = $lat;
        if (!empty($lng)) $this->lng = $lng;
        if (!empty($z)) $this->z = $z;

        /* Classe e método para geração do popup */
        if ($this->popupClassName) {
            $this->javascript .= "GeoMapApp.getMap()._popupClassName = '{$this->popupClassName}';";
        }
        if ($this->popupMethod) {
            $this->javascript .= "GeoMapApp.getMap()._popupMethod = '{$this->popupMethod}';";
        }

        /* Valores padrão */
        $this->javascript .= "
            GeoMapApp.getMap()._shouldUpdateCoords = " . ($this->shouldUpdateCoords ? 'true' : 'false') . ";
            GeoMapApp.getMap()._shouldAddPin = " . ($this->shouldAddPin ? 'true' : 'false') . ";
            GeoMapApp.getMap()._shouldShowPopup = " . ($this->shouldShowPopup ? 'true' : 'false') . ";
        ";
    }

    public function createMap()
    {
        /* Verifica se os arquivos necessários existem */
        $requiredFiles = [
            'vendor/marcelonees/plugins/src/OpenLayers/ol.js',
            'vendor/marcelonees/plugins/src/OpenLayers/turf.min.js',
            'vendor/marcelonees/plugins/src/OpenLayers/ol-popup.js',
            'vendor/marcelonees/plugins/src/OpenLayers/olmap.js'
        ];

        foreach ($requiredFiles as $file) {
            if (!file_exists($file)) {
                throw new Exception("Arquivo necessário não encontrado: {$file}");
            }
        }

        $requiredVersions = [
            'ol' => '6.5.0',
            'turf' => '5.1.6',
            'ol-popup' => '3.0.0'
        ];

        $versionCheckJS = "
            function checkLibraryVersions() {
                const errors = [];
                const versions = {};
            
                if (typeof ol !== 'undefined') {
                    versions.ol = ol.getVersion();
                    console.warn('Versão do OpenLayers:', versions.ol);
                    if (versions.ol < '{$requiredVersions['ol']}') {
                        errors.push(`Versão do OpenLayers é menor que a requerida ({$requiredVersions['ol']})`);
                    }
                } else {
                    errors.push('OpenLayers não carregado');
                }
            
                if (typeof turf !== 'undefined') {
                    versions.turf = turf.version || 'indeterminada';
                    console.warn('Versão do Turf.js:', versions.turf);
                    if (versions.turf < '{$requiredVersions['turf']}') {
                        errors.push(`Versão do Turf.js é menor que a requerida ({$requiredVersions['turf']})`);
                    }
                } else {
                    errors.push('Turf.js não carregado');
                }
            
                if (typeof Popup === 'undefined') {
                    errors.push('Popup não carregado');
                } else {
                    versions.popup = '3.0.0';
                }
            
                console.log('Versões carregadas:', versions);
                if (errors.length > 0) {
                    console.error('Problemas de versão:', errors);
                    return false;
                }
                return true;
            }
        ";

        $mapId = $this->id;
        $configFieldId = $this->configFieldId ? $this->configFieldId : '';
        $showLayerControl = $this->showLayerControl ? 'true' : 'false';
        $restoreConfigData = $this->restoreConfigData ? json_encode($this->restoreConfigData) : 'null';

        /* Configurações de highlight */
        $highlightEnabled = $this->highlightEnabled ? 'true' : 'false';
        $highlightLayerName = $this->highlightLayerName;
        $highlightMinZoom = $this->highlightMinZoom;
        $highlightWfsUrl = $this->highlightWfsUrl;

        /* Garante que o CSS seja carregado primeiro */
        TStyle::importFromFile('vendor/marcelonees/plugins/src/OpenLayers/ol.css');
        TStyle::importFromFile('vendor/marcelonees/plugins/src/OpenLayers/ol-popup.css');
        TStyle::importFromFile('vendor/marcelonees/topenlayerseditor/src/OpenLayersEditor/ol-editor.css');

        TScript::create("
        function safeGetCoordinates(geoObj) {
            try {
                if (!geoObj || !geoObj.geometry || !geoObj.geometry.coordinates) {
                    console.warn('Objeto geoespacial inválido:', geoObj);
                    return null;
                }
                return geoObj.geometry.coordinates;
            } catch(e) {
                console.error('Erro ao acessar coordenadas:', e);
                return null;
            }
        }
        
        function initializeMap() {
            try {
                if (typeof GeoMapApp === 'undefined') {
                    throw new Error('GeoMapApp não está definido');
                }
                
                var config = {
                    target: '{$mapId}',
                    center: {
                        lat: {$this->lat},
                        lng: {$this->lng}
                    },
                    zoom: {$this->z},
                    configField: '{$configFieldId}',
                    showLayerControl: {$showLayerControl},
                    restoreConfig: {$restoreConfigData},
                    highlightStrokeColor: '{$this->highlightStrokeColor}',
                    highlightFillColor: '{$this->highlightFillColor}',
                    /* NOVAS CONFIGURAÇÕES DE HIGHLIGHT */
                    highlight: {
                        enabled: {$highlightEnabled},
                        layerName: '{$highlightLayerName}',
                        minZoom: {$highlightMinZoom},
                        wfsUrl: '{$highlightWfsUrl}'
                    }
                };
                
                GeoMapApp.init(config);
                
                try {
                    {$this->javascript}
                } catch(jsError) {
                    console.error('Erro no JavaScript adicional:', jsError);
                }
            } catch(initError) {
                console.error('Erro na inicialização do mapa:', initError);
            }
        }
        
        var requiredScripts = [
            'vendor/marcelonees/plugins/src/OpenLayers/ol.js',
            'vendor/marcelonees/plugins/src/OpenLayers/turf.min.js',
            'vendor/marcelonees/plugins/src/OpenLayers/ol-popup.js',
            'vendor/marcelonees/plugins/src/OpenLayers/olmap.js'
        ];
        
        function loadScript(scripts, callback) {
            if (scripts.length === 0) {
                callback();
                return;
            }
            
            var currentScript = scripts.shift();
            $.getScript(currentScript)
                .done(function() {
                    console.log('Script carregado:', currentScript);
                    loadScript(scripts, callback);
                })
                .fail(function() {
                    console.error('Falha ao carregar:', currentScript);
                    loadScript(scripts, callback);
                });
        }
        
        loadScript(requiredScripts, function() {
            if (typeof ol === 'undefined' || typeof turf === 'undefined' || typeof GeoMapApp === 'undefined') {
                console.error('Bibliotecas necessárias não carregadas');
                return;
            }
            
            setTimeout(initializeMap, 100);
        });

        setTimeout(function() {
            {$versionCheckJS}
        }, 500);        
    ");
    }

    /**
     * Show the map
     */
    public function show()
    {
        $style = new TStyle("#{$this->id}");
        $style->width = $this->width;
        $style->height = $this->height;
        $style->border = '1px solid #ccc';
        $style->show();

        $content = new TElement('div');
        $content->id = $this->id;
        $content->class = 'openlayers-map';

        parent::add($content);
        $this->createMap();
        parent::show();
    }

    /* ======================================== */
    /* MÉTODOS PARA CONFIGURAÇÃO               */
    /* ======================================== */

    /**
     * Define o campo que armazenará a configuração do mapa
     * @param string $fieldId ID do campo hidden
     * @return OpenLayersMap
     */
    public function setConfigField($fieldId)
    {
        $this->configFieldId = $fieldId;
        return $this;
    }

    /**
     * Define se deve mostrar o controle de camadas
     * @param bool $show
     * @return OpenLayersMap
     */
    public function setShowLayerControl($show)
    {
        $this->showLayerControl = (bool) $show;
        return $this;
    }

    /**
     * Define os dados de configuração para restauração
     * @param mixed $configData Array ou JSON com configurações
     * @return OpenLayersMap
     */
    public function setRestoreConfig($configData)
    {
        if (is_array($configData)) {
            $this->restoreConfigData = json_encode($configData);
        } else {
            $this->restoreConfigData = $configData;
        }
        return $this;
    }

    /**
     * Restaura configurações com delay opcional
     * @param mixed $configData
     * @param int $delay Delay em milissegundos
     * @return OpenLayersMap
     */
    public function restoreConfig($configData = null, $delay = 1000)
    {
        if ($configData !== null) {
            $this->setRestoreConfig($configData);
        }

        if ($this->restoreConfigData) {
            $configJson = is_string($this->restoreConfigData) ?
                $this->restoreConfigData :
                json_encode($this->restoreConfigData);

            TScript::create("
                setTimeout(function() {
                    if (typeof GeoMapApp !== 'undefined' && GeoMapApp.restoreConfig) {
                        console.log('🔄 Restaurando configurações via método PHP...');
                        GeoMapApp.restoreConfig({$configJson});
                    } else {
                        console.warn('⚠️ GeoMapApp não disponível para restaurar');
                    }
                }, {$delay});
            ");
        }

        return $this;
    }

    /**
     * Salva a configuração atual do mapa
     * @return OpenLayersMap
     */
    public function saveConfig()
    {
        TScript::create("
            if (typeof GeoMapApp !== 'undefined' && GeoMapApp.saveConfig) {
                GeoMapApp.saveConfig();
                console.log('💾 Configuração salva');
            }
        ");
        return $this;
    }

    /**
     * Alterna a visibilidade do controle de camadas
     * @return OpenLayersMap
     */
    public function toggleLayerControl()
    {
        TScript::create("
            if (typeof GeoMapApp !== 'undefined' && GeoMapApp.toggleLayerControl) {
                GeoMapApp.toggleLayerControl();
            }
        ");
        return $this;
    }

    /* ======================================== */
    /* NOVOS MÉTODOS PARA CONTROLE DE HIGHLIGHT */
    /* ======================================== */

    /**
     * Ativa ou desativa o highlight dinamicamente
     * @param bool $enabled
     * @return OpenLayersMap
     */
    public function setHighlightEnabled($enabled = true)
    {
        $this->highlightEnabled = (bool) $enabled;

        $jsEnabled = $this->highlightEnabled ? 'true' : 'false';

        TScript::create("
            if (typeof GeoMapApp !== 'undefined' && GeoMapApp.setHighlightEnabled) {
                GeoMapApp.setHighlightEnabled({$jsEnabled});
                console.log('🎯 Highlight ' + ({$jsEnabled} ? 'ativado' : 'desativado') + ' via PHP');
            } else {
                console.warn('⚠️ GeoMapApp.setHighlightEnabled não disponível');
            }
        ");

        return $this;
    }

    /**
     * Define a camada de origem do highlight
     * @param string $layerName Nome da camada WFS
     * @return OpenLayersMap
     */
    public function setHighlightLayer($layerName)
    {
        $this->highlightLayerName = $layerName;

        TScript::create("
            if (typeof GeoMapApp !== 'undefined' && GeoMapApp.setHighlightLayer) {
                GeoMapApp.setHighlightLayer('{$layerName}');
                console.log('🎯 Camada de highlight alterada para: {$layerName}');
            } else {
                console.warn('⚠️ GeoMapApp.setHighlightLayer não disponível');
            }
        ");

        return $this;
    }

    /**
     * Define o zoom mínimo para ativação do highlight
     * @param int $minZoom
     * @return OpenLayersMap
     */
    public function setHighlightMinZoom($minZoom)
    {
        $this->highlightMinZoom = (int) $minZoom;

        TScript::create("
            if (typeof GeoMapApp !== 'undefined' && GeoMapApp.setHighlightMinZoom) {
                GeoMapApp.setHighlightMinZoom({$this->highlightMinZoom});
                console.log('🎯 Zoom mínimo do highlight alterado para: {$this->highlightMinZoom}');
            }
        ");

        return $this;
    }

    /**
     * Define a URL do WFS para o highlight
     * @param string $url
     * @return OpenLayersMap
     */
    public function setHighlightWfsUrl($url)
    {
        $this->highlightWfsUrl = $url;

        TScript::create("
            if (typeof GeoMapApp !== 'undefined' && GeoMapApp.setHighlightWfsUrl) {
                GeoMapApp.setHighlightWfsUrl('{$url}');
                console.log('🎯 URL do WFS alterada para: {$url}');
            }
        ");

        return $this;
    }

    /**
     * Configura todas as opções de highlight de uma vez
     * @param array $options Opções: enabled, layerName, minZoom, wfsUrl
     * @return OpenLayersMap
     */
    public function configureHighlight(array $options)
    {
        $config = json_encode($options);

        TScript::create("
            if (typeof GeoMapApp !== 'undefined' && GeoMapApp.configureHighlight) {
                GeoMapApp.configureHighlight({$config});
                console.log('🎯 Highlight configurado:', {$config});
            }
        ");

        return $this;
    }

    /* ======================================== */
    /* MÉTODOS DE CAMADAS                      */
    /* ======================================== */

    /**
     * Add a layer to the map
     * @param string $layerName Unique name for the layer
     * @param array $config Layer configuration options
     * @return OpenLayersMap
     */
    public function addLayer($layerName, array $config = [])
    {
        $defaultConfig = [
            'type'      => 'tile',
            'visible'   => true,
            'opacity'   => 1,
            'zIndex'    => 0,
            'source'    => 'osm',
            'title'     => $layerName
        ];

        $config = array_merge($defaultConfig, $config);

        $layerConfig = json_encode($config);
        $safeName = addslashes($layerName);

        $this->javascript .= "
            if (typeof GeoMapApp !== 'undefined' && GeoMapApp.addLayer) {
                console.log('📌 Adicionando camada via PHP: {$safeName}');
                GeoMapApp.addLayer('{$safeName}', {$layerConfig});
            } else {
                console.warn('⚠️ GeoMapApp não disponível para adicionar camada: {$safeName}');
            }
        ";

        return $this;
    }

    /**
     * Remove a layer from the map
     * @param string $layerName Name of the layer to remove
     * @return OpenLayersMap
     */
    public function removeLayer($layerName)
    {
        $safeName = addslashes($layerName);

        $this->javascript .= "
            if (typeof GeoMapApp !== 'undefined' && GeoMapApp.removeLayer) {
                console.log('🗑️ Removendo camada: {$safeName}');
                GeoMapApp.removeLayer('{$safeName}');
            }
        ";

        return $this;
    }

    /**
     * Add a marker to the map
     */
    public function addMarker($lat, $lng, $label = '')
    {
        $lat = (float)$lat;
        $lng = (float)$lng;
        $safeLabel = addslashes($label);

        $this->javascript .= "
            if (typeof GeoMapApp !== 'undefined' && GeoMapApp.addPin) {
                console.log('Adicionando marcador via PHP:', {lat: {$lat}, lng: {$lng}, label: '{$safeLabel}'});
                
                var marker = {
                    lat: parseFloat({$lat}),
                    lng: parseFloat({$lng}),
                    label: '{$safeLabel}'
                };
                
                if (!isNaN(marker.lat) && !isNaN(marker.lng)) {
                    GeoMapApp.addPin(marker);
                } else {
                    console.error('Coordenadas inválidas:', marker);
                }
            } else {
                console.error('GeoMapApp não disponível para adicionar marcador');
            }
        ";

        return $this;
    }

    /**
     * Add marker immediately (for static contexts)
     */
    public function addMarkerImmediate($lat, $lng, $label = '')
    {
        $lat = (float)$lat;
        $lng = (float)$lng;
        $safeLabel = addslashes($label);

        $js = "
            if (typeof GeoMapApp !== 'undefined' && GeoMapApp.addPin) {
                console.log('Adicionando marcador imediato via PHP:', {lat: {$lat}, lng: {$lng}, label: '{$safeLabel}'});
                
                var marker = {
                    lat: parseFloat({$lat}),
                    lng: parseFloat({$lng}),
                    label: '{$safeLabel}'
                };
                
                if (!isNaN(marker.lat) && !isNaN(marker.lng)) {
                    GeoMapApp.addPin(marker);
                } else {
                    console.error('Coordenadas inválidas:', marker);
                }
            }
        ";

        TScript::create($js);
        return $this;
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
     * Adiciona um mapa de calor ao mapa
     * @param array $points Array de pontos no formato [[lon, lat, intensity], ...]
     * @param array $config Configurações do heatmap (opcional)
     * @return $this
     */
    public function addHeatmap(array $points, array $config = [])
    {
        $defaultConfig = [
            'radius' => 15,
            'blur' => 15,
            'gradient' => ['#00f', '#0ff', '#0f0', '#ff0', '#f00'],
            'minOpacity' => 0.1,
            'maxZoom' => 18,
            'zIndex' => 10
        ];

        $config = array_merge($defaultConfig, $config);

        $pointsJS = json_encode($points);
        $gradientJS = json_encode($config['gradient']);

        $this->javascript .= "
            try {
                if (typeof ol === 'undefined' || typeof GeoMapApp === 'undefined') {
                    throw new Error('Bibliotecas necessárias não carregadas');
                }

                var map = GeoMapApp.getLastMap ? GeoMapApp.getLastMap() : (GeoMapApp.getMap ? GeoMapApp.getMap() : null);
                if (!map) {
                    console.warn('⚠️ Nenhum mapa disponível para heatmap');
                    return;
                }

                var heatmapSource = new ol.source.Vector();
                
                var features = [];
                var points = {$pointsJS};
                
                points.forEach(function(point) {
                    var feature = new ol.Feature({
                        geometry: new ol.geom.Point(ol.proj.fromLonLat([point[0], point[1]]))
                    });
                    
                    if (point.length > 2) {
                        feature.set('weight', point[2]);
                    }
                    
                    features.push(feature);
                });
                
                heatmapSource.addFeatures(features);
                
                var heatmapLayer = new ol.layer.Heatmap({
                    source: heatmapSource,
                    blur: {$config['blur']},
                    radius: {$config['radius']},
                    gradient: {$gradientJS},
                    minOpacity: {$config['minOpacity']},
                    zIndex: {$config['zIndex']},
                    name: 'heatmap'
                });
                
                map.addLayer(heatmapLayer);
                console.log('Camada de heatmap adicionada com sucesso');
                
                if (typeof GeoMapApp.heatmapLayers === 'undefined') {
                    GeoMapApp.heatmapLayers = [];
                }
                GeoMapApp.heatmapLayers.push(heatmapLayer);
                
            } catch(e) {
                console.error('Erro ao criar mapa de calor:', e);
            }
        ";

        return $this;
    }

    /**
     * Remove todas as camadas de heatmap
     * @return $this
     */
    public function clearHeatmaps()
    {
        $this->javascript .= "
            try {
                var map = GeoMapApp.getLastMap ? GeoMapApp.getLastMap() : (GeoMapApp.getMap ? GeoMapApp.getMap() : null);
                if (map && GeoMapApp.heatmapLayers) {
                    GeoMapApp.heatmapLayers.forEach(function(layer) {
                        map.removeLayer(layer);
                    });
                    GeoMapApp.heatmapLayers = [];
                }
            } catch(e) {
                console.error('Erro ao remover heatmaps:', e);
            }
        ";

        return $this;
    }

    /**
     * Draw a circle on the map
     */
    public function DrawCircleOnLonLat($lon, $lat, $radius = 300, $strokeColor = 'rgba(255,15,15)', $fillColor = 'rgba(255,15,15, 0.1)')
    {
        $this->javascript .= "
            var map = GeoMapApp.getLastMap ? GeoMapApp.getLastMap() : (GeoMapApp.getMap ? GeoMapApp.getMap() : null);
            if (map) {
                var circle = new ol.geom.Circle(
                    ol.proj.transform([{$lon}, {$lat}], 'EPSG:4326', 'EPSG:3857'),
                    {$radius}
                );
                
                var circleFeature = new ol.Feature(circle);
                var vectorSource = new ol.source.Vector();
                vectorSource.addFeatures([circleFeature]);
                
                var circleLayer = new ol.layer.Vector({
                    source: vectorSource,
                    style: new ol.style.Style({
                        stroke: new ol.style.Stroke({
                            color: '{$strokeColor}',
                            width: 3,
                        }),
                        fill: new ol.style.Fill({
                            color: '{$fillColor}',
                        }),
                    }),
                });
                
                map.addLayer(circleLayer);
            }
        ";
        return $this;
    }

    public function parseGeoJson($geom)
    {
        $decoded = json_decode($geom);

        if (is_string($decoded)) {
            $decoded = json_decode($decoded);
        }

        if (!is_object($decoded)) {
            throw new Exception("Formato GeoJSON inválido");
        }

        if ($decoded->type === 'FeatureCollection') {
            if (empty($decoded->features)) {
                throw new Exception("FeatureCollection sem features");
            }

            $feature = $decoded->features[0];
            return $feature->geometry;
        } elseif ($decoded->type === 'Feature') {
            return $decoded->geometry;
        } else {
            return $decoded;
        }
    }

    public function parseAllGeometries($geom)
    {
        $decoded = json_decode($geom);

        if (is_string($decoded)) {
            $decoded = json_decode($decoded);
        }

        if (!is_object($decoded)) {
            throw new Exception("Formato GeoJSON inválido");
        }

        if ($decoded->type === 'FeatureCollection') {
            return array_map(function ($feature) {
                return $feature->geometry;
            }, $decoded->features);
        } elseif ($decoded->type === 'Feature') {
            return [$decoded->geometry];
        } else {
            return [$decoded];
        }
    }

    /**
     * Highlight and fly to a geometry
     */
    public function HighlightAndFlyToGeom($geom, $z = 15)
    {
        try {
            $geoJson = json_decode($geom);

            if (is_string($geoJson)) {
                $geoJson = json_decode($geoJson);
            }

            if ($geoJson === null) {
                throw new Exception('Falha ao decodificar JSON da geometria. String inválida: ' . substr($geom, 0, 100));
            }

            if ($geoJson && isset($geoJson->type) && $geoJson->type === 'GeometryCollection') {
                if (isset($geoJson->geometries) && is_array($geoJson->geometries) && count($geoJson->geometries) > 0) {
                    $firstGeometry = $geoJson->geometries[0];
                    $geoJson = (object)[
                        'type' => 'Feature',
                        'geometry' => $firstGeometry,
                        'properties' => new stdClass()
                    ];
                } else {
                    throw new Exception('GeometryCollection vazia ou inválida');
                }
            }

            if (
                $geoJson && isset($geoJson->type) && $geoJson->type === 'FeatureCollection'
                && isset($geoJson->features) && count($geoJson->features) > 0
            ) {
                $geoJson = $geoJson->features[0];
            }

            if (
                $geoJson && isset($geoJson->type) && $geoJson->type === 'MultiLineString'
                && isset($geoJson->features)
            ) {
                $properties = $geoJson->features[0]->properties ?? new stdClass();
                $geoJson = (object)[
                    'type' => 'Feature',
                    'geometry' => $geoJson,
                    'properties' => $properties
                ];
            }

            if ($geoJson && isset($geoJson->type) && $geoJson->type === 'Polygon') {
                if (!isset($geoJson->coordinates) || !is_array($geoJson->coordinates)) {
                    throw new Exception('Estrutura de Polygon inválida');
                }
                if (count($geoJson->coordinates[0]) < 4) {
                    throw new Exception('Polygon deve ter pelo menos 4 pontos no anel exterior');
                }

                $properties = new stdClass();
                $geoJson = (object)[
                    'type' => 'Feature',
                    'geometry' => $geoJson,
                    'properties' => $properties
                ];
            }

            if ($geoJson && isset($geoJson->type) && $geoJson->type === 'MultiPolygon') {
                if (!isset($geoJson->coordinates) || !is_array($geoJson->coordinates)) {
                    throw new Exception('Estrutura de MultiPolygon inválida');
                }

                $properties = new stdClass();
                $geoJson = (object)[
                    'type' => 'Feature',
                    'geometry' => $geoJson,
                    'properties' => $properties
                ];
            }

            if (!$geoJson || !isset($geoJson->geometry) || !isset($geoJson->geometry->coordinates)) {
                if (isset($geoJson->coordinates) && isset($geoJson->type)) {
                    $tempGeo = $geoJson;
                    $geoJson = (object)[
                        'type' => 'Feature',
                        'geometry' => $tempGeo,
                        'properties' => new stdClass()
                    ];
                } else {
                    throw new Exception('Geometria inválida. Deve ser um objeto GeoJSON válido.');
                }
            }

            $geomString = json_encode($geoJson);
            $strokeColor = $this->highlightStrokeColor;
            $fillColor = $this->highlightFillColor;

            $this->javascript .= "
            (function() {
                var geomData = {$geomString};
                var zoomLevel = {$z};
                var maxRetries = 15;
                var retryCount = 0;
                var executed = false;
                var highlightStrokeColor = '{$strokeColor}';
                var highlightFillColor = '{$fillColor}';
                
                function ensureHighlightLayer(map) {
                    var highlightLayer = map.getLayers().getArray().find(function(l) { 
                        return l.get('name') === 'highlight'; 
                    });
                    
                    if (!highlightLayer) {
                        console.log('🔄 Criando camada de highlight...');
                        
                        var source = new ol.source.Vector({
                            format: new ol.format.GeoJSON()
                        });
                        
                        var style = new ol.style.Style({
                            stroke: new ol.style.Stroke({
                                color: highlightStrokeColor,
                                width: 3,
                            }),
                            fill: new ol.style.Fill({
                                color: highlightFillColor,
                            }),
                            image: new ol.style.Circle({
                                radius: 8,
                                fill: new ol.style.Fill({
                                    color: highlightStrokeColor,
                                }),
                                stroke: new ol.style.Stroke({
                                    color: '#ffffff',
                                    width: 2,
                                }),
                            }),
                        });
                        
                        highlightLayer = new ol.layer.Vector({
                            source: source,
                            name: 'highlight',
                            style: style,
                            zIndex: 7
                        });
                        
                        map.addLayer(highlightLayer);
                        console.log('✅ Camada de highlight criada com estilo personalizado');
                    }
                    
                    return highlightLayer;
                }
                
                function executeHighlightAndFly() {
                    if (executed) return;
                    
                    var map = GeoMapApp.getLastMap ? GeoMapApp.getLastMap() : null;
                    
                    if (!map) {
                        retryCount++;
                        if (retryCount < maxRetries) {
                            console.log('⏳ Aguardando mapa... tentativa ' + retryCount + '/' + maxRetries);
                            setTimeout(executeHighlightAndFly, 400);
                        } else {
                            console.warn('⚠️ Mapa não disponível após ' + maxRetries + ' tentativas');
                        }
                        return;
                    }
                    
                    var highlightLayer = ensureHighlightLayer(map);
                    
                    if (!highlightLayer) {
                        retryCount++;
                        if (retryCount < maxRetries) {
                            console.log('⏳ Aguardando camada de highlight... tentativa ' + retryCount + '/' + maxRetries);
                            setTimeout(executeHighlightAndFly, 400);
                        } else {
                            console.warn('⚠️ Camada de highlight não disponível após ' + maxRetries + ' tentativas');
                        }
                        return;
                    }
                    
                    executed = true;
                    
                    console.log('🔄 HighlightAndFlyToGeom - Executando no mapa:', map.getTarget());
                    
                    try {
                        var features = null;
                        
                        if (geomData && geomData.type === 'Feature') {
                            features = new ol.format.GeoJSON().readFeatures(geomData, {
                                featureProjection: 'EPSG:3857'
                            });
                        } 
                        else if (geomData && geomData.type && geomData.coordinates) {
                            var featureObj = {
                                type: 'Feature',
                                geometry: geomData,
                                properties: {}
                            };
                            features = new ol.format.GeoJSON().readFeatures(featureObj, {
                                featureProjection: 'EPSG:3857'
                            });
                        } else {
                            features = new ol.format.GeoJSON().readFeatures(geomData, {
                                featureProjection: 'EPSG:3857'
                            });
                        }
                        
                        if (!features || features.length === 0) {
                            console.warn('⚠️ Nenhuma feature encontrada');
                            return;
                        }
                        
                        console.log('📐 Features encontradas:', features.length);
                        
                        features.forEach(function(f) { 
                            f.set('custom', true); 
                        });
                        
                        highlightLayer.getSource().addFeatures(features);
                        console.log('✅ Geometria destacada (' + features.length + ' features)');
                        
                        var extent = ol.extent.createEmpty();
                        features.forEach(function(feature) {
                            var geomExtent = feature.getGeometry().getExtent();
                            ol.extent.extend(extent, geomExtent);
                        });
                        
                        const view = map.getView();
                        const center = ol.extent.getCenter(extent);

                        if (!ol.extent.isEmpty(extent)) {
                            console.log('📐 Extent calculado:', extent);
                            view.animate({
                                center: center,
                                zoom: zoomLevel,
                                duration: 2000
                            });

                            console.log('✅ Voo para geometria (zoom: ' + zoomLevel + ')');
                        } else {
                            console.warn('⚠️ Extent vazio, não foi possível voar');
                        }
                    } catch(e) {
                        console.error('❌ Erro em HighlightAndFlyToGeom:', e);
                        executed = false;
                        retryCount++;
                        if (retryCount < maxRetries) {
                            console.log('⏳ Tentando novamente... ' + retryCount + '/' + maxRetries);
                            setTimeout(executeHighlightAndFly, 500);
                        }
                    }
                }
                
                setTimeout(executeHighlightAndFly, 300);
            })();
        ";

            return $this;
        } catch (Exception $e) {
            new TMessage('error', $e->getMessage());
            return $this;
        }
    }

    /**
     * Highlight a geometry
     */
    public function HighlightGeom($geom, $z = 10)
    {
        $this->javascript .= "
            try {
                if (typeof HighlightGeom === 'function') {
                    HighlightGeom(" . json_encode($geom) . ");
                } else {
                    var map = GeoMapApp.getLastMap ? GeoMapApp.getLastMap() : (GeoMapApp.getMap ? GeoMapApp.getMap() : null);
                    if (map) {
                        var highlightLayer = map.getLayers().getArray().find(function(l) { 
                            return l.get('name') === 'highlight'; 
                        });
                        if (highlightLayer) {
                            var features = new ol.format.GeoJSON().readFeatures(" . json_encode($geom) . ", {
                                featureProjection: 'EPSG:3857'
                            });
                            features.forEach(function(f) { f.set('custom', true); });
                            highlightLayer.getSource().clear();
                            highlightLayer.getSource().addFeatures(features);
                        }
                    }
                }
            } catch(e) {
                console.error('Erro ao destacar geometria:', e);
            }
        ";
        return $this;
    }

    /**
     * Clear all Geom on the Map
     */
    public function clearGeomSource()
    {
        try {
            $this->javascript .= "
                if (typeof clearGeomSource === 'function') {
                    clearGeomSource();
                } else {
                    var map = GeoMapApp.getLastMap ? GeoMapApp.getLastMap() : (GeoMapApp.getMap ? GeoMapApp.getMap() : null);
                    if (map) {
                        var highlightLayer = map.getLayers().getArray().find(function(l) { 
                            return l.get('name') === 'highlight'; 
                        });
                        if (highlightLayer) {
                            highlightLayer.getSource().clear();
                            console.log('✅ Geometria limpa do último mapa');
                        }
                    }
                }
            ";
            TScript::create($this->javascript);
        } catch (Exception $e) {
            new TMessage('error', $e->getMessage());
        }
    }

    /**
     * Add layer immediately (for static contexts)
     */
    public function addLayerImmediate($layerName, array $config = [])
    {
        $defaultConfig = [
            'type'      => 'tile',
            'visible'   => true,
            'opacity'   => 1,
            'zIndex'    => 0,
            'source'    => 'osm',
            'title'     => $layerName
        ];

        $config = array_merge($defaultConfig, $config);
        $layerConfig = json_encode($config);
        $safeName = addslashes($layerName);

        $js = "
            if (typeof GeoMapApp !== 'undefined' && GeoMapApp.addLayer) {
                GeoMapApp.addLayer('{$safeName}', {$layerConfig});
            }
        ";

        TScript::create($js);
        return $this;
    }

    /**
     * configStroke a Geom on the Map
     * @param $strokeColor (default: 'rgba(149,31,212,1)')
     * @param $fillColor   (default: 'rgba(149,31,212,0.20)')
     */
    public function configStroke($strokeColor = 'rgba(149,31,212,1)', $fillColor = 'rgba(149,31,212,0.20)')
    {
        try {
            $this->highlightStrokeColor = $strokeColor;
            $this->highlightFillColor = $fillColor;

            $this->javascript .= "
                if (typeof configStroke === 'function') {
                    configStroke('$strokeColor', '$fillColor');
                } else if (GeoMapApp && GeoMapApp.configStroke) {
                    GeoMapApp.configStroke('$strokeColor', '$fillColor');
                }
            ";
            TScript::create($this->javascript);
        } catch (Exception $e) {
            new TMessage('error', $e->getMessage());
        }
        return $this;
    }


    /**
     * Set the popup class name
     * @param string $className The class name for the popup
     * @return $this
     */
    public function setPopupClassName($className)
    {
        $this->popupClassName = $className;
        $this->javascript .= "
            if (typeof GeoMapApp !== 'undefined') {
                GeoMapApp.getMap()._popupClassName = '{$className}';
            }
        ";
        return $this;
    }

    /**
     * Set the popup method
     * @param string $method The method name for the popup
     * @return $this
     */
    public function setPopupMethod($method = 'generatePopupStructure')
    {
        $this->popupMethod = $method;
        $this->javascript .= "
            if (typeof GeoMapApp !== 'undefined') {
                GeoMapApp.getMap()._popupMethod = '{$method}';
            }
        ";
        return $this;
    }

    /**
     * Set whether to update coordinates on click
     * @param bool $update Whether to update coordinates
     * @return $this
     */
    public function setShouldUpdateCoords($update = true)
    {
        $this->shouldUpdateCoords = (bool)$update;
        $this->javascript .= "
            if (typeof GeoMapApp !== 'undefined') {
                GeoMapApp.getMap()._shouldUpdateCoords = " . ($update ? 'true' : 'false') . ";
            }
        ";
        return $this;
    }

    /**
     * Set whether to add a pin on click
     * @param bool $addPin Whether to add a pin
     * @return $this
     */
    public function setShouldAddPin($addPin = true)
    {
        $this->shouldAddPin = (bool)$addPin;
        $this->javascript .= "
            if (typeof GeoMapApp !== 'undefined') {
                GeoMapApp.getMap()._shouldAddPin = " . ($addPin ? 'true' : 'false') . ";
            }
        ";
        return $this;
    }

    /**
     * Set whether to show popup on click
     * @param bool $showPopup Whether to show popup
     * @return $this
     */
    public function setShouldShowPopup($showPopup = true)
    {
        $this->shouldShowPopup = (bool)$showPopup;
        $this->javascript .= "
            if (typeof GeoMapApp !== 'undefined') {
                GeoMapApp.getMap()._shouldShowPopup = " . ($showPopup ? 'true' : 'false') . ";
            }
        ";
        return $this;
    }

    /**
     * Set map dimensions
     */
    public function setSize($width, $height)
    {
        $this->width = is_numeric($width) ? "{$width}px" : $width;
        $this->height = is_numeric($height) ? "{$height}px" : $height;

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
     * Ativa o modo de edição de geometria
     * @param string $geom GeoJSON da geometria a ser editada
     * @return $this
     */
    public function enableGeometryEditing($geom = null)
    {
        $geomJson = $geom ? json_encode($geom) : 'null';

        $this->javascript .= "
            (function() {
                if (typeof GeoMapApp === 'undefined' || !GeoMapApp.getMap()) {
                    console.error('Mapa não disponível');
                    return;
                }
                
                var map = GeoMapApp.getLastMap ? GeoMapApp.getLastMap() : GeoMapApp.getMap();
                if (!map) {
                    console.error('Nenhum mapa disponível');
                    return;
                }
                
                var oldLayer = map.getLayers().getArray().find(l => l.get('name') === 'edit_layer');
                if (oldLayer) {
                    map.removeLayer(oldLayer);
                }
                
                var source = new ol.source.Vector();
                
                if ({$geomJson}) {
                    var format = new ol.format.GeoJSON();
                    var features = format.readFeatures({$geomJson}, {
                        featureProjection: 'EPSG:3857'
                    });
                    source.addFeatures(features);
                }
                
                var layer = new ol.layer.Vector({
                    source: source,
                    name: 'edit_layer',
                    style: new ol.style.Style({
                        stroke: new ol.style.Stroke({
                            color: '#00ff00',
                            width: 3
                        }),
                        fill: new ol.style.Fill({
                            color: 'rgba(0, 255, 0, 0.1)'
                        })
                    })
                });
                
                map.addLayer(layer);
                
                window._editLayer = layer;
                window._editSource = source;
                
                console.log('Camada de edição criada no último mapa');
            })();
        ";

        TScript::create($this->javascript);
        return $this;
    }

    /**
     * Obtém a geometria editada como GeoJSON
     * @return string GeoJSON
     */
    public function getEditedGeometry()
    {
        $this->javascript .= "
            (function() {
                if (window._editLayer) {
                    var source = window._editLayer.getSource();
                    var features = source.getFeatures();
                    
                    if (features.length > 0) {
                        var format = new ol.format.GeoJSON();
                        var geomJson = format.writeFeatures(features, {
                            dataProjection: 'EPSG:4326',
                            featureProjection: 'EPSG:3857'
                        });
                        
                        var geomField = document.getElementById('geom');
                        if (geomField) {
                            geomField.value = geomJson;
                        }
                        
                        return geomJson;
                    }
                }
                return null;
            })();
        ";

        return $this;
    }
}
