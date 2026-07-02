function showresults(){
	var st=$('#searchbox').val();
	st = st.replace(/\W/g, " ");
	st = st.replace(/\s/g, "|");
	$.cookie('searchtext',st);
	var lr='http://'+location.hostname+'/library_search_'+st;
	location.replace(lr);
}
$(function(){
	$(".spinner").hide();
	$('#gotoarttop').click(function(){
		var artTop = $("#articleArea").offset().top;
		$("html,body").animate({scrollTop:artTop},500);
		return false;
	});
	$('#gotolist').click(function(){
		var listTop = $("#ml-article").offset().top;
		$("html,body").animate({scrollTop:listTop},500);
		return false;
	});
	// $(".bottompanes>div,.toppanes,.treatbottom").find("p,td,li,.normal,strong").css('color','#444');
	$(".hidden").removeClass("hidden");
	if($('#articleArea').is(":visible")){
		var artTop = $("#articleArea").offset().top;
		$("html,body").animate({scrollTop:artTop},500);
	}else if($('#articleList').is(":visible")){
		var listTop = $("#ml-article").offset().top;
		$("html,body").animate({scrollTop:listTop},500);
	}
});