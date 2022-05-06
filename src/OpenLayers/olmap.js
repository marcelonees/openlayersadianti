

    function onMapClick(e) {

        console.log(e);
    }

    map.on('click', onMapClick);

    var view = map.getView();

    view.animate({
            center: ol.proj.fromLonLat([ lng, lat ]),
            zoom: z
    });
            
    var HighlightGeomSource = new ol.source.Vector({
        format: new ol.format.GeoJSON()
    });

    var HighlightGeomLayer = new ol.layer.Vector({
        source: HighlightGeomSource,
        style: new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: 'rgba(149,31,212,1)',
                width: 3
            }),
            fill: new ol.style.Fill({
                color:'rgba(149,31,212,0.10)'
            })
        })
    });


    HighlightGeomLayer.setZIndex(7);
    map.addLayer(HighlightGeomLayer);


    function HighlightGeom(geom) {
        HighlightGeomSource.clear();
        HighlightGeomSource.addFeatures((new ol.format.GeoJSON()).readFeatures(
            geom, {
                featureProjection: 'EPSG:3857'}
            )
        );
    }


    function HighlightAndFlyToGeom(geom, zoom) {
        HighlightGeom(geom);
        const centroid = turf.centroid(geom);
        const centroidproj = ol.proj.fromLonLat(centroid.geometry.coordinates);
        flyTo(centroidproj, zoom);
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
        }, {
            zoom: zoom,
            duration: duration / 2
        }, callback);

        if (fitafter) {
            map.getView().fit(ext, map.getSize());
        }
    }

