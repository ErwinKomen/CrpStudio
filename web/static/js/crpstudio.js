/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
var Crpstudio = {
	baseUrl : null,
	blsUrl : null,              // Address of the Black Lab Server
  crppUrl : null,             // Address for Corpus Research Project Processor requests
	language : null,            // UI language currently used
	tab : null,   
	doDebug : true,             // Are we debugging right now? --> console output
	doDebugXhrResponse : true, // log full XHR responses? (long)
	exportLimit : 50000,        // Max size for exporting ???
  currentUser : "-",          // Name of the currently logged-in user
	
	confirmExport : function() {
		if (Crpstudio.language === "en")
			return confirm("Your query exceeds the maximum export size. Only the first "+Crpstudio.exportLimit+" results will be exported.\n\nDo you want to continue?\n");
		else
			return confirm("Uw zoekopdracht overschrijdt de export limiet. Alleen de eerste "+Crpstudio.exportLimit+" resultaten worden geëxporteerd.\n\nWilt u doorgaan?\n");
	},
	
  /* --------------------------------------------------------------------------
   * Name: cookies
   * Goal: handle cookies
   * History:
   * jun/2015 ERK Copied from WhiteLab
   */
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
	
  /* --------------------------------------------------------------------------
   * Name: createRequest
   * Goal: Make a request to the indicated @url to get an XML reply
   * History:
   * jun/2015 ERK Copied from WhiteLab
   */
	createRequest : function(method, url) {
		var xhr = new XMLHttpRequest();
		if ("withCredentials" in xhr) {
			// XHR for Chrome/Firefox/Opera/Safari.
			xhr.open(method, url, true);
		} else if (typeof XDomainRequest !== "undefined") {
			// XDomainRequest for IE.
			xhr = new XDomainRequest();
			xhr.open(method, url);
		} else {
			// CORS not supported.
			xhr = null;
		}
		return xhr;
	},
	
  /* --------------------------------------------------------------------------
   * Name: debug
   * Goal: Issue a debugging message to the console
   * History:
   * jun/2015 ERK Copied from WhiteLab
   */
	debug : function(msg) {
		if (Crpstudio.doDebug) {
			console.log(msg);
		}
	},
	
  /* --------------------------------------------------------------------------
   * Name: debugXhrResponse
   * Goal: Place the XhrResponse on the console for debugging
   * History:
   * jun/2015 ERK Copied from WhiteLab
   */
	debugXhrResponse : function(msg) {
		if (Crpstudio.doDebug && Crpstudio.doDebugXhrResponse) {
			console.log(msg);
		}
	},
	
  /* --------------------------------------------------------------------------
   * Name: getBlacklabData
   * Goal: Acquire data from the BlackLab Server
   * History:
   * jun/2015 ERK Copied from WhiteLab
   */
	getBlacklabData : function(type, params, callback, target) {
		var xhr = Crpstudio.createRequest('GET', Crpstudio.blsUrl + type);
		if (!xhr) {
			return;
		}
		
		if (params !== null && params.indexOf("outputformat=") === -1) {
			params = params + "&outputformat=json";
		} else if (params === null || params.length === 0) {
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
	
  /* --------------------------------------------------------------------------
   * Name: getCrppData
   * Goal: Acquire data in JSON format from the CRPP service
   * History:
   * 22/jun/2015 ERK Created
   */
	getCrppData : function(type, params, callback, target) {
		var xhr = Crpstudio.createRequest('GET', Crpstudio.crppUrl + type);
    // Validate
		if (!xhr) { return; }
		
    // Determine what the parameters are
		if (params !== null && params.indexOf("outputformat=") === -1) {
			params = params + "&outputformat=json";
		} else if (params === null || params.length === 0) {
			params = "outputformat=json";
		}
    // Add a timestamp
    params = params + "&rand=" + new Date().getTime() ;

    // Debugging: show what we are sending on the console
		Crpstudio.debug("getCrppData: "+Crpstudio.crppUrl + type + "?" + params);
		
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded; charset=UTF-8");
		xhr.setRequestHeader("Cache-Control", "no-cache, must-revalidate");
		
		xhr.onload = function() {
				Crpstudio.debugXhrResponse("#1: " + xhr.responseText);
				var resp = JSON.parse(xhr.responseText);
				Crpstudio.debugXhrResponse("response #2:");
				Crpstudio.debugXhrResponse(resp);
				callback(resp,target);
		};

    // Action when there is an error
		xhr.onerror = function(e) {
			Crpstudio.debug("getCrppData: failed to process CRPP request:");
      Crpstudio.debug(e.target.status);
		};

    // Main action: send the parameters
		xhr.send(params);
	},
  
  /* --------------------------------------------------------------------------
   * Name: postRequest
   * Goal: Issue a 'POST' request and process the results using the @callback
   *        function
   * History:
   * 22/jun/2015 ERK Copied from WhiteLab
   */
  postRequest : function(type, params, callback, target, update) {
		var xhr = Crpstudio.createRequest('POST', Crpstudio.crppUrl+type);
		if (!xhr) {
			return;
		}
		
		if (params !== null && params.indexOf("lang=") === -1) {
			params = params+"&lang="+Crpstudio.language;
		}

		Crpstudio.debug("params: "+decodeURI(params));
		
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded; charset=UTF-8");
		
		xhr.onload = function() {
			if (/^[\],:{}\s]*$/.test(xhr.responseText.replace(/\\["\\\/bfnrtu]/g, '@').
					replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
					replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {
        // Transform the response into a JSON object
				var resp = JSON.parse(xhr.responseText);
        // Debugging
				Crpstudio.debugXhrResponse("response:");
				Crpstudio.debugXhrResponse(resp);
        // Go to the callback function with the response object etc
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
	
  /* --------------------------------------------------------------------------
   * Name: readFile
   * Goal: Read a text file in a particular format
   *        After reading: call the @callback function
   * History:
   * 22/jun/2015 ERK Copied from WhiteLab
   */
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
	
  /* --------------------------------------------------------------------------
   * Name: switchTab
   * Goal: Open a different tab
   * History:
   * 22/jun/2015 ERK Copied from WhiteLab
   */  
	switchTab : function(target) {
		if (target !== Crpstudio.tab) {
			if (Crpstudio.language !== null) {
				window.location = window.location.protocol+target+"?lang="+Crpstudio.language;
			} else {
				window.location = window.location.protocol+target;
			}
		}
	},
  
  /* --------------------------------------------------------------------------
   * Name: setUser
   * Goal: Set the name of the user so that we can access it from anywhere
   * History:
   * 23/jun/2015 ERK Created
   */  
  setUser : function(sUserName) {
    Crpstudio.currentUser = sUserName;
    // $("#top_bar_current_user").text(sUserName);
  },
	
  /* --------------------------------------------------------------------------
   * Name: switchLanguage
   * Goal: Make sure the correct languages for the UI are *called* 
   * History:
   * 22/jun/2015 ERK Copied from WhiteLab
   */  
	switchLanguage : function(lang) {
		Crpstudio.language = lang;
		if (Crpstudio.tab === "search" && Crpstudio.project.tab !== "result" && Crpstudio.project.tab !== "document") {
			window.location = window.location.protocol+Crpstudio.tab+"?lang="+Crpstudio.language+"&tab="+Crpstudio.project.tab;
		} else {
			window.location = window.location.protocol+Crpstudio.tab+"?lang="+Crpstudio.language;
		}
	},
	
  /* --------------------------------------------------------------------------
   * Name: transform
   * Goal: Transform the [xml] using the [xslSheet]
   * History:
   * 22/jun/2015 ERK Copied from WhiteLab
   */  
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
	
  /* --------------------------------------------------------------------------
   * Name: home
   * Goal: Set the correct size for the iframe containing the "home.html"
   * History:
   * 22/jun/2015 ERK Copied from WhiteLab
   */  
	home : {
		// Set the correct size for the iframe containing the "home.html"
		setSizes : function() {
			var h = $(window).innerHeight() - 135;
			$("#homepage").css("height",h+"px");
		}
	},
  
  /* --------------------------------------------------------------------------
   * Name: about
   * Goal: Set the correct size for the iframe containing the "about.html"
   * History:
   * 22/jun/2015 ERK Copied from WhiteLab
   */  
	about : {
		// Set the correct size for the iframe containing the "about.html"
		setSizes : function() {
			var h = $(window).innerHeight() - 135;
			$("#aboutpage").css("height",h+"px");
		}
	}
};
