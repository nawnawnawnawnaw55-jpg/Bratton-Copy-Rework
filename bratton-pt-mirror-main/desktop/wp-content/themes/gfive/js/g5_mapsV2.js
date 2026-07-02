var maps=[];
var infowindows=[];

function dogmap(){
	console.log("Executing dogmap from /wp-content/themes/gfive/js/g5_mapsV2.js");
	$('.g5-gmap').each(function(i){
		// var params=$(this).metadata();
		$(this).html('');
		var params=$(this).data();
		console.log("Map Object:");
		console.log(params);
		maps[i]=[];
		maps[i].expocolor='#444444';
		if(params.expocolor!==undefined){
			maps[i].expocolor=params.expocolor;
		}
		maps[i].zoom=4;
		if(params.zoom!==undefined)maps[i].zoom=params.zoom;
		maps[i].zoom=20-maps[i].zoom;
		maps[i].id=params.gmapId;
		maps[i].domspot=this;
		if('static' in params && params.static === true) maps[i].static = true;
		else if('static' in params && params.static === false) maps[i].static = false;
		else if($(this).parents('footer').length > 0) maps[i].static = true;
		else maps[i].static = false;
		if(params.larger===true || params.directions===true){
			var links='';
			if(params.larger===true)links+="<a href='#' class='g5-gmaplarger'>LARGER MAP</a>";
			if(params.practice_id===undefined){
				if(params.directions===true)links+="<a href='#' class='g5-gmapdirections uk-float-right'>DIRECTIONS</a>";
			}
			$(this).html("<div class='g5-gmaptopper'>"+links+"</div>");
		}
		var ajaxparams;
		if(params.practice_id!==undefined){
			ajaxparams={practice_id:params.practice_id};
			maps[i].multi=true;
		} else {
			ajaxparams={id:maps[i].id};
		}
		ajaxparams.footer = $(this).parents('footer').length;
		ajaxparams.g5 = 1;
		ajaxparams.url = window.location.pathname;
		var mapheight=$(this).outerHeight(true);
		var mapwidth=$(this).outerWidth();
		if(mapwidth == 0) {
			console.log('Element hidden, quickly showing first...');
			el = $(this).clone();
			$("body").append(el);
			mapwidth=$(el).outerWidth();
			el.remove();
		}
		var newmapdiv=$("<div class='g5-newgmap' style='height:"+mapheight+"px;' />");
		$(this).height(mapheight+24);
		$(this).append(newmapdiv);
		maps[i].domspot=$(this).find('.g5-newgmap').get(0);
		$(maps[i].domspot).data('mapid',i);
		maps[i].height=$(maps[i].domspot).height();
		maps[i].orig=$(maps[i].domspot).parents('.g5-gmap');
		if(maps[i].static) {
			newmapdiv.addClass('js-staticmap');
			ajaxparams.zoom = maps[i].zoom;
			ajaxparams.staticdims = mapwidth + 'x' + mapheight;
			console.log("Static dog");
			$(newmapdiv).load('https://ptclinic.com/g5/mapdata_static.php', ajaxparams);
			return;
		}
		maps[i].bounds = new google.maps.LatLngBounds();
		$.ajax({
			dataType:'jsonp',
			data:ajaxparams,
			jsonp:'jsonp_callback',
			url:'https://www.ptclinic.com/g5/mapdataV2.php',
			success:function(data){
				var highlat=-1000;
				var lowlat=1000;
				var highlon=-1000;
				var lowlon=1000;
				maps[i].map_style=[];
				var allmaps={};
				$.each(data.clinics,function(j,val){
					allmaps[j]=[];
					var md=val;

					if(md.lat>highlat)highlat=md.lat;
					if(md.lon>highlon)highlon=md.lon;
					if(md.lat<lowlat)lowlat=md.lat;
					if(md.lon<lowlon)lowlon=md.lon;
					allmaps[j].point=new google.maps.LatLng(md.lat,md.lon);
					maps[i].bounds.extend(allmaps[j].point);
					allmaps[j].marker=new google.maps.Marker();
					allmaps[j].marker.setPosition(allmaps[j].point);
					allmaps[j].infowindow = new google.maps.InfoWindow({
						content: dogmapballoon(val),
						position: allmaps[j].point
					});
					infowindows.push(allmaps[j].infowindow);
					if(maps[i].height>279){
						google.maps.event.addListener(allmaps[j].marker, 'click', function () {
							allmaps[j].infowindow.open(maps[i].map);
						});
					} else{
						google.maps.event.addListener(allmaps[j].marker, 'click', function () {
							// maps[i].modal.dialog('open');
							// mapmodal.open({mapID:i});
							$(maps[i].domspot).parent().find('.g5-gmaplarger').click();
							allmaps[j].infowindow.open(maps[i].map);
						});
					}
					allmaps[j].data=val;
				});
				var zoomup=1.001;
				var zoomdown=.999;
				var southwest1=new google.maps.LatLng(lowlat*zoomdown,highlon*zoomup);
				var southwest=new google.maps.LatLng(lowlat,highlon);
				var northeast1=new google.maps.LatLng(highlat*zoomup,lowlon*zoomdown);
				var northeast=new google.maps.LatLng(highlat,lowlon);
				var ctrlat=(parseFloat(highlat)+parseFloat(lowlat))/2;
				var ctrlon=(parseFloat(highlon)+parseFloat(lowlon))/2;
				if(maps[i].multi===undefined){
					maps[i].center=allmaps[0].point;
				}
				maps[i].center= new google.maps.LatLng(ctrlat,ctrlon);
				maps[i].map=new google.maps.Map(maps[i].domspot,{
					zoom: maps[i].zoom,
					streetViewControl:false,
					center:maps[i].center,
					mapTypeId: google.maps.MapTypeId.ROADMAP
				});
				// map_style is from the clinics table in DB
				if(data.clinics[0].map_style!=null){
					var map_styles=$.parseJSON(data.clinics[0].map_style);
					maps[i].map.setOptions({styles:map_styles});
				}
				maps[i].map.fitBounds(maps[i].bounds);
				maps[i].listener = google.maps.event.addListener(maps[i].map, "idle", function() {
					if (maps[i].map.getZoom() > 1) maps[i].map.setZoom(maps[i].zoom);
					google.maps.event.removeListener(maps[i].listener);
				});
				if(params.directionsmap===true){
					maps[i].ds = new google.maps.DirectionsService();
					maps[i].dr = new google.maps.DirectionsRenderer();
					maps[i].dr.setMap(maps[i].map);
					maps[i].dr.setPanel(document.getElementById('directionsaddress'));
				}
				if(maps[i].height<280){
				}else{
					maps[i].map.setOptions({
						'zoomControlOptions':{
							'style':google.maps.ZoomControlStyle.LARGE
						}
					});
				}
				$.each(allmaps,function(k,val){
					allmaps[k].marker.setMap(maps[i].map);
				});
				maps[i].balloonwidth=$(maps[i].domspot).width()-170;
			}
		});
		var resizeTimer;
		$(window).on('resize', function(e) {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(function() {
				modal_height=$(window).height();
				$('#g5-modal-content-map').height(modal_height-80);
				maps.forEach(function(onemap){
					if(onemap.static) return true;
					google.maps.event.trigger(onemap.map,"resize");
					onemap.map.setCenter(onemap.center);
				})
			}, 250);
		});
	});

$('.g5-gmaplarger').live('click',function(){
	var ng=$(this).parents('.g5-gmap').find('.g5-newgmap');
	var i=ng.data('mapid');
	if(maps[i].static) {
		$('.js-staticmap').parents().data('static', false);
		window.modalMap = i;
		if(typeof google === 'undefined' || typeof google.maps === 'undefined') {
			$.getScript("https://maps.google.com/maps/api/js?key=AIzaSyCwLl_vXSbYwIwHf1Q86UHUhNSbf81XCUY&callback=showgmaplarger");
			// $.getScript("https://maps.google.com/maps/api/js?key=AIzaSyBp9pYaGLax8sPKnysCE6pXKpYMV9-IP_s&callback=showgmaplarger");
			return false;
		}
		else dogmap();
	}
	// console.log(i);
	g5_add_lightbox('map',maps[i].expocolor);
	$(maps[i].domspot).width('100%').height('100%');
	modal_height=$( window ).height();
	$('#g5-modal-content-map').height(modal_height-80).html(maps[i].domspot);
	$('#g5-modal-map').on("hide.uk.modal",function(){
		// console.log("Hiding");
		$(maps[i].domspot).height(maps[i].height).appendTo(maps[i].orig);
		google.maps.event.trigger(maps[i].map,"resize");maps[i].map.setCenter(maps[i].center);
		$.each(infowindows,function(k,val){
			infowindows[k].close();
		});
		$('#g5-modal-map').off('hide.uk.modal');
	});
	var modal = UIkit.modal("#g5-modal-map");
	modal.show();
	google.maps.event.trigger(maps[i].map,"resize");
	maps[i].map.setCenter(maps[i].center);
	return false;
});
$('.g5-gmapdirections').live('click',function(){
	var ng=$(this).parents('.g5-gmap').find('.g5-newgmap');
	var mapid=ng.data('mapid');
	window.location='/library_directions_'+maps[mapid].id;
	return false;
});
$('.js-staticmap').live('click', function() {
	$('.js-staticmap').parents().data('static', false);
	if(typeof google === 'undefined' || typeof google.maps === 'undefined') $.getScript("https://maps.google.com/maps/api/js?key=AIzaSyCwLl_vXSbYwIwHf1Q86UHUhNSbf81XCUY&callback=dogmap");
	else dogmap();
	return false;
})
}
// function dogmapOld(){
// 	console.log("Executing dogmap from /wp-content/themes/gfive/js/g5_maps.js");
// 	$('.g5-gmap').each(function(i){
// 		// var params=$(this).metadata();
// 		var params=$(this).data();
// 		console.log("Map Object:");
// 		console.log(params);
// 		maps[i]=[];
// 		maps[i].expocolor='#444444';
// 		if(params.expocolor!==undefined){
// 			maps[i].expocolor=params.expocolor;
// 		}
// 		maps[i].zoom=4;
// 		if(params.zoom!==undefined)maps[i].zoom=params.zoom;
// 		maps[i].zoom=20-maps[i].zoom;
// 		maps[i].id=params.gmapId;
// 		maps[i].domspot=this;
// 		if(params.larger===true || params.directions===true){
// 			var mapheight=$(this).outerHeight(true);
// 			var mapwidth=$(this).outerWidth();
// 			var newmapdiv=$("<div class='g5-newgmap' style='height:"+mapheight+"px;' />");
// 			$(this).height(mapheight+24);
// 			var links='';
// 			if(params.larger===true)links+="<a href='#' class='g5-gmaplarger'>LARGER MAP</a>";
// 			if(params.practice_id===undefined){
// 				if(params.directions===true)links+="<a href='#' class='g5-gmapdirections uk-float-right'>DIRECTIONS</a>";
// 			}
// 			$(this).html("<div class='g5-gmaptopper'>"+links+"</div>");
// 			$(this).append(newmapdiv);
// 			maps[i].domspot=$(this).find('.g5-newgmap').get(0);
// 			$(maps[i].domspot).data('mapid',i);
// 		}
// 		var ajaxparams;
// 		if(params.practice_id!==undefined){
// 			ajaxparams={practice_id:params.practice_id};
// 			maps[i].multi=true;
// 		} else {
// 			ajaxparams={id:maps[i].id};
// 		}
// 		maps[i].bounds = new google.maps.LatLngBounds();
// 		$.ajax({
// 			dataType:'jsonp',
// 			data:ajaxparams,
// 			jsonp:'jsonp_callback',
// 			url:'https://www.ptclinic.com/g5/mapdata.php',
// 			success:function(data){
// 				var highlat=-1000;
// 				var lowlat=1000;
// 				var highlon=-1000;
// 				var lowlon=1000;
// 				maps[i].height=$(maps[i].domspot).height();
// 				maps[i].map_style=[];
// 				var allmaps={};

