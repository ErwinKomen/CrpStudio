/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
/*globals jQuery, crpstudio, CodeMirror: true */
/*jslint browser: true, indent: 2 */
var crpstudio = (function ($, crpstudio) {
  "use strict";  
  // Define crpstudio.input
  crpstudio.input = (function ($, config){
    
    // Variables within the scope of crpstudio.input
    var rule = null,        // The metarule information
        loc_bDirty = false, // Flags status
        filters = null;     // The filter list
    
    // Define private methods
    var private_methods = {
      
    };
    
    // Define the methods we return publically
    return {
      // ============= Getters and setters ================
      getRule : function() { return rule; },
      
      // ============= Other methods ======================
      
      /**
       * setMetaInfo
       *    Load the correct metainformation section
       *    
       * @param {string} sCorpusName
       * @param {string} sCorpusDir
       * @returns {void}
       */
      setMetaInfo : function(sCorpusName, sCorpusDir) {
        // Find out which metavarset belongs to this corpus
        var sMetavarset = "";
        var arCorpusList = crpstudio.corpusInfo;
        for (var i=0;i<arCorpusList.length;i++) {
          // Access this item
          var oCorpus = arCorpusList[i];
          // Is this the one?
          if (oCorpus.lng === sCorpusName) {
            if (sCorpusDir || oCorpus.dir === sCorpusDir) {
              // Got it!
              sMetavarset = oCorpus.metavar; 
              break;
            }
          }          
        }
        // Double check results
        if (sMetavarset === "") {
          $("#project_meta_rule").html("<option>(Cannot find set of fields)</options>");
          return;
        }
        // Find the correct section
        var arMetaList = crpstudio.metaInfo;
        for (var i=0;i<arMetaList.length;i++) {
          // Access this item
          var oMeta = arMetaList[i];
          // Is this the one?
          if (oMeta.metavarset === sMetavarset) {
            // This is the one
            rule = oMeta.metaRule;
            filters = oMeta.filters;
            // Set the correct <div>
            $("#project_meta_rule").html(rule);
            // Get out of here
            break;
          }
        }
        // Add functions to monitor changes
        crpstudio.input.addChangeEvents("meta-accordion");
      },
      
      /**
       * addChangeEvents
       *    Add pointers to ctlTimer()
       *    Do this for all [input], [textarea] and [select] elements
       *       that are under DOM element with id [sItemId]
       * 
       * @param {type} sItemId
       * @returns {undefined}
       */
      addChangeEvents : function(sItemId) {
        var sId = "#" + sItemId;
        // Add event handlers on all INPUT elements under "project_general"
        $(sId + " input").on("change paste input", 
          function() {crpstudio.input.ctlTimer(this, "input");});
        // Checkbox: bind on the click event
        $(sId + " input:checkbox").on("click", 
          function() {crpstudio.input.ctlTimer(this, "input");});
        // Note: do not set the .on("blur") event, because that is not really necessary

        // Add event handlers on all TEXTAREA elements under "project_general"
        $(sId + " textarea").on("change paste input", 
          function() {crpstudio.input.ctlTimer(this, "textarea");});

        // Add event handlers on all SELECT elements under "project_general"
        $(sId + " select").on("change paste input", 
          function() {crpstudio.input.ctlTimer(this, "select");});

      }, 
      
      /**
       * ctlTimer -- Deal with changes
       * 
       * @param {type} source
       * @param {type} sType
       * @returns {undefined}
       */
      ctlTimer : function(source, sType) {
        // Switch on the button
        $("#input_general_save").removeClass("hidden");
        // Show that we have changed
        loc_bDirty = true;
      },
      
      
      /**
       * showMetaInfo -- show the input restrictions
       * 
       * @returns {void}
       */
      showMetaInfo : function() {
        // Get the new text
        var sInfo = crpstudio.input.parseQuery();
        // Put the text in place
        $("#input_general_oview").text(sInfo);
        // Hide the SAVE button
        $("#input_general_save").addClass("hidden");
        // Add the current metadata selection information to the current Project/User combination
        
        // TODO
        
        // Show that changes have been processed
        loc_bDirty = false;
      },
      
      /**
       * addRule -- Add one line to the metadata selector
       * 
       * @returns {void}
       */
      addRule : function() {
        $("#"+crpstudio.main.getTab()+"-meta .rules").append(crpstudio.input.getRule());
        // Add functions to monitor changes
        crpstudio.input.addChangeEvents("meta-accordion");
      },

      /**
       * removeRule -- remove a line from the meta-input-selector
       * 
       * @param {type} element
       * @returns {void}
       */
      removeRule : function(element) {
        if ($("#"+crpstudio.main.getTab()+"-meta").find(".rule").length > 1) {
          $(element).parent().parent().remove();
        }
      },

      /**
       * reset -- reset the meta-input-selector
       * 
       * @returns {void}
       */
      reset : function() {
        // Clear everything
        $("#"+crpstudio.main.getTab()+"-meta .rules").html("");
        // There must at least be one line
        crpstudio.input.addRule();
        // Put everything in the correct place
        $("#"+crpstudio.main.getTab()+"-meta #group-check").prop("checked",false);
        $("#"+crpstudio.main.getTab()+"-meta #group-select").val("hits");
        $("#"+crpstudio.main.getTab()+"-meta #group_by-select").val("");
        $("#"+crpstudio.main.getTab()+"-meta #search-within").val("");
      },

      /**
       * parseQuery
       * 
       * 
       * @returns {string}  filterquery
       */
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
            var f = "";
            switch (op) {
              case "is":      f = label + " = \"" + input + "\"";  break;
              case "not":     f = label + " != \"" + input + "\""; break;
              case "match":   f = "matches("+label + ", \"" + input + "\")"; break;
              case "nmatch":  f = "not(matches("+label + ", \"" + input + "\"))"; break;
              case "lt":      f = label + " < \"" + input + "\""; break;
              case "lte":     f = label + " <= \"" + input + "\""; break;
              case "gt":      f = label + " > \"" + input + "\""; break;
              case "gte":     f = label + " >= \"" + input + "\""; break;
            }
            // Take out the "field:" name
            f = f.replace(/field\:/g,"");
            // Add filter into array
            filters.push("(" + f + ")");
          }
        });
        // Combine all the individual parts with logical 'and'
        var filterQuery = filters.join("\n and ");
        
        /*
        // Whitelab: grouping (we do this differently)
        if (crpstudio.main.getTab() === "search") {
          var v = $("#"+crpstudio.main.getTab()+"-meta #group-select").val();
          if (v === "hits") {
            crpstudio.search.view = 1;
          } else {
            crpstudio.search.view = 2;
          }

          if ($("#"+crpstudio.main.getTab()+"-meta #group-check").prop("checked") == true && Crpstudio.search.group_by.length > 0) {
            crpstudio.search.group_by = $("#"+crpstudio.main.getTab()+"-meta #group_by-select").val();
            if (v === "hits") {
              crpstudio.search.view = 8;
            } else {
              crpstudio.search.view = 16;
            }
          }
          crpstudio.search.within = $("#"+crpstudio.main.getTab()+"-meta #search-within").val();
          if (crpstudio.search.within == null || crpstudio.search.within.length == 0) {
            crpstudio.search.within = "document";
          }
          $("#"+crpstudio.main.getTab()+"-meta #search-within").val("");
        } */
        
        // Return the combined filterquery
        return filterQuery;
      },

      /**
       * parseQueryToInterface
       * 
       * 
       * @param {type} q
       * @returns {void}
       */
      /*
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
          $("#"+crpstudio.main.getTab()+"-meta .rules").append(crpstudio.meta.getRule());
          $("#"+crpstudio.main.getTab()+"-meta").find(".metaLabel").last().val(v[0]);
          $("#"+crpstudio.main.getTab()+"-meta").find(".metaInput").last().val(v[1]);
          $("#"+crpstudio.main.getTab()+"-meta").find(".metaOperator").last().val(op);
        }
      },
      */

      /**
       * switchState
       *    Metadata input state switching
       * 
       * @param {element} item
       * @returns {void}
       */
      switchState : function(item) {
        if ($(item).parent().find("div.content-meta").hasClass("active"))
          $(item).find("img").attr("src","./static/img/plus.png");
        else
          $(item).find("img").attr("src","./static/img/minus.png");
      }

    };
    
  }($, crpstudio.config));
  
  return crpstudio;
  
} (jQuery, window.crpstudio || {}));
