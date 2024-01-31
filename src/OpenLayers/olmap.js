var geoserver_url = 'https://geo.jaraguadosul.sc.gov.br/gs/geoserver-hive/PMJS/wms?';

/**
 *  Cria o mapa
 */

var view = map.getView();

view.animate({
    center: ol.proj.fromLonLat([lng, lat]),
    zoom: 14
});

/**
 * SETA VARIAVEIS DE MAPA
 */


/**
 * VARIAVEIS DA INSPEÇÃO DE IMOVEIS
 */

var HoverImoveisFeatures = [];

var HighlightImoveisSource = new ol.source.Vector({
	format: new ol.format.GeoJSON()
});

var HighlightImoveisLayer = new ol.layer.Vector({
	source: HighlightImoveisSource,
	style: new ol.style.Style({
		stroke: new ol.style.Stroke({
			color: 'rgba(0,0,0,0)',
			width: 1
		}),
		fill: new ol.style.Fill({
			color: 'rgba(0,0,0,0)'
		})
	})
});

HighlightImoveisLayer.setZIndex(7);
map.addLayer(HighlightImoveisLayer);



/**
 * CRIA FUNÇÃO PARA LIMPAR OVERLAYS MAS MANTER ALGUNS ESPECÍFICOS
 */

var Imov_Popup = new Popup({width:'350px'});
map.addOverlay(Imov_Popup);


function limparOverlays(){
	/*map.getOverlays().clear();*/
	map.addOverlay(Imov_Popup);
}



/**
 * CAMADA DE HIGHLIGHT DE POLÍGONOS
 */
var HighlightGeomSource = new ol.source.Vector({
	format: new ol.format.GeoJSON()
});

var HighlightGeomStyle = new ol.style.Style({
	stroke: new ol.style.Stroke({
		color: strokeColor,
		width: 3
	}),
	fill: new ol.style.Fill({
		color: fillColor
	})
});

var HighlightGeomLayer = new ol.layer.Vector({
	source: HighlightGeomSource,
	style: (
		function () { 

			var stroke = new ol.style.Stroke({
				color: 'black'
			});

			var textStroke = new ol.style.Stroke({
				color: '#fff',
				width: 3
			});

			var textFill = new ol.style.Fill({
				color: '#000'
			});
			
			return function (feature, resolution) { 
				control = feature.get('control');
				/*console.log(control);*/

				/**
				 * Atividades tem cores diferentes, conforme seu Status
				 */
				if (control == 'VigEpiMinhasAtividades') {
					logradouro 		= feature.get('logradouro');
					logradouro_num 	= feature.get('logradouro_num');
					bairro 			= feature.get('bairro');
					quarteirao 		= feature.get('quarteirao');
					text 			= logradouro_num;

					textStyle = new ol.style.Text({
						font: '10px Calibri,sans-serif',
						text: text,
						fill: textFill,
						stroke: textStroke
					});

					classe = feature.get('class');

					switch(classe) {
						case "A":
						  	/* code block */
							return new ol.style.Style({ 
								stroke: new ol.style.Stroke({color: 'black', width: 1}),
								fill: new ol.style.Fill({ color: 'rgba(87,213,87,1)' }),
								text: textStyle
							});						
						  	break;
						case "I":
						  	/* code block */
							return new ol.style.Style({ 
								stroke: new ol.style.Stroke({color: 'black', width: 1}),
								fill: new ol.style.Fill({ color: 'rgba(204,229,255,1)'}),
								text: textStyle
							});							
						  	break;
						case "F":
							/* code block */
							return new ol.style.Style({ 
								stroke: new ol.style.Stroke({color: 'black', width: 1}),
								fill: new ol.style.Fill({ color: 'rgba(226,227,229,1)' }),
								text: textStyle
							});							
							break;
						default:
						  	/* code block */
						  	return new ol.style.Style({ 
								stroke: new ol.style.Stroke({color: 'black', width: 1}),
								fill: new ol.style.Fill({ color: 'rgba(244,67,54,1)' }),
								text: textStyle
							});						  
					}

				} 
				/**
				 * Outras telas
				 */
				else {
					return new ol.style.Style({ 
						stroke: new ol.style.Stroke({color: 'black', width: 1}),
						fill: new ol.style.Fill({ color: 'rgba(44,88,55,0.4)' }),
						text: new ol.style.Text({
							font: '10px Calibri,sans-serif',
							/*text: text,*/
							fill: textFill,
							stroke: textStroke
						})
					});					
				}
			}
		}
	)()
});

