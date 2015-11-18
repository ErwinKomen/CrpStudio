/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
/*globals jQuery, crpstudio: true */
/*jslint browser: true, indent: 2 */
var crpstudio = (function ($, crpstudio) {
  "use strict";
  crpstudio.currentUser = "-";          // Name of currently logged-in user
  
  // Define module 'main'
  crpstudio.main = (function ($, config){
    // Variables within the scope of [crpstudio.main]
    var loc_tab = null;   
    var loc_doDebug = true;             // Are we debugging right now? --> console output
    var loc_doDebugXhrResponse = true;  // log full XHR responses? (long)
    var loc_exportLimit = 50000;        // Max size for exporting ???
    
    // Define private methods
    var private_methods = {
      
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
       * Name: debugXhrResponse
       * Goal: Place the XhrResponse on the console for debugging
       * History:
       * jun/2015 ERK Copied from WhiteLab
       */
      debugXhrResponse : function(msg) {
        if (loc_doDebug && loc_doDebugXhrResponse) {
          console.log(msg);
        }
      }

    };

    // Define what we return publically
    return {
      // Getters for local variables
      getTab: function() { return loc_tab;},
      
      /**
       * confirmExport -- Copied from Whitelab
       * 
       * @returns {void}
       */
      confirmExport : function() {
        if (crpstudio.config.language === "en")
          return confirm("Your query exceeds the maximum export size. Only the first "+loc_exportLimit+" results will be exported.\n\nDo you want to continue?\n");
        else
          return confirm("Uw zoekopdracht overschrijdt de export limiet. Alleen de eerste "+loc_exportLimit+" resultaten worden geëxporteerd.\n\nWilt u doorgaan?\n");
      },

      /* --------------------------------------------------------------------------
       * Name: cookies
       * Goal: handle cookies
       * History:
       * jun/2015 ERK Copied from WhiteLab
       */
      cookies : {
        // Actions when accepting a cookie
        accept : function() {
          crpstudio.main.cookies.setCookie("corpusstudio",true,30);
          $("div.cookies").removeClass("active");
          $("nav.topbar").css({top : 0});
        },
        // How to check a cookie
        checkCookie : function(name) { return $.cookie(name); },
        // Set a cookie-value
        setCookie : function(name,value,days) {
          var date = new Date();
          date.setTime(date.getTime() + ( 1000 * 60 * 60 * 24 * parseInt(days)));

          $.cookie(name, "'"+value+"'", {path: '/', expires: date });
          return;
        }
      },

      /* --------------------------------------------------------------------------
       * Name: debug
       * Goal: Issue a debugging message to the console
       * History:
       * jun/2015 ERK Copied from WhiteLab
       */
      debug : function(msg) {
        if (loc_doDebug) { console.log(msg); }
      },


      /* ====================================================================================
         Name: getCrpStudioData
         Goal: Issue an AJAX request using jQuery
         History:
         26/oct/2015  ERK Modified from [rvisualization.js - ExecuteAjaxRequest]
         ==================================================================================== */
      getCrpStudioData: function(sCommand, sData, callback, target) {
        // Create search URL
        // var urlSearch = baseUrl + sCommand + "/";
        var urlSearch = config.baseUrl + sCommand ;
        // Send the query /crpstudio for processing
        $.ajax({
          type: 'POST',
          url : urlSearch,          // Address to pass the POST request to
          dataType : 'text',			  // The kind of data I am expecting back
          data : { "args": sData},	// String data that I am sending packed in Json
          cache: false,
          store: false,
          // process query results
          success : function(responses) { 
            var oResp = JSON.parse(responses);        
            callback(oResp, target); 
          },
          // Process any errors
          error : function(jqXHR, textStatus, errorThrown) {
            debug('The POST request did not succeed: ' + textStatus + 
                            ' Response=' + jqXHR.responseText);
          }
        });
        return (true);
       },

 

      /* --------------------------------------------------------------------------
       * Name: postRequest
       * Goal: Issue a 'POST' request and process the results using the @callback
       *        function
       * History:
       * 22/jun/2015 ERK Copied from WhiteLab
       */
      postRequest : function(type, params, callback, target, update) {
        var xhr = private_methods.createRequest('POST', config.crppUrl+type);
        if (!xhr) {
          return;
        }

        if (params !== null && params.indexOf("lang=") === -1) {
          params = params+"&lang="+crpstudio.config.language;
        }

        debug("params: "+decodeURI(params));

        xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded; charset=UTF-8");

        xhr.onload = function() {
          if (/^[\],:{}\s]*$/.test(xhr.responseText.replace(/\\["\\\/bfnrtu]/g, '@').
              replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
              replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {
            // Transform the response into a JSON object
            var resp = JSON.parse(xhr.responseText);
            // Debugging
            private_methods.debugXhrResponse("response:");
            private_methods.debugXhrResponse(resp);
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
       * Name: readXmlFile
       * Goal: Read a file as text (doesn't have to be XML)
       *        After reading: call the @callback function
       * History:
       * 8/jul/2015 ERK Created
       */
      readXmlFile : function(f, callback) {
        if (!f) {
          alert("Failed to load file");
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
        if (target !== loc_tab) {
          // Get the 'lang' parameter
          var sLang = "";
          if (crpstudio.config.language !== null) sLang = "?lang=" + crpstudio.config.language;
          // Switch to the 'target' page using the lang parameter
          window.location = window.location.protocol+target+sLang;
        }
      },

      /* --------------------------------------------------------------------------
       * Name: setUser
       * Goal: Set the name of the user so that we can access it from anywhere
       * History:
       * 23/jun/2015 ERK Created
       */  
      setUser : function(sUserName) {
        crpstudio.currentUser = sUserName;
        // $("#top_bar_current_user").text(sUserName);
      },

      /**
       * logoff -- remove the current user
       * 
       * @returns {void}
       * @history:
       *  13/oct/2015 ERK Created
       */
      logoff : function() {
        // Issue a request to /crpstudio to get the relevant help section
        var params = "logoff?userid=" + crpstudio.currentUser;
        if (crpstudio.config.language !== null) params += "&lang="+crpstudio.config.language;
        window.location = window.location.protocol+params;
      },

      /**
       * login -- this doesn't have functionality (yet)
       * @type type
       */
      login : {
        /**
         * accept -- accept a login request
         * 
         * @returns {void}
         */
        accept : function() {
          // Set the page
          loc_tab = "j_security_check";
          // Switch there
          window.location = window.location.protocol+loc_tab;
        }
      },

      /* --------------------------------------------------------------------------
       * Name: switchLanguage
       * Goal: Make sure the correct languages for the UI are *called* 
       * History:
       * 22/jun/2015 ERK Copied from WhiteLab
       */  
      switchLanguage : function(lang) {
        crpstudio.config.language = "lang";
        var tabPrj = crpstudio.project.getTab();
        if (loc_tab === "search" && tabPrj !== "result" && tabPrj !== "document") {
          window.location = window.location.protocol+loc_tab+"?lang="+crpstudio.config.language+"&tab="+tabPrj;
        } else {
          window.location = window.location.protocol+loc_tab+"?lang="+crpstudio.config.language;
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
          crpstudio.main.setNavigationSize();
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
          crpstudio.main.setNavigationSize();
        }
      },

      /**
       * setNavigationSize
       *    Make sure the size of the "for-navigation" <div> is high enough
       *    
       * @returns {undefined}
       */
      setNavigationSize : function() {
        var w_width = $(window).innerWidth();
        var rows = 4;
        var row_height = 45 * rows;
        if (w_width < 600 ) {
          $("#for-navigation").css("height", row_height);
        }
      },

      /**
       * help
       *    Provide help with the specified main tab's part
       *    
       * @param {type} sMainTab
       * @returns {undefined}
       */
      help : function(sMainTab) {
        var sHelpPart = "general";
        // Determine if we can fine-tune the help needed
        switch(sMainTab) {
          case "projects":
            var sProjectTab = crpstudio.project.getTab();
            sHelpPart = "projects-" + sProjectTab;
            break;
          case "corpora":
            sHelpPart = "corpora";
            break;
          case "dbases":
            sHelpPart = "dbases";
            break;
        }
        // Issue a request to /crpstudio to get the relevant help section
        // var params = "section=" + sHelpPart;
        var oArgs = { "section": sHelpPart };
        var params = JSON.stringify(oArgs);
        crpstudio.main.getCrpStudioData("help", params, crpstudio.main.processHelp, "_blank");
      },

      /**
       * processHelp
       *    Show the indicated help file on the indicated target window
       * 
       * @param {type} response
       * @param {type} target
       * @returns {undefined}
       */
      processHelp : function(response, target) {
        if (response !== null) {
          var sFile = response.file;
          var sSection = response.section;
          // Combine file and section?

          // Show the indicated help file on the indicate location
          window.open(sFile, target);
        }    
      }
    };
  }($, crpstudio.config));
  
  return crpstudio;
  
} (jQuery, window.crpstudio || {}));

