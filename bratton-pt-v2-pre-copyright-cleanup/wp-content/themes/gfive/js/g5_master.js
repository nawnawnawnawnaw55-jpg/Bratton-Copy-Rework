var $ = jQuery;
var wc_frame_target = '#arframe';

$(function($) {
    $("*[data-g5-phonelink]").click(function(){
        var phonenum=$(this).attr('href');
        var practice_id=$('#practiceid').text();
        if (typeof clientip != 'undefined') {
            cc=clientip;
        }else{
            cc=0;
        }
        console.log(practice_id+ " CC IP: " + cc + ' Click 2 Call ' + phonenum);
        window.postMessage({sc: "event", sid: practice_id, event: "click2call", params: phonenum}, window.origin);
        $.ajax({
            url : "https://ptclinic.com/g5/click2calltrack.php",
            type:'post',
            dataType:"jsonp",
            data:{'tel':phonenum,'practice_id':practice_id,'clientip':cc,'theme':'g5'},
            jsonpCallback:'c2c_callback'
        });
    });


    function c2c_callback(){
        // console.log("Done..");
    }

    $("*[data-g5-maplink]").click(function(){
        var mapid=$(this).attr('id');
        console.log('Map Link ' + mapid);

    });

    // Vanilla JS More dropdown toggle (replaces broken jQuery slideToggle)
    document.addEventListener('click', function(e) {
        var moreBtn = e.target.closest('[data-g5-qa]');
        if (moreBtn) {
            e.preventDefault();
            var qa = document.querySelector('.g5-quickaccess');
            if (qa) {
                var isHidden = qa.style.display === 'none' || !qa.style.display;
                if (isHidden) {
                    qa.style.display = 'block';
                    if (window.UIkit) {
                        var btns = document.querySelector('.g5-quickaccess-buttons');
                        if (btns) UIkit.Utils.checkDisplay(btns);
                    }
                } else {
                    qa.style.display = 'none';
                }
            }
        }
    });


    // $('.uk-accordion').on('toggle.uk.accordion', function (event, active, toggle, content) {
    // 	if(active){
    // 		var a = $(toggle[0]).offset().top;
    // 		$("html,body").animate({
    // 			scrollTop: a
    // 		}, "slow");
    // 	}
    // });

    console.log("Number of g5 maps " + $('.g5-gmap').length);

    if($('.g5-gmap').length > 0) {
        //foreach .g5-gmapV1 look if API needs to load - static=false or (not set static and outside footer)
        function isDynamicMap(element) {
            params = $(element).data();
            console.log(params);
            if('static' in params && params.static === true) return false;
            else if('static' in params && params.static === false) return true;
            else if($(element).parents('footer').length > 0) return false;
            else return true;
        }
        if($('.g5-gmap').toArray().some(isDynamicMap)) {
            console.log("Has dynamic map");
            $.getScript("https://maps.google.com/maps/api/js?key=AIzaSyCwLl_vXSbYwIwHf1Q86UHUhNSbf81XCUY&callback=get_g5_mapsV2");
        } else {
            console.log("No dynamic maps");
            get_g5_mapsV2();
        }
    }

    console.log("Number of g5 emaps " + $('.g5-embedmap').length);

    if($('.g5-embedmap').length > 0) {
        // $.getScript('/wp-content/themes/gfive/js/g5_embedmaps.js').done(function() {
        // 	doemap();
        // });
        $('.g5-embedmap').each(function() {
            $(this).load('https://ptclinic.com/g5/mapdata_embed.php', {
                id: $(this).data('gmapId'),
                style: $(this).get(0).style.cssText,
                url: window.location.pathname
            });
        })
    }

    //Appointment Request Loader
    if($('.g5-loadar').length>0){
        g5_appointment_request();
    }

    //Appointment Request Loader
    if($('.g5-loadarEmail').length>0){
        g5_appointment_request('email');
    }

    //Review Loader
    if($('.g5-loadreview').length>0){
        g5_review();
    }

    //Review Loader
    if($('.g5-loadreview-test').length>0){
        g5_review_test();
    }

    //Mini Banners
    if($('.g5-minibanner').length>0){
        $.getScript('https://ptclinicng.com/wp-content/themes/gfive/js/g5_minibanners.js',function(){
            initminibanners();
        });
    }

    if($('.g5-chart').length>0){
        $("<link/>", {
            rel: "stylesheet",
            type: "text/css",
            href: "https://cdnjs.cloudflare.com/ajax/libs/chartist/0.9.8/chartist.min.css"
        }).appendTo("head");
        var practice_id=$('#practiceid').text();
        $.getScript('https://cdnjs.cloudflare.com/ajax/libs/chartist/0.9.8/chartist.min.js',function(){
            var questions = new Array();
            $('.g5-chart').each(function(chart){
                questions.push($(this).data('g5-question'));
                // $(this).append("<h2 class='uk-text-center' data-mh='chartQuestion'>Question</h2><div class='g5-chart-area ct-square ct-chart'></div>");
            });
            // practice_id=4;
            $.ajax({
                url: 'https://ptclinic.com/g5/chd.php',
                dataType: 'jsonp',
                data: {practice_id:practice_id,questions:questions},
                success:function(data){
                    console.log(data);
                    $.each( data, function( key, val ) {
                        console.log(key);
                        console.log(val);
                        $("h2","[data-g5-question='"+key+"']").html(val.question);
                        var chartspot=$(".g5-chart-area","[data-g5-question='"+key+"']").get(0);
                        new Chartist.Bar(chartspot, val, {
                            distributeSeries: true
                        });
                    });
                }
            });
        });
    }


    //Top and Very Top Scrolling Functions
    $('.g5-totop').live('click',function(){
        var mcoffset=$('#content').offset().top;
        $('html,body').animate({scrollTop:mcoffset},'slow');
        return false;
    });
    $('.g5-toverytop').live('click',function(){
        $('html,body').animate({scrollTop:0},'slow');
        return false;
    });

    //Colorlists - change to all UL lists
    $('*[data-g5-colorlist]').addClass('g5-colorlist');
    $('*[data-g5-colorlist]').find('li').wrapInner("<span class='g5-normal'></span>");



    if($('.g5-mlvideo-wrapper').length > 0){
        $('.g5-mlvideo-wrapper a').on('click',function(e){
            console.log("Swap Video");
            e.preventDefault();
            vimeo_id=$(this).attr('title');
            $(this).css('padding','0').css('border','0').html("<iframe src='https://player.vimeo.com/video/"+vimeo_id+"?title=0&byline=0&portrait=0&autoplay=1' width='640' height='435' frameborder='0' webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>");
        });
    }
});


