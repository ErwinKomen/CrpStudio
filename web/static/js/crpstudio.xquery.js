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
  crpstudio.tagset = null;
  // Define module 'xquery'
  crpstudio.xquery = (function ($, config){
    // Variables within the scope of [crpstudio.xquery]
    var sLng = "",    // Language we are currently working with
        sPart = "";   // Part of the language (e.g: CGN, Sonar etc)
    
    // Define private methods
    var private_methods = {
      /**
       * getDescr
       *    Get the descriptor object for the indicated prjtype
       *    
       * @param {type} sPrjType
       * @returns {undefined}
       */
      getDescr: function(sPrjType) {
        var oBack = {}; // Default object
        // Walk the possibilities in the config file
        for (var i=0;i<crpstudio.config.prj_tags.length;i++) {
          // Access this object
          var oThis = crpstudio.config.prj_tags[i];
          // Check if this is the correct project type
          if (oThis.prjtype === sPrjType.toLowerCase()) {
            // Return this descriptor object
            oBack = oThis; break;
          }
        }
        // Return the result
        return oBack;
      },
      
      /**
       * getTagsetName
       *    Get the name of the tagset to be used for the combination of the current
       *      language/part
       * ======= THIS FUNCTION IS OBSOLETE ============
       * 
       * @returns {undefined}
       */
      getTagsetName : function() {
        // Determine our language/part
        sLng = crpstudio.project.getLng();
        sPart = crpstudio.project.getDir();
        var sTagset = "";
        // Action depends on lng and/or part
        switch(sLng) {
          case "nld":
            switch (sPart) {
              case "CGN":
                sTagset = "nld_cgn";
                break;
              default:  // Must be sonar
                sTagset = "nld_sonar";
                break;
            }
            break;
          case "lak_cyr":
            sTagset = "lbe";
            break;
          case "che_lat":
            sTagset = "che";
            break;
          case "eng_hist":  // Historical parsed corpora
            sTagset = "eng_hist";
            break;
          case "eng_sla":   // Second Language Acquisition English
            sTagset = "eng_sla";
            break;
        }
        // Return the tagset
        return sTagset;
      },

      /**
       * getTagDefOld
       *    Get the language/part dependant tag for the indicated @sType
       * ======= THIS FUNCTION IS OBSOLETE ============
       * @param {type} sTagName
       * @returns {undefined}
       */
      getTagDefOld : function(sTagName) {
        // Determine the tagset
        var sTagset = private_methods.getTagsetName();
        // Make sure the tagset object is specified
        if (!crpstudio.tagset) return "";
        // Get the value for this combination of tagset/tagname
        for (var i=0;i<crpstudio.tagset.length;i++) {
          // Get this item
          var oTagSpec = crpstudio.tagset[i];
          if (oTagSpec.tagset === sTagset && oTagSpec.title === sTagName) {
            return oTagSpec.value;
          }
        }
        // No success
        return "";
      },
      
      /**
       * getTagDef
       *    Get the language/part dependant tag for the indicated @sType
       * 
       * @param {string} sTagName
       * @returns {object}
       */
      getTagDef : function(sTagName) {
        // Get the 'tagset' section from the "metavar" part from [crp-info.json]
        var arTagset = crpstudio.project.getMetaList("", "", "tagset");
        // Make sure the tagset object is specified
        if (!arTagset.length === 0) return "";
        // Get the value for this combination of tagset/tagname
        for (var i=0;i<crpstudio.tagset.length;i++) {
          // Get this item
          var oTagSpec = crpstudio.tagset[i];
          if (oTagSpec.title === sTagName) {
            // Create a tag-definition object
            var oTagDef = {};
            oTagDef.class = oTagSpec.def;
            if (oTagSpec.hasOwnProperty("fs"))
              oTagDef.fs = oTagSpec.fs;
            else
              oTagDef.fs = null;
            return oTagDef;
          }
        }
        // No success
        return {};
      },
      
     /**
       * getVarDef
       *    Get the type/loc/value part of variable @sVarName from the "metavar"
       *    section of crp-info.json
       * 
       * @param {string} sVarName
       * @returns {object}
       */
      getVarDef : function(sVarName) {
        // Get the 'tagset' section from the "metavar" part from [crp-info.json]
        var arVarset = crpstudio.project.getMetaList("", "", "variables");
        // Make sure the tagset object is specified
        if (!arVarset.length === 0) return "";
        // Get the value for this combination of tagset/tagname
        for (var i=0;i<crpstudio.tagset.length;i++) {
          // Get this item
          var oVarSpec = crpstudio.tagset[i];
          if (oVarSpec.title === sVarName) {
            // Create a tag-definition object
            var oVarDef = {};
            oVarDef.type  = oVarSpec.type;
            oVarDef.loc   = oVarSpec.loc;
            oVarDef.value = oVarSpec.value;
            return oVarDef;
          }
        }
        // No success
        return {};
      }
      
    };
    
    // Define what we return publically
    return {
      /**
       * createRuleQ
       *    Create Xquery code to check if all the rules passed on in @arRules are met
       *    
       *    This is called from [crpstudio.input.js] in order to convert
       *      the array of rules generated there (by the user) into 
       *      a piece of Xquery that can be passed as "xqInput" setting
       *      to the current Corpus Research Project
       *      
       *    Each rule in @arRules has components:
       *      variable  - name of the variable as defined in the "variables" lists of "metavar" of crp-info.json
       *      operator  - one of: is, not, match, nmatch, lt, lte, gt, gte
       *      value     - a *string* representation of all values (including numbers)
       * 
       * @param {array} arRules
       * @returns {string}
       */
      createRuleQ : function(arRules) {
        var arCode = [];
        
        // Start with the starting tag
        arCode.push("<metaFilter>");
        // Get the header and mdi variables
        arCode.push(" let $hdr := ru:header()");
        arCode.push(" let $mdi := ru:mdi()");
        // Get all variables defined for this section in "metavar"
        // (NOTE: they are only actually calculeted if they are needed)
        var arVarset = crpstudio.project.getMetaList("", "", "variables");
        for (var i=0;i<arVarset.length;i++) {
          var oVardef = arVarset[i];
          var sEntry = (oVardef.loc==="header") ? "$hdr" : "$mdi";
          var sValue = oVardef.value.replace("descendant", sEntry+"/descendant");
          arCode.push("  let $"+oVardef.name+" := "+sValue);
        }
        
        // Walk all the rules, combining them into one boolean statement
        arCode.push("  let $cond := (");
        if (arRules.length === 0) {
          arCode.push("     false()");
        } else {
          for (var i=0;i<arRules.length;i++) {
            // Check if "and" needs to be supplied
            var sAnd = (i===0) ? "" : " and ";
            // Get this rule
            var oRule = arRules[i]; var sVar = oRule.variable; var sValue = oRule.value;
            // Calculate the rule, depending on the operator
            var sRule = "true()"; // Dummy value, just in case
            switch(oRule.operator) {
              case "is":      sRule = sVar+" = \""+sValue+"\""; break;
              case "not":     sRule = sVar+"!= \""+sValue+"\""; break;
              case "match":   sRule = "ru:matches("+sVar+", \""+sValue+"\")"; break;
              case "nmatch":  sRule = "not(ru:matches("+sVar+", \""+sValue+"\"))"; break;
              case "lt":      sRule = sVar+" < \""+sValue+"\""; break;
              case "lte":     sRule = sVar+"<= \""+sValue+"\""; break;
              case "gt":      sRule = sVar+" > \""+sValue+"\""; break;
              case "gte":     sRule = sVar+">= \""+sValue+"\""; break;
            }
            // Add the rule to the code
            arCode.push("     "+sAnd+"("+sRule+")");
          }
        }
        
        // Finish the rules
        arCode.push("       )");
        
        // Return the value of the calculated condition 
        // (first attempt...)
        arCode.push("  return ru:backfilter($cond)");
        
        // Add closing tag
        arCode.push("</metaFilter>");
        // Return what we have made
        var sBack = arCode.join("\n");
        return sBack;
      },
      
      /**
       * createQuery
       *    Construct an Xquery based on the @sPrjType, @bDbase and @sType
       *    The @sType values are defined in CrpstudioBundle.properties
       *      in query.type.name and query.type.title
       *    They are passed on the JS as a reaction to /crpstudio/projects
       *      using the Java function BaseResponse::getQryTypeList()
       * 
       * @param {type} sPrjType
       * @param {type} bDbase
       * @param {type} sType
       * @returns {String}
       */
      createQuery : function(sPrjType, bDbase, sType) {
        // clsAny, clsMain, clsSub, clsInf,  npSbj,    npObj,  npAny,   ppAny,   vbAny,  vbFin
        var arCode = [];
        var sSubcat = "";
        var sMsg = "";
        var oTag = {clsAny: private_methods.getTagDef("clsAny"),
                    clsMain: private_methods.getTagDef("clsMain"),
                    clsSub: private_methods.getTagDef("clsSub"),
                    clsInf: private_methods.getTagDef("clsInf"),
                    npSbj: private_methods.getTagDef("npSbj"),
                    npObj: private_methods.getTagDef("npObj"),
                    npAny: private_methods.getTagDef("npAny"),
                    ppAny: private_methods.getTagDef("ppAny"),
                    vbAny: private_methods.getTagDef("vbAny"),
                    vbFin: private_methods.getTagDef("vbFin")};
        // Get a descriptor object
        var oDescr = private_methods.getDescr(sPrjType);
        // Validate
        if (oDescr === null || oDescr.length === 0) return "(: Unknown project type :)";
        // Get the tags we need to work with
        var sTagMain = oDescr.main;
        arCode.push("<"+sTagMain+">{");
        // Construct the body of the query depending on Dbase and Type
        if (bDbase) {
          // Return a basic model for a database query
          arCode.push(" (: Look through all the result entries in the database :)");
          arCode.push(" for $search in //Result");
          arCode.push(" ");
          arCode.push("  (: Get the value of Feature1 :)");
          arCode.push("  let $ft1 := $search/child::Feature[@Name='Feature1']/@Value");
          arCode.push(" ");
          arCode.push("  (: Get the value of the category :)");
          arCode.push("  let $cat := $search/@Cat");
          arCode.push("  ");
          arCode.push("  (: The @Feature1 and @Cat must have a value :)");
          arCode.push("  where (");
          arCode.push("        $ft1 != ''");
          arCode.push("    and $cat != ''");
          arCode.push("  )");
          // Define subcategorization and message
          sSubcat = ",$cat"; sMsg = ",''";
        } else {
          arCode.push(" (: Loop through the elements of each text :)");
          // Model depends on type
          switch(sType) {
            case "clsAll":
              arCode.push(" for $search in //"+oDescr.const);
              break;
            case "clsMain":
              arCode.push(" for $search in //"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.clsMain.class+"')]");
              break;
            case "clsMainSbj":
              arCode.push(" for $search in //"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.clsMain.class+"')]");
              arCode.push(" ");
              arCode.push("  (: Retrieve possible subject :)");
              arCode.push("  let $sbj := $search/child::"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.npSbj.class+"')]");
              arCode.push("  ");
              arCode.push("  (: subject must exist :)");
              arCode.push("  where (");
              arCode.push("    exists($sbj)");
              arCode.push("  )");
              break;
            case "clsMainSbjObj":
              arCode.push(" for $search in //"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.clsMain.class+"')]");
              arCode.push(" ");
              arCode.push("  (: Retrieve possible subject :)");
              arCode.push("  let $sbj := $search/child::"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.npSbj.class+"')]");
              arCode.push(" ");
              arCode.push("  (: Retrieve possible direct/indirect object :)");
              arCode.push("  let $obj := $search/child::"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.npObj.class+"')]");
              arCode.push("  ");
              arCode.push("  (: subject and object must exist :)");
              arCode.push("  where (");
              arCode.push("        exists($sbj)");
              arCode.push("    and exists($obj)");
              arCode.push("  )");
              break;
            case "clsSub":
              arCode.push(" for $search in //"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.clsSub.class+"')]");
              break;
            case "clsSubSbj":
              arCode.push(" for $search in //"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.clsSub.class+"')]");
              arCode.push(" ");
              arCode.push("  (: Retrieve possible subject :)");
              arCode.push("  let $sbj := $search/child::"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.npSbj.class+"')]");
              arCode.push("  ");
              arCode.push("  (: subject must exist :)");
              arCode.push("  where (");
              arCode.push("    exists($sbj)");
              arCode.push("  )");
              break;
            case "clsSubSbjObj":
              arCode.push(" for $search in //"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.clsSub.class+"')]");
              arCode.push(" ");
              arCode.push("  (: Retrieve possible subject :)");
              arCode.push("  let $sbj := $search/child::"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.npSbj.class+"')]");
              arCode.push(" ");
              arCode.push("  (: Retrieve possible direct/indirect object :)");
              arCode.push("  let $obj := $search/child::"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.npObj.class+"')]");
              arCode.push("  ");
              arCode.push("  (: subject and object must exist :)");
              arCode.push("  where (");
              arCode.push("        exists($sbj)");
              arCode.push("    and exists($obj)");
              arCode.push("  )");
              break;
            case "npAll":
              arCode.push(" for $search in //"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.npAny.class+"')]");
              break;
            case "ppAll":
              arCode.push(" for $search in //"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.ppAny.class+"')]");
              break;
            default:
              arCode.push(" for $search in //"+oDescr.const);
              break;
          }
          // Provide a return statement
          arCode.push("  ");
          arCode.push(" (: Return results :)");
          arCode.push(" return ru:back($search"+sMsg+sSubcat+")");
        }
        // Closing tag
        arCode.push("}</"+sTagMain+">");
        // Combine the contents of arCode and return it as one string, separated by \n
        return (arCode.join("\n"));
      }
    };
  }($, crpstudio.config));
  
  return crpstudio;
  
} (jQuery, window.crpstudio || {}));