// 				$.each(data.clinics,function(j,val){
// 					allmaps[j]=[];
// 					var md=val;

// 					if(md.lat>highlat)highlat=md.lat;
// 					if(md.lon>highlon)highlon=md.lon;
// 					if(md.lat<lowlat)lowlat=md.lat;
// 					if(md.lon<lowlon)lowlon=md.lon;
// 					allmaps[j].point=new google.maps.LatLng(md.lat,md.lon);
// 					maps[i].bounds.extend(allmaps[j].point);
// 					allmaps[j].marker=new google.maps.Marker();
// 					allmaps[j].marker.setPosition(allmaps[j].point);
// 					allmaps[j].infowindow = new google.maps.InfoWindow({
// 						content: dogmapballoon(val),
// 						position: allmaps[j].point
// 					});
// 					infowindows.push(allmaps[j].infowindow);
// 					if(maps[i].height>279){
// 						google.maps.event.addListener(allmaps[j].marker, 'click', function () {
// 							allmaps[j].infowindow.open(maps[i].map);
// 						});
// 					} else{
// 						google.maps.event.addListener(allmaps[j].marker, 'click', function () {
// 							// maps[i].modal.dialog('open');
// 							mapmodal.open({mapID:i});
// 							allmaps[j].infowindow.open(maps[i].map);
// 						});
// 					}
// 					allmaps[j].data=val;
// 				});
// 				var zoomup=1.001;
// 				var zoomdown=.999;
// 				var southwest1=new google.maps.LatLng(lowlat*zoomdown,highlon*zoomup);
// 				var southwest=new google.maps.LatLng(lowlat,highlon);
// 				var northeast1=new google.maps.LatLng(highlat*zoomup,lowlon*zoomdown);
// 				var northeast=new google.maps.LatLng(highlat,lowlon);
// 				var ctrlat=(parseFloat(highlat)+parseFloat(lowlat))/2;
// 				var ctrlon=(parseFloat(highlon)+parseFloat(lowlon))/2;
// 				if(maps[i].multi===undefined){
// 					maps[i].center=allmaps[0].point;
// 				}
// 				maps[i].orig=$(maps[i].domspot).parents('.g5-gmap');
// 				maps[i].center= new google.maps.LatLng(ctrlat,ctrlon);
// 				maps[i].map=new google.maps.Map(maps[i].domspot,{
// 					zoom: maps[i].zoom,
// 					streetViewControl:false,
// 					center:maps[i].center,
// 					mapTypeId: google.maps.MapTypeId.ROADMAP
// 				});
// 				// map_style is from the clinics table in DB
// 				if(data.clinics[0].map_style!=null){
// 					var map_styles=$.parseJSON(data.clinics[0].map_style);
// 					maps[i].map.setOptions({styles:map_styles});
// 				}
// 				maps[i].map.fitBounds(maps[i].bounds);
// 				maps[i].listener = google.maps.event.addListener(maps[i].map, "idle", function() {
// 					if (maps[i].map.getZoom() > 1) maps[i].map.setZoom(maps[i].zoom);
// 					google.maps.event.removeListener(maps[i].listener);
// 				});
// 				if(params.directionsmap===true){
// 					maps[i].ds = new google.maps.DirectionsService();
// 					maps[i].dr = new google.maps.DirectionsRenderer();
// 					maps[i].dr.setMap(maps[i].map);
// 					maps[i].dr.setPanel(document.getElementById('directionsaddress'));
// 				}
// 				if(maps[i].height<280){
// 				}else{
// 					maps[i].map.setOptions({
// 						'zoomControlOptions':{
// 							'style':google.maps.ZoomControlStyle.LARGE
// 						}
// 					});
// 				}
// 				$.each(allmaps,function(k,val){
// 					allmaps[k].marker.setMap(maps[i].map);
// 				});
// 				maps[i].balloonwidth=$(maps[i].domspot).width()-170;
// 			}
// 		});
// 		var resizeTimer;
// 		$(window).on('resize', function(e) {
// 			clearTimeout(resizeTimer);
// 			resizeTimer = setTimeout(function() {
// 				modal_height=$(window).height();
// 				$('#g5-modal-content-map').height(modal_height-80);
// 				maps.forEach(function(onemap){
// 					google.maps.event.trigger(onemap.map,"resize");
// 					onemap.map.setCenter(onemap.center);
// 				})
// 			}, 250);
// 		});
// 	});