function get_g5_mapsV2(){
    $.getScript('/wp-content/themes/gfive/js/g5_mapsV2.js').done(function(){
        dogmap();
        dogmapaddresses();
    }).fail(function(jqxhr, settings, exception){console.log("Oh crap "+exception);});
}

function g5_add_lightbox(id,expo){
    if ( $( "#g5-modal-"+id ).length==0) {
        $('body').append("<div id=\"g5-modal-"+id+"\" class=\"uk-modal\">\n\r<div class=\"uk-modal-dialog uk-modal-dialog-large uk-modal-dialog-lightbox uk-margin-large-top\">\n\r<a class=\"uk-modal-close uk-close uk-close-alt\"></a><div id='g5-modal-content-"+id+"'></div>\n\r</div>\n\r</div>");
        $('.uk-close',"#g5-modal-"+id).css('z-index',10);
        $("#g5-modal-"+id).css('background',hexToRgbA(expo,.7));
    }
}

function g5_add_modal(id,expo,header){
    if ( $( "#g5-modal-"+id ).length==0) {
        $('body').append("<div id=\"g5-modal-"+id+"\" class=\"uk-modal\">\n\r<div class=\"uk-modal-dialog\"><a class='uk-modal-close uk-close'></a>\n\r<div class='uk-modal-header'>"+header+"</div>\n\r<div id='g5-modal-content-"+id+"' class=''></div>\n\r</div>\n\r</div>");
        // $('body').append("<div id=\"g5-modal-"+id+"\" class=\"uk-modal\">\n\r<div class=\"uk-modal-dialog\"><a class='uk-modal-close uk-close'></a>\n\r<div class='uk-modal-header'>"+header+"</div>\n\r<div id='g5-modal-content-"+id+"' class='uk-overflow-container'></div>\n\r</div>\n\r</div>");
        $("#g5-modal-"+id).css('background',hexToRgbA(expo,.7));
    }
}

function g5_appointment_request(doEmail){
    var practice_id=$('#practiceid').text();
    $("<h1 id='apptreqcolor' style='display:none;'>AR</h1>").appendTo('body');
    $('.g5-loadar,.g5-loadarEmail').on("click",function(){
        var expocolor_rgb=$('#apptreqcolor').css('color');
        expocolor_hex=rgb2hex(expocolor_rgb);
        var bookingUrl = (typeof BOOKING_FORM_URL !== 'undefined') ? BOOKING_FORM_URL : '/booking/';
        g5_add_modal('ar',expocolor_hex,'<h2><i class="uk-icon-calendar"></i> Appointment Request</h2>');
        $('.uk-modal-dialog','#g5-modal-ar').removeClass('uk-modal-dialog-large');
        var modal = UIkit.modal("#g5-modal-ar");
        $('#g5-modal-content-ar').html('<iframe allowTransparency="true" frameborder="0" scrolling="auto" style="height:760px;width:100%;border:none" id="arframe" src="'+bookingUrl+'"></iframe>');
        UIkit.offcanvas.hide([force = false]);
        modal.show();
        return false;
    });
}

// Review - now redirects to the site's own review pages
function g5_review(){
    $("<h1 id='reviewcolor' style='display:none;'>Review Color</h1>").appendTo('body');
    $('.g5-loadreview,.g5-loadreview-test').on("click",function(){
        window.location.href = '/desktop/reviews/';
        return false;
    });
}


// COLOR FUNCTIONS

// Used with Expo color on modals
function hexToRgbA(hex,alpha){
    var c;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x'+c.join('');
        return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+alpha+')';
    }
    throw new Error('Bad Hex');
}

var hexDigits = new Array
("0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f");

//Function to convert hex format to a rgb color
function rgb2hex(rgb) {
    rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
}

function hex(x) {
    return isNaN(x) ? "00" : hexDigits[(x - x % 16) / 16] + hexDigits[x % 16];
}

