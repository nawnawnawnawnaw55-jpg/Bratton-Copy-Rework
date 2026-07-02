function replace_style(uksize){
	console.log(uksize+" Start");
	sizes=['default','small','medium','large','xlarge'];
	size_equality="gt";
	$.each(sizes,function(index,thesize){
		$("body").removeClass("g5-lt-"+thesize);
		$("body").removeClass("g5-eq-"+thesize);
		$("body").removeClass("g5-gt-"+thesize);
		if(uksize==thesize){
			size_equality='eq';
		}else{
			if(size_equality=='eq'){
				size_equality='lt';
			}
		}
		$("body").addClass("g5-"+size_equality+"-"+thesize);
		$("[data-g5-style-"+thesize+"]").attr("data-g5-style",'');
		$("[data-g5-style-gt-"+thesize+"]").attr("data-g5-style",'');
	});
	$("[data-g5-style]").each(function(){
		thisone=$(this);
		var has_original_style=thisone.attr('original-style');
		if(typeof has_original_style==typeof undefined){
			thestyle=thisone.attr('style');
			if(typeof thestyle==typeof undefined)thestyle='';
			original_style=thestyle;
			// console.log("Original style set to "+original_style);
			thisone.attr('original-style',original_style);
		}
		match_string="data-g5-style-"+uksize;
		size_match=thisone.attr(match_string);
		// console.log(match_string+" "+size_match);
		if(typeof size_match!==typeof undefined && size_match!==false){
			console.log(uksize+":Size Match - "+size_match);
			thisone.attr('style',size_match);
		}else{
			style_to_use='';
			size_used='';
			done_check=false;
			$.each(sizes,function(index,thesize){
				if(done_check==true)return false;
				thesize_match=thisone.attr("data-g5-style-gt-"+thesize);
				if(typeof thesize_match!==typeof undefined && thesize_match!==false){
					style_to_use=thesize_match;
					size_used=thesize;
				}
				if(uksize==thesize)done_check=true;
			});
			if(style_to_use==''){
				if(typeof has_original_style!==typeof undefined){
					console.log(uksize+":Back to Original - "+has_original_style);
					thisone.attr('style',has_original_style);
				}
			}else{
				console.log(uksize+":"+size_used+" GT Style Used - "+style_to_use);
				thisone.attr('style',style_to_use);
			}
		}
	})
}

enquire.register("screen and (max-width: 480px)",function(){replace_style("default")});
enquire.register("screen and (min-width: 480px) and (max-width: 767px)",function(){replace_style("small")});
enquire.register("screen and (min-width: 768px) and (max-width: 959px)",function(){replace_style("medium")});
enquire.register("screen and (min-width: 960px)and (max-width: 1159px)",function(){replace_style("large")});
enquire.register("screen and (min-width: 1200px)",function(){replace_style("xlarge")});