// $('.g5-gmaplarger').live('click',function(){
// 	var ng=$(this).parents('.g5-gmap').find('.g5-newgmap');
// 	var i=ng.data('mapid');
// 	// console.log(i);
// 	g5_add_lightbox('map',maps[i].expocolor);
// 	$(maps[i].domspot).width('100%').height('100%');
// 	modal_height=$( window ).height();
// 	$('#g5-modal-content-map').height(modal_height-80).html(maps[i].domspot);
// 	$('#g5-modal-map').on("hide.uk.modal",function(){
// 		// console.log("Hiding");
// 		$(maps[i].domspot).height(maps[i].height).appendTo(maps[i].orig);
// 		google.maps.event.trigger(maps[i].map,"resize");maps[i].map.setCenter(maps[i].center);
// 		$.each(infowindows,function(k,val){
// 			infowindows[k].close();
// 		});
// 		$('#g5-modal-map').off('hide.uk.modal');
// 	});
// 	var modal = UIkit.modal("#g5-modal-map");
// 	modal.show();
// 	google.maps.event.trigger(maps[i].map,"resize");
// 	maps[i].map.setCenter(maps[i].center);
// 	return false;
// });
// $('.g5-gmapdirections').live('click',function(){
// 	var ng=$(this).parents('.g5-gmap').find('.g5-newgmap').get(0);
// 	var mapid=$(ng).data('mapid');
// 	window.location='/library_directions_'+maps[mapid].id;
// 	return false;
// });
// }



