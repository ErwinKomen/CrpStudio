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
       * getClassTag
       *    Get the language/part dependant tag for the indicated @sType
       * 
       * @param {type} sTagName
       * @returns {undefined}
       */
      getClassTag : function(sTagName) {
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
      }
    };
    
    // Define what we return publically
    return {
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
        var oTag = {clsAny: private_methods.getClassTag("clsAny"),
                    clsMain: private_methods.getClassTag("clsMain"),
                    clsSub: private_methods.getClassTag("clsSub"),
                    clsInf: private_methods.getClassTag("clsInf"),
                    npSbj: private_methods.getClassTag("npSbj"),
                    npObj: private_methods.getClassTag("npObj"),
                    npAny: private_methods.getClassTag("npAny"),
                    ppAny: private_methods.getClassTag("ppAny"),
                    vbAny: private_methods.getClassTag("vbAny"),
                    vbFin: private_methods.getClassTag("vbFin")};
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
              arCode.push(" for $search in //"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.clsMain+"')]");
              break;
            case "clsMainSbj":
              arCode.push(" for $search in //"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.clsMain+"')]");
              arCode.push(" ");
              arCode.push("  (: Retrieve possible subject :)");
              arCode.push("  let $sbj := $search/child::"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.npSbj+"')]");
              arCode.push("  ");
              arCode.push("  (: subject must exist :)");
              arCode.push("  where (");
              arCode.push("    exists($sbj)");
              arCode.push("  )");
              break;
            case "clsMainSbjObj":
              arCode.push(" for $search in //"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.clsMain+"')]");
              arCode.push(" ");
              arCode.push("  (: Retrieve possible subject :)");
              arCode.push("  let $sbj := $search/child::"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.npSbj+"')]");
              arCode.push(" ");
              arCode.push("  (: Retrieve possible direct/indirect object :)");
              arCode.push("  let $sbj := $search/child::"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.npObj+"')]");
              arCode.push("  ");
              arCode.push("  (: subject and object must exist :)");
              arCode.push("  where (");
              arCode.push("        exists($sbj)");
              arCode.push("    and exists($obj)");
              arCode.push("  )");
              break;
            case "clsSub":
              arCode.push(" for $search in //"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.clsSub+"')]");
              break;
            case "clsSubSbj":
              arCode.push(" for $search in //"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.clsSub+"')]");
              arCode.push(" ");
              arCode.push("  (: Retrieve possible subject :)");
              arCode.push("  let $sbj := $search/child::"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.npSbj+"')]");
              arCode.push("  ");
              arCode.push("  (: subject must exist :)");
              arCode.push("  where (");
              arCode.push("    exists($sbj)");
              arCode.push("  )");
              break;
            case "clsSubSbjObj":
              arCode.push(" for $search in //"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.clsSub+"')]");
              arCode.push(" ");
              arCode.push("  (: Retrieve possible subject :)");
              arCode.push("  let $sbj := $search/child::"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.npSbj+"')]");
              arCode.push(" ");
              arCode.push("  (: Retrieve possible direct/indirect object :)");
              arCode.push("  let $sbj := $search/child::"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.npObj+"')]");
              arCode.push("  ");
              arCode.push("  (: subject and object must exist :)");
              arCode.push("  where (");
              arCode.push("        exists($sbj)");
              arCode.push("    and exists($obj)");
              arCode.push("  )");
              break;
            case "npAll":
              arCode.push(" for $search in //"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.npAny+"')]");
              break;
            case "ppAll":
              arCode.push(" for $search in //"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.ppAny+"')]");
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