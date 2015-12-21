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
      /**
       * fillRule
       *    Put the data of the @oRule into the last element
       *    One rule: variable, operator, value
       * 
       * @param {type} oRule
       * @returns {undefined}
       */
      fillRule : function(oRule) {
        // Get to the last "rule" element
        var elLastRule = $("#project_meta_rule").find(".rule").last();
        // Set the values of 'metaLabel', 'metaOperator' and 'metaInput'
        $(elLastRule).find(".metaLabel").val("field:"+oRule.variable);
        $(elLastRule).find(".metaOperator").val(oRule.operator);
        $(elLastRule).find(".metaInput").val(oRule.value);
      }
    };
    
    // Define the methods we return publically
    return {
      // ============= Getters and setters ================
      getRule : function() { return rule; },
      
      // ============= Other methods ======================
      
      /**
       * setMetaInfo
       *    Load the correct meta information section
       *    
       * @param {string} sCorpusName
       * @param {string} sCorpusDir
       * @param {string} sInputRules  - Stringified JSON array with rules
       * @returns {void}
       */
      setMetaInfo : function(sCorpusName, sCorpusDir, sInputRules) {
        // Find out which metavarset belongs to this corpus
        var sMetavarset = crpstudio.project.getMetavarName(sCorpusName, sCorpusDir);
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
        
        if (sInputRules !== undefined && sInputRules !== "") {
          // Possibly show the meta-rules that are there already??
          crpstudio.input.setMetaRules(sInputRules);
          crpstudio.input.showMetaInfo(false);
          crpstudio.input.setState(true);
        } else {
          crpstudio.input.reset();
          crpstudio.input.setState(false);
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
       * @param {boolean} bSetCorpus
       * @returns {void}
       */
      showMetaInfo : function(bSetCorpus) {
        // Get the new text + make a call to crpstudio.project.setCorpus(...)
        var oInfo = crpstudio.input.parseQuery();
        
        if (bSetCorpus) {
          // Store the input restriction rules for the currently selected CRP
          var oRules = {}; 
          oRules.rules = JSON.stringify(oInfo.rules); 
          oRules.xqinput = crpstudio.xquery.createRuleQ(oInfo.rules);
          crpstudio.project.setCorpus("", "", oRules);
        }
        
        // Put the text in place
        $("#input_general_oview").text(oInfo.text);
        // Hide the SAVE button
        $("#input_general_save").addClass("hidden");
        // Show that changes have been processed
        loc_bDirty = false;
      },
      
      /**
       * setMetaRules
       *    Set the meta input selection rules according to @sInputRules
       * 
       * @param {type} sInputRules
       * @returns {undefined}
       */
      setMetaRules : function(sInputRules) {
        // TODO: transform [sInputRules] into a JSON array of rules, and implement these
        if (sInputRules !== "" && sInputRules.startsWith("[")) {
          // Transform the rules into an array
          var arRules = JSON.parse(sInputRules);
          // Any substance?
          if (arRules.length>0) {
            // Reset the rules
            crpstudio.input.reset();
            // Add the first rule
            var oFirst = arRules[0];
            private_methods.fillRule(oFirst);
            // Continue to add the other rules
            for (var i=1;i<arRules.length;i++) {
              // Get this rule
              var oRule = arRules[i];
              // Add a new rule to the list
              crpstudio.input.addRule();
              // TODO: implement this rule
              private_methods.fillRule(oRule);
            }
          }
        }
        
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
        
        /* NOTE: we do not use the 'group' or 'within' sections
        // Put everything in the correct place
        $("#"+crpstudio.main.getTab()+"-meta #group-check").prop("checked",false);
        $("#"+crpstudio.main.getTab()+"-meta #group-select").val("hits");
        $("#"+crpstudio.main.getTab()+"-meta #group_by-select").val("");
        $("#"+crpstudio.main.getTab()+"-meta #search-within").val("");
        */
      },

      /**
       * parseQuery
       * 
       * 
       * @returns {object}  filterquery
       */
      parseQuery : function() {
        var filters = new Array();  // Array of filter expressions
        var arRules = new Array();  // JSON array of rules
        var oBack = {};             // What we return
        
        // Perform a function for each of the rules supplied by the user
        $("#"+crpstudio.main.getTab()+"-meta .rule").each(function( index ) {
          
          // Get the name of the input @variable
          var label = $(this).find(".metaLabel").val();
          
          // Get the input @value
          var input = $(this).find(".metaInput").val()
          
          /*  Replace the '&' symbol for transmission over the internet by GET
          input = input.replace(/&/g,"%26");
          */
         
          // Get the operator definition
          var op = $(this).find(".metaOperator").val();
          
          /*
          if (op === 'not') { input = "-"+input; }
          */
          if (label && input && input.length > 0) {
            // Take out the "field:" name
            label = label.replace(/field\:/g,"");
            // Add this rule
            var oRule = {variable: label, operator: op, value: input};
            arRules.push(oRule);

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
            // f = f.replace(/field\:/g,"");
            // Add filter into array
            filters.push("(" + f + ")");
          }
        });
        // Combine all the individual parts with logical 'and'
        var filterQuery = filters.join("\n and ");
        
        // Return the filerquery and the array 
        oBack.text = filterQuery;
        oBack.rules = arRules;
        return oBack;
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
        if ($(item).parent().find("div.content-meta").hasClass("active")) {
          // Reset the rules: fold it inwards
          $(item).find("img").attr("src","./static/img/plus.png");
          // Reset the rules
          crpstudio.project.setCorpus("no_rules");
          crpstudio.input.reset(); 
          // Set the correct text
          $(item).find("h6").text(crpstudio.config.input_set);
        } else {
          // Start-up rule-setting: fold it outwards
          $(item).find("img").attr("src","./static/img/minus.png");
          // Set the correct text
          $(item).find("h6").text(crpstudio.config.input_clr);
        }
      },
      
      /**
       * setState -- set the status to 'plus' or to 'minus'
       * 
       * @param {type} bValue
       * @returns {undefined}
       */
      setState : function(bValue) {
        // set the 'active' class or remove it
        if (bValue) {
          // Make the rules active
          $("#meta-accordion").find(".content-meta").addClass("active");
          $("#meta-accordion").find("img").attr("src","./static/img/minus.png");
          // Set the correct text
          $("#meta-accordion").find("h6").text(crpstudio.config.input_clr);
        } else {
          // Make the rules inactive
          $("#meta-accordion").find(".content-meta").removeClass("active");
          $("#meta-accordion").find("img").attr("src","./static/img/plus.png");
          // Set the correct text
          $("#meta-accordion").find("h6").text(crpstudio.config.input_set);
        }
        // 
      }

    };
    
  }($, crpstudio.config));
  
  return crpstudio;
  
} (jQuery, window.crpstudio || {}));