function dogmapballoon(data){
	display_name=data.pName;
	console.log("dogmapbaloon data:");
	console.log(data);
	if(data.nap_name.length>0){
		display_name=data.nap_name;
	}
	var balloon="<div class='gmapballon'>";
	balloon+="<h4 style='margin-bottom:2px;display:inline;'>"+display_name+"</h4>";
	balloon+="<br/>"+data.street1;
	balloon+="<br/>"+data.city+" "+data.state+" "+data.zip;
	balloon+="<br/>"+data.phone;
	balloon+="</div>";
	return balloon;
}

function dogmapdirections(toAddress){
	$('.address-panel').hide();
	$('#directionsaddress').show().width('100%');
	fromAddress = $("#street").val()+' '+ $("#zip").val();
	var request = {
		origin: fromAddress,
		destination: toAddress,
		travelMode: google.maps.DirectionsTravelMode.DRIVING
	};
	maps[0].ds.route(request, function(response, status) {
		if (status == google.maps.DirectionsStatus.OK) {
			maps[0].dr.setDirections(response);
			// kyle add
			$('#content')
			.after("<a class='uk-button uk-button-primary uk-width-1-1 uk-margin-small' value='submit' href=\"javascript:printDiv('directionsaddress');\">Print Directions</a>")
			.before("<a class='uk-button uk-button-primary uk-width-1-1 uk-margin-small' value='submit' href=\"javascript:printDiv('directionsaddress');\">Print Directions</a>");
		}else{
			dogmaphandleErrorsV3(status);
		}
	});
}

