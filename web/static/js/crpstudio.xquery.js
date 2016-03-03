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
  // ========== Variables that are global to 'crpstudio' ===================================
  //            (also see crpstudio.js)
  crpstudio.tagset = null,        // Array with pre-specified tags like 'subject', 'object' and so on
  crpstudio.qry_relation = null,  // Array with pre-specified relations: preceding-sibling, child, parent...
  crpstudio.qry_position = null;  // Array with pre-specified positions: first, last, any
  
  // Define module 'xquery'
  crpstudio.xquery = (function ($, config){
    // Variables within the scope of [crpstudio.xquery]
    var sLng = "",    // Language we are currently working with
        arMonth =  new Array('January', 'February', 'March', 'April', 
                             'May', 'June', 'July', 'August', 'September', 
                             'October', 'November', 'December'),
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
        for (var i=0;i<arTagset.length;i++) {
          // Get this item
          var oTagSpec = arTagset[i];
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
        arCode.push("{");
        // Get the header and mdi variables
        arCode.push("  let $hdr := ru:header()");
        arCode.push("  let $mdi := ru:mdi()");
        // Get all variables defined for this section in "metavar"
        // (NOTE: they are only actually calculated in Xquery if they are needed)
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
            var oRule = arRules[i]; var sVar = "$"+oRule.variable; var sValue = oRule.value;
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
        arCode.push("}");
        arCode.push("</metaFilter>");
        // Return what we have made
        var sBack = arCode.join("\n");
        return sBack;
      },
      
      /**
       * createGroupingQ
       *    Create Xquery code to assign each input file to one particular 'group'
       *    
       *    This is called from [crpstudio.result.js] in order to convert
       *      a particular grouping into a piece of Xquery that can be 
       *      passed as "xqGrouping" setting to the current Corpus Research Project
       *      
       * @param {string} sGroupingValue - the 'value' of the chosen grouping in terms of variables
       * @returns {string}
       */
      createGroupingQ : function(sGroupingValue) {
        var arCode = [];
        
        // Start with the starting tag
        arCode.push("<metaGrouping>");
        arCode.push("{");
        // Get the header and mdi variables
        arCode.push("  let $hdr := ru:header()");
        arCode.push("  let $mdi := ru:mdi()");
        // Get all variables defined for this section in "metavar"
        // (NOTE: they are only actually calculated in Xquery if they are needed)
        var arVarset = crpstudio.project.getMetaList("", "", "variables");
        for (var i=0;i<arVarset.length;i++) {
          var oVardef = arVarset[i];
          var sEntry = (oVardef.loc==="header") ? "$hdr" : "$mdi";
          var sValue = oVardef.value.replace(/descendant/g, sEntry+"/descendant");
          arCode.push("  let $"+oVardef.name+" := "+sValue);
        }
        
        // The user (or system) supplied 'value' should return a proper group name string
        arCode.push("  let $name := "+sGroupingValue);
        // But if the name returns empty, it should be replaced with 'default'
        arCode.push("  let $group := if ($name = '') then 'default' else $name");
        
        // Finish the group-name-determination section
        arCode.push("       ");
        
        // Return the value of the calculated condition 
        // (first attempt...)
        arCode.push("  return ru:backgroup($group)");
        
        // Add closing tag
        arCode.push("}");
        arCode.push("</metaGrouping>");
        // Return what we have made
        var sBack = arCode.join("\n");
        // Show this code on the grouping results
        $("#result_view3_grpcode").children("textarea").html(sBack);
        return sBack;
      },
      
      /**
       * getCurrentDate
       *    Get the current date as a string
       * 
       * @returns {String}
       */
      getCurrentDate : function() {
        var today = new Date();
        var dd = today.getDate();
        var mm = arMonth[today.getMonth()]; //January is 0!
        var yyyy = today.getFullYear();

        var sBack = dd+'/'+mm+'/'+yyyy;        
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
       * @param {string}  sPrjType   - Project type
       * @param {boolean} bDbase     - database is input
       * @param {string}  sType      - Type of overall query to produce (preset); may be "definition"
       * @param {string}  sItemName  - Name of the query/definition
       * @param {boolean} bMakeDbase - output into a database
       * @returns {String}
       */
      createQuery : function(sPrjType, bDbase, sType, sItemName, bMakeDbase) {
        // clsAny, clsMain, clsSub, clsInf,  npSbj,    npObj,  npAny,   ppAny,   vbAny,  vbFin
        var arCode = [];    // Code for in the query
        var arDef = [];     // Code for in a definitions file
        var arWhere = [];   // Code containing the 'where' part
        var arArgList = []; // List of arguments for definition function
        var arCnsList = []; // Same list, but with the constituents as used in the Query code
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
        // Prepare creating a definitions file
        var sDefName = "";
        if (sType === "definition") 
          sDefName = sItemName;
        else
          sDefName = sItemName + "_def";
        // Add preamble to definition
        arDef.push("(: ----------------------------------------------------------------------------");
        arDef.push("   Name:  " + sDefName);
        arDef.push("   Goal:  Definition supporting main query");
        arDef.push("   History:");
        // TODO: add the current date after the user
        arDef.push("   " + crpstudio.currentUser + "\t" + crpstudio.xquery.getCurrentDate() + "\tCreated");
        arDef.push("   ---------------------------------------------------------------------------- :)");
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
              if (bMakeDbase) { arArgList.push("cls"); arCnsList.push("search");}
              break;
            case "clsMain":
              arCode.push(" for $search in //"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.clsMain.class+"')]");
              if (bMakeDbase) { arArgList.push("clsMain"); arCnsList.push("search");}
              break;
            case "clsMainSbj":
              arCode.push(" for $search in //"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.clsMain.class+"')]");
              arCode.push(" ");
              arCode.push("  (: Retrieve the first possible subject  :)");
              arCode.push("  let $sbj := $search/child::"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.npSbj.class+"')][1]");
              arCode.push("  ");
              arWhere.push("  (: subject must exist :)");
              arWhere.push("  where (");
              arWhere.push("    exists($sbj)");
              arWhere.push("  )");
              if (bMakeDbase) {
                arArgList.push("clsMain"); arArgList.push("npSbj");
                arCnsList.push("search"); arCnsList.push("sbj");
              }
              break;
            case "clsMainSbjObj":
              arCode.push(" for $search in //"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.clsMain.class+"')]");
              arCode.push(" ");
              arCode.push("  (: Retrieve the first possible subject :)");
              arCode.push("  let $sbj := $search/child::"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.npSbj.class+"')][1]");
              arCode.push(" ");
              arCode.push("  (: Retrieve the first possible direct/indirect object :)");
              arCode.push("  let $obj := $search/child::"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.npObj.class+"')][1]");
              arCode.push("  ");
              arWhere.push("  (: subject and object must exist :)");
              arWhere.push("  where (");
              arWhere.push("        exists($sbj)");
              arWhere.push("    and exists($obj)");
              arWhere.push("  )");
              if (bMakeDbase) {
                arArgList.push("clsMain");arArgList.push("npSbj");arArgList.push("npObj");
                arCnsList.push("search"); arCnsList.push("sbj");arCnsList.push("obj");
              }
              break;
            case "clsSub":
              arCode.push(" for $search in //"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.clsSub.class+"')]");
              if (bMakeDbase) { arArgList.push("clsSub"); arCnsList.push("search");}
              break;
            case "clsSubSbj":
              arCode.push(" for $search in //"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.clsSub.class+"')]");
              arCode.push(" ");
              arCode.push("  (: Retrieve the first possible subject :)");
              arCode.push("  let $sbj := $search/child::"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.npSbj.class+"')][1]");
              arCode.push("  ");
              arWhere.push("  (: subject must exist :)");
              arWhere.push("  where (");
              arWhere.push("    exists($sbj)");
              arWhere.push("  )");
              if (bMakeDbase) {
                arArgList.push("clsSub");arArgList.push("npSbj");
                arCnsList.push("search");arCnsList.push("sbj");
              }
              break;
            case "clsSubSbjObj":
              arCode.push(" for $search in //"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.clsSub.class+"')]");
              arCode.push(" ");
              arCode.push("  (: Retrieve the first possible subject :)");
              arCode.push("  let $sbj := $search/child::"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.npSbj.class+"')][1]");
              arCode.push(" ");
              arCode.push("  (: Retrieve the first possible direct/indirect object :)");
              arCode.push("  let $obj := $search/child::"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.npObj.class+"')][1]");
              arCode.push("  ");
              arWhere.push("  (: subject and object must exist :)");
              arWhere.push("  where (");
              arWhere.push("        exists($sbj)");
              arWhere.push("    and exists($obj)");
              arWhere.push("  )");
              if (bMakeDbase) {
                arArgList.push("clsSub");arArgList.push("npSbj");arArgList.push("npObj");
                arCnsList.push("search"); arCnsList.push("sbj");arCnsList.push("obj");
              }
              break;
            case "clsSubVfinFirst":
              arCode.push(" for $search in //"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.clsSub.class+"')]");
              arCode.push(" ");
              arCode.push("  (: Retrieve first constituent - if it is a finite verb :)");
              arCode.push("  let $subVfin := $search/child::"+oDescr.const+"[1][ru:matches(@"+oDescr.pos+",'"+oTag.vbFin.class+"')][1]");
              arCode.push(" ");
              arWhere.push("  (: the vFin first constituent must exist :)");
              arWhere.push("  where (");
              arWhere.push("     exists($subVfin)");
              arWhere.push("  )");
              if (bMakeDbase) {
                arArgList.push("clsSub");arArgList.push("vFin");
                arCnsList.push("search"); arCnsList.push("subVfin");
              }
              break;
            case "npAll":
              arCode.push(" for $search in //"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.npAny.class+"')]");
              if (bMakeDbase) { arArgList.push("npAny");arCnsList.push("search"); }
              break;
            case "ppAll":
              arCode.push(" for $search in //"+oDescr.const+"[ru:matches(@"+oDescr.pos+",'"+oTag.ppAny.class+"')]");
              if (bMakeDbase) { arArgList.push("ppAny");arCnsList.push("search"); }
              break;
            default:
              arCode.push(" for $search in //"+oDescr.const);
              break;
          }
          // Continue with code for the database
          if (bMakeDbase) {
            var strArgList = "";  // List of arguments
            var strCnsList = "";  // List of constituents
            var strDbList = "";   // List for the concat() function
            for (var i=0;i<arArgList.length;i++) {
              // Argument list
              if (strArgList !== "") strArgList = strArgList + ", ";
              strArgList = strArgList + "$nd_" + arArgList[i] + " as node()?";
              // List for calling features
              if (strCnsList !== "") strCnsList = strCnsList + ", ";
              strCnsList = strCnsList + "$" + arCnsList[i];
            }
            arDef.push("declare function tb:GetFt" + sItemName + "(" + strArgList + ") as xs:string?");
            arDef.push("{");                
            // Make code to get the text of all the arguments
            for (var i=0;i<arArgList.length;i++) {
              arDef.push("  (: Get the text of argument #"+(i+1)+" :)");
              arDef.push("  let $ft_txt_"+arArgList[i]+" := ru:NodeText($nd_"+arArgList[i]+")");
              arDef.push("");
              // Keep track of the concat() function
              if (strDbList !== "") strDbList += ",';', \n" + "      ";
              strDbList += "$ft_txt_"+arArgList[i];
            }            
            // Make code to get the label fo all the arguments
            for (var i=0;i<arArgList.length;i++) {
              arDef.push("  (: Get the label of argument #"+(i+1)+" :)");
              arDef.push("  let $ft_lbl_"+arArgList[i]+" := $nd_"+arArgList[i]+"/@"+oDescr.pos);
              arDef.push("");
              // Keep track of the concat() function
              if (strDbList !== "") strDbList += ",';', \n" + "      ";
              strDbList += "$ft_lbl_"+arArgList[i];
            }     
            // Finish the database function
            arDef.push("  return concat(" + strDbList + ")");
            arDef.push("};");
            arDef.push("");
          }
          // Combine the definition function
          var strDefText = arDef.join("\n");
          // Create a new definition file
          var oDef = {"Name": sDefName, "Goal": "Support query ["+sItemName+"]", 
                      "Comment": "Supply variable definitions and functions in support of query ["+sItemName+"]",
                      "Text": strDefText};
                    
          // Does this provide Dbase output?
          if (bMakeDbase) {
            arCode.push("  (: Calculate the features for the results database :)");
            arCode.push("  let $dbList := tb:GetFt"+sItemName + "(" + strCnsList + ")");
            arCode.push("  ");
            sMsg = ", $dbList";
          }
          
          // Add the 'where' part
          arCode.push(arWhere.join("\n"));
          
          // Provide a return statement for the main query
          arCode.push("  ");
          arCode.push(" (: Return results :)");
          arCode.push(" return ru:back($search"+sMsg+sSubcat+")");          
        }
        // Closing tag
        arCode.push("}</"+sTagMain+">");
        // Combine the contents of arCode and return it as one string, separated by \n
        var oBack = {"query": arCode.join("\n"), 
          "definition": oDef, 
          "features": arArgList};
        return (oBack);
      }
    };
  }($, crpstudio.config));
  
  return crpstudio;
  
} (jQuery, window.crpstudio || {}));