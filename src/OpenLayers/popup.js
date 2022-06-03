// function constructMapPopUp(e){
//     var popup = L.popup({minWidth:"auto",maxWidth: "auto", height:250});
//     var pnt = e;
//     lat = e.latlng.lat;
// 	lng = e.latlng.lng;
//     var pop_div = document.createElement('div');
//     pop_div.className = "popDiv"
//     pop_div.appendChild(getLoader());
//     // var tree = $("#layerstree").fancytree("getTree");
//     // var node = tree.getNodeByKey(Imov_Touch_Control.nodeKey)
//     var req_ins = $.post(GeoServer_constructURL_featureByLatLng(e.latlng,Imov_Touch_Control.wms_url,Imov_Touch_Control.wms_layer), {crossDomain: true});
//     req_ins.done(function(data){
//          if(data['numberReturned']>0){
//                 var first_valid_feature = null;
//                 data['features'].forEach(function(feature){
//                 feature['id'] = feature['id'].split('.')[0]
//                 })
//                 for (let index = 0; index < data['features'].length; index++) {
//                     if(data['features'][0]['id']=='lotes_rurais' || data['features'][0]['id']=='lotes'){
//                         first_valid_feature = data['features'][index];
//                     }
//                 }
//                 if( first_valid_feature['id']=='lotes_rurais'){
//                     Imov_Touch_Control.currentKey = data['features'][0]['properties']['chave'],
//                     Imov_Touch_Control.currentGeom = JSON.stringify(data['features'][0]["geometry"]['coordinates'][0][0])
//                     Imov_Touch_Control.currentTipo = data['features'][0]['id']
//                     chave = data['features'][0]['properties']['chave'];
//                     HighlightGeom(data);
//                     getImovInfo(popup,chave,data,e,data['features'][0]['id']);
//                     popup.setContent(pop_div);
//                 }else if ( first_valid_feature['id']=='lotes'){ 
//                     Imov_Touch_Control.currentKey = data['features'][0]['properties']['chave'],
//                     Imov_Touch_Control.currentGeom = JSON.stringify(data['features'][0]["geometry"]['coordinates'][0][0])
//                     chave = data['features'][0]['properties']['chave'];
//                     Imov_Touch_Control.currentTipo = data['features'][0]['id']
//                     HighlightGeom(data);
//                     getImovInfo(popup,chave,data,e,data['features'][0]['id']);
//                     popup.setContent(pop_div);
//                 }else{
//                     pop_div.innerHTML='Nenhum Imóvel Encontrado'
//                     popup.setContent(pop_div);
//                 }
                
//          }else{
//             pop_div.innerHTML='Nenhum Imóvel Encontrado'
//             popup.setContent(pop_div);
//          }   
//         }    
//     )

    
//     return popup;
// }



function constructMapPopUp(e){
    var popup = L.popup({minWidth:"auto",maxWidth: "auto", height:250});
    var pnt = e;
    lat = e.latlng.lat;
	lng = e.latlng.lng;
    var pop_div = document.createElement('div');
    pop_div.className = "popDiv"
    pop_div.appendChild(getLoader());
    popup.setContent(pop_div);
    // var tree = $("#layerstree").fancytree("getTree");
    // var node = tree.getNodeByKey(Imov_Touch_Control.nodeKey)
    $('#sidebar_cadastro_info_panel').remove();
    __adianti_ajax_exec('class=GeoMapView&method=generatePopup&lat='+e.latlng.lat+'&lng='+e.latlng.lng,function(data){
        const imov_panel = $('#imovel_info_panel').detach();
        const sidebar_imov_info_panel = $('#sidebar_imov_info').detach();
        sidebar_imov_info_panel.attr('id','sidebar_imov_info_panel')
        $('#table_imov_info').html(sidebar_imov_info_panel);
        $('#table_imov_info').show()
        popup.setContent(imov_panel[0]);
    })
    // $.ajax({
    //     url:'engine.php',
    //     crossDomain: true,
    //     data:{
    //     class:'GeoMapView',
    //     method:'generatePopup',
    //     lat:e.latlng.lat,
    //     lng:e.latlng.lng,
    //     static:'1'}}).done(function(data){
    //     popup.setContent(data);
    //     $('input[name=POP_LAT]').val(e.latlng['lat'].toFixed(8))
    //     $('input[name=POP_LNG]').val(e.latlng['lng'].toFixed(8))
    //      $('#popupdiv > legend').css('box-shadow','0 0 0 0 white')
    //     }) 
    return popup;
}





