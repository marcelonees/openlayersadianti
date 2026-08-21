/**
 * OpenLayers Map Manager - 1.5
 *
 * Autor: Marcelo Barreto Nees
 * Data: 2025-02-xx
 * Descrição: Gerenciador de mapas OpenLayers com suporte a eventos, camadas,
 * salvar/restaurar configurações e controle de camadas.
 * Suporte a múltiplas instâncias - SEMPRE opera no ÚLTIMO elemento do DOM.
 * Licença: MIT
 * Dependências: OpenLayers, Turf.js
 */

(function () {
  const requiredLibs = {
    ol: () => typeof ol !== "undefined",
    turf: () => typeof turf !== "undefined",
    Popup: () => typeof Popup !== "undefined",
  };

  const missingLibs = Object.entries(requiredLibs)
    .filter(([_, check]) => !check())
    .map(([name, _]) => name);

  if (missingLibs.length > 0) {
    const errorMsg = `Falha ao carregar dependências: ${missingLibs.join(
      ", ",
    )}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  /* Módulo Principal */
  var GeoMapApp = (function () {
    if (typeof ol === "undefined") {
      console.error("OpenLayers não está carregado!");
      return null;
    }

    /* Variáveis privadas */
    let _map;
    let _popup;
    let _popupClassName;
    let _popupMethod;
    let _shouldUpdateCoords;
    let _shouldAddPin;
    let _shouldShowPopup;
    let _highlightSource;
    let _initialized = false;
    let _hoverFeatures = [];
    const _controls = {};
    const _layers = {};
    const _layerConfigs = {};
    let _pendingLayers = [];

    /* ======================================== */
    /* REGISTRO DE MÚLTIPLAS INSTÂNCIAS        */
    /* ======================================== */
    let _mapInstances = {};
    let _lastInstanceId = null;

    /* ======================================== */
    /* VARIÁVEIS PARA CONFIGURAÇÃO             */
    /* ======================================== */
    let _mapConfig = {
      layers: {},
      ui: {
        layerControlCollapsed: false,
      },
      map: {
        center: null,
        zoom: null,
      },
    };
    let _configFieldId = null;
    let _isLayerControlCollapsed = false;
    let _layerControlContainer = null;

    /* ======================================== */
    /* VARIÁVEIS PARA CONTROLE DE HIGHLIGHT    */
    /* ======================================== */
    let _highlightConfig = {
      enabled: true,
      layerName: "view_territorio_censo",
      minZoom: 15,
      wfsUrl: "https://geo.jaraguadosul.sc.gov.br/gs/geoserver-main/PMJS/wms",
    };
    let _highlightActive = false;
    let _wfsRequestTimer = null;
    let _lastWfsData = null;

    /* Mapeamento de ícones Font Awesome para caracteres */
    const _iconMap = {
      "fa fa-map-marker-alt": "",
      "fa fa-store": "",
      "fa fa-home": "",
      "fa fa-utensils": "",
      "fa fa-wrench": "",
      "fa fa-hospital": "",
      "fa fa-school": "",
      "fa fa-building": "",
      "fa fa-tree": "",
      "fa fa-car": "",
      "fa fa-bus": "",
      "fa fa-bicycle": "",
      "fa fa-camera": "",
      "fa fa-coffee": "",
      "fa fa-cutlery": "",
      "fa fa-diamond": "",
      "fa fa-fire": "",
      "fa fa-flag": "",
      "fa fa-flask": "",
      "fa fa-futbol": "",
      "fa fa-gift": "",
      "fa fa-glass": "",
      "fa fa-heart": "",
      "fa fa-key": "",
      "fa fa-leaf": "",
      "fa fa-music": "",
      "fa fa-paw": "",
      "fa fa-phone": "",
      "fa fa-plane": "",
      "fa fa-rocket": "",
      "fa fa-shopping-cart": "",
      "fa fa-star": "",
      "fa fa-sun": "",
      "fa fa-tag": "",
      "fa fa-thumbs-up": "",
      "fa fa-trophy": "",
      "fa fa-truck": "",
      "fa fa-umbrella": "",
      "fa fa-university": "",
      "fa fa-user": "",
      "fa fa-users": "",
      "fa fa-video": "",
      "fa fa-volume-up": "",
      "fa fa-wifi": "",
    };

    /* Estilos centralizados */
    const _styles = {
      highlightImovel: new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: "#efb800",
          width: 4,
        }),
        fill: new ol.style.Fill({
          color: "rgba(249,252,78,0.1)",
        }),
      }),
      defaultMarker: new ol.style.Style({
        image: new ol.style.Icon({
          anchor: [0.5, 1],
          src: "vendor/marcelonees/plugins/src/OpenLayers/marker-icon.png",
          scale: 0.5,
        }),
      }),
      markerLabel: new ol.style.Style({
        text: new ol.style.Text({
          font: "12px Calibri,sans-serif",
          overflow: true,
          fill: new ol.style.Fill({
            color: "#000",
          }),
          stroke: new ol.style.Stroke({
            color: "#fff",
            width: 3,
          }),
          offsetY: -12,
        }),
      }),
      activityFeature: {
        A: new ol.style.Style({
          stroke: new ol.style.Stroke({ color: "black", width: 1 }),
          fill: new ol.style.Fill({ color: "rgba(87,213,87,1)" }),
        }),
        I: new ol.style.Style({
          stroke: new ol.style.Stroke({ color: "black", width: 1 }),
          fill: new ol.style.Fill({ color: "rgba(204,229,255,1)" }),
        }),
        F: new ol.style.Style({
          stroke: new ol.style.Stroke({ color: "black", width: 1 }),
          fill: new ol.style.Fill({ color: "rgba(226,227,229,1)" }),
        }),
        default: new ol.style.Style({
          stroke: new ol.style.Stroke({ color: "black", width: 1 }),
          fill: new ol.style.Fill({ color: "rgba(244,67,54,1)" }),
        }),
      },
    };

    /* ======================================== */
    /* FUNÇÕES AUXILIARES                      */
    /* ======================================== */

    function _getLastElement(selector) {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) return null;
      return elements[elements.length - 1];
    }

    function _getLastElementValue(selector) {
      const el = _getLastElement(selector);
      return el ? el.value : null;
    }

    function _getLastMapInstance() {
      const keys = Object.keys(_mapInstances);
      if (keys.length === 0) return null;
      const lastKey = keys[keys.length - 1];
      return _mapInstances[lastKey];
    }

    function _getLastMap() {
      const instance = _getLastMapInstance();
      return instance ? instance.map : null;
    }

    function _getLastHighlightSource() {
      const instance = _getLastMapInstance();
      return instance ? instance.highlightSource : null;
    }

    function _getLastPopup() {
      const instance = _getLastMapInstance();
      return instance ? instance.popup : null;
    }

    /**
     * Cria um canvas com ícone Font Awesome
     */
    function _createIconCanvas(iconClass, color = "#e74c3c", size = 32) {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");

      // Fundo circular branco
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 2, 0, 2 * Math.PI);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Ícone
      ctx.fillStyle = color;
      ctx.font = `${size - 8}px FontAwesome`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Extrai a classe do ícone
      let iconChar = ""; // padrão (fa-flag)

      if (iconClass) {
        // Tenta encontrar o caractere correspondente
        for (const [key, value] of Object.entries(_iconMap)) {
          if (
            iconClass.includes(key) ||
            iconClass.includes(key.replace("fa ", ""))
          ) {
            iconChar = value;
            break;
          }
        }

        // Extrai a cor do estilo inline se presente
        const colorMatch = iconClass.match(/color:\s*([^;]+)/);
        if (colorMatch) {
          ctx.fillStyle = colorMatch[1].trim();
          ctx.strokeStyle = colorMatch[1].trim();
        }
      }

      ctx.fillText(iconChar, size / 2, size / 2 + 1);

      return canvas;
    }

    /* ======================================== */
    /* MÉTODOS DE CONTROLE DE HIGHLIGHT        */
    /* ======================================== */

    function _setHighlightEnabled(enabled) {
      _highlightConfig.enabled = enabled;

      if (_controls.featureInspect) {
        if (enabled) {
          _controls.featureInspect.enable();
        } else {
          _controls.featureInspect.disable();
        }
      }

      if (!enabled && _highlightSource) {
        _highlightSource.clear();
        _highlightActive = false;
        console.log("🎯 Highlight desativado");
      } else if (enabled && _map) {
        _updateHighlightFeatures();
        console.log("🎯 Highlight ativado");
      }

      return _highlightConfig.enabled;
    }

    function _setHighlightLayer(layerName) {
      _highlightConfig.layerName = layerName;
      if (_highlightConfig.enabled) {
        _updateHighlightFeatures();
      }
      console.log("🎯 Camada de highlight alterada para:", layerName);
      return _highlightConfig.layerName;
    }

    function _setHighlightMinZoom(minZoom) {
      _highlightConfig.minZoom = minZoom;
      if (_highlightConfig.enabled) {
        _updateHighlightFeatures();
      }
      console.log("🎯 Zoom mínimo do highlight alterado para:", minZoom);
      return _highlightConfig.minZoom;
    }

    function _setHighlightWfsUrl(url) {
      _highlightConfig.wfsUrl = url;
      if (_highlightConfig.enabled) {
        _updateHighlightFeatures();
      }
      console.log("🎯 URL do WFS alterada para:", url);
      return _highlightConfig.wfsUrl;
    }

    function _configureHighlight(options) {
      if (options.enabled !== undefined) {
        _setHighlightEnabled(options.enabled);
      }
      if (options.layerName) {
        _setHighlightLayer(options.layerName);
      }
      if (options.minZoom !== undefined) {
        _setHighlightMinZoom(options.minZoom);
      }
      if (options.wfsUrl) {
        _setHighlightWfsUrl(options.wfsUrl);
      }
    }

    function _updateHighlightFeatures() {
      if (!_highlightConfig.enabled) {
        if (_highlightSource) {
          _highlightSource.clear();
          _highlightActive = false;
        }
        return;
      }

      if (!_map) {
        return;
      }

      const currentZoom = _map.getView().getZoom();

      if (currentZoom < _highlightConfig.minZoom) {
        if (_highlightSource) {
          _highlightSource.clear();
          _highlightActive = false;
        }
        return;
      }

      if (_wfsRequestTimer) {
        clearTimeout(_wfsRequestTimer);
        _wfsRequestTimer = null;
      }

      _wfsRequestTimer = setTimeout(function () {
        _fetchWfsFeatures();
      }, 500);
    }

    function _fetchWfsFeatures() {
      if (!_highlightConfig.enabled) {
        console.log("🎯 Highlight desabilitado, ignorando requisição WFS");
        return;
      }

      if (!_map) {
        console.log("⚠️ Mapa não disponível para requisição WFS");
        return;
      }

      const currentZoom = _map.getView().getZoom();
      if (currentZoom < _highlightConfig.minZoom) {
        console.log("🎯 Zoom abaixo do mínimo, ignorando requisição WFS");
        return;
      }

      console.log(
        "🔄 Buscando dados WFS da camada:",
        _highlightConfig.layerName,
      );

      const extent = _map.getView().calculateExtent(_map.getSize());
      const bbox = extent.join(",") + ", EPSG:3857";

      $.ajax({
        url: _highlightConfig.wfsUrl,
        type: "POST",
        data: {
          service: "WFS",
          request: "GetFeature",
          typeNames: _highlightConfig.layerName,
          version: "2.0.0",
          srsName: "EPSG:4326",
          outputFormat: "application/json",
          bbox: bbox,
        },
        success: function (data) {
          if (!_highlightConfig.enabled) {
            console.log(
              "🎯 Highlight desabilitado durante a requisição, ignorando resposta",
            );
            return;
          }

          try {
            const features = new ol.format.GeoJSON().readFeatures(data, {
              featureProjection: "EPSG:3857",
            });

            if (_highlightSource) {
              _highlightSource.clear();
              _highlightSource.addFeatures(features);
              _lastWfsData = data;
              _highlightActive = true;
              console.log(
                "✅ Highlight atualizado:",
                features.length,
                "features",
              );
            }
          } catch (e) {
            console.error("Erro ao processar features WFS:", e);
          }
        },
        error: function (xhr, status, error) {
          console.warn("⚠️ Erro ao buscar dados WFS:", error);
        },
      });
    }

    /* Métodos privados de inicialização */
    function _initMap(config) {
      if (_initialized) return;
      _initialized = true;

      console.log("_initMap - config");
      console.log(config);

      /* Configuração de highlight */
      if (config.highlight) {
        if (config.highlight.enabled !== undefined) {
          _highlightConfig.enabled = config.highlight.enabled;
        }
        if (config.highlight.layerName) {
          _highlightConfig.layerName = config.highlight.layerName;
        }
        if (config.highlight.minZoom !== undefined) {
          _highlightConfig.minZoom = config.highlight.minZoom;
        }
        if (config.highlight.wfsUrl) {
          _highlightConfig.wfsUrl = config.highlight.wfsUrl;
        }
      }

      console.log("🎯 Configuração de highlight:", _highlightConfig);

      /* Configuração de visibilidade do controle de camadas */
      let layerControlVisible = true;
      if (config.layerControlVisible !== undefined) {
        layerControlVisible = config.layerControlVisible;
      }

      console.log("🎯 Controle de camadas visível:", layerControlVisible);

      /* Armazena configurações do mapa */
      if (config.configField) {
        _configFieldId = config.configField;
      }

      try {
        _map = new ol.Map({
          target: config.target,
          layers: [],
          view: new ol.View({
            center: ol.proj.fromLonLat([config.center.lng, config.center.lat]),
            zoom: config.zoom,
          }),
          controls: ol.control
            .defaults({ attribution: false })
            .extend([new ol.control.ScaleLine(), new ol.control.FullScreen()]),
        });

        _initHighlightLayer();
        _initPopup();
        _initControls();
        _setupEventListeners();

        /* Registra a instância do mapa */
        if (config.target) {
          _mapInstances[config.target] = {
            id: config.target,
            map: _map,
            popup: _popup,
            highlightSource: _highlightSource,
            layers: _layers,
            layerConfigs: _layerConfigs,
            configFieldId: _configFieldId,
            mapConfig: _mapConfig,
            isLayerControlCollapsed: _isLayerControlCollapsed,
            layerControlContainer: _layerControlContainer,
            highlightConfig: _highlightConfig,
          };
          _lastInstanceId = config.target;
          console.log(`✅ Instância do mapa registrada: ${config.target}`);
        }

        /* Processa camadas pendentes */
        if (_pendingLayers.length > 0) {
          console.log(
            "📌 Processando camadas pendentes:",
            _pendingLayers.length,
          );
          _pendingLayers.forEach(function (layerData) {
            _addLayerInternal(layerData.name, layerData.config);
          });
          _pendingLayers = [];
        }

        /* Adiciona controle de camadas se configurado */
        if (config.showLayerControl !== false) {
          _addLayerControl();
          /* Aplica a visibilidade inicial */
          if (!layerControlVisible && _layerControlContainer) {
            _layerControlContainer.style.display = "none";
          }
        }

        /* Restaura configurações se fornecidas */
        if (config.restoreConfig) {
          setTimeout(function () {
            _restoreMapConfig(config.restoreConfig);
          }, 1);
        }

        /* Inicializa o highlight se estiver habilitado */
        if (_highlightConfig.enabled) {
          setTimeout(function () {
            _updateHighlightFeatures();
          }, 500);
        } else {
          console.log("🎯 Highlight desabilitado na inicialização");
          if (_highlightSource) {
            _highlightSource.clear();
            _highlightActive = false;
          }
        }

        console.log("Map initialized successfully");
      } catch (error) {
        console.error("Map initialization failed:", error);
      }
    }

    /* ======================================== */
    /* MÉTODO INTERNO PARA ADICIONAR CAMADAS   */
    /* ======================================== */

    function _addLayerInternal(name, config) {
      console.log("_addLayerInternal", name, config);

      if (!_map) {
        console.warn("⚠️ Mapa não inicializado, adicionando à fila:", name);
        _pendingLayers.push({ name: name, config: config });
        return;
      }

      let layer = null;
      const layerConfig = {
        name: name,
        title: config.title || name,
        visible: config.visible !== false,
        opacity: config.opacity || 1.0,
        zIndex: config.zIndex || 0,
      };

      try {
        switch (config.type) {
          case "wms":
            const wmsParams = config.params || {};
            if (!wmsParams.LAYERS) {
              wmsParams.LAYERS = name;
            }

            layer = new ol.layer.Tile({
              name: name,
              title: layerConfig.title,
              source: new ol.source.TileWMS({
                url: config.url,
                params: wmsParams,
                serverType: config.serverType || "geoserver",
                crossOrigin: config.crossOrigin || "anonymous",
                transition: 0,
              }),
              visible: layerConfig.visible,
              opacity: layerConfig.opacity,
              zIndex: layerConfig.zIndex,
            });
            break;

          case "xyz":
            layer = new ol.layer.Tile({
              name: name,
              title: layerConfig.title,
              source: new ol.source.XYZ({
                url: config.url,
                maxZoom: config.maxZoom || 19,
                minZoom: config.minZoom || 0,
                tileSize: config.tileSize || 256,
                attributions: config.attributions || null,
              }),
              visible: layerConfig.visible,
              opacity: layerConfig.opacity,
              zIndex: layerConfig.zIndex,
            });
            break;

          case "vector":
            layer = new ol.layer.Vector({
              name: name,
              title: layerConfig.title,
              source: new ol.source.Vector({
                url: config.url,
                format: new ol.format.GeoJSON(),
              }),
              style: config.style || null,
              visible: layerConfig.visible,
              opacity: layerConfig.opacity,
              zIndex: layerConfig.zIndex,
            });
            break;

          case "tile":
          default:
            layer = new ol.layer.Tile({
              name: name,
              title: layerConfig.title,
              source: new ol.source.OSM(),
              visible: layerConfig.visible,
              opacity: layerConfig.opacity,
              zIndex: layerConfig.zIndex,
            });
            break;
        }

        if (layer) {
          _map.addLayer(layer);
          _layers[name] = layer;
          _layerConfigs[name] = layerConfig;
          console.log(`✅ Camada adicionada: ${name} (${layerConfig.title})`);

          _updateLayerControl();
          _updateConfigField();
        } else {
          console.error(`❌ Falha ao criar camada: ${name}`);
        }
      } catch (e) {
        console.error(`❌ Erro ao adicionar camada ${name}:`, e);
      }
    }

    function _updateLayerControl() {
      if (_layerControlContainer) {
        _layerControlContainer.remove();
        _layerControlContainer = null;
      }

      if (_map && _initialized) {
        _addLayerControl();
      }
    }

    function _setupEventListeners() {
      if (!_map) return;

      console.log("_setupEventListeners - setting up");

      _map.un("click", _handleMapClick);
      _map.un("pointermove", _handlePointerMove);
      _map.un("moveend", _handleMapMoveEnd);

      _map.on("click", _handleMapClick);
      _map.on("pointermove", _handlePointerMove);
      _map.on("moveend", _handleMapMoveEnd);

      console.log("_setupEventListeners - completed");
    }

    /* ======================================== */
    /* MÉTODOS PARA CONFIGURAÇÃO               */
    /* ======================================== */

    function _handleMapMoveEnd() {
      _updateConfigField();
      if (_highlightConfig.enabled) {
        _updateHighlightFeatures();
      } else if (_highlightSource) {
        _highlightSource.clear();
        _highlightActive = false;
      }
    }

    function _updateConfigField() {
      if (!_configFieldId) return;

      const field = _getLastElement("#" + _configFieldId);
      if (!field) {
        console.warn(
          "⚠️ Campo de configuração não encontrado:",
          _configFieldId,
        );
        return;
      }

      if (_map) {
        const view = _map.getView();
        const center = view.getCenter();
        _mapConfig.map.center = center;
        _mapConfig.map.zoom = view.getZoom();
      }

      _map
        .getLayers()
        .getArray()
        .forEach(function (layer) {
          const name = layer.get("name");
          const title = layer.get("title") || name;
          if (
            name &&
            name !== "highlight" &&
            name !== "pin" &&
            name !== "edit_layer"
          ) {
            if (!_mapConfig.layers[name]) {
              _mapConfig.layers[name] = {
                title: title,
              };
            }
            _mapConfig.layers[name].visible = layer.getVisible();
            _mapConfig.layers[name].opacity = layer.getOpacity();
          }
        });

      _mapConfig.ui.layerControlCollapsed = _isLayerControlCollapsed;

      field.value = JSON.stringify(_mapConfig);
      field.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function _restoreMapConfig(configData) {
      if (!configData) {
        console.log("⚠️ Nenhum dado de configuração para restaurar");
        return;
      }

      console.log("📌 Restaurando configurações do mapa");

      try {
        const config =
          typeof configData === "string" ? JSON.parse(configData) : configData;

        if (config.layers) {
          Object.keys(config.layers).forEach(function (name) {
            const settings = config.layers[name];
            const layer = _map
              .getLayers()
              .getArray()
              .find(function (l) {
                return l.get("name") === name;
              });

            if (layer) {
              if (settings.visible !== undefined) {
                layer.setVisible(settings.visible);
              }
              if (settings.opacity !== undefined) {
                layer.setOpacity(settings.opacity);
              }

              const checkbox = _getLastElement("#layer_chk_" + name);
              if (checkbox) {
                checkbox.checked = settings.visible !== false;
              }

              const slider = _getLastElement("#layer_opacity_" + name);
              if (slider) {
                slider.value = Math.round((settings.opacity || 1) * 100);
                const label = slider.parentNode.querySelector("span");
                if (label) {
                  label.textContent =
                    Math.round((settings.opacity || 1) * 100) + "%";
                }
              }
            }
          });
        }

        if (config.ui && config.ui.layerControlCollapsed !== undefined) {
          _isLayerControlCollapsed = config.ui.layerControlCollapsed;
          const bodyEl = _getLastElement("#layer_control_body");
          const icon = _getLastElement("#layer_toggle_btn i");

          if (bodyEl && icon) {
            if (_isLayerControlCollapsed) {
              bodyEl.style.display = "none";
              icon.className = "fas fa-chevron-down";
            } else {
              bodyEl.style.display = "block";
              icon.className = "fas fa-chevron-up";
            }
          }
        }

        console.log("✅ Configurações restauradas com sucesso");
      } catch (e) {
        console.error("❌ Erro ao restaurar configurações:", e);
      }
    }

    /* ======================================== */
    /* CONTROLE DE CAMADAS                     */
    /* ======================================== */

    function _addLayerControl() {
      const container = document.createElement("div");
      container.id = "layer_control_container";
      container.className = "ol-editor-layer-control";
      container.style.cssText = `
            position: absolute;
            bottom: 10px;
            right: 10px;
            z-index: 1000;
            background: white;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            min-width: 200px;
            max-height: 350px;
            overflow: hidden;
            font-family: Arial, sans-serif;
            font-size: 12px;
            cursor: default;
        `;

      const header = document.createElement("div");
      header.id = "layer_control_header";
      header.className = "ol-editor-layer-control-header";
      header.style.cssText = `
            padding: 8px 12px;
            background: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
            font-weight: bold;
            cursor: move;
            display: flex;
            justify-content: space-between;
            align-items: center;
            user-select: none;
        `;

      const leftPart = document.createElement("span");
      leftPart.className = "ol-editor-layer-control-left";
      leftPart.innerHTML =
        '<span class="ol-editor-layer-control-grip"><span><i class="fas fa-layer-group"></i> Camadas</span>';
      header.appendChild(leftPart);

      const toggleBtn = document.createElement("span");
      toggleBtn.id = "layer_toggle_btn";
      toggleBtn.className = "ol-editor-layer-control-toggle";
      toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
      toggleBtn.style.cssText =
        "cursor: pointer; padding: 0 5px; font-size: 14px;";
      header.appendChild(toggleBtn);

      container.appendChild(header);

      const body = document.createElement("div");
      body.id = "layer_control_body";
      body.className = "ol-editor-layer-control-body";
      body.style.cssText =
        "padding: 5px 10px; max-height: 280px; overflow-y: auto;";
      container.appendChild(body);

      _map
        .getLayers()
        .getArray()
        .forEach(function (layer) {
          const name = layer.get("name");
          const title = layer.get("title") || name;

          if (
            !name ||
            name === "highlight" ||
            name === "pin" ||
            name === "edit_layer"
          )
            return;

          const item = document.createElement("div");
          item.className = "ol-editor-layer-control-item";
          item.style.cssText =
            "padding: 4px 0; display: flex; align-items: center; border-bottom: 1px solid #f1f3f5;";

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.checked = layer.getVisible() !== false;
          checkbox.className = "ol-editor-layer-control-checkbox";
          checkbox.id = "layer_chk_" + name;
          checkbox.style.cssText = "margin-right: 8px; cursor: pointer;";

          checkbox.onchange = function (e) {
            const isChecked = this.checked;
            layer.setVisible(isChecked);
            console.log(
              `🔄 Camada ${title} ${isChecked ? "ativada" : "desativada"}`,
            );

            const opacitySlider = _getLastElement("#layer_opacity_" + name);
            if (opacitySlider) {
              opacitySlider.disabled = !isChecked;
              opacitySlider.style.opacity = isChecked ? "1" : "0.5";
            }

            _updateConfigField();
          };
          item.appendChild(checkbox);

          const label = document.createElement("label");
          label.htmlFor = "layer_chk_" + name;
          label.className = "ol-editor-layer-control-label";
          label.textContent = title;
          label.style.cssText =
            "flex: 1; cursor: pointer; font-size: 12px; color: #333;";
          item.appendChild(label);

          const opacityContainer = document.createElement("div");
          opacityContainer.className = "ol-editor-layer-control-opacity";
          opacityContainer.style.cssText =
            "display: flex; align-items: center; gap: 5px; margin-left: 5px;";

          const opacityLabel = document.createElement("span");
          opacityLabel.className = "ol-editor-layer-control-opacity-label";
          const opacity = layer.getOpacity() || 1;
          opacityLabel.textContent = Math.round(opacity * 100) + "%";
          opacityLabel.style.cssText =
            "font-size: 10px; color: #6c757d; min-width: 30px; text-align: right;";
          opacityContainer.appendChild(opacityLabel);

          const opacityInput = document.createElement("input");
          opacityInput.type = "range";
          opacityInput.min = "0";
          opacityInput.max = "100";
          opacityInput.value = Math.round(opacity * 100);
          opacityInput.className = "ol-editor-layer-control-opacity-slider";
          opacityInput.id = "layer_opacity_" + name;
          opacityInput.disabled = !layer.getVisible();
          opacityInput.style.cssText = `
                width: 60px;
                height: 4px;
                cursor: pointer;
            `;
          if (!layer.getVisible()) {
            opacityInput.style.opacity = "0.5";
          }

          opacityInput.oninput = function () {
            const value = parseInt(this.value) / 100;
            layer.setOpacity(value);
            const label = this.parentNode.querySelector("span");
            if (label) {
              label.textContent = Math.round(value * 100) + "%";
            }
          };

          opacityInput.onchange = function () {
            _updateConfigField();
          };
          opacityContainer.appendChild(opacityInput);

          item.appendChild(opacityContainer);
          body.appendChild(item);
        });

      if (body.children.length === 0) {
        const emptyMsg = document.createElement("div");
        emptyMsg.className = "ol-editor-layer-control-empty";
        emptyMsg.textContent = "Nenhuma camada configurada";
        emptyMsg.style.cssText =
          "padding: 10px; color: #6c757d; text-align: center;";
        body.appendChild(emptyMsg);
      }

      function toggleLayerControl() {
        const bodyEl = _getLastElement("#layer_control_body");
        const icon = _getLastElement("#layer_toggle_btn i");

        if (!bodyEl || !icon) return;

        if (bodyEl.style.display === "none") {
          bodyEl.style.display = "block";
          icon.className = "fas fa-chevron-up";
          _isLayerControlCollapsed = false;
        } else {
          bodyEl.style.display = "none";
          icon.className = "fas fa-chevron-down";
          _isLayerControlCollapsed = true;
        }
        _updateConfigField();
      }

      toggleBtn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleLayerControl();
      };

      header.onclick = function (e) {
        if (e.target === toggleBtn || toggleBtn.contains(e.target)) {
          return;
        }
        toggleLayerControl();
      };

      let isDragging = false;
      let offsetX, offsetY;

      header.addEventListener("mousedown", function (e) {
        if (e.target === toggleBtn || toggleBtn.contains(e.target)) {
          return;
        }

        isDragging = true;
        const rect = container.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        container.style.cursor = "grabbing";
        container.style.transition = "none";
        e.preventDefault();
      });

      document.addEventListener("mousemove", function (e) {
        if (!isDragging) return;

        const mapContainer = document.getElementById(_map.getTarget());
        if (!mapContainer) return;

        const mapRect = mapContainer.getBoundingClientRect();

        let newX = e.clientX - mapRect.left - offsetX;
        let newY = e.clientY - mapRect.top - offsetY;

        newX = Math.max(
          0,
          Math.min(mapRect.width - container.offsetWidth, newX),
        );
        newY = Math.max(
          0,
          Math.min(mapRect.height - container.offsetHeight, newY),
        );

        container.style.left = newX + "px";
        container.style.top = newY + "px";
        container.style.bottom = "auto";
        container.style.right = "auto";
      });

      document.addEventListener("mouseup", function () {
        if (isDragging) {
          isDragging = false;
          container.style.cursor = "default";
          container.style.transition = "all 0.1s ease";
        }
      });

      const mapContainer = document.getElementById(_map.getTarget());
      if (mapContainer) {
        mapContainer.appendChild(container);
        _layerControlContainer = container;
      }
    }

    function _initHighlightLayer() {
      console.log("/* INICIALIZANDO CAMADA DE DESTAQUE */");
      _highlightSource = new ol.source.Vector({
        format: new ol.format.GeoJSON(),
      });

      let customStrokeColor = "rgba(149,31,212,1)";
      let customFillColor = "rgba(149,31,212,0.20)";

      const highlightLayer = new ol.layer.Vector({
        source: _highlightSource,
        style: function (feature) {
          const isCustom = feature.get("custom");
          const control = feature.get("control");
          const geometry = feature.getGeometry();
          const isPoint = geometry && geometry.getType() === "Point";
          const label = feature.get("label") || "";
          const iconClass = feature.get("icon") || "";

          if (isPoint && isCustom) {
            // Se tem ícone, usa o canvas com ícone
            if (iconClass) {
              const canvas = _createIconCanvas(iconClass);
              return new ol.style.Style({
                image: new ol.style.Icon({
                  img: canvas,
                  imgSize: [canvas.width, canvas.height],
                  anchor: [0.5, 1],
                  scale: 1,
                }),
                text: new ol.style.Text({
                  font: "12px Calibri,sans-serif",
                  text: label,
                  fill: new ol.style.Fill({
                    color: "#000",
                  }),
                  stroke: new ol.style.Stroke({
                    color: "#fff",
                    width: 3,
                  }),
                  offsetY: -20,
                  textAlign: "center",
                  textBaseline: "bottom",
                }),
              });
            }

            // Fallback para marcador padrão
            return new ol.style.Style({
              image: new ol.style.Icon({
                anchor: [0.5, 1],
                src: "vendor/marcelonees/plugins/src/OpenLayers/marker-icon.png",
                scale: 0.5,
              }),
              text: new ol.style.Text({
                font: "12px Calibri,sans-serif",
                text: label,
                fill: new ol.style.Fill({
                  color: "#000",
                }),
                stroke: new ol.style.Stroke({
                  color: "#fff",
                  width: 3,
                }),
                offsetY: -12,
                textAlign: "center",
                textBaseline: "bottom",
              }),
            });
          }

          if (isCustom) {
            return new ol.style.Style({
              stroke: new ol.style.Stroke({
                color: customStrokeColor,
                width: 3,
              }),
              fill: new ol.style.Fill({
                color: customFillColor,
              }),
            });
          }

          if (control === "VigEpiMinhasAtividades") {
            const classe = feature.get("class") || "default";
            return _styles.activityFeature[classe];
          }

          return new ol.style.Style({
            stroke: new ol.style.Stroke({
              width: 0.1,
            }),
          });
        },
      });

      highlightLayer.setZIndex(7);
      _map.addLayer(highlightLayer);
      _layers.highlight = highlightLayer;

      window._updateHighlightStyle = function (strokeColor, fillColor) {
        console.log("/* ATUALIZANDO ESTILO PERSONALIZADO */", {
          strokeColor,
          fillColor,
        });
        customStrokeColor = strokeColor;
        customFillColor = fillColor;

        _highlightSource
          .getFeatures()
          .filter(
            (f) => f.get("custom") && f.getGeometry().getType() !== "Point",
          )
          .forEach((f) => f.setStyle(null));
      };
    }

    function _initPopup() {
      console.log("_initPopup");
      try {
        if (typeof Popup === "undefined") {
          throw new Error("Popup library not loaded");
        }

        _popup = new Popup({
          width: "350px",
          positioning: "bottom-center",
          stopEvent: false,
          autoPan: true,
          autoPanAnimation: {
            duration: 250,
          },
        });

        if (typeof _popup.show !== "function") {
          _popup.show = function (coords, content) {
            this.setPosition(coords);
            this.setElement(content);
          };
        }

        _map.addOverlay(_popup);
      } catch (e) {
        console.error("Popup initialization failed:", e);
        _popup = new ol.Overlay({
          element: document.createElement("div"),
          autoPan: true,
          autoPanAnimation: {
            duration: 250,
          },
        });
        _popup.setPosition(undefined);
        _map.addOverlay(_popup);

        _popup.show = function (coords, content) {
          if (typeof content === "string") {
            this.getElement().innerHTML = content;
          } else {
            this.getElement().appendChild(content);
          }
          this.setPosition(coords);
        };
      }
    }

    function _initControls() {
      console.log("_initControls");
      console.log("🎯 Highlight enabled:", _highlightConfig.enabled);

      try {
        _controls.mousePosition = new MousePositionControl();
        _map.addControl(_controls.mousePosition);

        if (_highlightConfig.enabled) {
          console.log(
            "🎯 Criando FeatureInspectControl (highlight habilitado)",
          );
          _controls.featureInspect = new FeatureInspectControl();
          _map.addControl(_controls.featureInspect);

          if (_map && _controls.featureInspect) {
            setTimeout(() => {
              try {
                _controls.featureInspect.enable();
              } catch (e) {
                console.error("Error enabling feature inspect:", e);
              }
            }, 300);
          }
        } else {
          console.log(
            "🎯 Highlight desabilitado - FeatureInspectControl NÃO será criado",
          );
          _controls.featureInspect = null;
        }
      } catch (e) {
        console.error("Error initializing controls:", e);
      }
    }

    /* Métodos de manipulação de eventos */
    function _handleMapClick(e) {
      try {
        console.log("_handleMapClick", e);

        const urlParams = new URLSearchParams(window.location.search);
        const params = {};

        urlParams.forEach((value, key) => {
          const match = key.match(/^(\d+)\[(.+)\]$/);
          if (match) {
            const index = match[1];
            const paramName = match[2];
            if (!params[index]) params[index] = {};
            params[index][paramName] = value;
          } else {
            params[key] = value;
          }
        });
        console.log("Parâmetros processados:", params);

        const config = params["0"] || {};
        console.log("config", config);

        const shouldUpdateCoords = _map._shouldUpdateCoords;
        const shouldAddPin = _map._shouldAddPin;
        const shouldShowPopup = _map._shouldShowPopup;
        const popupClassName = _map._popupClassName;
        const popupMethod = _map._popupMethod;

        console.log("Configurações:", {
          shouldUpdateCoords: shouldUpdateCoords,
          shouldAddPin: shouldAddPin,
          shouldShowPopup: shouldShowPopup,
          popupClassName: popupClassName,
          popupMethod: popupMethod,
        });

        const coordinate = _transformCoordinate(e.coordinate);
        const feature = _getFeatureAtPixel(e.pixel);

        if (!feature) {
          console.log("Nenhuma feature encontrada no clique");
          return;
        }

        const featureData = feature.values_;
        console.log("Feature data:", featureData);

        if (shouldUpdateCoords) {
          console.log("Atualizando coordenadas nos campos do formulário");
          _updateCoordinateFields(coordinate);
        }

        if (shouldAddPin) {
          console.log("Adicionando marcador no mapa");

          const highlightLayer = _map
            .getLayers()
            .getArray()
            .find(function (l) {
              return l.get("name") === "highlight";
            });

          if (highlightLayer && highlightLayer.getSource()) {
            const source = highlightLayer.getSource();
            const features = source.getFeatures();

            features.forEach(function (f) {
              if (f.get("custom") && f.getGeometry().getType() === "Point") {
                source.removeFeature(f);
              }
            });
          } else {
            console.warn("⚠️ Camada highlight não encontrada ou sem source");
          }

          _addPin({ lat: coordinate.lng, lng: coordinate.lat }, false, true);
        }

        if (
          (shouldShowPopup || featureData.url) &&
          _popup &&
          typeof _popup.show === "function"
        ) {
          if (!coordinate || isNaN(coordinate.lat) || isNaN(coordinate.lng)) {
            console.error("Coordenadas inválidas para popup:", coordinate);
            return;
          }

          if (featureData.url) {
            console.log("Mostrando popup com URL da feature:", featureData.url);
            _showPopupWithLoader(coordinate, featureData.url);
          } else {
            if (featureData.control) {
              console.log("Mostrando popup com controle:", featureData.control);

              _showPopupWithLoader(
                coordinate,
                `class=${featureData.control}&method=${popupMethod}` +
                  `&lat=${coordinate.lat}&lng=${coordinate.lng}`,
              );

              console.log(
                "_showPopupWithLoader(" +
                  `${coordinate}, class=${featureData.control}&method=${popupMethod}&lat=${coordinate.lat}&lng=${coordinate.lng}` +
                  ")",
              );
            } else {
              console.log(
                "Mostrando popup com popupClassName:",
                popupClassName,
              );

              _showPopupWithLoader(
                coordinate,
                `class=${popupClassName}&method=${popupMethod}` +
                  `&lat=${coordinate.lat}&lng=${coordinate.lng}`,
              );

              console.log(
                "_showPopupWithLoader(" +
                  `${coordinate}, class=${popupClassName}&method=${popupMethod}&lat=${coordinate.lat}&lng=${coordinate.lng}` +
                  ")",
              );
            }
          }
        }
      } catch (error) {
        console.error("Error handling map click:", error);
      }
    }

    function _handlePointerMove(e) {
      if (!e || !e.pixel) return;

      _hoverFeatures.forEach((feat) => feat.setStyle(null));
      _hoverFeatures = [];

      _map.forEachFeatureAtPixel(e.pixel, function (feature) {
        feature.setStyle(_styles.highlightImovel);
        _hoverFeatures.push(feature);
      });

      _map.getTargetElement().style.cursor =
        _hoverFeatures.length > 0 ? "pointer" : "";
    }

    /* Métodos auxiliares */
    function _transformCoordinate(coordinate) {
      const lonlat = ol.proj.transform(coordinate, "EPSG:3857", "EPSG:4326");
      return {
        lat: lonlat[1],
        lng: lonlat[0],
      };
    }

    function _getFeatureAtPixel(pixel) {
      return _map.forEachFeatureAtPixel(pixel, function (ft) {
        return ft;
      });
    }

    function _updateCoordinateFields(coordinate) {
      console.log("_updateCoordinateFields(coordinate):", coordinate);

      const allLatFields = document.querySelectorAll(
        '[id="lat"], [name="lat"]',
      );
      const latField =
        allLatFields.length > 0 ? allLatFields[allLatFields.length - 1] : null;

      const allLonFields = document.querySelectorAll(
        '[id="lon"], [name="lon"]',
      );
      const lonField =
        allLonFields.length > 0 ? allLonFields[allLonFields.length - 1] : null;

      console.log("Campos selecionados:", { latField, lonField });

      if (latField) {
        latField.value = coordinate.lat;
        $(latField).trigger("change");
        console.log("Campo lat atualizado:", coordinate.lat);
        latField.classList.add("coordinate-updated");
        setTimeout(() => latField.classList.remove("coordinate-updated"), 500);
      } else {
        console.warn("Campo lat não encontrado");
      }

      if (lonField) {
        lonField.value = coordinate.lng;
        $(lonField).trigger("change");
        console.log("Campo lon atualizado:", coordinate.lng);
        lonField.classList.add("coordinate-updated");
        setTimeout(() => lonField.classList.remove("coordinate-updated"), 500);
      } else {
        console.warn("Campo lon não encontrado");
      }
    }

    function _handleEmptyClick(coordinate) {
      console.log("_handleEmptyClick");
      _updateCoordinateFields(coordinate);
      _addPin({ lat: coordinate.lat, lng: coordinate.lng }, true, false);
    }

    function _handleSimpleMarkerFeature(coordinate) {
      console.log("_handleSimpleMarkerFeature");
      _updateCoordinateFields(coordinate);
      _addPin({ lat: coordinate.lat, lng: coordinate.lng }, true, false);
    }

    function _handleActivityFeatureClick(featureData, coordinate) {
      console.log("_handleActivityFeatureClick");
      const { programacao_id, inscricao_imobiliaria } = featureData;

      _showPopupWithLoader(
        coordinate,
        `class=VigEpiMinhasAtividades&method=generatePopupStructure&lat=${coordinate.lat}` +
          `&lng=${coordinate.lng}&programacao_id=${programacao_id}` +
          `&inscricao_imobiliaria=${inscricao_imobiliaria}`,
      );
    }

    function _handleRecognitionFeatureClick(
      coordinate,
      className = "VigEpiReconhecimentoGeograficoForm",
      method = "generatePopupStructure",
    ) {
      console.log("_handleRecognitionFeatureClick");
      _updateCoordinateFields(coordinate);
      _showPopupWithLoader(
        coordinate,
        `class=${className}&method=${method}` +
          `&lat=${coordinate.lat}&lng=${coordinate.lng}`,
      );
    }

    function _showPopupWithLoader(coordinate, ajaxParams) {
      console.log("_showPopupWithLoader");
      console.log("coordinate:", coordinate);
      console.log("ajaxParams:", ajaxParams);

      const mapCoords = Array.isArray(coordinate)
        ? coordinate
        : ol.proj.fromLonLat([coordinate.lng, coordinate.lat]);

      console.log("mapCoords:", mapCoords);

      const el = document.createElement("div");

      const content = document.createElement("div");
      Object.assign(content.style, {
        maxHeight: "300px",
        overflowY: "auto",
      });

      el.appendChild(content);
      content.appendChild(_getLoader());

      __adianti_ajax_exec(
        ajaxParams,
        function (data) {
          $(content).html(data);
          _setupPopupTabs(content);

          console.log("content: ", content);
          if (_popup) {
            try {
              if (_popup.setPosition && _popup.setElement) {
                console.log("_popup.setPosition && _popup.setElement");
                _popup.setPosition(mapCoords);
              } else if (typeof _popup.show === "function") {
                console.log("_popup.show(mapCoords, el);");
                _popup.show(mapCoords, el);
              }
            } catch (e) {
              console.error("Error showing popup:", e);
              document.body.appendChild(el);
              Object.assign(el.style, {
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              });
            }
          }
        },
        true,
      );

      if (_popup) {
        if (_popup.setPosition && _popup.setElement) {
          console.log("_popup.setPosition(mapCoords);");
          _popup.setPosition(mapCoords);
          _popup.setElement(el);
        }
      } else {
        console.log("Fallback caso o popup não exista");
        document.body.appendChild(el);
      }
    }

    function _setupPopupTabs(content) {
      _popup.getElement().addEventListener(
        "click",
        function (e) {
          if ($(e.target).attr("data-toggle") === "tab") {
            $(e.target).tab("show");
          }
        },
        false,
      );
    }

    function _getLoader() {
      const loaderContainer = document.createElement("div");
      Object.assign(loaderContainer.style, {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100px",
      });

      const loader = document.createElement("div");
      loader.innerHTML = "Carregando...";
      Object.assign(loader.style, {
        fontSize: "14px",
        color: "#333",
      });

      loaderContainer.appendChild(loader);
      return loaderContainer;
    }

    /* ======================================== */
    /* _addPin - com suporte a ícones          */
    /* ======================================== */
    function _addPin(marker, flyTo = true, removePrevious = false) {
      const map = _getLastMap();
      if (!map) {
        console.warn("⚠️ Nenhum mapa disponível para adicionar pin");
        return;
      }

      const lat = marker.lat;
      const lng = marker.lng;

      if (isNaN(lat) || isNaN(lng)) {
        console.error("Coordenadas inválidas para marcador:", marker);
        return;
      }

      console.log("Coordenadas lng, lat:", lng, lat);
      console.log("Ícone:", marker.icon);

      if (removePrevious) {
        const oldPinLayer = map
          .getLayers()
          .getArray()
          .find(function (l) {
            return l.get("name") === "pin";
          });
        if (oldPinLayer) {
          map.removeLayer(oldPinLayer);
          console.log("🗑️ Marcador anterior removido (via clique)");
        }
      }

      const iconFeature = new ol.Feature({
        geometry: new ol.geom.Point(
          ol.proj.transform([lat, lng], "EPSG:4326", "EPSG:3857"),
        ),
        name: marker.label || "",
        icon: marker.icon || "",
        custom: true,
      });

      const vectorSource = new ol.source.Vector({
        features: [iconFeature],
      });

      const vectorLayer = new ol.layer.Vector({
        source: vectorSource,
        name: "pin",
        style: function (feature) {
          const label = feature.get("name") || "";
          const iconClass = feature.get("icon") || "";

          const styles = [];

          // Se tem ícone, cria um canvas com o ícone
          if (iconClass) {
            // Extrai a cor do ícone do label ou usa padrão
            let color = "#e74c3c";
            const colorMatch = label.match(/color:\s*([^;]+)/);
            if (colorMatch) {
              color = colorMatch[1].trim();
            }

            const canvas = _createIconCanvas(iconClass, color);
            styles.push(
              new ol.style.Style({
                image: new ol.style.Icon({
                  img: canvas,
                  imgSize: [canvas.width, canvas.height],
                  anchor: [0.5, 1],
                  scale: 1,
                }),
              }),
            );
          } else {
            // Fallback para marcador padrão
            styles.push(
              new ol.style.Style({
                image: new ol.style.Icon({
                  anchor: [0.5, 1],
                  src: "vendor/marcelonees/plugins/src/OpenLayers/marker-icon.png",
                  scale: 0.5,
                }),
              }),
            );
          }

          // Adiciona o label se existir (remove HTML)
          const cleanLabel = label.replace(/<[^>]*>/g, "").trim();
          if (cleanLabel) {
            styles.push(
              new ol.style.Style({
                text: new ol.style.Text({
                  font: "12px Calibri,sans-serif",
                  text: cleanLabel,
                  fill: new ol.style.Fill({
                    color: "#000",
                  }),
                  stroke: new ol.style.Stroke({
                    color: "#fff",
                    width: 3,
                  }),
                  offsetY: -20,
                  textAlign: "center",
                  textBaseline: "bottom",
                }),
              }),
            );
          }

          return styles;
        },
      });

      vectorLayer.setZIndex(1000);

      map.addLayer(vectorLayer);
      _layers.marker = vectorLayer;

      if (flyTo) {
        _flyTo([lat, lng], 17);
      }
    }

    function _highlightGeom(geom) {
      const features = new ol.format.GeoJSON().readFeatures(geom, {
        featureProjection: "EPSG:3857",
      });

      features.forEach((f) => f.set("custom", true));

      _highlightSource.addFeatures(features);
    }

    function _flyTo(location, zoom = null) {
      if (!_map || !location) return;

      console.log("Iniciando _flyTo - Zoom recebido:", zoom);

      const targetCoords = Array.isArray(location)
        ? ol.proj.fromLonLat(location)
        : location;

      const targetZoom =
        zoom !== null && !isNaN(zoom) ? Number(zoom) : _map.getView().getZoom();

      console.log("Zoom que será aplicado:", targetZoom);

      _map.getView().cancelAnimations();

      const animationOpts = {
        center: targetCoords,
        zoom: targetZoom,
        duration: 1500,
      };

      console.log("Opções de animação:", animationOpts);
      _map.getView().animate(animationOpts);
    }

    function _configStroke(strokeColor, fillColor) {
      console.log(
        "_configStroke - strokeColor:",
        strokeColor,
        "fillColor:",
        fillColor,
      );

      if (!_highlightSource) return;

      _highlightSource
        .getFeatures()
        .filter(
          (feature) =>
            feature.get("custom") &&
            feature.getGeometry().getType() !== "Point",
        )
        .forEach((feature) => {
          feature.setStyle(
            new ol.style.Style({
              stroke: new ol.style.Stroke({
                color: strokeColor,
                width: 3,
              }),
              fill: new ol.style.Fill({
                color: fillColor,
              }),
            }),
          );
        });
    }

    function _getGeometryCentroid(geometry) {
      if (!geometry || !geometry.type) return null;

      if (geometry.type === "Point") {
        return geometry.coordinates;
      }

      if (typeof turf !== "undefined") {
        try {
          return turf.centroid(geometry).geometry.coordinates;
        } catch (e) {
          console.error("Erro ao calcular centróide com turf:", e);
        }
      }

      if (
        geometry.type === "Polygon" &&
        geometry.coordinates &&
        geometry.coordinates[0]
      ) {
        const firstRing = geometry.coordinates[0];
        if (firstRing.length > 0) {
          return firstRing[0];
        }
      }

      return null;
    }

    function _validateGeometry(geom) {
      if (!geom || !geom.type || !geom.coordinates) {
        console.warn("Geometria inválida:", geom);
        return false;
      }
      console.log("Geometria:", geom);
      return true;
    }

    function _safeGetCoordinates(geom) {
      try {
        if (_validateGeometry(geom)) {
          return geom.coordinates;
        }
        return null;
      } catch (e) {
        console.error("Erro ao obter coordenadas:", e);
        return null;
      }
    }

    /**
     * Ativa modo de edição de geometria
     */
    function enableGeometryEditing(geomData) {
      const map = GeoMapApp.getMap();
      if (!map) return;

      const oldLayer = map
        .getLayers()
        .getArray()
        .find((l) => l.get("name") === "edit_layer");
      if (oldLayer) {
        map.removeLayer(oldLayer);
      }

      const source = new ol.source.Vector();

      if (geomData) {
        const format = new ol.format.GeoJSON();
        const features = format.readFeatures(geomData, {
          featureProjection: "EPSG:3857",
        });
        source.addFeatures(features);
      }

      const layer = new ol.layer.Vector({
        source: source,
        name: "edit_layer",
        style: new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: "#00ff00",
            width: 3,
          }),
          fill: new ol.style.Fill({
            color: "rgba(0, 255, 0, 0.1)",
          }),
        }),
      });

      map.addLayer(layer);

      const modify = new ol.interaction.Modify({
        source: source,
        style: new ol.style.Style({
          image: new ol.style.Circle({
            radius: 5,
            fill: new ol.style.Fill({
              color: "#ff0000",
            }),
            stroke: new ol.style.Stroke({
              color: "#ffffff",
              width: 2,
            }),
          }),
        }),
      });
      map.addInteraction(modify);

      window._editLayer = layer;
      window._editSource = source;
      window._modifyInteraction = modify;

      return { layer, source, modify };
    }

    function disableGeometryEditing() {
      const map = GeoMapApp.getMap();
      if (!map) return;

      const layer = map
        .getLayers()
        .getArray()
        .find((l) => l.get("name") === "edit_layer");
      if (layer) {
        map.removeLayer(layer);
      }

      if (window._modifyInteraction) {
        map.removeInteraction(window._modifyInteraction);
        delete window._modifyInteraction;
      }

      delete window._editLayer;
      delete window._editSource;
    }

    function getEditedGeometry() {
      if (!window._editSource) return null;

      const features = window._editSource.getFeatures();
      if (features.length === 0) return null;

      const format = new ol.format.GeoJSON();
      return format.writeFeatures(features, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      });
    }

    function saveEditedGeometry(rg_id, callback) {
      const geom = getEditedGeometry();
      if (!geom) {
        alert("Nenhuma geometria para salvar.");
        return;
      }

      $.post(
        "index.php?class=VigEpiGeometriaEditor&method=onSaveGeometry",
        {
          rg_id: rg_id,
          geom: geom,
        },
        function (response) {
          if (callback) callback(response);
        },
      );
    }

    /* Classes de Controles Customizados */
    class MousePositionControl extends ol.control.Control {
      constructor() {
        const container = document.createElement("div");
        container.classList.add(
          "custom-control",
          "rectangle-medium-ctrl",
          "Mouse-Position-Control",
        );
        $(container)
          .attr("id", "mousepositioncontainer")
          .css("font-size", "11px");

        super({
          element: container,
        });

        new ol.control.MousePosition({
          coordinateFormat: ol.coordinate.createStringXY(4),
          projection: "EPSG:4326",
          target: container,
        });
      }
    }

    class FeatureInspectControl extends ol.control.Control {
      constructor() {
        const container = document.createElement("div");
        container.className = "custom-control small-ctrl Imov-Touch-Control";

        const button = document.createElement("button");
        button.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
        container.appendChild(button);

        super({
          element: container,
        });

        this.container = container;
        this.button = button;
        this.enabled = false;

        this.toggle = this.toggle.bind(this);
        this._onDragUpdate = this._onDragUpdate.bind(this);
        this._onHighlightFeature = this._onHighlightFeature.bind(this);

        button.addEventListener("click", this.toggle);
      }

      toggle() {
        if (this.enabled) {
          this.disable();
        } else {
          this.enable();
        }
      }

      enable() {
        if (this.enabled || !_map) return;

        console.log("Ativando FeatureInspectControl");
        this.enabled = true;

        this.container.classList.add("small-ctrl-extend");
        _map.getViewport().style.cursor = "crosshair";

        setTimeout(() => {
          try {
            _map.on("moveend", this._onDragUpdate);
            _map.on("pointermove", this._onHighlightFeature);
            this._onDragUpdate();
          } catch (e) {
            console.error("Erro ao ativar FeatureInspect:", e);
          }
        }, 100);
      }

      disable() {
        if (!this.enabled || !_map) return;

        console.log("Desativando FeatureInspectControl");
        this.enabled = false;

        _map.un("moveend", this._onDragUpdate);
        _map.un("pointermove", this._onHighlightFeature);

        this.container.classList.remove("small-ctrl-extend");
        _map.getViewport().style.cursor = "";

        if (_highlightSource) {
          _highlightSource.clear();
        }
      }

      _onDragUpdate() {
        if (!this.enabled) return;
        _updateHighlightFeatures();
      }

      _onHighlightFeature(e) {
        if (!e || !e.pixel) return;
        if (!this.enabled) return;

        _hoverFeatures.forEach((feat) => feat.setStyle(null));
        _hoverFeatures = [];

        _map.forEachFeatureAtPixel(e.pixel, function (feature) {
          feature.setStyle(_styles.highlightImovel);
          _hoverFeatures.push(feature);
        });
      }
    }

    /* ======================================== */
    /* API PÚBLICA                             */
    /* ======================================== */
    return {
      init: function (config) {
        _initMap(config);
        return this;
      },

      addPin: function (marker) {
        _addPin(marker, true, false);
        return this;
      },

      highlightGeometry: function (geom) {
        _highlightGeom(geom);
        return this;
      },

      flyTo: function (location, zoom) {
        _flyTo(location, zoom);
        return this;
      },

      addLayer: function (name, config) {
        console.log("addLayer chamado:", name, config);
        _addLayerInternal(name, config);
        return this;
      },

      removeLayer: function (name) {
        if (_layers[name]) {
          _map.removeLayer(_layers[name]);
          delete _layers[name];
          delete _layerConfigs[name];

          _updateLayerControl();
          _updateConfigField();
        }
        return this;
      },

      getLayers: function () {
        return _layers;
      },

      getMap: function () {
        return _map;
      },

      getPopup: function () {
        return _popup;
      },

      configStroke: function (strokeColor, fillColor) {
        if (typeof _configStroke === "function") {
          _configStroke(strokeColor, fillColor);
        }
        return this;
      },

      validateGeometry: _validateGeometry,

      safeGetCoordinates: _safeGetCoordinates,

      clearHighlight: function () {
        if (_highlightSource) {
          _highlightSource.clear();
        }
      },

      /* ======================================== */
      /* MÉTODOS PARA CONFIGURAÇÃO               */
      /* ======================================== */
      saveConfig: function () {
        _updateConfigField();
        return _mapConfig;
      },

      restoreConfig: function (configData) {
        _restoreMapConfig(configData);
        return this;
      },

      getConfig: function () {
        return _mapConfig;
      },

      setConfigField: function (fieldId) {
        _configFieldId = fieldId;
        return this;
      },

      /* ======================================== */
      /* MÉTODOS PARA CONTROLE DE CAMADAS        */
      /* ======================================== */
      showLayerControl: function (show) {
        if (show) {
          if (!_layerControlContainer) {
            _addLayerControl();
          } else {
            _layerControlContainer.style.display = "block";
          }
        } else {
          if (_layerControlContainer) {
            _layerControlContainer.style.display = "none";
          }
        }
        return this;
      },

      toggleLayerControl: function () {
        if (_layerControlContainer) {
          const bodyEl = _getLastElement("#layer_control_body");
          const icon = _getLastElement("#layer_toggle_btn i");

          if (bodyEl && icon) {
            if (bodyEl.style.display === "none") {
              bodyEl.style.display = "block";
              icon.className = "fas fa-chevron-up";
              _isLayerControlCollapsed = false;
            } else {
              bodyEl.style.display = "none";
              icon.className = "fas fa-chevron-down";
              _isLayerControlCollapsed = true;
            }
            _updateConfigField();
          }
        }
        return this;
      },

      /* ======================================== */
      /* MÉTODOS PARA CONTROLE DE HIGHLIGHT      */
      /* ======================================== */
      setHighlightEnabled: function (enabled) {
        _setHighlightEnabled(enabled);
        return this;
      },

      setHighlightLayer: function (layerName) {
        _setHighlightLayer(layerName);
        return this;
      },

      setHighlightMinZoom: function (minZoom) {
        _setHighlightMinZoom(minZoom);
        return this;
      },

      setHighlightWfsUrl: function (url) {
        _setHighlightWfsUrl(url);
        return this;
      },

      configureHighlight: function (options) {
        _configureHighlight(options);
        return this;
      },

      getHighlightConfig: function () {
        return { ..._highlightConfig };
      },

      /* ======================================== */
      /* MÉTODOS PARA MÚLTIPLAS INSTÂNCIAS      */
      /* ======================================== */
      getMapInstance: function (id) {
        return _mapInstances[id] || null;
      },

      getAllInstances: function () {
        return _mapInstances;
      },

      getLastMapInstance: function () {
        return _getLastMapInstance();
      },

      getLastMap: function () {
        return _getLastMap();
      },
    };
  })();

  /* Garante que GeoMapApp está disponível globalmente */
  if (typeof GeoMapApp !== "undefined") {
    window.GeoMapApp = GeoMapApp;
  } else {
    console.error("Falha ao inicializar GeoMapApp");
  }

  /* ======================================== */
  /* FUNÇÕES GLOBAIS                         */
  /* ======================================== */

  function _getGlobalLastElement(selector) {
    const elements = document.querySelectorAll(selector);
    if (elements.length === 0) return null;
    return elements[elements.length - 1];
  }

  function _getGlobalLastMap() {
    if (GeoMapApp && GeoMapApp.getLastMap) {
      return GeoMapApp.getLastMap();
    }
    if (GeoMapApp && GeoMapApp.getMap) {
      return GeoMapApp.getMap();
    }
    return null;
  }

  /* Funções globais */
  window.configStroke = function (strokeColor, fillColor) {
    if (typeof _updateHighlightStyle === "function") {
      _updateHighlightStyle(strokeColor, fillColor);
    } else {
      console.error("_updateHighlightStyle não está disponível");
    }
  };

  window.limparOverlays = function () {
    const map = _getGlobalLastMap();
    if (!map) return;

    const popups = map.getOverlays().getArray();
    const popup = GeoMapApp.getPopup ? GeoMapApp.getPopup() : null;
    popups.forEach((p) => {
      if (p !== popup) {
        map.removeOverlay(p);
      }
    });
  };

  window.DrawCircleOnLonLat = function (
    lon,
    lat,
    radius,
    strokeColor,
    fillColor,
  ) {
    const map = _getGlobalLastMap();
    if (!map) {
      console.error("Nenhum mapa disponível para DrawCircleOnLonLat");
      return null;
    }

    const circle = new ol.geom.Circle(
      ol.proj.transform([lon, lat], "EPSG:4326", "EPSG:3857"),
      radius,
    );

    const circleFeature = new ol.Feature(circle);
    const vectorSource = new ol.source.Vector();
    vectorSource.addFeatures([circleFeature]);

    const circleLayer = new ol.layer.Vector({
      source: vectorSource,
      style: new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: strokeColor,
          width: 3,
        }),
        fill: new ol.style.Fill({
          color: fillColor,
        }),
      }),
    });

    map.addLayer(circleLayer);
    return circleLayer;
  };

  window.clearGeomSource = function () {
    const map = _getGlobalLastMap();
    if (!map) {
      console.warn("⚠️ Nenhum mapa disponível para clearGeomSource");
      return;
    }

    const highlightLayer = map
      .getLayers()
      .getArray()
      .find((layer) => layer.get("name") === "highlight");
    if (highlightLayer) {
      highlightLayer.getSource().clear();
      console.log("✅ Geometria limpa do último mapa");
    } else {
      console.warn("⚠️ Camada de highlight não encontrada");
    }
  };

  window.HighlightGeom = function (geom) {
    const map = _getGlobalLastMap();
    if (!map) {
      console.warn("⚠️ Nenhum mapa disponível para HighlightGeom");
      return;
    }

    const highlightLayer = map
      .getLayers()
      .getArray()
      .find((layer) => layer.get("name") === "highlight");
    if (!highlightLayer) {
      console.warn("⚠️ Camada de highlight não encontrada");
      return;
    }

    try {
      let geomData = geom;
      if (typeof geom === "string") {
        geomData = JSON.parse(geom);
      }

      let features = null;

      if (geomData && geomData.type === "Feature") {
        features = new ol.format.GeoJSON().readFeatures(geomData, {
          featureProjection: "EPSG:3857",
        });
      } else if (geomData && geomData.type && geomData.coordinates) {
        const featureObj = {
          type: "Feature",
          geometry: geomData,
          properties: {},
        };
        features = new ol.format.GeoJSON().readFeatures(featureObj, {
          featureProjection: "EPSG:3857",
        });
      } else if (typeof geom === "string") {
        features = new ol.format.GeoJSON().readFeatures(geom, {
          featureProjection: "EPSG:3857",
        });
      } else {
        features = new ol.format.GeoJSON().readFeatures(geom, {
          featureProjection: "EPSG:3857",
        });
      }

      if (!features || features.length === 0) {
        console.warn("⚠️ Nenhuma feature encontrada para destacar");
        return;
      }

      features.forEach((f) => f.set("custom", true));

      highlightLayer.getSource().clear();
      highlightLayer.getSource().addFeatures(features);
      console.log(
        `✅ Geometria destacada no último mapa (${features.length} features)`,
      );
    } catch (e) {
      console.error("❌ Erro ao destacar geometria:", e);
    }
  };

  window.HighlightAndFlyToGeom = function (geom, zoom) {
    const map = _getGlobalLastMap();
    if (!map) {
      console.warn("⚠️ Nenhum mapa disponível para HighlightAndFlyToGeom");
      return;
    }

    console.log("🔄 HighlightAndFlyToGeom - Iniciando...");

    HighlightGeom(geom);

    try {
      let geomData = geom;
      if (typeof geom === "string") {
        geomData = JSON.parse(geom);
      }

      let features = null;

      if (geomData && geomData.type === "Feature") {
        features = new ol.format.GeoJSON().readFeatures(geomData, {
          featureProjection: "EPSG:3857",
        });
      } else if (geomData && geomData.type && geomData.coordinates) {
        const featureObj = {
          type: "Feature",
          geometry: geomData,
          properties: {},
        };
        features = new ol.format.GeoJSON().readFeatures(featureObj, {
          featureProjection: "EPSG:3857",
        });
      } else if (typeof geom === "string") {
        features = new ol.format.GeoJSON().readFeatures(geom, {
          featureProjection: "EPSG:3857",
        });
      } else {
        features = new ol.format.GeoJSON().readFeatures(geom, {
          featureProjection: "EPSG:3857",
        });
      }

      if (!features || features.length === 0) {
        console.warn("⚠️ Nenhuma feature encontrada para voar");
        return;
      }

      const extent = ol.extent.createEmpty();
      features.forEach(function (feature) {
        const geomExtent = feature.getGeometry().getExtent();
        ol.extent.extend(extent, geomExtent);
      });

      if (ol.extent.isEmpty(extent)) {
        console.warn("⚠️ Extent vazio, não é possível voar");
        return;
      }

      console.log("📐 Extent calculado:", extent);

      const zoomLevel = zoom || 18;
      console.log(`🔍 Zoom a ser aplicado: ${zoomLevel}`);

      map.getView().fit(extent, {
        padding: [50, 50, 50, 50],
        maxZoom: zoomLevel,
        duration: 1000,
      });

      console.log(`✅ Voo para geometria no último mapa (zoom: ${zoomLevel})`);
    } catch (e) {
      console.error("❌ Erro ao voar para geometria:", e);
    }
  };

  /* Funções globais para controle de camadas */
  window.showLayerControl = function (show) {
    if (GeoMapApp && GeoMapApp.showLayerControl) {
      GeoMapApp.showLayerControl(show);
    } else {
      console.warn("⚠️ GeoMapApp.showLayerControl não disponível");
    }
  };

  window.toggleLayerControl = function () {
    if (GeoMapApp && GeoMapApp.toggleLayerControl) {
      GeoMapApp.toggleLayerControl();
    } else {
      console.warn("⚠️ GeoMapApp.toggleLayerControl não disponível");
    }
  };

  /* Funções globais para highlight */
  window.setHighlightEnabled = function (enabled) {
    if (GeoMapApp && GeoMapApp.setHighlightEnabled) {
      GeoMapApp.setHighlightEnabled(enabled);
      console.log(
        "🎯 Highlight " +
          (enabled ? "ativado" : "desativado") +
          " via função global",
      );
    } else {
      console.warn("⚠️ GeoMapApp.setHighlightEnabled não disponível");
    }
  };

  window.setHighlightLayer = function (layerName) {
    if (GeoMapApp && GeoMapApp.setHighlightLayer) {
      GeoMapApp.setHighlightLayer(layerName);
    } else {
      console.warn("⚠️ GeoMapApp.setHighlightLayer não disponível");
    }
  };

  window.setHighlightMinZoom = function (minZoom) {
    if (GeoMapApp && GeoMapApp.setHighlightMinZoom) {
      GeoMapApp.setHighlightMinZoom(minZoom);
    } else {
      console.warn("⚠️ GeoMapApp.setHighlightMinZoom não disponível");
    }
  };

  window.setHighlightWfsUrl = function (url) {
    if (GeoMapApp && GeoMapApp.setHighlightWfsUrl) {
      GeoMapApp.setHighlightWfsUrl(url);
    } else {
      console.warn("⚠️ GeoMapApp.setHighlightWfsUrl não disponível");
    }
  };

  window.configureHighlight = function (options) {
    if (GeoMapApp && GeoMapApp.configureHighlight) {
      GeoMapApp.configureHighlight(options);
    } else {
      console.warn("⚠️ GeoMapApp.configureHighlight não disponível");
    }
  };

  window.getHighlightConfig = function () {
    if (GeoMapApp && GeoMapApp.getHighlightConfig) {
      return GeoMapApp.getHighlightConfig();
    }
    return null;
  };

  /* Sobrescreve funções existentes para garantir compatibilidade */
  if (typeof window.DrawCircleOnLonLat === "undefined") {
    window.DrawCircleOnLonLat = function (
      lon,
      lat,
      radius,
      strokeColor,
      fillColor,
    ) {
      return DrawCircleOnLonLat(lon, lat, radius, strokeColor, fillColor);
    };
  }

  console.log(
    "✅ GeoMapApp carregado - SEMPRE opera no ÚLTIMO elemento do DOM",
  );
})();