HighlightGeomLayer.setZIndex(7);
map.addLayer(HighlightGeomLayer);

function configStroke(strokeColor, fillColor) {

	HighlightGeomLayer.setStyle([
		new ol.style.Style({
			stroke: new ol.style.Stroke({
				color: strokeColor,
				width: 3
			}),
			fill: new ol.style.Fill({
				color: fillColor
			})
		})
	]);

}


/**
 * addLayer
 */
function addLayer(layerName, sourceType = 'OSM', attributions = NULL, sourceUrl = NULL, minZoom = 8, maxZoom = 19) {

    console.log('função addLayer');
    /*
    console.log(layerName, sourceType, attributions, sourceUrl, minZoom, maxZoom);
    console.log('layerName, sourceType, attributions, sourceUrl, minZoom, maxZoom');
    */

    /*
    var layerName = new ol.layer.Tile({
        source: new ol.source.XYZ({
            attributions: + '\'' + attributions + '\'',
            url:          + '\'' + sourceUrl    + '\'',
            minZoom:      + '\'' + minZoom      + '\'',
            maxZoom:      + '\'' + maxZoom      + '\''
        })
    });    

    map.addLayer(layerName);
    */

}


function DrawCircleOnLonLat(lon, lat, radius, strokeColor = 'rgba(255,15,15)', fillColor = 'rgba(255,15,15, 0.1)') {

    var circle = new ol.geom.Circle(
        ol.proj.transform(
            [lon,lat], 
            'EPSG:4326', 
            'EPSG:3857'
        ), radius
    );

    var CircleFeature = new ol.Feature(circle);

    var vectorSource = new ol.source.Vector({
        projection: 'EPSG:4326',
    });

    vectorSource.addFeatures([CircleFeature]);

    var circleLayer = new ol.layer.Vector({
        source: vectorSource,
        style: [
            new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: strokeColor,
                    width: 3
                }),
                fill: new ol.style.Fill({
                    color: fillColor
                })
            })
        ]
    });

    map.addLayer(circleLayer);
}




/**
 * FUNÇÕES DE GEOMETRIA
 */

function clearGeomSource() {
	HighlightGeomSource.clear();
	console.log('clearGeomSource');
}

function HighlightGeom(geom){
	/*console.log(geom);*/
    /* HighlightGeomSource.clear();*/
    HighlightGeomSource.addFeatures(
        (new ol.format.GeoJSON()).readFeatures(
            geom, {
                featureProjection: 'EPSG:3857'
            }
        )
    );
}

function HighlightAndFlyToGeom(geom, zoom) {
    HighlightGeom(geom);
    const centroid = turf.centroid(geom);
    const centroidproj = ol.proj.fromLonLat(centroid.geometry.coordinates);
	flyTo(centroidproj, zoom);
}


function centroidOfGeom(geom) {

    const centroid = turf.centroid(geom);
	lon = centroid.geometry.coordinates[0];
    lat = centroid.geometry.coordinates[1];

    if (document.getElementById("lat")) {
		document.getElementById("lat").value = lat;
    }

    if (document.getElementById("lon")) {
		document.getElementById("lon").value = lon;
    }

    return centroid.geometry.coordinates;
}