// kyle add
function printDiv(elementId) {
    // var a = document.getElementById('printing-css').value;
    // console.log(elementId)
	var restorepage = document.body.innerHTML;
	document.getElementById(elementId).style.margin='80px';
	var printcontent = document.getElementById(elementId).innerHTML;
	document.body.innerHTML = printcontent;
	window.print();
	document.body.style.padding='0px';
	document.body.innerHTML = restorepage;
    // var b = $('#content').html();
    // window.frames["print_frame"].document.title = document.title;
    // window.frames["print_frame"].document.body.innerHTML =  b;
    // window.frames["print_frame"].window.focus();
    // window.frames["print_frame"].window.print();
}

function dogmaphandleErrorsV3(status){
	if (status == google.maps.DirectionsStatus.NOT_FOUND)
		alert("No corresponding geographic location could be found for one of the specified addresses. This may be due to the fact that the address is relatively new, or it may be incorrect.");
	else if (status == google.maps.DirectionsStatus.ZERO_RESULTS)
		alert("Zero corresponding geographic location could be found for one of the specified addresses. This may be due to the fact that the address is relatively new, or it may be incorrect.");
	else if (status == google.maps.DirectionsStatus.UNKNOWN_ERROR)
		alert("A geocoding or directions request could not be successfully processed, yet the exact reason for the failure is not known.\n");
	else if (status == google.maps.DirectionsStatus.INVALID_REQUEST)
		alert("The request was either missing or had no value. For geocoder requests, this means that an empty address was specified as input. For directions requests, this means that no query was specified in the input.\n");
	else if (status == google.maps.DirectionsStatus.REQUEST_DENIED)
		alert("The given key is either invalid or does not match the domain for which it was given.");
	else alert("An unknown error occurred.");
	console.log("Map Status:"+status);
	$('.address-panel').show();
	$('#street').focus();
}

