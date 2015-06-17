var Crpstudio = {
	baseUrl : null,
	blsUrl : null,
	language : null,
	tab : null,
	doDebug : true,
	doDebugXhrResponse : false, // log full XHR responses? (long)
	exportLimit : 50000,
	
	confirmExport : function() {
		if (Crpstudio.language === "en")
			return confirm("Your query exceeds the maximum export size. Only the first "+Crpstudio.exportLimit+" results will be exported.\n\nDo you want to continue?\n");
		else
			return confirm("Uw zoekopdracht overschrijdt de export limiet. Alleen de eerste "+Crpstudio.exportLimit+" resultaten worden geëxporteerd.\n\nWilt u doorgaan?\n");
	},
	
	cookies : {
		accept : function() {
			Crpstudio.cookies.setCookie("corpusstudio",true,30);
			$("div.cookies").removeClass("active");
			$("nav.topbar").css({top : 0});
		},
		
		checkCookie : function(name) {
			return $.cookie(name);
		},
		
		setCookie : function(name,value,days) {
			var date = new Date();
			date.setTime(date.getTime() + ( 1000 * 60 * 60 * 24 * parseInt(days)));
			
			$.cookie(name, "'"+value+"'", {path: '/', expires: date });
			return;
		}
	},
	
	createRequest : function(method, url) {
		var xhr = new XMLHttpRequest();
		if ("withCredentials" in xhr) {
			// XHR for Chrome/Firefox/Opera/Safari.
			xhr.open(method, url, true);
		} else if (typeof XDomainRequest != "undefined") {
			// XDomainRequest for IE.
			xhr = new XDomainRequest();
			xhr.open(method, url);
		} else {
			// CORS not supported.
			xhr = null;
		}
		return xhr;
	},
	
	debug : function(msg) {
		if (Crpstudio.doDebug) {
			console.log(msg);
		}
	},
	
	debugXhrResponse : function(msg) {
		if (Crpstudio.doDebug && Crpstudio.doDebugXhrResponse) {
			console.log(msg);
		}
	},
	
	getBlacklabData : function(type, params, callback, target) {
		var xhr = Crpstudio.createRequest('GET', Crpstudio.blsUrl + type);
		if (!xhr) {
			return;
		}
		
		if (params != null && params.indexOf("outputformat=") == -1) {
			params = params + "&outputformat=json";
		} else if (params == null || params.length == 0) {
			params = "outputformat=json";
		}

		Crpstudio.debug(Crpstudio.blsUrl + type + "?" + params);
		
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded; charset=UTF-8");
		
		xhr.onload = function() {
//			if (/^[\],:{}\s]*$/.test(xhr.responseText.replace(/\\["\\\/bfnrtu]/g, '@').
//					replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
//					replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {
				Crpstudio.debugXhrResponse(xhr.responseText);
				var resp = JSON.parse(xhr.responseText);
				Crpstudio.debugXhrResponse("response:");
				Crpstudio.debugXhrResponse(resp);
				callback(resp,target);
//			} else {
//				Crpstudio.debug("invalid JSON");
//			}
		};

		xhr.onerror = function() {
			Crpstudio.debug("Failed to proces request.");
		};

		xhr.send(params);
	},
	
	getData : function(params, callback, target, update) {
		var xhr = Crpstudio.createRequest('POST', Crpstudio.baseUrl+"query");
		if (!xhr) {
			return;
		}
		
		if (params != null && params.indexOf("lang=") == -1) {
			params = params+"&lang="+Crpstudio.language;
		}

		Crpstudio.debug("params: "+decodeURI(params));
		
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded; charset=UTF-8");
		
		xhr.onload = function() {
			if (/^[\],:{}\s]*$/.test(xhr.responseText.replace(/\\["\\\/bfnrtu]/g, '@').
					replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
					replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {
				var resp = JSON.parse(xhr.responseText);
				Crpstudio.debugXhrResponse("response:");
				Crpstudio.debugXhrResponse(resp);
				callback(resp,target,update);
			} else {
				$("#status_"+target).html("ERROR");
				$("#result_"+target).html("ERROR - Could not process request.");
			}
		};

		xhr.onerror = function() {
			$("#status_"+target).html("ERROR");
			$("#result_"+target).html("ERROR - Could not connect to server.");
		};

		xhr.send(params);
	},
	
	readFile : function(f, callback) {
		if (!f) {
	        alert("Failed to load file");
	    } else if (!f.type.match('text.*')) {
			    alert(f.name + " is not a valid text file.");
	    } else {
	    	var reader = new FileReader();
	        reader.onload = callback;
	        reader.readAsText(f);
	    }
	},
	
	switchTab : function(target) {
		if (target !== Crpstudio.tab) {
			if (Crpstudio.language !== null) {
				window.location = window.location.protocol+target+"?lang="+Crpstudio.language;
			} else {
				window.location = window.location.protocol+target;
			}
		}
	},
	
	switchLanguage : function(lang) {
		Crpstudio.language = lang;
		if (Crpstudio.tab === "search" && Crpstudio.search.tab !== "result" && Crpstudio.search.tab !== "document") {
			window.location = window.location.protocol+Crpstudio.tab+"?lang="+Crpstudio.language+"&tab="+Crpstudio.search.tab;
		} else {
			window.location = window.location.protocol+Crpstudio.tab+"?lang="+Crpstudio.language;
		}
	},
	
	transform : function(xml, xslSheet) {	
		// get stylesheet
		xhttp = new XMLHttpRequest();
		xhttp.open("GET", xslSheet, false);
		xhttp.send("");
		
		var parser = new DOMParser();
		var sheet = parser.parseFromString( xhttp.responseText, "text/xml");
		
		// apply translation
		var result = "";
		if(window.ActiveXObject) {
			// Internet Explorer has to be the special child of the class -_-
			sheet = new ActiveXObject("Microsoft.XMLDOM");
			sheet.async = false;
			sheet.loadXML(xhttp.responseText);
			result = xml.transformNode(sheet);
		} else {
			var processor = new XSLTProcessor();
			processor.importStylesheet(sheet);
			result = processor.transformToFragment(xml, document);
		}
		
		return result;
	},
	
	home : {
		// Set the correct size for the iframe containing the "home.html"
		setSizes : function() {
			var h = $(window).innerHeight() - 135;
			$("#homepage").css("height",h+"px");
		}
	},
  
	about : {
		// Set the correct size for the iframe containing the "about.html"
		setSizes : function() {
			var h = $(window).innerHeight() - 135;
			$("#aboutpage").css("height",h+"px");
		}
	}
};