function flyTo(location, zoom = null, done) {
    var duration = 1500;
    var parts = 2;
    var fitafter = false;

    if (zoom==null) {            
        var ext = ol.extent.createEmpty();
        ol.extent.extend(ext, HighlightGeomSource.getExtent());
        zoom = 15;
        fitafter = true;
    }
    
    var called = false;

    function callback(complete) {
        --parts;
        if (called) {
            return;
        }
        if (parts === 0 || !complete) {
            called = true;
        }
    }

    view.animate({
        center: location,
        duration: duration
    }, callback);

    view.animate({
        zoom: zoom - 1,
        duration: duration / 2
    }, 
    {
        zoom: zoom,
        duration: duration / 2
    }, callback);

    if (fitafter) {
        map.getView().fit(ext, map.getSize());
    }
}





/**
 * FUNCOES DE INTEGRAÇÃO DE CAMADAS
 */

function addNode(node) {
	switch(node.data.layer_type) {
		case 'wms':
			addWMSLayer(node);
			break;

		case 'raster-XYZtiles':
			addXYZTileLayer(node);
			break;

		case 'blank':
			break;

		case 'vector-XYZtiles':
			addXYZVectorLayer(node);
			break;

		default:
	}
}

function removeNode(node) {
	switch(node.data.layer_type) {
		case 'wms':
			removeWMSLayer(node);
			break;

		case 'raster-XYZtiles':
			removeXYZTileLayer(node);

		case 'blank':
			break;

		case 'vector-XYZtiles':
			removeXYZVectorLayer(node);
			break;

		default:
	}
}

function addWMSLayer(node) {
	var WMSLayer = new ol.layer.Tile({
		name:node.key,
		source: new ol.source.TileWMS({
			url: node.data.source_url,
			params: {
				'layers':		node.data.lyr,
				'TILED':		true,
				'tiled':		true,
				'TRANSPARENT':	true,
				'srs':			'EPGS:3857',
				'STYLES':		node.data.layer_styles
			},
			serverType: 'geoserver',
			crossOrigin: 'anonymous'
		})
	});
	WMSLayer.setZIndex(node.data.pane);
	map.addLayer(WMSLayer);
}

function removeWMSLayer(node){
	const layersToRemove = [];
	map.getLayers().forEach(function(layer){
		if(layer.get('name') != undefined && layer.get('name')===node.key){
			layersToRemove.push(layer)
		}
	})
	if(layersToRemove.length>=1){
		map.removeLayer(layersToRemove[0]);
	}
}

function addXYZTileLayer(node){
	var XYZTileLayer = new ol.layer.Tile({
		name:node.key,
        maxZoom: node.data.maxzoom || 18,
		source: new ol.source.XYZ({
			url:			node.data.source_url,
			crossOrigin: 	'anonymous',
            maxZoom:		node.data.maxzoom  || 18,
            tileSize: 		node.data.tileSize || 256
		})
	})
	XYZTileLayer.setZIndex(node.data.pane);
	map.addLayer(XYZTileLayer);
}

function removeXYZTileLayer(node){
	const layersToRemove = [];
	map.getLayers().forEach(function(layer){
		if(layer.get('name') != undefined && layer.get('name')===node.key){
			layersToRemove.push(layer)
		}
	})
	if(layersToRemove.length>=1){
		map.removeLayer(layersToRemove[0]);
	}
}

function addXYZVectorLayer(node){
	var XYZVectorLayer = new ol.layer.VectorTile({
		name:node.key,
		declutter: true,
		source: new ol.source.VectorTile({
			url: node.data.source_url,
		    format: new ol.format.MVT(),
		    crossOrigin: 'anonymous'
		})
	})
	XYZVectorLayer.setZIndex(node.data.pane);
	map.addLayer(XYZVectorLayer);
	/*console.log(node.data.style_url);*/
	fetch(node.data.style_url).then(function(response) {
		  response.json().then(function(glStyle) { 
		    olms.stylefunction(XYZVectorLayer, glStyle,node.data.style_key);
		  });
	});
}

