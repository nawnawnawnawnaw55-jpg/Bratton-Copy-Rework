var $ = jQuery;
var wc_frame_target = '#arframe';

$(function($) {
    // Phone click - simplified, no e-rehab tracking dependency
    $("*[data-g5-phonelink]").click(function(){
        var phonenum=$(this).attr('href');
        console.log('Click 2 Call: ' + phonenum);
        // Google Analytics phone click tracking is handled
        // by the gtag_report_conversion function in the page
    });

    $("*[data-g5-maplink]").click(function(){
        var mapid=$(this).attr('id');
        console.log('Map Link ' + mapid);
    });

    $("*[data-g5-qa]").click(function(){
        console.log("Toggle QA");
        $('.g5-quickaccess').slideToggle();
        $('.g5-quickaccess-buttons').trigger('display.uk.check');
    });

    // Google Maps - static embed for Bratton PT Slidell
    var mapHTML = '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3453.8!2d-89.755801!3d30.283206!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x889e4f5c4f5c4f5d%3A0x1234567890abcdef!2s1346%20Lindberg%20Dr%20Suite%203%2C%20Slidell%2C%20LA%2070458!5e0!3m2!1sen!2sus!4v1700000000000" width="100%" height="350" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>';
    
    console.log("Number of g5 maps " + $('.g5-gmap').length);
    if($('.g5-gmap').length > 0) {
        $('.g5-gmap').each(function() { $(this).html(mapHTML); });
    }

    console.log("Number of g5 emaps " + $('.g5-embedmap').length);
    if($('.g5-embedmap').length > 0) {
        $('.g5-embedmap').each(function() { $(this).html(mapHTML); });
    }

    // Appointment Request Loader - now uses config.js central URL
    if($('.g5-loadar').length>0 || $('.g5-loadarEmail').length>0){
        g5_appointment_request();
    }

    // Review Loader - now redirects to the site's own review page
    if($('.g5-loadreview').length>0 || $('.g5-loadreview-test').length>0){
        g5_review();
    }

    // Charts - remove ptclinic.com data dependency
    if($('.g5-chart').length>0){
        $('.g5-chart').each(function(){
            $(this).html('<p class="uk-text-center">Chart data will be available soon.</p>');
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
    // Static maps are already embedded inline above
    console.log("Using static Google Maps embed");
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

