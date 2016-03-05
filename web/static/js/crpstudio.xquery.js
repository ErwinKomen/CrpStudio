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
    var sLng = "",              // Language we are currently working with
        loc_sConstituents = "", // List of constituents
        loc_sRelations = "",    // Relations
        loc_sPositions = "",    // Positions
        loc_arVarName = [],     // Array of variable names
        loc_arVarAll = [],      // List of *all* the variable names
        arMonth =  new Array('January', 'February', 'March', 'April', 
                             'May', 'June', 'July', 'August', 'September', 
                             'October', 'November', 'December'),
        sPart = "";           // Part of the language (e.g: CGN, Sonar etc)
    
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
      },
      
      /**
       * getRowNumber 
       *    Given the tag name and the full id, return the number in the tag-name
       * 
       * @param {string} sIdName
       * @param {string} sId
       * @returns {int}
       */
      getRowNumber : function(sIdName, sId) {
        if (sId.startsWith(sIdName)) {
          var iNumber = parseInt(sId.substring(sIdName.length), 10);
          return iNumber;
        } else return 0;
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
      },
      
      /**
       * varNameChange
       *    Process changes in the name of variable # iNumber
       * 
       * @param {type} target
       * @param {type} iNumber
       * @returns {undefined}
       */
      varNameChange : function(target, iNumber) {
        // Get the name of the variable
        var sName = $(target).val().trim();
        // Check for the first element, which must be 'search'
        if (loc_arVarName.length === 0) loc_arVarName.push("search");
        // Check if a variable with this number already exists
        if (loc_arVarName.length <= iNumber) {
          // Add an element
          loc_arVarName.push(sName);
        } else {
          // Adapt the existing element
          loc_arVarName[iNumber] = sName;
        }
        // Adapt the contents of the variable boxes
        crpstudio.xquery.adaptVarCombos(iNumber);
      },
      
      /**
       * adaptVarCombos
       *    Adapt the contents of the variable combo-boxes
       * 
       * @param {type} iNumber
       * @returns {undefined}
       */
      adaptVarCombos : function(iNumber) {
        // Create new options
        var arHtml = [];
        for (var i=0;i<loc_arVarName.length-1;i++) {
          arHtml.push("<option value=\""+loc_arVarName[i]+"\">"+loc_arVarName[i]+"</option>");
        }
        if (iNumber >0) {
          // Adapt the existing combobox on this BuildItem
          var sTowards = "cns_towards"+iNumber;
          var sOrgVal = $("#"+sTowards).val();
          if (!sOrgVal || sOrgVal === "") sOrgVal = "search";
          $("#"+sTowards).html(arHtml.join("\n"));
          $("#"+sTowards).val(sOrgVal);
        }
        
        // Create options for condition item
        var arCondItem = [];
        for (var i=0;i<loc_arVarName.length;i++) {
          arCondItem.push("<option value=\""+loc_arVarName[i]+"\">"+loc_arVarName[i]+"</option>");
        }
        var sCondList = arCondItem.join("\n");
        // Adapt all the comboboxes on the 'ConditionItem' elements
        $("#query_new_cnd .cnd-var").each(function() {
          var sOrgSel = $(this).val();
          $(this).html(sCondList);
          $(this).val(sOrgSel);
        });        
      },
      
      /**
       * getBuildItem
       *    Create one table row element for [query_new_cns]
       * 
       * @returns {undefined}
       */
      getBuildItem : function() {
        var arHtml = [];    // Array to put in parts for this row
        // Find out how many rows are in there already
        var iRowNumber = $("#query_new_cns").find("tr").length+1;
        // Start the row
        arHtml.push("<tr id=\"cns_number_"+iRowNumber+"\" >");
        // (1) Allow user to enter a name in [cns_name_dd]
        arHtml.push("<td><input id=\"cns_name"+iRowNumber+"\""+
                " class=\"left general_input\" type=\"text\" placeholder=\"name (no spaces)\" >"+
                "<small id=\"cns_name"+iRowNumber+"_error\" class=\"hidden\">Name must be new and not have spaces</small>"+
                "</td>");
        // (2) Allow user to select a constituent type
        arHtml.push("<td><select id=\"cns_type"+iRowNumber+"\">"+loc_sConstituents+"</select></td>");
        // (3) Allow user to select a constituent relation
        arHtml.push("<td><select id=\"cns_rel"+iRowNumber+"\">"+loc_sRelations+"</select></td>");
        // (4) Allow user to select a constituent positions
        arHtml.push("<td><select id=\"cns_pos"+iRowNumber+"\">"+loc_sPositions+"</select></td>");
        // (5) Provide a list of variable names that have already been made, including "search"
        arHtml.push("<td><select id=\"cns_towards"+iRowNumber+"\">"+loc_arVarName+"</select></td>");
        // (6) Add a button to *remove* this current row
        arHtml.push("<td><a href=\"#\" onclick=\"crpstudio.xquery.removeBuildRow(this);\""+
                " class=\"knopje\"><b>-</b></a></td>");
        // (7) Add a button to *add* a new row
        arHtml.push("<td><a href=\"#\" onclick=\"crpstudio.xquery.addBuildRow(this);\""+
                " class=\"knopje\"><b>+</b></a></td>");
        
        // Finish the row
        arHtml.push("</tr>");
        // Return the combined result
        return arHtml.join("\n");
      },
     
      /**
       * getConditionItem
       *    Create one table row element for [query_new_cnd]
       * 
       * @returns {undefined}
       */
      getConditionItem : function() {
        var arHtml = [];    // Array to put in parts for this row
        // Find out how many rows are in there already
        var iRowNumber = $("#query_new_cnd").find("tr").length+1;
        // Start the row
        arHtml.push("<tr id=\"cnd_number_"+iRowNumber+"\" >");
        // (2) Allow user to select one variable (including 'search')
        arHtml.push("<td><select id=\"cnd_var"+iRowNumber+"\" class=\"cnd-var\">"+loc_arVarName+"</select></td>");
        // (3) Allow user to select a constituent relation
        arHtml.push("<td><select id=\"cnd_rel"+iRowNumber+"\">"+loc_sRelations+"</select></td>");
        // (4) Allow user to select a constituent positions
        arHtml.push("<td><select id=\"cnd_pos"+iRowNumber+"\">"+loc_sPositions+"</select></td>");
        // (5) Provide a list of variable names that have already been made, including "search"
        arHtml.push("<td><select id=\"cnd_towards"+iRowNumber+"\" class=\"cnd-var\">"+loc_arVarName+"</select></td>");
        // (6) Add a button to *remove* this current row
        arHtml.push("<td><a href=\"#\" onclick=\"crpstudio.xquery.removeConditionRow(this);\""+
                " class=\"knopje\"><b>-</b></a></td>");
        // (7) Add a button to *add* a new row
        arHtml.push("<td><a href=\"#\" onclick=\"crpstudio.xquery.addConditionRow(this);\""+
                " class=\"knopje\"><b>+</b></a></td>");
        
        // Finish the row
        arHtml.push("</tr>");
        // Return the combined result
        return arHtml.join("\n");
      },

      /**
       * removeBuildRow
       *    Remove the row on which [target] is situated
       * 
       * @param {type} target
       * @returns {undefined}
       */
      removeBuildRow: function(target) {
        var divRow = $(target).closest("tr");
        var sRowName = $(divRow).attr("id");
        var iRow = private_methods.getRowNumber("cns_number_", sRowName);
        // Check how many rows there are 
        var iTotal = $("#query_new_cns").find("tr").length;
        // Validate
        if (iRow < iTotal) {
          // We may not remove this row
          return;
        }
        $(divRow).remove();
        // TODO: check which 'additional conditions' must be removed because
        //       this row has been removed
        
        // Add event handling
        crpstudio.xquery.addBuildChangeEvents("query_new_builder");
      },
      
      /**
       * addBuildRow
       *    Add a new row after [target]
       * 
       * @param {type} target
       * @returns {undefined}
       */
      addBuildRow : function(target) {
        var divRow = $(target).closest("tr");
        var sRowName = $(divRow).attr("id");
        var iRow = private_methods.getRowNumber("cns_number_", sRowName);
        // Get the new row's content
        var sContent = crpstudio.xquery.getBuildItem();
        // Add this <tr> after the current <tr>
        $(divRow).after(sContent);
        // Check if 'additional' is already shown
        if ($("#query_new_additional").hasClass("hidden")) {
          // It is not shown: check if it *should* be shown
          var iTotal = $("#query_new_cns").find("tr").length;
          if (iTotal >=2) {
            // Yes it should be shown -- first put at least *ONE* row there
            $("#query_new_cnd").html(crpstudio.xquery.getConditionItem());
            // Now show it
            $("#query_new_additional").removeClass("hidden");
          }
        }
        // Adapt the contents of the variable boxes
        crpstudio.xquery.adaptVarCombos(0);
        // Add event handling
        crpstudio.xquery.addBuildChangeEvents("query_new_builder");
      },
      
      /**
       * removeConditionRow
       *    Remove the row on which [target] is situated
       * 
       * @param {type} target
       * @returns {undefined}
       */
      removeConditionRow: function(target) {
        var divRow = $(target).closest("tr");
        var sRowName = $(divRow).attr("id");
        var iRow = private_methods.getRowNumber("cnd_number_", sRowName);
        // Check how many rows there are 
        var iTotal = $("#query_new_cnd").find("tr").length;
        // Validate
        if (iRow < iTotal) {
          // We may not remove this row
          return;
        }
        $(divRow).remove();
        // TODO: check which 'additional conditions' must be removed because
        //       this row has been removed
        
        // Add event handling
        crpstudio.xquery.addBuildChangeEvents("query_new_builder");
      },
      
      /**
       * addConditionRow
       *    Add a new row after [target]
       * 
       * @param {type} target
       * @returns {undefined}
       */
      addConditionRow : function(target) {
        var divRow = $(target).closest("tr");
        var sRowName = $(divRow).attr("id");
        var iRow = private_methods.getRowNumber("cnd_number_", sRowName);
        // Get the new row's content
        var sContent = crpstudio.xquery.getConditionItem();
        // Add this <tr> after the current <tr>
        $(divRow).after(sContent);
        // Adapt the contents of the variable boxes
        crpstudio.xquery.adaptVarCombos(0);
        // Add event handling
        crpstudio.xquery.addBuildChangeEvents("query_new_builder");
      },
            
      /**
       * buildQueryParts
       *    Collect the user-chosen query parts 
       * 
       * @returns {object}
       */
      buildQueryParts : function() {
        // Create an object where we collect the results
        var oBuild = {};
        // Get the $search consonant type
        oBuild.search = $("#query_new_cnstype").val();
        // Process all the table rows in [query_new_cns]
        var arCnsRows = $("#query_new_cns").find("tr");
        var arCns = [];
        for (var i=0;i<arCnsRows.length;i++) {
          // Get all the <td> elements
          var arTd = $(arCnsRows[i]).children("td");
          var oCns = {};
          // Get the relevant information for this included constituent
        }
        // Process all the table rows in [query_new_cnd]
        var arCndRows = $("#query_new_cnd").find("tr");
        var arCnd = [];
        for (var i=0;i<arCndRows.length;i++) {
          // Get all the <td> elements
          var arTd = $(arCnsRows[i]).children("td");
          var oCnd = {};
          // Get the relevant information for this included condition
        }
        // COmbine
        oBuild.cns = arCns;
        oBuild.cnd = arCnd;
        // Return the result
        return oBuild;
      },
      
      /**
       * newQueryType
       *    This function is called when "query_new_qrytype" changes
       * 
       * @param {e} target
       * @returns {void}
       */
      newQueryType : function(target) {
        // Find out what the changed value is
        var sTypeValue = $(target).val();
        // Switch the [query_new_builder] on or off
        if (sTypeValue === "qryBuild") {
          // Fill the combobox afresh
          if (loc_sConstituents === "") {
            var arHtml = [];
            arHtml.push("<option value=\"\">(Please make a selection)</option>");
            // Prepare the array of consonants
            for (var i=0;i<crpstudio.constituents.length;i++) {
              var oThis = crpstudio.constituents[i];
              var sShow = (crpstudio.config.language === "en") ? oThis.eng : oThis.nld;
              arHtml.push("<option value=\""+oThis.title+"\">"+oThis.title+": "+sShow+"</option>");
            }
            loc_sConstituents = arHtml.join("\n");
            // Prepare an array of relations
            loc_sRelations = crpstudio.qry_relation;
            // Prepare an array of positions
            loc_sPositions = crpstudio.qry_position;
          }
          // Put a *FIRST* row into place
          $("#query_new_cns").html(crpstudio.xquery.getBuildItem());
          // Add event handling
          crpstudio.xquery.addBuildChangeEvents("query_new_builder");
          $("#query_new_cnstype").html(loc_sConstituents);
          // Make sure the constituent-choosing is switched off initially
          $("#query_new_constituents").addClass("hidden");
          // Make sure the additional-choosing is switched off initially
          $("#query_new_additional").addClass("hidden");
          // Show the builder
          $("#query_new_builder").removeClass("hidden");
        } else {
          $("#query_new_builder").addClass("hidden");
        }
      },
      
      /**
       * ctlTimer
       *    Catch events from <input> and so forth
       * 
       * @param {type} target
       * @param {type} sType
       * @returns {undefined}
       */
      ctlTimer : function(target, sType) {
        var sIdName = "cns_name";
        var sId = $(target).attr("id");
        
        // Check the type
        switch(sType) {
          case "input":
            // We are dealing with an <input> event
            if (sId.startsWith(sIdName)) {
              var iNumber = parseInt(sId.substring(sIdName.length), 10);
              crpstudio.xquery.varNameChange(target, iNumber);
            }
            break;
          case "select":
            // Action depends on the combobox that is selected
            switch(sId) {
              case "query_new_cnstype":
                // Check if a value has been chosen
                if ($(target).val() !== "") {
                  // This means that the [query_new_constituents] may be shown
                  $("#query_new_constituents").removeClass("hidden");
                }
                break;
            }
            break;
        }
      },

      /**
       * addBuildChangeEvents
       *    Add events to facilitate query building
       * 
       * @param {e} sItemId
       * @returns {void}
       */
      addBuildChangeEvents : function(sItemId) {
        // Get the ID of the element we need
        var sId = "#" + sItemId;
        // Add event handlers on all INPUT elements under sItemId
        $(sId + " input").on("change paste input", 
          function() {crpstudio.xquery.ctlTimer(this, "input");});
        // Add event handlers on all SELECT elements under sItemId
        $(sId + " select").on("change paste input", 
          function() {crpstudio.xquery.ctlTimer(this, "select");});
      }
      
      
    };
  }($, crpstudio.config));
  
  return crpstudio;
  
} (jQuery, window.crpstudio || {}));