function removeXYZVectorLayer(node){
	const layersToRemove = [];
	map.getLayers().forEach(function(layer){
		if(layer.get('name') != undefined && layer.get('name')===node.key){
			layersToRemove.push(layer)
		}
	})
	if(layersToRemove.length>=1){
		map.removeLayer(layersToRemove[0]);
	}
}



/**
 * ANIMAÇÕES E EVENTOS
 */
function getLoader(){
	var loader_container = document.createElement('div');
	loader_container.className = 'loader-container';

	var loader_div = document.createElement('div');
	loader_div.className = 'csscssload-load-frame';

	for (var i=0;i<25;i++) {
		var loader = document.createElement('div');
		loader.className = 'cssload-dot';
		loader_div.appendChild(loader);
	}

	loader_container.appendChild(loader_div);
	return loader_container;
}


/**
 * CONTROLES DE MAPA
 */
Mouse_Position = function(opt_options){
	this.container = document.createElement('div');
	this.container.classList.add('custom-control');
	this.container.classList.add('rectangle-medium-ctrl');
	this.container.classList.add('Mouse-Position-Control');
	$(this.container).attr('id','mousepositioncontainer');
	this.lat = 0;
	this.lng = 0;
	$(this.container).css('font-size','11px');
	ol.control.Control.call(this,{
		element: this.container
	});

	var mousePositionControl = new ol.control.MousePosition({
		coordinateFormat: ol.coordinate.createStringXY(4),
		projection: 'EPSG:4326',
		target: this.container
	});

	map.addControl(mousePositionControl);
}

