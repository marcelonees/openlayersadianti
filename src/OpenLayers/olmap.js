var geoserver_url = 'https://geo.jaraguadosul.sc.gov.br/gs/geoserver-hive/PMJS/wms?';

/**
 *  Cria o mapa
 */

console.log('Cria o mapa');


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
			width:1
		}),
		fill: new ol.style.Fill({
			color:'rgba(0,0,0,0)'
		})
	})
});

HighlightImoveisLayer.setZIndex(7);
map.addLayer(HighlightImoveisLayer);


/**
 * CRIA FUNÇÃO PARA LIMPAR OVERLAYS MAS MANTER ALGUNS ESPECÍFICOS
 */
function limparOverlays(){
	map.getOverlays().clear();
    /*
	map.addOverlay(Imov_Popup);
    */
}

/*
var Imov_Popup = new Popup({width:'350px'});
map.addOverlay(Imov_Popup);
*/


/**
 * CAMADA DE INSPEÇÃO DE RUAS
 */

var HoverRuasFeatures = [];
var HighlightRuasSource = new ol.source.Vector({
	format: new ol.format.GeoJSON()
})

var HighlightRuasLayer = new ol.layer.Vector({
	source: HighlightRuasSource,
	style: new ol.style.Style({
		stroke: new ol.style.Stroke({
			color: 'rgba(6,144,3,1)',
			width:1
		}),
		fill: new ol.style.Fill({
			color: 'rgba(191,237,7,0.5)',
		})
	})
})

HighlightRuasLayer.setZIndex(7);
map.addLayer(HighlightRuasLayer);




/**
 * CAMADA DE HIGHLIGHT DE POLÍGONOS
 */
var HighlightGeomSource = new ol.source.Vector({
	format: new ol.format.GeoJSON()
})

var HighlightGeomLayer = new ol.layer.Vector({
	source: HighlightGeomSource,
	style: new ol.style.Style({
		stroke: new ol.style.Stroke({
			color: 'rgba(149,31,212,1)',
			width:3
		}),
		fill: new ol.style.Fill({
			color:'rgba(149,31,212,0.10)'
		})
	})
})

HighlightGeomLayer.setZIndex(7);
map.addLayer(HighlightGeomLayer);




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




function DrawCircleOnLonLat(lon, lat, radius) {

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
                    color: 'rgba(255,15,15)',
                    width: 3
                }),
                fill: new ol.style.Fill({
                    color: 'rgba(255,15,15, 0.1)'
                })
            })
        ]
    });

    map.addLayer(circleLayer);
}







/**
 * FUNÇÕES DE GEOMETRIA
 */
function HighlightGeom(geom){
    HighlightGeomSource.clear();
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
    /*console.log('centroid: ' + centroid.geometry.coordinates);*/
    flyTo(centroidproj, zoom);
}