function getImovInfo(popup,chave,geom,e,tipo){
        coords = JSON.stringify(geom['features'][0]["geometry"]['coordinates'][0][0])
        $.ajax({
            url:'engine.php',
            crossDomain: true,
            data:{
            class:'GeoMapView',
            method:'generatePopup',
            ins:chave,
            static:'1'}}).done(function(data){
            popup.setContent(data);
            // $('#popupdiv fieldset').each(function(idx){ $(this).parent().css('position','relative');
            //                                           })
            // $('#frame_erbs').parent().css('position','relative')
            // $('#frame_erbs').parent().css('top','0') 
            // $('#frame_helipontos').parent().css('position','relative')
            // $('#frame_helipontos').parent().css('top','0') 
            // $('#frame_evolucao_perimetro').parent().css('position','relative')
            // $('#frame_evolucao_perimetro').parent().css('top','0') 
            // $('#frame_zoneamento').parent().css('top','0')
            // $('#frame_zoneamento').parent().css('position','relative')
            // $('#frame_acoes_usosolo').parent().css('top','0')
            // $('.leaflet-popup-content').css('width','auto');
            // $('#frame_acoes_usosolo').parent().css('position','relative') 
            // $('#frame_acoes').parent().css('left','-40px!important') 
            // $('#frame_acoes').parent().css('top','200px!important') 
            // $('#frame_acoes').parent().css('position','relative!important') 

            // // $('#frame_acoes').parent().css('top','0') 
            // // $('#frame_acoes').parent().css('position','relative')
            $('input[name=POP_LAT]').val(e.latlng['lat'].toFixed(8))
            $('input[name=POP_LNG]').val(e.latlng['lng'].toFixed(8))
            // $('#popupdiv').parent().css('position','relative')
            // //getZoneamento();
            // $("#btn_verEvolucao").click(getEvolucaoPerimetro);
            // $("#btn_verERBs").click(getERBs);
            // $("#btn_verHelipontos").click(getHelipontos);
             $('#popupdiv > legend').css('box-shadow','0 0 0 0 white')
            }) 
}


function getInundacao(){
        $.ajax({
            url:'engine.php',
            crossDomain: true,
            data:{
            class:'GeoEngine',
            method:'TubosPorGeom',
            coords:Imov_Touch_Control.currentGeom,
            static:'1'}}).done(function(data){
                console.log(data)
            })         
}


function getZoneamento(){
        $.ajax({
            url:'engine.php',
            crossDomain: true,
            data:{
            class:'GeoEngine',
            method:'getZoneamento',
            ins:Imov_Touch_Control.currentKey,
            static:'1'}}).done(function(data){
                $('#frame_zoneamento').find('div').html(data)
            })         
}

function getEvolucaoPerimetro(){
        $.ajax({
            url:'engine.php',
            crossDomain: true,
            data:{
            class:'GeoEngine',
            method:'getEvolucaoPerimetro',
            ins:Imov_Touch_Control.currentKey,
            coords:Imov_Touch_Control.currentGeom,
            static:'1'}}).done(function(data){
                $('#frame_evolucao_perimetro').find('div').html(data)
            })         
}

function getERBs(){
        $.ajax({
            url:'engine.php',
            crossDomain: true,
            data:{
            class:'GeoEngine',
            method:'getERBs',
            ins:Imov_Touch_Control.currentKey,
            coords:Imov_Touch_Control.currentGeom,
            static:'1'}}).done(function(data){
                $('#frame_erbs').find('div').html(data)
            })         
}


function getHelipontos(){
        $.ajax({
            url:'engine.php',
            crossDomain: true,
            data:{
            class:'GeoEngine',
            method:'getHelipontos',
            ins:Imov_Touch_Control.currentKey,
            coords:Imov_Touch_Control.currentGeom,
            static:'1'}}).done(function(data){
                $('#frame_helipontos').find('div').html(data)
            })         
}
