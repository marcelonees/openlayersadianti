/**
 * OpenLayers Map Manager - 1.2
 *
 * Autor: Marcelo Barreto Nees
 * Data: 2023-10-01
 * Descrição: Gerenciador de mapas OpenLayers com suporte a eventos, camadas e
 * funcionalidades avançadas como destaque de feições, popups e controle de atividades.
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
      ", "
    )}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  /* Módulo Principal */
  var GeoMapApp = (function () {
    /* Verifica se OpenLayers está carregado */
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

    /* Métodos privados de inicialização */
    function _initMap(config) {
      if (_initialized) return;
      _initialized = true;

      console.log("_initMap - config");
      console.log(config);

      try {
        _map = new ol.Map({
          target: config.target,
          layers: [
            /**
             * Se quiser deixar a camada do OpenStreetMap habilitada por
             * padrão, é preciso descomentar o bloco abaixo
             */
            /*
                        new ol.layer.Tile({
                            source: new ol.source.OSM({
                                crossOrigin: null,
                            }),
                        }),
                        */
          ],
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
        console.log("Map initialized successfully");
      } catch (error) {
        console.error("Map initialization failed:", error);
      }
    }

    function _setupEventListeners() {
      if (!_map) return;

      console.log("_setupEventListeners - setting up");

      /* Remove event listeners antigos para evitar duplicação */
      _map.un("click", _handleMapClick);
      _map.un("pointermove", _handlePointerMove);

      /* Adiciona os listeners */
      _map.on("click", _handleMapClick);
      _map.on("pointermove", _handlePointerMove);

      console.log("_setupEventListeners - completed");
    }

    function _initHighlightLayer() {
      console.log("/* INICIALIZANDO CAMADA DE DESTAQUE */");
      _highlightSource = new ol.source.Vector({
        format: new ol.format.GeoJSON(),
      });

      /* Variáveis para armazenar o estilo personalizado */
      let customStrokeColor = "rgb(240, 115, 12)"; /* Valor padrão */
      let customFillColor = "rgba(224, 17, 86, 0.2)"; /* Valor padrão */

      const highlightLayer = new ol.layer.Vector({
        source: _highlightSource,
        style: function (feature) {
          const isCustom = feature.get("custom");
          const control = feature.get("control");

          /* 1. Se for uma feature manual (custom), aplica o estilo personalizado */
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

          /* 2. Se for uma feature de atividade */
          if (control === "VigEpiMinhasAtividades") {
            const classe = feature.get("class") || "default";
            return _styles.activityFeature[classe];
          }

          /* 3. Estilo padrão para outras features (como lotes) */
          return new ol.style.Style({
            stroke: new ol.style.Stroke({
              color: "rgba(255, 255, 255, 0.1)",
              width: 1,
            }),
            fill: new ol.style.Fill({
              color: "rgba(255, 255, 255, 0.1)",
            }),
          });
        },
      });

      highlightLayer.setZIndex(7);
      _map.addLayer(highlightLayer);
      _layers.highlight = highlightLayer;

      /* Função para atualizar o estilo personalizado */
      window._updateHighlightStyle = function (strokeColor, fillColor) {
        console.log("/* ATUALIZANDO ESTILO PERSONALIZADO */", {
          strokeColor,
          fillColor,
        });
        customStrokeColor = strokeColor;
        customFillColor = fillColor;

        /* Atualiza apenas features customizadas */
        _highlightSource
          .getFeatures()
          .filter((f) => f.get("custom"))
          .forEach((f) => f.setStyle(null)); /* Força a reavaliação do estilo */
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

        /* Adiciona verificação de métodos essenciais */
        if (typeof _popup.show !== "function") {
          _popup.show = function (coords, content) {
            this.setPosition(coords);
            this.setElement(content);
          };
        }

        _map.addOverlay(_popup);
      } catch (e) {
        console.error("Popup initialization failed:", e);
        /* Fallback mais robusto */
        _popup = new ol.Overlay({
          element: document.createElement("div"),
          autoPan: true,
          autoPanAnimation: {
            duration: 250,
          },
        });
        _popup.setPosition(undefined); // Garante que comece oculto
        _map.addOverlay(_popup);

        /* Adiciona método show para compatibilidade */
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

      try {
        _controls.mousePosition = new MousePositionControl();
        _map.addControl(_controls.mousePosition);

        _controls.featureInspect = new FeatureInspectControl();
        _map.addControl(_controls.featureInspect);

        /* Ativação segura com verificação */
        if (_map && _controls.featureInspect) {
          setTimeout(() => {
            try {
              _controls.featureInspect.enable();
            } catch (e) {
              console.error("Error enabling feature inspect:", e);
            }
          }, 300);
        }
      } catch (e) {
        console.error("Error initializing controls:", e);
      }
    }

    /* Métodos de manipulação de eventos */
    function _handleMapClick(e) {
      console.log();
      try {
        console.log("_handleMapClick", e);

        // 1. Extrai os parâmetros da URL no formato array
        const urlParams = new URLSearchParams(window.location.search);
        const params = {};

        // Processa parâmetros no formato 0[param]
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

        // 2. Verifica os parâmetros específicos (considerando o primeiro conjunto [0])
        const config = params["0"] || {};
        console.log("config", config);

        // No método _handleMapClick, você pode acessar assim:
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

        /**
         * Transforma as coordenadas
         */
        const coordinate = _transformCoordinate(e.coordinate);
        const feature = _getFeatureAtPixel(e.pixel);

        if (!feature) {
          console.log("Nenhuma feature encontrada no clique");
          return;
        }

        const featureData = feature.values_;
        console.log("Feature data:", featureData);

        /* 3. Atualiza coordenadas se o parâmetro estiver presente */
        if (shouldUpdateCoords) {
          console.log("Atualizando coordenadas nos campos do formulário");
          _updateCoordinateFields(coordinate);
        }

        /* 4. Adiciona pin se o parâmetro estiver presente */
        if (shouldAddPin) {
          console.log("Adicionando marcador no mapa");
          _map
            .getLayers()
            .getArray()
            .filter((layer) => layer.get("name") === "pin")
            .forEach((layer) => _map.removeLayer(layer));

          _addPin({ lat: coordinate.lng, lng: coordinate.lat }, false);
        }

        /**
         * Verifica se o parâmetro popup foi passado e se popup=true
         */
        if (
          (shouldShowPopup || featureData.url) &&
          _popup &&
          typeof _popup.show === "function"
        ) {
          /* Verificação adicional para ver se as coordenadas são válidas */
          if (!coordinate || isNaN(coordinate.lat) || isNaN(coordinate.lng)) {
            console.error("Coordenadas inválidas para popup:", coordinate);
            return;
          }

          /* Se houver URL, carrega o conteúdo via AJAX */
          if (featureData.url) {
            console.log("Mostrando popup com URL da feature:", featureData.url);
            _showPopupWithLoader(coordinate, featureData.url);
          } else {
            if (featureData.control) {
              console.log("Mostrando popup com controle:", featureData.control);

              _showPopupWithLoader(
                coordinate,
                `class=${featureData.control}&method=${popupMethod}` +
                  `&lat=${coordinate.lat}&lng=${coordinate.lng}`
              );

              console.log(
                "_showPopupWithLoader(" +
                  `${coordinate}, class=${featureData.control}&method=${popupMethod}&lat=${coordinate.lat}&lng=${coordinate.lng}` +
                  ")"
              );
            } else {
              console.log(
                "Mostrando popup com popupClassName:",
                popupClassName
              );

              _showPopupWithLoader(
                coordinate,
                `class=${popupClassName}&method=${popupMethod}` +
                  `&lat=${coordinate.lat}&lng=${coordinate.lng}`
              );

              console.log(
                "_showPopupWithLoader(" +
                  `${coordinate}, class=${popupClassName}&method=${popupMethod}&lat=${coordinate.lat}&lng=${coordinate.lng}` +
                  ")"
              );
            }
          }
        }
      } catch (error) {
        console.error("Error handling map click:", error);
      }
    }

    function _handlePointerMove(e) {
      /* console.log("_handlePointerMove"); */
      if (!e || !e.pixel) return;

      _hoverFeatures.forEach((feat) => feat.setStyle(null));
      _hoverFeatures = [];

      _map.forEachFeatureAtPixel(e.pixel, function (feature) {
        feature.setStyle(_styles.highlightImovel);
        _hoverFeatures.push(feature);
      });

      /* Muda o cursor quando estiver sobre uma feature */
      /* TODO: Não está funcionando */
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
      const latField = document.getElementById("lat");
      const lonField = document.getElementById("lon");

      if (latField) {
        latField.value = coordinate.lat;
        $("#lat").trigger("change");
      }

      if (lonField) {
        lonField.value = coordinate.lng;
        $("#lon").trigger("change");
      }
    }

    function _handleEmptyClick(coordinate) {
      console.log("_handleEmptyClick");
      _updateCoordinateFields(coordinate);
      _addPin({ lat: coordinate.lat, lng: coordinate.lng });
    }

    function _handleSimpleMarkerFeature(coordinate) {
      console.log("_handleSimpleMarkerFeature");
      _updateCoordinateFields(coordinate);
      _addPin({ lat: coordinate.lat, lng: coordinate.lng });
    }

    function _handleActivityFeatureClick(featureData, coordinate) {
      console.log("_handleActivityFeatureClick");
      const { programacao_id, inscricao_imobiliaria } = featureData;

      _showPopupWithLoader(
        coordinate,
        `class=VigEpiMinhasAtividades&method=generatePopupStructure&lat=${coordinate.lat}` +
          `&lng=${coordinate.lng}&programacao_id=${programacao_id}` +
          `&inscricao_imobiliaria=${inscricao_imobiliaria}`
      );
    }

    function _handleRecognitionFeatureClick(
      coordinate,
      className = "VigEpiReconhecimentoGeograficoForm",
      method = "generatePopupStructure"
    ) {
      console.log("_handleRecognitionFeatureClick");
      _updateCoordinateFields(coordinate);
      _showPopupWithLoader(
        coordinate,
        /*`class=VigEpiReconhecimentoGeograficoForm&method=generatePopupStructure` +*/
        `class=${className}&method=${method}` +
          `&lat=${coordinate.lat}&lng=${coordinate.lng}`
      );
    }

    function _showPopupWithLoader(coordinate, ajaxParams) {
      console.log("_showPopupWithLoader");
      console.log("coordinate:", coordinate);
      console.log("ajaxParams:", ajaxParams);

      // Garante que as coordenadas estejam no formato esperado (EPSG:3857)
      const mapCoords = Array.isArray(coordinate)
        ? coordinate
        : ol.proj.fromLonLat([coordinate.lng, coordinate.lat]);

      console.log("mapCoords:", mapCoords);

      // 1. Cria o container principal do popup
      const el = document.createElement("div");

      // 2. [NOVO] ADICIONE O BOTÃO DE FECHAR AQUI (debug)
      // const closeBtn = document.createElement("button");
      // closeBtn.innerHTML = "X";
      // Object.assign(closeBtn.style, {
      //     position: "absolute",
      //     top: "5px",
      //     right: "5px",
      //     background: "transparent",
      //     border: "none",
      //     cursor: "pointer",
      //     fontSize: "16px",
      //     fontWeight: "bold",
      //     color: "#999",
      // });
      // closeBtn.onclick = () => {
      //     if (_popup) {
      //         _popup.setPosition(undefined); // Remove o popup
      //     } else {
      //         el.remove(); // Fallback se não usar o overlay do OpenLayers
      //     }
      // };
      // el.appendChild(closeBtn);

      // 3. Aplica estilos diretamente ao elemento
      // Object.assign(el.style, {
      //     position: "absolute",
      //     backgroundColor: "white",
      //     boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
      //     padding: "15px",
      //     borderRadius: "10px",
      //     border: "1px solid #cccccc",
      //     minWidth: "180px",
      //     maxWidth: "450px",
      //     zIndex: "1000",
      //     display: "none",
      // });

      // Adiciona a seta do popup (opcional)
      // const arrow = document.createElement("div");
      // Object.assign(arrow.style, {
      //     position: "absolute",
      //     bottom: "-30px",
      //     left: "50%",
      //     marginLeft: "-10px",
      //     width: "0",
      //     height: "0",
      //     borderLeft: "10px solid transparent",
      //     borderRight: "10px solid transparent",
      //     borderTop: "10px solid white",
      // });
      // el.appendChild(arrow);

      // Cria o conteúdo do popup
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
          // Mostra o popup somente após o conteúdo ser carregado
          if (_popup) {
            try {
              // Verifica se é um overlay do OpenLayers padrão
              if (_popup.setPosition && _popup.setElement) {
                console.log("_popup.setPosition && _popup.setElement");
                _popup.setPosition(mapCoords);
                // _popup.setElement(el);
              }
              // Se for um popup customizado com método show
              else if (typeof _popup.show === "function") {
                console.log("_popup.show(mapCoords, el);");
                _popup.show(mapCoords, el);
              }
            } catch (e) {
              console.error("Error showing popup:", e);
              // Fallback extremo - adiciona diretamente ao body
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
        true
      );

      // Adiciona temporariamente para visualização imediata
      if (_popup) {
        if (_popup.setPosition && _popup.setElement) {
          console.log("_popup.setPosition(mapCoords);");
          _popup.setPosition(mapCoords);
          _popup.setElement(el);
        }
      } else {
        // Fallback caso o popup não exista
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
        false
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

    function _addPin(marker, flyTo = true) {
      /* Remove existing marker layer */
      // _map.getLayers()
      //     .getArray()
      //     .filter((layer) => layer.get("name") === "pin")
      //     .forEach((layer) => _map.removeLayer(layer));

      const lat = marker.lat;
      const lng = marker.lng;

      /* Verificar se as coordenadas são válidas */
      if (isNaN(lat) || isNaN(lng)) {
        console.error("Coordenadas inválidas para marcador:", marker);
        return;
      }

      console.log("Coordenadas lng, lat:", lng, lat);

      const iconFeature = new ol.Feature({
        geometry: new ol.geom.Point(
          ol.proj.transform([lat, lng], "EPSG:4326", "EPSG:3857")
        ),
        name: marker.label || "",
      });

      const vectorSource = new ol.source.Vector({
        features: [iconFeature],
      });

      const vectorLayer = new ol.layer.Vector({
        source: vectorSource,
        name: "pin",
        style: function (feature) {
          const label = feature.get("name");
          const style = _styles.markerLabel.clone();
          style.getText().setText(label);
          return [_styles.defaultMarker, style];
        },
      });

      /* Definir um zIndex alto para garantir que o marcador fique acima de outras camadas */
      vectorLayer.setZIndex(1000);

      _map.addLayer(vectorLayer);
      _layers.marker = vectorLayer;

      /* Centralizar o mapa no marcador */
      if (flyTo) {
        _flyTo([lat, lng], 17);
      }
    }

    function _highlightGeom(geom) {
      // TODO: Verificar se é preciso limpar a fonte de destaque antes de adicionar novas features
      // _highlightSource.clear();

      const features = new ol.format.GeoJSON().readFeatures(geom, {
        featureProjection: "EPSG:3857",
      });

      // Marca as features como customizadas
      features.forEach((f) => f.set("custom", true));

      _highlightSource.addFeatures(features);
    }

    function _flyTo(location, zoom = null) {
      if (!_map || !location) return;

      console.log("Iniciando _flyTo - Zoom recebido:", zoom);

      // 1. Processa as coordenadas
      const targetCoords = Array.isArray(location)
        ? ol.proj.fromLonLat(location)
        : location;

      // 2. Define o zoom (com fallback para o zoom atual)
      const targetZoom =
        zoom !== null && !isNaN(zoom) ? Number(zoom) : _map.getView().getZoom();

      console.log("Zoom que será aplicado:", targetZoom);

      // 3. Cancela qualquer animação em andamento
      _map.getView().cancelAnimations();

      // 4. Animação única combinando movimento e zoom
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
        fillColor
      );

      if (!_highlightSource) return;

      // Atualiza apenas features customizadas
      _highlightSource
        .getFeatures()
        .filter((feature) => feature.get("custom"))
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
            })
          );
        });
    }

    function _getGeometryCentroid(geometry) {
      if (!geometry || !geometry.type) return null;

      /* Para pontos, retorna as coordenadas diretamente */
      if (geometry.type === "Point") {
        return geometry.coordinates;
      }

      /* Para outras geometrias, calcula o centróide */
      if (typeof turf !== "undefined") {
        try {
          return turf.centroid(geometry).geometry.coordinates;
        } catch (e) {
          console.error("Erro ao calcular centróide com turf:", e);
        }
      }

      /* Fallback para polígonos sem turf.js */
      if (
        geometry.type === "Polygon" &&
        geometry.coordinates &&
        geometry.coordinates[0]
      ) {
        const firstRing = geometry.coordinates[0];
        if (firstRing.length > 0) {
          return firstRing[0]; /* Retorna o primeiro ponto */
        }
      }

      return null;
    }

    /* Verifica se uma geometria é válida */
    function _validateGeometry(geom) {
      if (!geom || !geom.type || !geom.coordinates) {
        console.warn("Geometria inválida:", geom);
        return false;
      }
      console.log("Geometria:", geom);
      return true;
    }

    /* Obtém coordenadas com verificação de segurança */
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

    /* Classes de Controles Customizados */
    class MousePositionControl extends ol.control.Control {
      constructor() {
        const container = document.createElement("div");
        container.classList.add(
          "custom-control",
          "rectangle-medium-ctrl",
          "Mouse-Position-Control"
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
        /* Cria o container principal */
        const container = document.createElement("div");
        container.className = "custom-control small-ctrl Imov-Touch-Control";

        /* Cria o botão de controle */
        const button = document.createElement("button");
        button.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
        container.appendChild(button);

        /* Chama o construtor pai */
        super({
          element: container,
        });

        /* Armazena referências importantes */
        this.container = container;
        this.button = button;
        this.enabled = false;

        /* Bind dos métodos */
        this.toggle = this.toggle.bind(this);
        this._onDragUpdate = this._onDragUpdate.bind(this);
        this._onHighlightFeature = this._onHighlightFeature.bind(this);

        /* Event listeners */
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

        /* Atualiza a UI */
        this.container.classList.add("small-ctrl-extend");
        _map.getViewport().style.cursor = "crosshair";

        /* Adiciona listeners com delay para garantir que o mapa está pronto */
        setTimeout(() => {
          try {
            _map.on("moveend", this._onDragUpdate);
            _map.on("pointermove", this._onHighlightFeature);
            this._onDragUpdate(); /* Carrega features imediatamente */
          } catch (e) {
            console.error("Erro ao ativar FeatureInspect:", e);
          }
        }, 100);
      }

      disable() {
        if (!this.enabled || !_map) return;

        console.log("Desativando FeatureInspectControl");
        this.enabled = false;

        /* Remove listeners */
        _map.un("moveend", this._onDragUpdate);
        _map.un("pointermove", this._onHighlightFeature);

        /* Atualiza a UI */
        this.container.classList.remove("small-ctrl-extend");
        _map.getViewport().style.cursor = "";

        /* Limpa features */
        if (_highlightSource) {
          _highlightSource.clear();
        }
      }

      _onDragUpdate() {
        console.log("FeatureInspectControl - _onDragUpdate()");
        if (!this.enabled) return;

        /**
         * TODO:Layer de lotes
         *
         * Obter via configuração, a layer de lotes, para que não
         * dependa de uma URL fixa
         *
         */
        const geoserver_url =
          "https://geo.jaraguadosul.sc.gov.br/gs/geoserver-hive/PMJS/wms";
        if (_map.getView().getZoom() > 16) {
          $.post(
            geoserver_url,
            {
              service: "WFS",
              request: "GetFeature",
              typeNames: "view_lote",
              version: "2.0.0",
              srsName: "EPSG:4326",
              outputFormat: "application/json",
              bbox:
                _map.getView().calculateExtent(_map.getSize()).join(",") +
                ", EPSG:3857",
            },
            function (data) {
              const features = new ol.format.GeoJSON().readFeatures(data, {
                featureProjection: "EPSG:3857",
              });

              /* Marca as features como vindas do WFS */
              features.forEach((f) => f.set("source", "wfs"));

              _highlightSource.addFeatures(features);
            }
          );
        }
      }

      _onHighlightFeature(e) {
        if (!e || !e.pixel) return;
        if (!this.enabled) return;

        /*
                console.log("FeatureInspectControl - _onHighlightFeature()");
                console.log("e:");
                console.log(e);
                */

        _hoverFeatures.forEach((feat) => feat.setStyle(null));
        _hoverFeatures = [];

        _map.forEachFeatureAtPixel(e.pixel, function (feature) {
          feature.setStyle(_styles.highlightImovel);
          _hoverFeatures.push(feature);
        });
      }
    }

    /* API Pública */
    return {
      init: function (config) {
        _initMap(config);
        return this;
      },

      addPin: function (marker) {
        _addPin(marker);
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
        console.log("addLayer", name, config);
        let layer;

        if (config.type === "wms") {
          layer = new ol.layer.Tile({
            name: name,
            source: new ol.source.TileWMS({
              url: config.url,
              params: {
                LAYERS: config.layers,
                TILED: true,
                TRANSPARENT: true,
              },
              serverType: "geoserver",
              crossOrigin: "anonymous",
            }),
          });
        } else if (config.type === "xyz") {
          layer = new ol.layer.Tile({
            name: name,
            source: new ol.source.XYZ({
              url: config.url,
              maxZoom: config.maxZoom || 19,
              crossOrigin: "anonymous",
            }),
          });
        }

        if (layer) {
          layer.setZIndex(config.zIndex || 0);
          _map.addLayer(layer);
          _layers[name] = layer;
        }

        return this;
      },

      removeLayer: function (name) {
        if (_layers[name]) {
          _map.removeLayer(_layers[name]);
          delete _layers[name];
        }
        return this;
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
    };
  })();

  /* Garante que GeoMapApp está disponível globalmente */
  if (typeof GeoMapApp !== "undefined") {
    window.GeoMapApp = GeoMapApp;
  } else {
    console.error("Falha ao inicializar GeoMapApp");
  }

  /* Funções globais necessárias para compatibilidade */
  window.configStroke = function (strokeColor, fillColor) {
    if (typeof _updateHighlightStyle === "function") {
      _updateHighlightStyle(strokeColor, fillColor);
    } else {
      console.error("_updateHighlightStyle não está disponível");
    }
  };

  window.limparOverlays = function () {
    /* Mantém compatibilidade com código legado */
    const popups = GeoMapApp.getMap().getOverlays().getArray();
    popups.forEach((popup) => {
      if (popup !== GeoMapApp.getPopup()) {
        GeoMapApp.getMap().removeOverlay(popup);
      }
    });
  };

  window.DrawCircleOnLonLat = function (
    lon,
    lat,
    radius,
    strokeColor,
    fillColor
  ) {
    const circle = new ol.geom.Circle(
      ol.proj.transform([lon, lat], "EPSG:4326", "EPSG:3857"),
      radius
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

    GeoMapApp.getMap().addLayer(circleLayer);
    return circleLayer;
  };

  window.clearGeomSource = function () {
    if (GeoMapApp && GeoMapApp.getMap()) {
      const highlightLayer = GeoMapApp.getMap()
        .getLayers()
        .getArray()
        .find((layer) => layer.get("name") === "highlight");

      if (highlightLayer) {
        highlightLayer.getSource().clear();
      }
    }
  };
})();