function dogmapaddresses(){
	$('.gmapaddress').each(function(i){
		var params=$(this).data();
		// var params=$(this).metadata();
		dogmapaddress(params,this);
	});
}


function dogmapaddress(params,spot){
	var ajaxparams={id:params.id};
	$.ajax({
		dataType:'jsonp',
		data:ajaxparams,
		jsonp:'jsonp_callback',
		url:'https://www.ptclinic.com/x3/mapdata.php',
		success:function(data){
			data=data.clinics[0];
			var address='';
			address+="<div class='g5-gmap-address' id='gmapaddress_"+params.id+"'>";
			address+="<h4>"+data.LocationName+"</h4>";
			address+=data.street1;
			address+="<br/>"+data.city+" "+data.state+" "+data.zip;
			if(params.phone!=undefined){
				address+="<br/>"+params.phone+data.phone;
			} else {
				address+="<br/>Phone: "+data.phone;
			}
			if(params.fax!=undefined){
				address+="<br/>"+params.fax+data.fax;
			}
			address+="</div>";
			$(spot).html(address);
		}
	});
}

function showgmaplarger() {
	dogmap();
	i = window.modalMap;
	g5_add_lightbox('map',maps[i].expocolor);
	$(maps[i].domspot).width('100%').height('100%');
	modal_height=$( window ).height();
	$('#g5-modal-content-map').height(modal_height-80).html(maps[i].domspot);
	$('#g5-modal-map').on("hide.uk.modal",function(){
		console.log("Hiding");
		$(maps[i].domspot).height(maps[i].height).appendTo(maps[i].orig);
		google.maps.event.trigger(maps[i].map,"resize");maps[i].map.setCenter(maps[i].center);
		$.each(infowindows,function(k,val){
			infowindows[k].close();
		});
		$('#g5-modal-map').off('hide.uk.modal');
	});
	var modal = UIkit.modal("#g5-modal-map");
	modal.show();
	google.maps.event.trigger(maps[i].map,"resize");
	maps[i].map.setCenter(maps[i].center);
}