Imov_Touch_Control  = function(opt_options){
	this.TouchImovEnabled = false;
	this.container  = document.createElement('div');
	this.container.classList.add('custom-control');
	this.container.classList.add('small-ctrl');
	this.container.classList.add('Imov-Touch-Control');

	/*
	this.button     = document.createElement('button');
	this.name       = 'TouchImov';
	this.button.innerHTML = "<i class='far fa-hand-point-down fa-2x' color: #006600'></i>";
	this.button.addEventListener('click', () => {
		if (this.TouchImovEnabled==false) {
			this.onEnable();
		} else {
			this.onDisable();
		}
	});
	this.container.appendChild(this.button);
	*/

	ol.control.Control.call(this,{
		element:this.container
	});

	this.onEnable = function(){
		disableOtherControls(this.name);
		this.TouchImovEnabled = true;
		this.container.classList.add('small-ctrl-extend');
		/*this.button.innerHTML = "Inspecionar Imóvel <i class='far fa-hand-point-down fa-2x' color: #006600'></i>";*/

		map.getViewport().style.cursor = 'crosshair';
		
		map.on('moveend',       this.onDragUpdate);
		map.on('pointermove',   this.onHighlightFeature);
		map.on('singleclick',   this.onSingleClick);
		

		this.onDragUpdate();
	};

	this.onDisable = function(){
		this.TouchImovEnabled = false;
		/*this.button.innerHTML = "<i class='far fa-hand-point-down fa-2x' color: #006600'></i>";*/
		map.getViewport().style.cursor = '';
		this.container.classList.remove('small-ctrl-extend');

		map.un('moveend',       this.onDragUpdate);
		map.un('pointermove',   this.onHighlightFeature);
		map.un('singleclick',   this.onSingleClick);

		HighlightImoveisSource.clear();
	};

	this.onDragUpdate = function(){
		const geoserver_url = 'https://geo.jaraguadosul.sc.gov.br/gs/geoserver-hive/PMJS/wms';
		if (map.getView().getZoom() > 16) {

			$.post(geoserver_url, {
				service:        'WFS',
				request:        'GetFeature',
				/*typeNames:      'lim_lotes_urbanos',*/
				typeNames:      'lotes',
				version:        '2.0.0',
				srsName:        'EPSG:4326',
				outputFormat:   'application/json',
				bbox:			map.getView().calculateExtent(map.getSize()).join(',') + ', EPSG:3857'
			}, function(data) {
				/*HighlightImoveisSource.clear();*/
				HighlightImoveisSource.addFeatures(
					(new ol.format.GeoJSON()).readFeatures(
						data, {
							featureProjection: 'EPSG:3857'
						}
					)
				)
			});

			/*
			$.post(geoserver_url, {
				service:        'WFS',
				request:        'GetFeature',
				typeNames:      'eixo_ferrovia',
				version:        '2.0.0',
				srsName:        'EPSG:4326',
				outputFormat:   'application/json',bbox:map.getView().calculateExtent(map.getSize()).join(',') + ', EPSG:3857'
			}, function(data) {
				HighlightImoveisSource.clear();
				HighlightImoveisSource.addFeatures(
					(
						new ol.format.GeoJSON()
					).readFeatures(
						data, {
							featureProjection: 'EPSG:3857'
						}
					)
				)
			});
			*/		

			/*
			$.post(geoserver_url, {
				service:        'WFS',
				request:        'GetFeature',
				typeNames:      'lim_municipal',
				version:        '2.0.0',
				srsName:        'EPSG:4326',
				outputFormat:   'application/json',bbox:map.getView().calculateExtent(map.getSize()).join(',') + ', EPSG:3857'
			}, function(data) {
				HighlightImoveisSource.clear();
				HighlightImoveisSource.addFeatures(
					(
						new ol.format.GeoJSON()
					).readFeatures(
						data, {
							featureProjection: 'EPSG:3857'
						}
					)
				)
			});
			*/

		}

	};

	this.onHighlightFeature = function(e) {
		var i;
		var style_highlighted_imovel = new ol.style.Style({
			stroke: new ol.style.Stroke({
				color:'#efb800',
				width:4
			}),
			fill: new ol.style.Fill({
				color: 'rgba(249,252,78,0.1)'
			})
		})
		for (i=0;i<HoverImoveisFeatures.length;i++) {
			/*console.log(HoverImoveisFeatures[i].get('id_'));*/
			HoverImoveisFeatures[i].setStyle(null);
		}
		HoverImoveisFeatures = [];
		map.forEachFeatureAtPixel(e.pixel,function(feature){
			feature.setStyle(style_highlighted_imovel);
			HoverImoveisFeatures.push(feature);
		})
	};

	this.onSingleClick = function(e) {
		var coordinate  = ol.proj.toLonLat(e.coordinate,'EPSG:3857');
		var el          = document.createElement('div');
		var content     = document.createElement('div');
		el.appendChild(content);
		content.appendChild(getLoader());
		

		
		/*
		console.log(e);
		__adianti_ajax_exec('class=VigEpiReconhecimentoGeograficoForm&method=generatePopupStructure&lat='+coordinate[1]+'&lng='+coordinate[0],
			function(data){

				$(content).html(data);

				Imov_Popup.getElement().addEventListener('click', function(e) {
					if($(e.target).attr('data-toggle')=='tab'){
						$(e.target).tab('show');
					}
				}, false);
			},false
		);

		Imov_Popup.show(e.coordinate,el)
		*/
		
        
	}
}


ol.inherits(Imov_Touch_Control, ol.control.Control);
/*ol.inherits(Rua_Touch_Control,  ol.control.Control);*/
ol.inherits(Mouse_Position,     ol.control.Control);
/*ol.inherits(Attributions,       ol.control.Control);*/


Control_Imov_Touch     = new Imov_Touch_Control;
/*Control_Rua_Touch      = new Rua_Touch_Control;*/
Control_Mouse_Position = new Mouse_Position;
/*Control_Attributions   = new Attributions;*/

