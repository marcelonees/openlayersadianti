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
 * @version 1.1
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

        // Classe e método para geração do popup
        if ($this->popupClassName) {
            $this->javascript .= "GeoMapApp.getMap()._popupClassName = '{$this->popupClassName}';";
        }
        if ($this->popupMethod) {
            $this->javascript .= "GeoMapApp.getMap()._popupMethod = '{$this->popupMethod}';";
        }

        // Valores padrão
        $this->javascript .= "
            GeoMapApp.getMap()._shouldUpdateCoords = " . ($this->shouldUpdateCoords ? 'true' : 'false') . ";
            GeoMapApp.getMap()._shouldAddPin = " . ($this->shouldAddPin ? 'true' : 'false') . ";
            GeoMapApp.getMap()._shouldShowPopup = " . ($this->shouldShowPopup ? 'true' : 'false') . ";
        ";
    }

    public function createMap()
    {
        // Verifica se os arquivos necessários existem
        $requiredFiles = [
            'vendor/marcelonees/plugins/src/OpenLayers/ol.js',
            'vendor/marcelonees/plugins/src/OpenLayers/turf.min.js',
            'vendor/marcelonees/plugins/src/OpenLayers/ol-popup.js'
        ];

        foreach ($requiredFiles as $file) {
            if (!file_exists($file)) {
                throw new Exception("Arquivo necessário não encontrado: {$file}");
            }
        }

        $requiredVersions = [
            'ol' => '6.5.0',        // Versão do OpenLayers
            'turf' => '5.1.6',      // Versão do Turf.js
            'ol-popup' => '3.0.0'   // Versão do Popup
        ];

        // Adicione esta função para verificar versões
        $versionCheckJS = "
            function checkLibraryVersions() {
                const errors = [];
                const versions = {};
            
                /* Verifica OpenLayers */
                if (typeof ol !== 'undefined') {
                    versions.ol = ol.getVersion();
                    console.warn('Versão do OpenLayers:', versions.ol);
                    if (versions.ol < '{$requiredVersions['ol']}') {
                        errors.push(`Versão do OpenLayers é menor que a requerida ({$requiredVersions['ol']})`);
                    }
                } else {
                    errors.push('OpenLayers não carregado');
                }
            
                /* Verifica Turf.js */
                if (typeof turf !== 'undefined') {
                    versions.turf = turf.version || 'indeterminada';
                    console.warn('Versão do Turf.js:', versions.turf);
                    if (versions.turf < '{$requiredVersions['turf']}') {
                        errors.push(`Versão do Turf.js é menor que a requerida ({$requiredVersions['turf']})`);
                    }
                } else {
                    errors.push('Turf.js não carregado');
                }
            
                /* Verifica Popup */
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

        /* Garante que o CSS seja carregado primeiro */
        TStyle::importFromFile('vendor/marcelonees/plugins/src/OpenLayers/ol.css');
        TStyle::importFromFile('vendor/marcelonees/plugins/src/OpenLayers/ol-popup.css');

        /* Cria um sistema de carregamento robusto com verificações de segurança */
        TScript::create("
        /* Função para verificar segurança antes de acessar coordenadas */
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
        
        /* Função principal de inicialização */
        function initializeMap() {
            try {
                /* Verificação de segurança */
                if (typeof GeoMapApp === 'undefined') {
                    throw new Error('GeoMapApp não está definido');
                }
                
                /* Inicializa o mapa */
                GeoMapApp.init({
                    target: '{$mapId}',
                    center: {
                        lat: {$this->lat},
                        lng: {$this->lng}
                    },
                    zoom: {$this->z}
                });
                
                /* Processa o JavaScript adicional com tratamento de erros */
                try {
                    {$this->javascript}
                } catch(jsError) {
                    console.error('Erro no JavaScript adicional:', jsError);
                }
            } catch(initError) {
                console.error('Erro na inicialização do mapa:', initError);
            }
        }
        
        /* Carrega os scripts necessários em ordem */
        var requiredScripts = [
            'vendor/marcelonees/plugins/src/OpenLayers/ol.js',
            'vendor/marcelonees/plugins/src/OpenLayers/turf.min.js',
            'vendor/marcelonees/plugins/src/OpenLayers/ol-popup.js',
            'vendor/marcelonees/plugins/src/OpenLayers/olmap.js'
        ];
        
        /* Função para carregar scripts sequencialmente */
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
        
        /* Inicia o processo de carregamento */
        loadScript(requiredScripts, function() {
            /* Verifica se todos os requisitos estão carregados */
            if (typeof ol === 'undefined' || typeof turf === 'undefined' || typeof GeoMapApp === 'undefined') {
                console.error('Bibliotecas necessárias não carregadas');
                return;
            }
            
            /* Executa a inicialização */
            setTimeout(initializeMap, 100);
        });

        /* Após carregar tudo, verifique as versões */
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
        // Set container dimensions
        $style = new TStyle("#{$this->id}");
        $style->width = $this->width;
        $style->height = $this->height;
        $style->border = '1px solid #ccc';
        $style->show();

        // Create map container
        $content = new TElement('div');
        $content->id = $this->id;
        $content->class = 'openlayers-map';

        parent::add($content);
        $this->createMap();
        parent::show();
    }


    public function addMarker($lat, $lng, $label = '')
    {
        // Garantir que os valores sejam numéricos
        $lat = (float)$lat;
        $lng = (float)$lng;

        // Sanitizar o label
        $safeLabel = addslashes($label);

        $this->javascript .= "
            /* Verifica se GeoMapApp está disponível */
            if (typeof GeoMapApp !== 'undefined' && GeoMapApp.addPin) {
                console.log('Adicionando marcador:', {lat: {$lat}, lng: {$lng}, label: '{$safeLabel}'});
                
                /* Criar objeto marker com valores numéricos */
                var marker = {
                    lat: parseFloat({$lat}),
                    lng: parseFloat({$lng}),
                    label: '{$safeLabel}'
                };
                
                /* Verificar se as coordenadas são válidas */
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
     * Add a layer to the map
     * @param string $layerName Unique name for the layer
     * @param array $config Layer configuration options
     * @return OpenLayersMap
     */
    public function addLayer($layerName, array $config = [])
    {
        // Default configuration
        $defaultConfig = [
            'type'      => 'tile',
            'visible'   => true,
            'opacity'   => 1,
            'zIndex'    => 0,
            'source'    => 'osm'
        ];

        $config = array_merge($defaultConfig, $config);

        // Generate the JavaScript code based on layer type
        switch ($config['type']) {
            case 'wms':
                $this->javascript .= $this->createWMSLayerJS($layerName, $config);
                break;

            case 'xyz':
                $this->javascript .= $this->createXYZLayerJS($layerName, $config);
                break;

            case 'vector':
                $this->javascript .= $this->createVectorLayerJS($layerName, $config);
                break;

            default: /* tile */
                $this->javascript .= $this->createTileLayerJS($layerName, $config);
        }

        return $this;
    }

    /**
     * Create JavaScript code for WMS layer
     */
    protected function createWMSLayerJS($layerName, $config)
    {
        $params = json_encode($config['params'] ?? []);
        $url = addslashes($config['url'] ?? '');
        $serverType = addslashes($config['serverType'] ?? 'geoserver');
        $crossOrigin = addslashes($config['crossOrigin'] ?? 'anonymous');

        $opacity = $config['opacity'] ?? 0.8;
        $zIndex  = $config['zIndex']  ?? 5;
        $visible = $config['visible'] ? 'true' : 'false';

        return "
            try {
                var wmsLayer = new ol.layer.Tile({
                    source: new ol.source.TileWMS({
                        url: '{$url}',
                        params: {$params},
                        serverType: '{$serverType}',
                        crossOrigin: '{$crossOrigin}',
                        transition: 0
                    }),
                    opacity: {$opacity},
                    zIndex: {$zIndex},
                    visible: {$visible}
                });
                
                /* Add layer to map */
                if (typeof GeoMapApp !== 'undefined' && GeoMapApp.getMap()) {
                    GeoMapApp.getMap().addLayer(wmsLayer);
                    console.log('WMS layer added: {$layerName}');
                } else {
                    console.error('GeoMapApp not available for adding layer');
                }
                
                /* Error handling */
                wmsLayer.getSource().on('tileloaderror', function(event) {
                    console.error('Tile load error for layer {$layerName}:', event);
                });
            } catch(e) {
                console.error('Error adding WMS layer {$layerName}:', e);
            }
        ";
    }

    /**
     * Create JavaScript code for Vector layer
     */
    protected function createVectorLayerJS($layerName, $config)
    {
        $url = addslashes($config['url'] ?? '');
        $format = addslashes($config['format'] ?? 'geojson');

        $opacity = $config['opacity'] ?? 0.8;
        $zIndex  = $config['zIndex']  ?? 5;
        $visible = $config['visible'] ? 'true' : 'false';

        // Processar estilo se fornecido
        $styleJS = 'null';
        if (!empty($config['style'])) {
            $styleJS = json_encode($config['style']);
        }

        return "
        try {
            var vectorSource = new ol.source.Vector({
                url: '{$url}',
                format: new ol.format.{$format}()
            });
            
            var vectorLayer = new ol.layer.Vector({
                source: vectorSource,
                style: {$styleJS},
                opacity: {$opacity},
                zIndex: {$zIndex},
                visible: {$visible}
            });
            
            /* Add layer to map */
            if (typeof GeoMapApp !== 'undefined' && GeoMapApp.getMap()) {
                GeoMapApp.getMap().addLayer(vectorLayer);
                console.log('Vector layer added: {$layerName}');
                
                /* Tratar erros de carregamento */
                vectorSource.on('change:state', function() {
                    if (vectorSource.getState() === 'error') {
                        console.error('Failed to load vector layer: {$layerName}');
                    }
                });
            } else {
                console.error('GeoMapApp not available for adding layer');
            }
        } catch(e) {
            console.error('Error adding Vector layer {$layerName}:', e);
        }
    ";
    }

    /**
     * Create JavaScript code for Tile layer
     */
    protected function createTileLayerJS($layerName, $config)
    {
        $opacity = $config['opacity'] ?? 0.8;
        $zIndex  = $config['zIndex']  ?? 5;
        $visible = $config['visible'] ? 'true' : 'false';

        // Configuração baseada no tipo de fonte
        switch ($config['source']) {
            case 'bing':
                $key = addslashes($config['key'] ?? '');
                $imagerySet = addslashes($config['imagerySet'] ?? 'Aerial');

                return "
                try {
                    var tileLayer = new ol.layer.Tile({
                        source: new ol.source.BingMaps({
                            key: '{$key}',
                            imagerySet: '{$imagerySet}'
                        }),
                        opacity: {$opacity},
                        zIndex: {$zIndex},
                        visible: {$visible}
                    });
                    
                    /* Add layer to map */
                    if (typeof GeoMapApp !== 'undefined' && GeoMapApp.getMap()) {
                        GeoMapApp.getMap().addLayer(tileLayer);
                        console.log('Bing Maps layer added: {$layerName}');
                    }
                } catch(e) {
                    console.error('Error adding Bing Maps layer {$layerName}:', e);
                }
            ";

            case 'mapbox':
                $accessToken = addslashes($config['accessToken'] ?? '');
                $mapId = addslashes($config['mapId'] ?? 'mapbox.streets');

                return "
                try {
                    var tileLayer = new ol.layer.Tile({
                        source: new ol.source.XYZ({
                            url: 'https://api.mapbox.com/styles/v1/mapbox/{$mapId}/tiles/{z}/{x}/{y}?access_token={$accessToken}'
                        }),
                        opacity: {$opacity},
                        zIndex: {$zIndex},
                        visible: {$visible}
                    });
                    
                    /* Add layer to map */
                    if (typeof GeoMapApp !== 'undefined' && GeoMapApp.getMap()) {
                        GeoMapApp.getMap().addLayer(tileLayer);
                        console.log('Mapbox layer added: {$layerName}');
                    }
                } catch(e) {
                    console.error('Error adding Mapbox layer {$layerName}:', e);
                }
            ";

            default: // OSM
                return "
                try {
                    var tileLayer = new ol.layer.Tile({
                        source: new ol.source.OSM(),
                        opacity: {$opacity},
                        zIndex: {$zIndex},
                        visible: {$visible}
                    });
                    
                    /* Add layer to map */
                    if (typeof GeoMapApp !== 'undefined' && GeoMapApp.getMap()) {
                        GeoMapApp.getMap().addLayer(tileLayer);
                        console.log('OSM layer added: {$layerName}');
                    }
                } catch(e) {
                    console.error('Error adding OSM layer {$layerName}:', e);
                }
            ";
        }
    }

    /**
     * Create JavaScript code for XYZ layer
     */
    protected function createXYZLayerJS($layerName, $config)
    {
        $url = addslashes($config['url'] ?? '');
        $attributions = isset($config['attributions']) ? "'" . addslashes($config['attributions']) . "'" : 'null';

        $maxZoom  = $config['maxZoom'] ?? 19;
        $minZoom  = $config['minZoom'] ?? 0;
        $tileSize = $config['tileSize'] ?? 256; // Padrão 256x256 se não especificado
        $opacity  = $config['opacity'] ?? 0.8;
        $zIndex   = $config['zIndex']  ?? 5;
        $visible  = $config['visible'] ? 'true' : 'false';

        return "
            try {
                var xyzLayer = new ol.layer.Tile({
                    source: new ol.source.XYZ({
                        url: '{$url}',
                        maxZoom: {$maxZoom},
                        minZoom: {$minZoom},
                        tileSize: {$tileSize},
                        attributions: {$attributions}
                    }),
                    opacity: {$opacity},
                    zIndex: {$zIndex},
                    visible: {$visible}
                });
                
                if (typeof GeoMapApp !== 'undefined' && GeoMapApp.getMap()) {
                    GeoMapApp.getMap().addLayer(xyzLayer);
                    console.log('XYZ layer added: {$layerName}');
                }
            } catch(e) {
                console.error('Error adding XYZ layer {$layerName}:', e);
            }
        ";
    }


    /**
     * Adiciona um mapa de calor ao mapa
     * @param array $points Array de pontos no formato [[lon, lat, intensity], ...]
     * @param array $config Configurações do heatmap (opcional)
     * @return $this
     */
    public function addHeatmap(array $points, array $config = [])
    {
        // Configurações padrão
        $defaultConfig = [
            'radius' => 15,
            'blur' => 15,
            'gradient' => ['#00f', '#0ff', '#0f0', '#ff0', '#f00'],
            'minOpacity' => 0.1,
            'maxZoom' => 18,
            'zIndex' => 10
        ];

        $config = array_merge($defaultConfig, $config);

        // Prepara os pontos no formato adequado
        $pointsJS = json_encode($points);
        $gradientJS = json_encode($config['gradient']);

        $this->javascript .= "
            try {
                if (typeof ol === 'undefined' || typeof GeoMapApp === 'undefined') {
                    throw new Error('Bibliotecas necessárias não carregadas');
                }

                /* Cria uma fonte vetorial com os pontos */
                var heatmapSource = new ol.source.Vector();
                
                /* Adiciona os pontos como features */
                var features = [];
                var points = {$pointsJS};
                
                points.forEach(function(point) {
                    var feature = new ol.Feature({
                        geometry: new ol.geom.Point(ol.proj.fromLonLat([point[0], point[1]]))
                    });
                    
                    /* Define a intensidade (weight) se fornecida */
                    if (point.length > 2) {
                        feature.set('weight', point[2]);
                    }
                    
                    features.push(feature);
                });
                
                heatmapSource.addFeatures(features);
                
                /* Cria a camada de heatmap */
                var heatmapLayer = new ol.layer.Heatmap({
                    source: heatmapSource,
                    blur: {$config['blur']},
                    radius: {$config['radius']},
                    gradient: {$gradientJS},
                    minOpacity: {$config['minOpacity']},
                    zIndex: {$config['zIndex']}
                });
                
                /* Adiciona ao mapa */
                if (GeoMapApp && GeoMapApp.getMap()) {
                    GeoMapApp.getMap().addLayer(heatmapLayer);
                    console.log('Camada de heatmap adicionada com sucesso');
                } else {
                    console.error('Não foi possível acessar o mapa principal');
                }
                
                /* Armazena a referência para possível remoção posterior */
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
                if (GeoMapApp && GeoMapApp.heatmapLayers) {
                    GeoMapApp.heatmapLayers.forEach(function(layer) {
                        if (GeoMapApp.getMap()) {
                            GeoMapApp.getMap().removeLayer(layer);
                        }
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
            DrawCircleOnLonLat({$lon}, {$lat}, {$radius}, '{$strokeColor}', '{$fillColor}');
        ";
        return $this;
    }

    public function parseGeoJson($geom)
    {
        // Primeiro decode para remover escapes (se necessário)
        $decoded = json_decode($geom);

        // Se ainda for string (caso de escapes), faz decode novamente
        if (is_string($decoded)) {
            $decoded = json_decode($decoded);
        }

        // Verifica se é um objeto válido
        if (!is_object($decoded)) {
            throw new Exception("Formato GeoJSON inválido");
        }

        // Caso FeatureCollection
        if ($decoded->type === 'FeatureCollection') {
            // Pega a primeira feature (você pode adaptar para múltiplas features se necessário)
            if (empty($decoded->features)) {
                throw new Exception("FeatureCollection sem features");
            }

            $feature = $decoded->features[0];
            return $feature->geometry; // Retorna o objeto geometry
        }
        // Caso Feature individual
        elseif ($decoded->type === 'Feature') {
            return $decoded->geometry; // Retorna o objeto geometry
        }
        // Caso direto (Geometry Object)
        else {
            return $decoded; // Retorna o próprio objeto (já é a geometria)
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

    public function HighlightAndFlyToGeom($geom, $z = 10)
    {
        try {
            // echo '<pre>';
            // print_r("HighlightAndFlyToGeom(\$geom, $z)");
            // echo '</pre>';

            /* Decodifica o JSON da geometria */
            $geoJson = json_decode($geom);

            /* Verifica se precisa decodificar novamente */
            if (is_string($geoJson)) {
                $geoJson = json_decode($geoJson);
            }

            // echo '<pre>';
            // print_r($geoJson);
            // echo '</pre>';

            /* Verifica se é uma FeatureCollection */
            if (
                $geoJson && isset($geoJson->type) && $geoJson->type === 'FeatureCollection'
                && isset($geoJson->features) && count($geoJson->features) > 0
            ) {
                $geoJson = $geoJson->features[0]; // Usa a primeira feature
            }

            /* Verifica se é um MultiLineString com features incorporadas */
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

            if ($geoJson->type === 'Polygon') {
                if (!isset($geoJson->coordinates) || !is_array($geoJson->coordinates)) {
                    throw new Exception('Estrutura de Polygon inválida');
                }
                // Verifica se tem pelo menos um anel com pelo menos 4 pontos (polígono fechado)
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

            // echo '<pre>';
            // print_r($geoJson);
            // echo '</pre>';

            // if (!$geoJson) {
            if (!$geoJson || !isset($geoJson->geometry) || !isset($geoJson->geometry->coordinates)) {
                throw new Exception('Geometria inválida. Deve ser um objeto GeoJSON válido.');
            }

            $this->javascript .= "
                try {
                    if (typeof GeoMapApp === 'undefined') {
                        throw new Error('GeoMapApp não está disponível');
                    }
                    
                    /* Cria o objeto de geometria completo */
                    var geometry = {
                        type: 'Feature',
                        geometry: " . json_encode($geoJson->geometry) . ",
                        properties: " . json_encode($geoJson->properties ?? new stdClass()) . "
                    };
                    
                    /* Destaca a geometria no mapa */
                    console.log('Destacando geometria:', geometry);
                    GeoMapApp.highlightGeometry(geometry);
                    
                    /* Calcula o ponto ideal para o popup baseado no tipo de geometria */
                    var popupAnchorPoint;
                    
                    if (typeof turf !== 'undefined') {
                        console.log('Calculando ponto ideal com turf');
    
                        try {
                            if (geometry.geometry.type === 'LineString' || geometry.geometry.type === 'MultiLineString') {
                                /* Para linhas, calcula um ponto ao longo da linha */
                                var line = geometry.geometry;
                                
                                if (geometry.geometry.type === 'MultiLineString') {
                                    /* Pega a linha mais longa do MultiLineString */
                                    var longestLine = geometry.geometry.coordinates.reduce((a, b) => 
                                        a.length > b.length ? a : b
                                    );
                                    line = { type: 'LineString', coordinates: longestLine };
                                }
                                
                                /* Calcula o ponto no meio da linha (50% do comprimento) */
                                var lineLength = turf.length(line);
                                var midpoint = turf.along(line, lineLength / 2);
                                popupAnchorPoint = midpoint.geometry.coordinates;
                                
                            } else if (geometry.geometry.type === 'Polygon' || geometry.geometry.type === 'MultiPolygon') {
                                /* Para polígonos, usa o centroide */
                                popupAnchorPoint = turf.centroid(geometry.geometry).geometry.coordinates;
                            }

                            /* console.log('popupAnchorPoint (turf): ', popupAnchorPoint); */

                        } catch (turfError) {
                            console.warn('Erro ao calcular ponto com turf:', turfError);
                        }
                    }
                    
                    /* Fallback para quando turf não estiver disponível */
                    if (!popupAnchorPoint) {
                        console.log('Calculando ponto ideal sem turf');
    
                        var coords = geometry.geometry.coordinates;
                        
                        if (geometry.geometry.type === 'MultiLineString' && coords.length > 0) {
                            var firstLine = coords[0];
                            if (firstLine.length > 0) {
                                popupAnchorPoint = firstLine[0];
                            }
                        } 
                        else if (geometry.geometry.type === 'MultiPolygon' && coords.length > 0) {
                            var firstPolygon = coords[0];
                            if (firstPolygon.length > 0 && firstPolygon[0].length > 0) {
                                popupAnchorPoint = firstPolygon[0][0];
                            }
                        }
                        else if (geometry.geometry.type === 'LineString' && coords.length > 0) {
                            popupAnchorPoint = coords[0];
                        }
                        else if (geometry.geometry.type === 'Polygon' && coords.length > 0) {
                            /* Um Polygon tem pelo menos um anel (o exterior) */
                            var exteriorRing = coords[0];
                            if (exteriorRing.length > 0) {
                                /* Pega o primeiro ponto do anel exterior */
                                popupAnchorPoint = exteriorRing[0];
                            }
                        }
                    }
                    
                    if (popupAnchorPoint && popupAnchorPoint.length === 2) {
                        var mapCoord = ol.proj.fromLonLat(popupAnchorPoint);
                        
                        /* Executa o flyTo */
                        console.log('GeoMapApp.flyTo(popupAnchorPoint, {$z});');
                        GeoMapApp.flyTo(popupAnchorPoint, $z);
                        
                        /* Exibe propriedades no popup se existirem */
                        if (geometry.properties && Object.keys(geometry.properties).length > 0) {
                            setTimeout(function() {
                                var popup = GeoMapApp.getPopup();
                                if (!popup) {
                                    popup = new ol.Overlay.Popup({
                                        element: document.getElementById('popup'),
                                        positioning: 'bottom-left',
                                        stopEvent: false,
                                        autoPan: true,
                                        autoPanAnimation: {
                                            duration: 250
                                        },
                                        offset: [0, 0] /* Ajuste fino do posicionamento */
                                    });
                                    GeoMapApp.getMap().addOverlay(popup);
                                }
                                
                                /* Cria o conteúdo do popup com estilos melhorados */
                                var popupContent = '<div class=\"ol-popup-content\" style=\"' +
                                    'background-color: white; ' +
                                    'padding: 15px; ' +
                                    'min-width: 270px; ' +
                                    'max-height: 300px; ' +
                                    'overflow-x: auto; ' +
                                    'border-radius: 5px; ' +
                                    'box-shadow: 0 3px 10px rgba(0,0,0,0.3);' +
                                    '\">';
                                
                                /* Adiciona link se existir URL */
                                if (geometry.properties.url) {
                                    let url = geometry.properties.url;
                                    console.log('URL original:', url);
                                    if (!url.startsWith('http') && !url.startsWith('index.php') && !url.startsWith('/')) {
                                        url = 'index.php?' + url;
                                    }
                                    popupContent += '<a href=\"#\" onclick=\"__adianti_load_page(\'' + url + '\'); return false;\" ' +
                                        'style=\"display: inline-block; margin-bottom: 10px; color: #0066cc;\">';
                                    popupContent += '<i class=\"fas fa-edit\"></i> Editar';
                                    popupContent += '</a><br>';
                                }
                                
                                /* Adiciona outras propriedades */
                                /*
                                for (var prop in geometry.properties) {
                                    if (geometry.properties.hasOwnProperty(prop) && prop !== 'url') {
                                        popupContent += '<div style=\"margin-bottom: 5px;\">' +
                                            '<strong style=\"color: #555;\">' + prop + ':</strong> ' +
                                            '<span style=\"color: #333;\">' + geometry.properties[prop] + '</span>' +
                                            '</div>';
                                    }
                                }
                                */
                                popupContent += '</div>';
                                
                                /* Exibe o popup */
                                /*popup.show(mapCoord, popupContent);*/
                                
                            }, 500);
                        }
                    } else {
                        console.warn('Não foi possível determinar o ponto de ancoragem para o popup', geometry);
                    }
                } catch(e) {
                    console.error('Erro em HighlightAndFlyToGeom:', e);
                }
            ";

            return $this;
        } catch (Exception $e) {
            new TMessage('error', $e->getMessage());
            return $this;
        }
    }


    public function HighlightGeom($geom, $z = 10)
    {
        $this->javascript .= "
            try {
                var geomObj = typeof {$geom} === 'string' ? JSON.parse({$geom}) : {$geom};
                if (geomObj && geomObj.geometry && geomObj.geometry.coordinates) {
                    if (typeof GeoMapApp !== 'undefined') {
                        GeoMapApp.highlightGeometry(geomObj);
                    }
                }
            } catch(e) {
                console.error('Erro ao destacar geometria:', e);
            }
        ";
        // TScript::create("$this->javascript");
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
                } else if (GeoMapApp && GeoMapApp.highlightGeometry) {
                    GeoMapApp.highlightGeometry(null);
                }
            ";
            TScript::create($this->javascript);
        } catch (Exception $e) {
            new TMessage('error', $e->getMessage());
        }
    }


    /**
     * configStroke a Geom on the Map
     * @param $strokeColor (default: 'rgba(149,31,212,1)')
     * @param $fillColor   (default: 'rgba(149,31,212,0.20)')
     */
    public function configStroke($strokeColor = 'rgba(149,31,212,1)', $fillColor = 'rgba(149,31,212,0.20)')
    {
        try {
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
        // return $this;

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
}
