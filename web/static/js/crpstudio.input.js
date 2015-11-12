/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

Crpstudio.input = {
	rule : null,
	
	addRule : function() {
		$("#"+crpstudio.main.getTab()+"-meta .rules").append(Crpstudio.meta.rule);
	},
	
	removeRule : function(element) {
		if ($("#"+crpstudio.main.getTab()+"-meta").find(".rule").length > 1) {
			$(element).parent().parent().remove();
		}
	},
	
	reset : function() {
		$("#"+crpstudio.main.getTab()+"-meta .rules").html("");
		Crpstudio.meta.addRule();
		$("#"+crpstudio.main.getTab()+"-meta #group-check").prop("checked",false);
		$("#"+crpstudio.main.getTab()+"-meta #group-select").val("hits");
		$("#"+crpstudio.main.getTab()+"-meta #group_by-select").val("");
		$("#"+crpstudio.main.getTab()+"-meta #search-within").val("");
	},
	
	parseQuery : function() {
		var filters = new Array();
		$("#"+crpstudio.main.getTab()+"-meta .rule").each(function( index ) {
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
		if (crpstudio.main.getTab() === "search") {
			var v = $("#"+crpstudio.main.getTab()+"-meta #group-select").val();
			if (v === "hits") {
				Crpstudio.search.view = 1;
			} else {
				Crpstudio.search.view = 2;
			}
			
			if ($("#"+crpstudio.main.getTab()+"-meta #group-check").prop("checked") == true && Crpstudio.search.group_by.length > 0) {
				Crpstudio.search.group_by = $("#"+crpstudio.main.getTab()+"-meta #group_by-select").val();
				if (v === "hits") {
					Crpstudio.search.view = 8;
				} else {
					Crpstudio.search.view = 16;
				}
			}
			Crpstudio.search.within = $("#"+crpstudio.main.getTab()+"-meta #search-within").val();
			if (Crpstudio.search.within == null || Crpstudio.search.within.length == 0) {
				Crpstudio.search.within = "document";
			}
			$("#"+crpstudio.main.getTab()+"-meta #search-within").val("");
		}
		return filterQuery;
	},
	
	parseQueryToInterface : function(q) {
		$("#"+crpstudio.main.getTab()+"-meta .rules").html("");
		
		var vals = meta.split('&amp;');
		while (vals.length > 0) {
			var val = vals.shift();
			var v = val.split('=');
			var op = "is";
			if (input.indexOf("-") == 0) {
				input = input.substring(1); 
				op = "not";
			}
			$("#"+crpstudio.main.getTab()+"-meta .rules").append(Crpstudio.meta.rule);
			$("#"+crpstudio.main.getTab()+"-meta").find(".metaLabel").last().val(v[0]);
			$("#"+crpstudio.main.getTab()+"-meta").find(".metaInput").last().val(v[1]);
			$("#"+crpstudio.main.getTab()+"-meta").find(".metaOperator").last().val(op);
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