if (typeof CustomControls == 'undefined') {
    
    var CustomControls   = {
        'TouchImov': Control_Imov_Touch,
        /*'TouchRua':  Control_Rua_Touch,*/
    }
    
}


map.addControl(Control_Imov_Touch);
/*map.addControl(Control_Rua_Touch);*/
map.addControl(Control_Mouse_Position);
/*map.addControl(Control_Attributions);*/

Control_Imov_Touch.onEnable();


/**
 * DESATIVA OUTROS CONTROLES
 */
function disableOtherControls(controltokeep){
	for (var control in CustomControls) {
		if(control != controltokeep){
			CustomControls[control].onDisable();
		}
	}
}



function refreshHeatmap() {
	var geometry, extent, source, features;
	source = vectorLayer.getSource();
	features = source.getFeaturesInExtent(map.getView().calculateExtent());
	heatmapSource.clear();
	for (var i = 0; i < features.length; i++) {
		geometry = features[i].getGeometry();
		/*if ((geometry.getType() == 'Point') && (features[i].get('layer').substring(0, 4) == 'City')  && features[i].get('_name_en') )  {*/
			extent = geometry.getExtent();
			heatmapSource.addFeature(new ol.Feature({geometry: new ol.geom.Point([extent[0], extent[1]])}));
		/*}*/
	}
}


/*
function addHeatmapMarker(Markers) {
	var item = Markers;
	var longitude = item.lng;
	var latitude = item.lat;
	
	heatmapMarkers.push([longitude, latitude]);
}
*/


/**
 * clearHeatmap
 */
function clearHeatmap() {
	console.log('clearHeatmap');
	
	map.getLayers()
		.getArray()
		.filter(layer => layer.get('name') === 'HeatmapMarker')
		.forEach(function(layer) {
			var source = layer.getSource();
			map.removeLayer(layer);
		}
	);	
}


/**
 * animateHeatmap
 * @param {*} heatmapData Array of Objects
 */
function animateHeatmap(heatmapData) {
	console.log('animateHeatmap');
	console.log(heatmapData);

	/* Dados de exemplo (coordenadas e intensidade do heatmap ao longo do tempo) */
	/*
	var heatmapData = [
		{ lon: -75.1698, lat: 39.9526, value: 0.5, time: new Date("2023-11-23T08:00:00") },
		{ lon: -75.1698, lat: 39.9526, value: 0.8, time: new Date("2023-11-23T12:00:00") },
	];
	*/

	/* Crie uma fonte de dados de vetor */
	var vectorSource = new ol.source.Vector();

	/* Adicione os pontos ao vetor de fonte de dados */
	heatmapData.forEach(function(data) {
		var point = new ol.geom.Point(ol.proj.fromLonLat([data.lon, data.lat]));
		var feature = new ol.Feature(point);
		feature.setProperties({ value: data.value, time: data.time });
		vectorSource.addFeature(feature);
	});

	/* Crie a camada de vetor com a fonte de dados */
	var vectorLayer = new ol.layer.Vector({
		source: vectorSource,
		style: function(feature) {	
			/* Estilo do ponto de acordo com a intensidade do heatmap */
			var value = feature.get('value');
			var radius = value * 20; /* Ajuste conforme necessário */

			return new ol.style.Style({
				image: new ol.style.Circle({
					radius: radius,
					fill: new ol.style.Fill({ color: 'rgba(255, 0, 0, ' + value + ')' }),
					stroke: new ol.style.Stroke({ color: 'rgba(255, 0, 0, 0.5)', width: 1 })
				}),
			});
		}
	});

	/* Crie o mapa */
	/*
	var map = new ol.Map({
		target: 'map',
		layers: [
			new ol.layer.Tile({
				source: new ol.source.OSM()
			}),
			vectorLayer
		],
		view: new ol.View({
			center: ol.proj.fromLonLat([-75.1698, 39.9526]),
			zoom: 12
		})
	});
	*/

	/* Função para animar o heatmap */
	function animate() {
		vectorSource.getFeatures().forEach(function(feature) {
			var currentTime = new Date();
			var timeDiff = currentTime - feature.get('time');
			var animationValue = Math.abs(Math.sin(timeDiff / 10000)); /* Ajuste conforme necessário */
			feature.set('value', animationValue);
		});

		/* Atualize o mapa */
		vectorSource.changed();

		/* Agende a próxima animação */
		setTimeout(animate, 100);
	}

	/* Inicie a animação */
	animate();	
}

