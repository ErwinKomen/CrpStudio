/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

Crpstudio.input = {
	rule : null,
	
	addRule : function() {
		$("#"+Crpstudio.tab+"-meta .rules").append(Crpstudio.meta.rule);
	},
	
	removeRule : function(element) {
		if ($("#"+Crpstudio.tab+"-meta").find(".rule").length > 1) {
			$(element).parent().parent().remove();
		}
	},
	
	reset : function() {
		$("#"+Crpstudio.tab+"-meta .rules").html("");
		Crpstudio.meta.addRule();
		$("#"+Crpstudio.tab+"-meta #group-check").prop("checked",false);
		$("#"+Crpstudio.tab+"-meta #group-select").val("hits");
		$("#"+Crpstudio.tab+"-meta #group_by-select").val("");
		$("#"+Crpstudio.tab+"-meta #search-within").val("");
	},
	
	parseQuery : function() {
		var filters = new Array();
		$("#"+Crpstudio.tab+"-meta .rule").each(function( index ) {
			var label = $(this).find(".metaLabel").val();
			var input = $(this).find(".metaInput").val().replace(/&/g,"%26");
			var op = $(this).find(".metaOperator").val();
			if (op === 'not') {
				input = "-"+input;
			}
			if (label && input && input.length > 0) {
				var f = label+"=\""+input+"\"";
				f = f.replace(/field\:/g,"");
				filters.push(f);
			}
		});
		var filterQuery = filters.join("&");
		if (Crpstudio.tab === "search") {
			var v = $("#"+Crpstudio.tab+"-meta #group-select").val();
			if (v === "hits") {
				Crpstudio.search.view = 1;
			} else {
				Crpstudio.search.view = 2;
			}
			
			if ($("#"+Crpstudio.tab+"-meta #group-check").prop("checked") == true && Crpstudio.search.group_by.length > 0) {
				Crpstudio.search.group_by = $("#"+Crpstudio.tab+"-meta #group_by-select").val();
				if (v === "hits") {
					Crpstudio.search.view = 8;
				} else {
					Crpstudio.search.view = 16;
				}
			}
			Crpstudio.search.within = $("#"+Crpstudio.tab+"-meta #search-within").val();
			if (Crpstudio.search.within == null || Crpstudio.search.within.length == 0) {
				Crpstudio.search.within = "document";
			}
			$("#"+Crpstudio.tab+"-meta #search-within").val("");
		}
		return filterQuery;
	},
	
	parseQueryToInterface : function(q) {
		$("#"+Crpstudio.tab+"-meta .rules").html("");
		
		var vals = meta.split('&amp;');
		while (vals.length > 0) {
			var val = vals.shift();
			var v = val.split('=');
			var op = "is";
			if (input.indexOf("-") == 0) {
				input = input.substring(1); 
				op = "not";
			}
			$("#"+Crpstudio.tab+"-meta .rules").append(Crpstudio.meta.rule);
			$("#"+Crpstudio.tab+"-meta").find(".metaLabel").last().val(v[0]);
			$("#"+Crpstudio.tab+"-meta").find(".metaInput").last().val(v[1]);
			$("#"+Crpstudio.tab+"-meta").find(".metaOperator").last().val(op);
		}
	},
	
  /**
   * switchState - 
   * 
   * @param {type} item
   * @returns {undefined}
   */
	switchState : function(item) {
		if ($(item).parent().find("div.content-meta").hasClass("active"))
			$(item).find("img").attr("src","../web/img/plus.png");
		else
			$(item).find("img").attr("src","../web/img/minus.png");
	}}
