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
 * @version 1.4
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
            'ol' => '6.5.0',        /* Versão do OpenLayers */
            'turf' => '5.1.6',      /* Versão do Turf.js */
            'ol-popup' => '3.0.0'   /* Versão do Popup */
        ];

        /* Adicione esta função para verificar versões */
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
        $configFieldId = $this->configFieldId ? $this->configFieldId : '';
        $showLayerControl = $this->showLayerControl ? 'true' : 'false';
        $restoreConfigData = $this->restoreConfigData ? json_encode($this->restoreConfigData) : 'null';

        /* Garante que o CSS seja carregado primeiro */
        TStyle::importFromFile('vendor/marcelonees/plugins/src/OpenLayers/ol.css');
        TStyle::importFromFile('vendor/marcelonees/plugins/src/OpenLayers/ol-popup.css');
        /* Adiciona CSS do mapa se não existir */
        TStyle::importFromFile('vendor/marcelonees/topenlayerseditor/src/OpenLayersEditor/ol-editor.css');

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
                
                /* Configuração do mapa */
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
                    highlightFillColor: '{$this->highlightFillColor}'
                };
                
                /* Inicializa o mapa */
                GeoMapApp.init(config);
                
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
        /* Set container dimensions */
        $style = new TStyle("#{$this->id}");
        $style->width = $this->width;
        $style->height = $this->height;
        $style->border = '1px solid #ccc';
        $style->show();

        /* Create map container */
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
        /* Default configuration */
        $defaultConfig = [
            'type'      => 'tile',
            'visible'   => true,
            'opacity'   => 1,
            'zIndex'    => 0,
            'source'    => 'osm',
            'title'     => $layerName
        ];

        $config = array_merge($defaultConfig, $config);

        /* Adiciona a camada via JavaScript */
        $layerConfig = json_encode($config);
        $safeName = addslashes($layerName);

        $this->javascript .= "
            /* Adiciona camada via GeoMapApp */
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
     * Remove o marcador anterior antes de adicionar o novo
     */
    public function addMarker($lat, $lng, $label = '')
    {
        /* Garantir que os valores sejam numéricos */
        $lat = (float)$lat;
        $lng = (float)$lng;

        /* Sanitizar o label */
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
                    /* Remove o marcador anterior ANTES de adicionar o novo */
                    var map = GeoMapApp.getLastMap ? GeoMapApp.getLastMap() : GeoMapApp.getMap();
                    if (map) {
                        var oldPinLayer = map.getLayers().getArray().find(function(l) { 
                            return l.get('name') === 'pin'; 
                        });
                        if (oldPinLayer) {
                            map.removeLayer(oldPinLayer);
                            console.log('🗑️ Marcador anterior removido via addMarker');
                        }
                    }
                    
                    /* Adiciona o novo marcador */
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
     * Remove o marcador anterior antes de adicionar o novo
     */
    public function addMarkerImmediate($lat, $lng, $label = '')
    {
        $lat = (float)$lat;
        $lng = (float)$lng;
        $safeLabel = addslashes($label);

        $js = "
            if (typeof GeoMapApp !== 'undefined' && GeoMapApp.addPin) {
                console.log('Adicionando marcador imediato:', {lat: {$lat}, lng: {$lng}, label: '{$safeLabel}'});
                
                var marker = {
                    lat: parseFloat({$lat}),
                    lng: parseFloat({$lng}),
                    label: '{$safeLabel}'
                };
                
                if (!isNaN(marker.lat) && !isNaN(marker.lng)) {
                    /* Remove o marcador anterior ANTES de adicionar o novo */
                    var map = GeoMapApp.getLastMap ? GeoMapApp.getLastMap() : GeoMapApp.getMap();
                    if (map) {
                        var oldPinLayer = map.getLayers().getArray().find(function(l) { 
                            return l.get('name') === 'pin'; 
                        });
                        if (oldPinLayer) {
                            map.removeLayer(oldPinLayer);
                            console.log('🗑️ Marcador anterior removido via addMarkerImmediate');
                        }
                    }
                    
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
        /* Configurações padrão */
        $defaultConfig = [
            'radius' => 15,
            'blur' => 15,
            'gradient' => ['#00f', '#0ff', '#0f0', '#ff0', '#f00'],
            'minOpacity' => 0.1,
            'maxZoom' => 18,
            'zIndex' => 10
        ];

        $config = array_merge($defaultConfig, $config);

        /* Prepara os pontos no formato adequado */
        $pointsJS = json_encode($points);
        $gradientJS = json_encode($config['gradient']);

        $this->javascript .= "
            try {
                if (typeof ol === 'undefined' || typeof GeoMapApp === 'undefined') {
                    throw new Error('Bibliotecas necessárias não carregadas');
                }

                /* Obtém o último mapa criado */
                var map = GeoMapApp.getLastMap ? GeoMapApp.getLastMap() : (GeoMapApp.getMap ? GeoMapApp.getMap() : null);
                if (!map) {
                    console.warn('⚠️ Nenhum mapa disponível para heatmap');
                    return;
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
                    zIndex: {$config['zIndex']},
                    name: 'heatmap'
                });
                
                /* Adiciona ao mapa */
                map.addLayer(heatmapLayer);
                console.log('Camada de heatmap adicionada com sucesso');
                
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
     * OPERA NO ÚLTIMO MAPA CRIADO
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
        /* Primeiro decode para remover escapes (se necessário) */
        $decoded = json_decode($geom);

        /* Se ainda for string (caso de escapes), faz decode novamente */
        if (is_string($decoded)) {
            $decoded = json_decode($decoded);
        }

        /* Verifica se é um objeto válido */
        if (!is_object($decoded)) {
            throw new Exception("Formato GeoJSON inválido");
        }

        /* Caso FeatureCollection */
        if ($decoded->type === 'FeatureCollection') {
            /* Pega a primeira feature (você pode adaptar para múltiplas features se necessário) */
            if (empty($decoded->features)) {
                throw new Exception("FeatureCollection sem features");
            }

            $feature = $decoded->features[0];
            return $feature->geometry; /* Retorna o objeto geometry */
        }
        /* Caso Feature individual */ elseif ($decoded->type === 'Feature') {
            return $decoded->geometry; /* Retorna o objeto geometry */
        }
        /* Caso direto (Geometry Object) */ else {
            return $decoded; /* Retorna o próprio objeto (já é a geometria) */
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
     * OPERA NO ÚLTIMO MAPA CRIADO COM RETRY AUTOMÁTICO
     * CORRIGIDO: Cria a camada de highlight se não existir com estilo personalizado
     */
    public function HighlightAndFlyToGeom($geom, $z = 10)
    {
        try {
            /* Decodifica o JSON da geometria */
            $geoJson = json_decode($geom);

            /* Verifica se precisa decodificar novamente */
            if (is_string($geoJson)) {
                $geoJson = json_decode($geoJson);
            }

            /* VERIFICAÇÃO CRÍTICA - Garante que $geoJson não seja null */
            if ($geoJson === null) {
                throw new Exception('Falha ao decodificar JSON da geometria. String inválida: ' . substr($geom, 0, 100));
            }

            /* Verifica se é uma FeatureCollection */
            if (
                $geoJson && isset($geoJson->type) && $geoJson->type === 'FeatureCollection'
                && isset($geoJson->features) && count($geoJson->features) > 0
            ) {
                $geoJson = $geoJson->features[0]; /* Usa a primeira feature */
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
                /* Verifica se tem pelo menos um anel com pelo menos 4 pontos (polígono fechado) */
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

            if (!$geoJson || !isset($geoJson->geometry) || !isset($geoJson->geometry->coordinates)) {
                throw new Exception('Geometria inválida. Deve ser um objeto GeoJSON válido.');
            }

            $geomString = json_encode($geoJson);
            $strokeColor = $this->highlightStrokeColor;
            $fillColor = $this->highlightFillColor;

            /* Gera o JavaScript com retry automático e CRIA a camada de highlight se não existir */
            $this->javascript .= "
                /* Função interna com retry para HighlightAndFlyToGeom */
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
                            
                            /* Estilo personalizado com as cores definidas */
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
                        
                        /* Garante que a camada de highlight existe */
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
                        
                        /* Marca como executado para evitar duplicidade */
                        executed = true;
                        
                        console.log('🔄 HighlightAndFlyToGeom - Executando no mapa:', map.getTarget());
                        
                        try {
                            /* Processa a geometria para garantir o formato correto */
                            var features = null;
                            
                            /* Se for um objeto Feature */
                            if (geomData && geomData.type === 'Feature') {
                                features = new ol.format.GeoJSON().readFeatures(geomData, {
                                    featureProjection: 'EPSG:3857'
                                });
                            } 
                            /* Se for um objeto geometry puro */
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
                                /* Tenta ler diretamente */
                                features = new ol.format.GeoJSON().readFeatures(geomData, {
                                    featureProjection: 'EPSG:3857'
                                });
                            }
                            
                            if (!features || features.length === 0) {
                                console.warn('⚠️ Nenhuma feature encontrada');
                                return;
                            }
                            
                            console.log('📐 Features encontradas:', features.length);
                            
                            /* Marca as features como customizadas */
                            features.forEach(function(f) { 
                                f.set('custom', true); 
                            });
                            
                            /* Adiciona à camada de highlight */
                            highlightLayer.getSource().clear();
                            highlightLayer.getSource().addFeatures(features);
                            console.log('✅ Geometria destacada (' + features.length + ' features)');
                            
                            /* Calcula o extent para voar */
                            var extent = ol.extent.createEmpty();
                            features.forEach(function(feature) {
                                var geomExtent = feature.getGeometry().getExtent();
                                ol.extent.extend(extent, geomExtent);
                            });
                            
                            if (!ol.extent.isEmpty(extent)) {
                                console.log('📐 Extent calculado:', extent);
                                map.getView().fit(extent, {
                                    padding: [50, 50, 50, 50],
                                    maxZoom: zoomLevel,
                                    duration: 1000
                                });
                                console.log('✅ Voo para geometria (zoom: ' + zoomLevel + ')');
                            } else {
                                console.warn('⚠️ Extent vazio, não foi possível voar');
                            }
                        } catch(e) {
                            console.error('❌ Erro em HighlightAndFlyToGeom:', e);
                            /* Se falhar, tenta novamente com retry */
                            executed = false;
                            retryCount++;
                            if (retryCount < maxRetries) {
                                console.log('⏳ Tentando novamente... ' + retryCount + '/' + maxRetries);
                                setTimeout(executeHighlightAndFly, 500);
                            }
                        }
                    }
                    
                    /* Executa com um pequeno delay inicial */
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
     * OPERA NO ÚLTIMO MAPA CRIADO
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
     * OPERA NO ÚLTIMO MAPA CRIADO
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
     * OPERA NO ÚLTIMO MAPA CRIADO
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
            /* Armazena as cores para uso futuro */
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
                
                /* Remove camada de edição anterior se existir */
                var oldLayer = map.getLayers().getArray().find(l => l.get('name') === 'edit_layer');
                if (oldLayer) {
                    map.removeLayer(oldLayer);
                }
                
                /* Cria fonte e camada de edição */
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
                
                /* Armazena referências */
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
                        
                        /* Atualiza o campo hidden */
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