/**
 * displayHeatmap
 * @param {*} heatmapMarkers Array of coordinates (E.g.: [[53.50119612705815, -1.1270833894501477], [53.34474, -3.01101]])
 */
function displayHeatmap(heatmapMarkers) {
	console.log('displayHeatmap');
	console.log(heatmapMarkers);

	map.getLayers()
		.getArray()
		.filter(layer => layer.get('name') === 'HeatmapMarker')
		.forEach(function(layer) {
			/* var source = layer.getSource(); */
			console.log(layer);
			map.removeLayer(layer);
		}
	);

	var heatmapSource = new ol.source.Vector({
		name: 'HeatmapMarker'	
	});
      
    var heatmapLayer = new ol.layer.Heatmap({
        source: heatmapSource,
        weight: function(feature) {
          return(0.8);
        }
    });

	heatmapSource.addFeature(
		new ol.Feature({
			geometry: new ol.geom.MultiPoint(heatmapMarkers).transform('EPSG:4326', 'EPSG:3857')
		})
	);
	map.addLayer(heatmapLayer);

}



/**
 * addPin
 * @param {*} Markers 
 */
function addPin(Markers) {

	map.getLayers()
		.getArray()
		.filter(layer => layer.get('name') === 'VLMarker')
		.forEach(function(layer) {
			var source = layer.getSource();
			map.removeLayer(layer);
		}
	);

	var item = Markers;
	var longitude = item.lng;
	var latitude  = item.lat;
	var label 	  = item.label;
	item.icon     = null ?? 'vendor/marcelonees/plugins/src/OpenLayers/marker-icon.png';
	var icon 	  = item.icon;

	var iconFeature = new ol.Feature({
		geometry: new ol.geom.Point(
			ol.proj.transform(
				[longitude, latitude], 
				'EPSG:4326', 
				'EPSG:3857'
			)
		),
		name: label
	});

	var iconStyle = new ol.style.Style({
		image: new ol.style.Icon(
			{
				anchor: [0.5, 1],
				src: icon,
				scale: 0.5
			}
		)
	});

	var labelStyle = new ol.style.Style({
		text: new ol.style.Text({
			font: '12px Calibri,sans-serif',
			overflow: true,
			fill: new ol.style.Fill({
				color: '#000'
			}),
			stroke: new ol.style.Stroke({
				color: '#fff',
				width: 3
			}),
			offsetY: -12
		})
	});
	var style = [iconStyle, labelStyle];
	
	iconFeature.setStyle(iconStyle);
	features.push(iconFeature);

	var vectorSource = new ol.source.Vector({
		features: features
	});

	vectorLayer = new ol.layer.Vector({
		source: vectorSource,
		name: 'VLMarker',
		style: function(feature) {
        	labelStyle.getText().setText(feature.get('name'));
        	return style;
      	}
	});

	map.addLayer(vectorLayer);
}


/**
 * onMapClick
 * @param {*} e 
 */