function centroidOfGeom(geom) {

    const centroid = turf.centroid(geom);
    
    if (document.getElementById("lat")) {
        document.getElementById("lat").setAttribute("value", centroid.geometry.coordinates[1]);
    }

    if (document.getElementById("lon")) {
        document.getElementById("lon").setAttribute("value", centroid.geometry.coordinates[0]);
    }
    console.log('centroid: ' + centroid);
    /*document.getElementById('lat').setAttribute("value", centroid.geometry.coordinates[1s]);*/
    
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
 * Eventos no StartUp
 */
if (typeof(HIGHLIGHT_IMOVEL)!='undefined') {
    HighlightandFlyToGeom(HIGHLIGHT_IMOVEL, 18)
} else if (typeof(HIGHLIGHT_RUA)!='undefined') {
    HighlightandFlyToGeom(HIGHLIGHT_RUA, 17)
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
			url:node.data.source_url,
			params:{'layers':node.data.lyr,'TILED':true,'tiled':true,'TRANSPARENT':true,'srs':'EPGS:3857','STYLES':node.data.layer_styles},
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
			url:node.data.source_url,
			crossOrigin: 'anonymous',
            maxZoom:node.data.maxzoom || 18,
            tileSize: node.data.tileSize || 256
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
	console.log(node.data.style_url);
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


Attributions = function(opt_options){
	this.container = document.createElement('div');
	this.container.classList.add('custom-control');
	this.container.classList.add('rectangle-long-ctrl');
	this.container.classList.add('Attributions-Control');

	const atr1 = $('<div class="rectangle-auto-size">Prefeitura Municipal de Jaraguá do Sul</div>');
	this.container.appendChild(atr1[0]);

	const atr2 = $('<div class="rectangle-auto-size">Secretaria Municipal de Planejamento e Urbanismo | Diretoria de TI</div>');
	this.container.appendChild(atr2[0]);

	const atr3 = $('<div class="rectangle-auto-size">Contribuidores do <a href="https://www.openstreetmap.org/">OpenStreetMap | Google Satellite</div>');
	this.container.appendChild(atr3[0]);

	$(this.container).css('font-size',          '10px');
	$(this.container).css('background-color',   'rgba(0,0,0,0');
	$(this.container).css('text-align',         'right');
	$(this.container).css('display',            'flex');
	$(this.container).css('flex-wrap',          'wrap');
	$(this.container).css('width',              '320px');
	$(this.container).css('justify-content',    'right');

	ol.control.Control.call(this,{
		element:this.container
	});
}


Rua_Touch_Control = function(opt_options){
	this.container = document.createElement('div');
	this.container.classList.add('custom-control');
	this.TouchRuaEnabled = false;
	this.container.classList.add('small-ctrl');
	this.container.classList.add('Rua-Touch-Control'); 
	this.button = document.createElement('button');
	this.name = 'TouchRua';
	this.button.innerHTML = "<i class='fas fa-road fa-2x'></i>";
	this.button.addEventListener('click', () => {
		if(this.TouchRuaEnabled==false){
			this.onEnable();
		}else {
			this.onDisable();
		}
	});
	this.container.appendChild(this.button);

	ol.control.Control.call(this,{
		element:this.container
	});

	this.onEnable = function(){
		disableOtherControls(this.name);
		this.TouchRuaEnabled = true;
		this.container.classList.add('small-ctrl-extend');
		this.button.innerHTML = "Inspecionar Ruas <i class='fas fa-road fa-2x'></i>";
		map.getViewport().style.cursor = 'crosshair';

		map.on('moveend',       this.onDragUpdate);
		map.on('pointermove',   this.onHighlightFeature);
		map.on('singleclick',   this.onSingleClick);

		this.onDragUpdate();
	};

	this.onDisable = function(){
		this.TouchRuaEnabled = false;
		this.button.innerHTML = "<i class='fas fa-road fa-2x'></i>";

		map.getViewport().style.cursor = '';
		this.container.classList.remove('small-ctrl-extend');

		map.un('moveend',       this.onDragUpdate);
		map.un('singleclick',   this.onSingleClick);
		map.un('pointermove',   this.onHighlightFeature);

		HighlightRuasSource.clear();
	};

	this.onDragUpdate = function(){
		const geoserver_url = 'https://geo.jaraguadosul.sc.gov.br/gs/geoserver-hive/PMJS/wms';
		if (map.getView().getZoom()>14) {
			$.post(geoserver_url, {
				service:        'WFS',
				request:        'GetFeature',
				typeNames:      'eixo_ruas',
				version:        '2.0.0',
				srsName:        'EPSG:4326',
				outputFormat:   'application/json',bbox:map.getView().calculateExtent(map.getSize()).join(',') + ', EPSG:3857'
			}, function(data) {
				data = turf.buffer(data,5,{units:'metres'})
				HighlightRuasSource.clear();
				HighlightRuasSource.addFeatures((new ol.format.GeoJSON()).readFeatures(data,{featureProjection: 'EPSG:3857'}))		
			})
		}
	};

	this.onHighlightFeature = function(e){
		var i;
		var style_highlighted_rua = new ol.style.Style({
			stroke: new ol.style.Stroke({
				color:'#efb800',
				lineDash: [4],
				width:3
			}),
			fill: new ol.style.Fill({
				color: 'rgba(249,252,78,0.5)'
			})
		})
		for(i=0;i<HoverRuasFeatures.length;i++){
			HoverRuasFeatures[i].setStyle(null);
		}
		HoverRuasFeatures = [];
		map.forEachFeatureAtPixel(e.pixel,function(feature){
			feature.setStyle(style_highlighted_rua);
			HoverRuasFeatures.push(feature);
		})
	};

	this.onSingleClick = function(e){
		var coord       = e.coordinate;
		var feature     = HighlightRuasSource.getFeaturesAtCoordinate(coord)[0];
		var coordinate  = e.coordinate;
		var el          = document.createElement('div');
		var content     = document.createElement('div');
		el.appendChild(content);
		content.appendChild(getLoader());
		console.log(feature);
		var chave       = feature.getProperties().chave
		var i_ruas      = parseInt(feature.getProperties().chave.match(/\d/g).join(''));;
		console.log(i_ruas);
		$.ajax({
			url: 'engine.php',
			crossDomain: true,
			data:{
				class:'GeoMapView',
				method:'getRuaPopUp',
				RUA_I_RUAS:i_ruas,
				static:1
			}
		}).done(function(data){
			$(content).html(data);
			Imov_Popup.getElement().addEventListener('click', function(e) {
				if($(e.target).attr('data-toggle')=='tab'){
					$(e.target).tab('show');
				}
			}, false);

		});
		Imov_Popup.show(coordinate, el)
	}
}


Imov_Touch_Control  = function(opt_options){
	this.container  = document.createElement('div');
	this.container.classList.add('custom-control');
	this.TouchImovEnabled = false;
	this.container.classList.add('small-ctrl');
	this.container.classList.add('Imov-Touch-Control'); 
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

	ol.control.Control.call(this,{
		element:this.container
	});

	this.onEnable = function(){
		disableOtherControls(this.name);
		this.TouchImovEnabled = true;
		this.container.classList.add('small-ctrl-extend');
		this.button.innerHTML = "Inspecionar Imóvel <i class='far fa-hand-point-down fa-2x' color: #006600'></i>";

		map.getViewport().style.cursor = 'crosshair';
		map.on('moveend',       this.onDragUpdate);
		map.on('pointermove',   this.onHighlightFeature);
		map.on('singleclick',   this.onSingleClick);

		this.onDragUpdate();
	};

	this.onDisable = function(){
		this.TouchImovEnabled = false;
		this.button.innerHTML = "<i class='far fa-hand-point-down fa-2x' color: #006600'></i>";
		map.getViewport().style.cursor = '';
		this.container.classList.remove('small-ctrl-extend');

		map.un('moveend',       this.onDragUpdate);
		map.un('singleclick',   this.onSingleClick);
		map.un('pointermove',   this.onHighlightFeature);

		HighlightImoveisSource.clear();
	};

	this.onDragUpdate = function(){
		const geoserver_url = 'https://geo.jaraguadosul.sc.gov.br/gs/geoserver-hive/PMJS/wms';
		if (map.getView().getZoom() > 16) {
			$.post(geoserver_url,{
				service:        'WFS',
				request:        'GetFeature',
				typeNames:      'lim_lotes_urbanos',
				version:        '2.0.0',
				srsName:        'EPSG:4326',
				outputFormat:   'application/json',bbox:map.getView().calculateExtent(map.getSize()).join(',') + ', EPSG:3857'
			},function(data) {
				HighlightImoveisSource.clear();
				HighlightImoveisSource.addFeatures((new ol.format.GeoJSON()).readFeatures(data,{featureProjection: 'EPSG:3857'}))
			})
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
		__adianti_ajax_exec('class=GeoMapView&method=generatePopupStructure&lat='+coordinate[1]+'&lng='+coordinate[0],
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
ol.inherits(Rua_Touch_Control,  ol.control.Control);
ol.inherits(Mouse_Position,     ol.control.Control);
ol.inherits(Attributions,       ol.control.Control);


Control_Imov_Touch     = new Imov_Touch_Control;
Control_Rua_Touch      = new Rua_Touch_Control;
Control_Mouse_Position = new Mouse_Position;
Control_Attributions   = new Attributions;

if (typeof CustomControls == 'undefined') {
    
    var CustomControls   = {
        'TouchImov': Control_Imov_Touch,
        'TouchRua': Control_Rua_Touch,
    }
    
}



map.addControl(Control_Imov_Touch);
map.addControl(Control_Rua_Touch);
map.addControl(Control_Mouse_Position);
map.addControl(Control_Attributions);

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



    function onMapClick(e) {

        /*
        console.log(e);
        */
        lon = e.coordinate[0];
        lat = e.coordinate[1];

        lonlat = ol.proj.transform(
            [lon, lat],
            'EPSG:3857',
            'EPSG:4326'
        );

        /*console.log(lonlat);*/
        /*DrawCircleOnLonLat(lonlat[0], lonlat[1], 300);*/

		var f = map.forEachFeatureAtPixel(
			e.pixel,
			function(ft, layer){

				/*
				console.log(layer);
				console.log(ft);
				*/
				

				/*
				var polygonGeometry = e.feature.getGeometry();
				var coords = iconFeature.getGeometry().getCoordinates();
				polygonGeometry.intersectsCoordinate(coords)
				*/

				if (!ft.geometryChangeKey_.bindTo.values_.chave) {

					/*alert('Coordenadas: ' + lon + ', ' + lat);*/

					if (document.getElementById("lat")) {
						document.getElementById("lat").setAttribute("value", lonlat[1]);
					}
			
					if (document.getElementById("lon")) {
						document.getElementById("lon").setAttribute("value", lonlat[0]);        
					}
				}				
				
				return ft;
			}
		);
		
		/*
		if (f && f.get('type') == 'click') {
			
			var geometry = f.getGeometry();
			var coord = geometry.getCoordinates();
			
			var content = '<p>'+f.get('desc')+'</p>';

			

			// popup.show(coord, content);
			
		}*/
		/* else {
			popup.hide();
		}*/


    }

    map.on('click', onMapClick);

	/*
	var style = [
		new ol.style.Style({
			image: new ol.style.Icon(({
				scale: 0.7,
				rotateWithView: false,
				anchor: [0.5, 1],
				anchorXUnits: 'fraction',
				anchorYUnits: 'fraction',
				opacity: 1,
				src: 'https://raw.githubusercontent.com/jonataswalker/map-utils/master/images/marker.png'
			})),
			zIndex: 5
		}),
		new ol.style.Style({
			image: new ol.style.Circle({
				radius: 5,
				fill: new ol.style.Fill({
					color: 'rgba(255,255,255,1)'
				}),
				stroke: new ol.style.Stroke({
					color: 'rgba(0,0,0,1)'
				})
			})
		})
	];

	
	var popup = new ol.Overlay.Popup();
	map.addOverlay(popup);

	var feature = new ol.Feature({
		type: 'click',
		desc: 'long_string',
		geometry: new ol.geom.Point([0, 0])
	});

	feature.setStyle(style);
	sourceFeatures.addFeature(feature);

	map.on('click', function(evt) {

        lon = evt.coordinate[0];
        lat = evt.coordinate[1];

        lonlat = ol.proj.transform(
            [lon, lat],
            'EPSG:3857',
            'EPSG:4326'
        );


		var f = map.forEachFeatureAtPixel(
			evt.pixel,
			function(ft, layer){return ft;}
		);
		
		if (f && f.get('type') == 'click') {
			var geometry = f.getGeometry();
			var coord = geometry.getCoordinates();
			
			var content = '<p>'+f.get('desc')+'</p>';

			popup.show(coord, content);
			
		} else {
			popup.hide();
		}
		
	});

	map.on('pointermove', function(e) {
		if (e.dragging) { popup.hide(); return; }
		
		var pixel 	= map.getEventPixel(e.originalEvent);
		var hit 	= map.hasFeatureAtPixel(pixel);
		
		map.getTarget().style.cursor = hit ? 'pointer' : '';
	});

	*/