function onMapClick(e) {

	const requestURL = e.b.view.Adianti.requestURL;
	const control = requestURL.replace(/^engine.php\?class=/g, '').replace(/&.+/g, '');

	console.log('control');
	console.log(control);

	lon = e.coordinate[0];
	lat = e.coordinate[1];

	lonlat = ol.proj.transform(
		[lon, lat],
		'EPSG:3857',
		'EPSG:4326'
	);

	var lon = lonlat[0];
	var lat = lonlat[1];

	/* TODO - Usar apenas na tela de RG? */
	/*
			if (document.getElementById("lat")) {
				document.getElementById("lat").value = lat;
			}
	
			if (document.getElementById("lon")) {
				document.getElementById("lon").value = lon;
			}
	*/

	var f = map.forEachFeatureAtPixel(e.pixel, function (ft, layer) {
		
		/*
		console.log('layer');
		console.log(layer);
		
		*/
		console.log('ft');
		console.log(ft);		

		/*
		var polygonGeometry = e.feature.getGeometry();
		var coords = iconFeature.getGeometry().getCoordinates();
		polygonGeometry.intersectsCoordinate(coords)
		*/
		var coordinate  = ol.proj.toLonLat(e.coordinate,'EPSG:3857');
		var el          = document.createElement('div');
		var content     = document.createElement('div');
		el.appendChild(content);
		content.appendChild(getLoader());

		/* Qual Form do Adianti está chamando essa função? */
		/*console.log('antes');*/
		/*control = ft.geometryChangeKey_.bindTo.values_.control;*/
		/*
		console.log('depois');
		*/

		console.log('control');
		console.log(control);

		if (control == 'VigEpiMinhasAtividades') {				
			/*
			programacao_id 		  = ft.geometryChangeKey_.bindTo.values_.programacao_id;
			lote_id 			  = ft.geometryChangeKey_.bindTo.values_.lote_id;
			inscricao_imobiliaria = ft.geometryChangeKey_.bindTo.values_.inscricao_imobiliaria;

			console.log('VigEpiMinhasAtividades: ' + inscricao_imobiliaria);
			__adianti_ajax_exec('class=VigEpiMinhasAtividades&method=generatePopupStructure&lat='+coordinate[1]+'&lng='+coordinate[0]+'&programacao_id='+programacao_id+'&inscricao_imobiliaria='+inscricao_imobiliaria,
				function(data){
					$(content).html(data);
	
					Imov_Popup.getElement().addEventListener('click', function(e) {
						if($(e.target).attr('data-toggle')=='tab'){
							$(e.target).tab('show');
						}
					}, false);
				}, false
			);
			Imov_Popup.show(e.coordinate, el);
			*/
		} else
			/* ft.geometryChangeKey_.bindTo.values_.chave */
		if (ft.geometryChangeKey_?.bindTo?.values_?.chave === 'undefined'){

			if (document.getElementById("lat")) {
				document.getElementById("lat").value = lat;
			}
	
			if (document.getElementById("lon")) {
				document.getElementById("lon").value = lon;
			}

			var Markers = {
				lat: lat, 
				lng: lon
			};

			addPin(Markers);

		} else {

			/* TODO - Usar apenas na tela de RG? */
			if (document.getElementById("lat")) {
				document.getElementById("lat").value = lat;
			}
	
			if (document.getElementById("lon")) {
				document.getElementById("lon").value = lon;
			}

			/*
			var coordinate  = ol.proj.toLonLat(e.coordinate,'EPSG:3857');
			var el          = document.createElement('div');
			var content     = document.createElement('div');
			el.appendChild(content);
			content.appendChild(getLoader());
			*/
	
			__adianti_ajax_exec('class=VigEpiReconhecimentoGeograficoForm&method=generatePopupStructure&lat='+coordinate[1]+'&lng='+coordinate[0],
				function(data){
	
					$(content).html(data);
	
					Imov_Popup.getElement().addEventListener('click', function(e) {
						if($(e.target).attr('data-toggle')=='tab'){
							$(e.target).tab('show');
						}
					}, false);
				}, false
			);

			Imov_Popup.show(e.coordinate, el);
		}
			
		return ft;
	});

	console.log('f');
	console.log(f);
}

map.on('click', onMapClick);