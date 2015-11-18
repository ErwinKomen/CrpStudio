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
  // Define crpstudio.project
  crpstudio.project = (function ($, config){

    // Variables within the scope of crpstudio.project
    var loc_tab  =  "project";    // The main tab we are on (equals to "project_editor")
    var loc_dbaseInput = false;   // Do we have a database as input?
    var currentCorpus =  "";      // Currently selected corpus
    var currentPrj =  "";         // The currently being executed project (the CRP name)  (used by crpstudio.result)
    var currentLng =  "";         // the "lng" parameter of the current project (used by crpstudio.result)
    var currentDir =  "";         // the "dir" parameter of the current project (used by crpstudio.result)
    var currentDb =  "";          // The database that serves as current input
    var currentDbLng =  "";       // Language according to current db
    var currentDbDir =  "";       // Part of language for current db
    var currentCrp =  -1;         // The CrpId of the currently selected CRP (project)
    var currentQry =  -1;         // The QueryId of the currently selected query
    var currentDef =  -1;         // The DefId of the currently selected Definition
    var currentQc =  -1;          // The QCid of the currently selected QC
    var currentDbf =  -1;         // The DbFeatId of the currently selected dbfeat
    var currentDbId = -1;         // The DbId of the currently selected database
    var strQstatus =  "";         // The JSON string passed on to R-server "status"
    var divStatus =  "";          // The name of the div where the status is to be shown
    var recentcrp =  "";          // Recently used CRP
    var interval =  200;          // Number of milliseconds
    var typingTimer =  null;      // Timer to make sure we react only X seconds after typing
    var doneTypingIntv =  2000;   // Stop-typing interval =  2 seconds
    var ctlCurrent =  null;       // Current control
    var ctlCurrentId =  "";       // ID of current control
    var lstHistory =  [];         // List of changes =  type; id; crp; key; value
    var cmQuery =  null;          // 
    var cmDef =  null;            // 
    var prj_dbaseinput =  "";     // Field value of this project =  dbaseinput (True/False)
    var prj_language =  "";       // Field value of this project =  language
    var prj_deflist =  null;      // Field value of this project =  list of definitions
    var prj_qrylist =  null;      // Field value of this project =  list of queries
    var prj_qclist =  null;       // Field value of this project =  list of QC elements
    var prj_dbflist =  null;      // Field value of this project =  list of database features
    var prj_crplist =  null;      // List of currently available CRPs
    var qry_current =  null;      // Currently loaded Query object
    var def_current =  null;      // Currently loaded Definition object
    var dbf_current =  null;      // Currently loaded DbFeat object
    var qc_current =  null;       // Currently loaded QC object (constructor)
    var loc_dirty =  false;       // Project needs saving or not
    var qry_dirty =  false;       // Flag to indicate that the 'Text' area of Query has changed
    var def_dirty =  false;       // Flag to indicate that the 'Text' area of Definition has changed
    var bIsSelecting =  false;    // Flag to indicate that selection changes take place
    var loc_bNew = false;         // New CRP created, but not yet saved

    // Define private methods
    var private_methods = {
      /**
       * histAdd - add one item to the history
       * 
       * @param {string} sType  - project, query, definition etc
       * @param {int} iId       - numerical id of query/def etc
       * @param {string} sCrp   - name of the CRP
       * @param {string} sKey   - field name (e.g. "Goal", "Text")
       * @param {string} sValue - new value of the field
       * @param {bool}   bForce - this value must be created, even if it equals the old one
       * @returns {bool}
       */
      histAdd : function(sType, iId, sCrp, sKey, sValue, bForce) {
        // If this is a change in name, then check it immediately
        if (!private_methods.itemCheck(sType, iId, sKey, sValue)) return false;
        // Check what the 'old' value was
        var sOld = private_methods.getItemValue(sType, iId, sCrp, sKey);
        // Validate: only real changes must continue
        if (sValue === sOld && (!bForce || bForce===undefined || bForce===false)) return false;
        // Some changes cause perculation (e.g. query name change --> QC list)
        if (!private_methods.itemPerculate(sType, iId, sCrp, sKey, sValue, sOld)) return false;
        // Possibly get the last item of history
        var iSize = lstHistory.length;
        var bAdded = false;
        if (iSize >0) {
          // Look for the last entry in lstHistory with the same type/id/crp/key
          for (var i=iSize-1; i>=0 && !bAdded;i--) {
            var oThis = lstHistory[i];
            // Check if this pertains to the same type/id/crp/key
            if (oThis.type === sType && oThis.id === iId && oThis.crp === sCrp &&
                    oThis.key === sKey) {
              // Is the value equal?
              if (oThis.value === sValue) {
                // Then no changes are needed
                bAdded = true;
              } else if (i === iSize-1) {
                // We simply adapt the last item
                oThis.value = sValue;
                lstHistory[iSize-1] = oThis;
                bAdded = true;
              }
            } 
          }
        } 
        if (!bAdded) {
          // Make sure 'project' stuff does *NOT* get an id
          var iPushId = iId;
          if (sType === "project") iPushId = -1;
          // We need to *add* a new element: create the element
          var oNew = {type: sType, id: iPushId, crp: sCrp, key: sKey, value: sValue, old: sOld, saved: false};
          // Add the new element to the list
          lstHistory.push(oNew);
        }
        // Check if the value needs to be adapted in a list
        switch (sKey) {
          case "delete":
          case "create":
            // No changes here
            break;
          default:
            // Change in list
            private_methods.setOneItem(sType, sKey, iId, sValue);
            // Check if list needs to be re-drawn

            break;
        }

        // Make sure the save button is shown
        private_methods.showSaveButton(true);
        // Indicate the project needs saving
        loc_dirty = true;
        // Return positively
        return true;
      },

      /**
       * histAddItem
       *    Add all elements of item in the list of @sItemType with @iItemId
       * 
       * @param {type} sItemType
       * @param {type} iItemId
       * @returns {undefined}
       */
      histAddItem : function(sItemType, iItemId) {
        // Validate: the @id must be 1 or higher
        if (!sItemType || !iItemId || iItemId <1) return;
        // Access the information object for this type
        var oItemDesc = private_methods.getItemDescr(sItemType);
        // Access the item from the correct list
        var oListItem = private_methods.getListObject(sItemType, oItemDesc.id, iItemId);
        // Determine the target project name
        var sTargetPrj = currentPrj;
        switch(sItemType) {
          case "project":
            sTargetPrj = oListItem["Name"];
            break;
        }
        // Start out with a histAdd that signals the creation of a new item
        private_methods.histAdd(sItemType, iItemId, sTargetPrj, "create", "");
        // Walk all the fields of this item
        var arFields = oItemDesc.fields;
        for (var i=0;i<arFields.length;i++) {
          // Get the descriptor of this item
          var oFieldDesc = arFields[i];
          // Check if this one needs to be done
          if (oFieldDesc.loc !== "") {
            // Yes, this one needs an addHist treatment
            var sValue = oListItem[oFieldDesc.field];
            // Only add if we really have a value
            if (sValue) {
              // Add the value by force
              private_methods.histAdd(sItemType, iItemId, sTargetPrj, oFieldDesc.field, sValue, true);
            }
          }
        }

      },

      /**
       * histClear -- Clear the history for the specified project
       * 
       * @param {type} sCrpName
       * @returns {undefined}
       */
      histClear: function(sCrpName) {
        var arHist = lstHistory;
        // Walk all the items in the history
        for (var i=arHist.length-1; i>=0;i--) {
          // Access this item for convenience
          var oItem = arHist[i];
          // Check if this item relates to the indicated CRP
          if (oItem.crp === sCrpName) {
            // Clear this item
            arHist.splice(i,1);
          }
        }
        // Reset the dirty flag if needed
        // if (arHist.length === 0) loc_dirty = false;
        // (No 'if' is needed, perhaps??)
        loc_dirty = false;
      },

      /**
       * histSave -- save current history and clear it
       * 
       * @param {bool} bClear
       * @returns {void}
       */
      histSave : function(bClear) {
        var arSend = [];
        var arHist = lstHistory;
        var arHad = [];
        var targetCrp = currentPrj;   // The CRP for which this change is intended
        //
        // Validate
        if (!loc_dirty && arHist.Length === 0) return;
        // Make sure we have the correct CRP name
        for (var i=0;i<arHist.length;i++) {
          var oItem = arHist[i];
          if (oItem.key === "Name") {
            // Take the *oldest* crp name instead of the currentPrj
            targetCrp = oItem.old;
            break;
          }
        }
        // Copy the original history array to a new one, combining type + key
        // Leave out the ones we've already had, but preserve order
        
        for (var i=0;i<arHist.length;i++) {
          // Access this element
          var oItem = arHist[i];
          // Calculate the correct key
          var sKey = oItem.key;
          if (oItem.type !== "project") sKey = oItem.type + "." + sKey;
          // Find out whether this is already in the arSend array
          var iHaveHad = -1;
          for (var j=0;j<arSend.length;j++) {
            var oOneSend = arSend[j];
            // Note: I have excluded a check on CRP name -- is that okay??
            if (oOneSend.key === sKey && oOneSend.id === oItem.id) {
              // We've already had this one
              iHaveHad = j; break;
            }
          }
          var oPush = {key: sKey, id: oItem.id, value: oItem.value};
          if (iHaveHad<0) 
            arSend.push(oPush);
          else
            arSend[iHaveHad] = oPush;
        }

        // Pass on this value to /crpstudio and to /crpp
        var oChanges = { "crp": targetCrp,
          "userid": crpstudio.currentUser, "list": arSend };
        var params = JSON.stringify(oChanges);
        // Clear the history list
        if (bClear) 
          lstHistory = [];
        else {
          // At least clear the project history
          private_methods.histClear(currentPrj);
        }
        // Send the changes
        crpstudio.main.getCrpStudioData("crpchg", params, crpstudio.project.processCrpChg, "#project_description");      
      },

      /**
       * getNewId 
       *    Create a new id for list @oList, using field @sIdField
       * 
       * @param {type} oList
       * @param {type} sIdField
       * @returns {undefined}
       */
      getNewId : function(oList, sIdField) {
        var iItemId = 0;
        // Validate
        if (oList === null) return 0;
        // Walk through all members, looking for the maximum
        for (var i=0;i<oList.length;i++) {
          var oItem = oList[i];
          var iThisId = parseInt(oItem[sIdField],10);
          if (iThisId > iItemId) iItemId = iThisId;
        }
        // Return the result
        return iItemId+1;
      },
      
      /**
       * getItemDescr
       *    Get the correct item from "prj_access", which describes the details
       *    of the project's item
       * 
       * @param {type} sListType
       * @returns {object}
       */
      getItemDescr : function(sListType) {
        var oItem = null;
        // Find the correct item
        for (var i=0;i<config.prj_access.length;i++) {
          oItem = config.prj_access[i];
          // Check if this is the item
          if (oItem.name === sListType) return oItem;
        }
        // Didn't find it
        return null;
      },

      /**
       * itemCheck
       *    Check if item of type @sItemType kan have a @sKey with @sValue
       *    
       * @param {type} sItemType
       * @param {type} iId        - @id value of the item to be checked
       * @param {type} sKey
       * @param {type} sValue
       * @returns {bool}          - Return true if the check is okay
       */
      itemCheck : function(sItemType, iId, sKey, sValue) {
        var bOkay = true;
        // Find out which name needs to be checked
        var oDescr = private_methods.getItemDescr(sItemType);
        var sListField = oDescr.listfield;
        var sIdField = oDescr.id;
        var sId = iId.toString();
        // Check if this is the listfield
        if (sListField === sKey) {
          // This is the list field, so check the value
          if (sValue.indexOf(" ") >= 0) {
            bOkay = false;
          } else {
            // Check if the name occurs already
            switch (sItemType) {
              case "project":
                var oList = prj_crplist;
                var sCurCrp = currentPrj;
                // Walk the list
                for (var i=0;i<oList.length;i++) {
                  // Get this item
                  var oItem = oList[i];
                  if (oItem["crp"] !== sCurCrp+".crpx") {
                    if (oItem["crp"] === sValue+".crpx" && oItem["CrpId"] !== iId) { bOkay = false; break; }
                  }
                }
                break;
              default:
                var oList = private_methods.getList(sItemType);
                // Walk the list
                for (var i=0;i<oList.length;i++) {
                  // Get this item
                  var oItem = oList[i];
                  if (oItem[sListField] === sValue && oItem[sIdField] !== sId) { bOkay = false; break; }
                }
                break;
            }
          }
        }
        // Get the name of the <div> for this field
        var sLoc = "";
        for (var i=0;i<oDescr.fields.length;i++) {
          var oFieldDescr = oDescr.fields[i];
          if (oFieldDescr.field === sKey) {
            sLoc = oFieldDescr.loc; break;
          }
        }
        // FOund the loc?>
        if (sLoc !== "") {
          var sLocErr = sLoc + "_error";
          // Action if we're not okay
          if (!bOkay) {
            // Put the location in error mode
            $("#"+sLocErr).addClass("error");
            $("#"+sLocErr).removeClass("hidden");
          } else {
            // Remove possible error mode
            $("#"+sLocErr).removeClass("error");
            $("#"+sLocErr).addClass("hidden");
          }

        }

        // Getting here means we're okay
        return bOkay;
      },

      /**
       * itemNameCheck
       *    Check if name @sItemName already exists for @sItemType
       *    
       * @param {type} sItemType
       * @param {type} sItemName
       * @returns {boolean}       - true if the item is okay (it *not* a duplicate)
       */
      itemNameCheck : function(sItemType, sItemName) {
        // Get the list
        var oList = private_methods.getList(sItemType);
        // If the list is emtpy, we are okay
        if (oList === null) return true;
        // Find out which name need to be checked
        var oDescr = private_methods.getItemDescr(sItemType);
        var sListField = oDescr.listfield;
        // Walk the list
        for (var i=0;i<oList.length;i++) {
          // Get this item
          var oItem = oList[i];
          if (oItem[sListField] === sItemName) return false;
        }
        // Getting here means we're okay
        return true;
      },

      /**
       * itemPerculate
       *    Perculate change in type @sItemType of @sKey with @sValue
       *    
       * @param {string} sItemType
       * @param {int} iId           - @id value of the item to be checked
       * @param {string} sCrp       - name of current CRP
       * @param {string} sKey
       * @param {string} sValue
       * @param {string} sOldValue  - value of the @sKey before changes
       * @returns {bool}            - Return true if the perculation proceeded well
       */
      itemPerculate : function(sItemType, iId, sCrp, sKey, sValue, sOldValue) {
        var bOkay = true;
        // Find out which item is changing
        var oDescr = private_methods.getItemDescr(sItemType);
        var sListField = oDescr.listfield;
        // Not used now, but keep for future perculation tasks
        var sIdField = oDescr.id;
        var sId = iId.toString();
        // Perculation actions depend on the type of element
        switch (sItemType) {
          case "query":
            // Check if this is the listfield (i.e. @Name)
            if (sListField === sKey) {
              // Also change the @Query field in the QC list -- where appropriate
              var oList = prj_qclist;
              for (var i=0;i<oList.length;i++) {
                var bChanged = false;
                // Get this item
                var oItem = oList[i];
                // Check: Query, Output, Result
                if (oItem["Query"] === sOldValue) { 
                  // First perculation: need to create a histAdd
                  //    This requires the id...
                  var iQCid = parseInt(oItem["QCid"],10);              
                  private_methods.histAdd("constructor",iQCid, sCrp, "Query", sValue); 
                  if (oItem["Output"] === sOldValue) { 
                    oItem["Output"] = sValue; 
                    private_methods.histAdd("constructor",iQCid, sCrp, "Output", sValue);
                  }
                  if (oItem["Result"] === sOldValue) { 
                    oItem["Result"] = sValue; 
                    private_methods.histAdd("constructor",iQCid, sCrp, "Result", sValue);
                  }
                  // Only now make the change in the *list*
                  oItem["Query"] = sValue; 
                  bChanged = true;
                }            
                // Possibly put the list element back correcte
                if (bChanged) oList[i] = oItem;
              }
            }
            break;
          default:
            // No other actions are required
            break;
        }

        // Getting here means we're okay
        return bOkay;
      },
      
      /**
       * getItemValue -- get the value of the indicated item
       *                 use the on-board lists to get it
       * @param {type} sListType
       * @param {type} iItemId
       * @param {type} sCrp
       * @param {type} sKey
       * @returns {undefined}
       */
      getItemValue : function(sListType, iItemId, sCrp, sKey) {
        // Access the information object for this type
        var oItemDesc = private_methods.getItemDescr(sListType);
        // Access the item from the correct list
        var oListItem = private_methods.getListObject(sListType, oItemDesc.id, iItemId);
        // Get the value of the indicated field
        return oListItem[sKey];
      },
      
      /**
       * showExeButtons -- show or hide the Execute buttons
       * 
       * @param {type} bShow
       * @returns {undefined}
       */
      showExeButtons : function(bShow) {
        if (bShow) {
          $("#project_executor").removeClass("hidden");
          $("#project_executor_nocache").removeClass("hidden");
        } else {
          $("#project_executor").addClass("hidden");
          $("#project_executor_nocache").addClass("hidden");
        }
      },

      /**
       * showSaveButton -- show or hide the SAVE button
       * 
       * @param {type} bShow
       * @returns {undefined}
       */
      showSaveButton : function(bShow) {
        if (bShow) {
          $("#project_saving").removeClass("hidden");
        } else {
          $("#project_saving").addClass("hidden");
        }
      },

      /**
       * getList
       *    Find the indicated list
       * 
       * @param {type} sListType
       * @returns {object}    the indicated array/list
       */
      getList : function(sListType) {
        var oList = [];   // JSON type list of objects
        // Find the correct list
        switch(sListType) {
          case "project":     oList = prj_crplist; break;
          case "query":       oList = prj_qrylist;break;
          case "definition":  oList = prj_deflist;break;
          case "constructor": oList = prj_qclist;break;
          case "dbfeat":      oList = prj_dbflist;break;
        }
        if (oList === null) oList = [];
        // Return what we found
        return oList;
      },
      
      /**
       * setList
       *    Set the value of the indicated list
       * 
       * @param {type} sListType
       * @param {type} oList
       * @returns {void}
       */
      setList : function(sListType, oList) {
        // Find the correct list
        switch(sListType) {
          case "project":     prj_crplist = oList; break;
          case "query":       prj_qrylist = oList;break;
          case "definition":  prj_deflist = oList;break;
          case "constructor": prj_qclist = oList; break;
          case "dbfeat":      prj_dbflist = oList;break;
        }
      },

      /**
       * showlist -- create a set of <li> items to occur in the "available"
       *             section of one of four different types:
       *             "query", "definition", "constructor" or "dbfeat"
       * 
       * Notes: this function should *not* be used for the projectlist
       *        nor for the databaselist. Those lists are created by /crpstudio
       *        and sent here upon request            
       *        
       * Experimental: Type "project" has been added to see if we can use it for the project list after all
       *             
       * @param {string} sListType
       * @returns {void} 
       * @history
       *  6/oct/2015  ERK Created
       *  15/oct/2015 ERK 
       */
      showlist : function(sListType) {
        var oList = null;   // JSON type list of objects
        var sPrf = "";      // Prefix
        var sLoc = "";      // Location on html
        var arHtml = [];    // To gather the output

        // Find the correct list
        oList = private_methods.getList(sListType);
        // Find the prefix
        var oItemDesc = private_methods.getItemDescr(sListType);
        var sPrf = oItemDesc.prf;
        sLoc = "#" + sListType + "_list" + " ." + sPrf + "-available";
        // Calculate a list consisting of <li> items
        // QRY: "QueryId;Name;File;Goal;Comment;Created;Changed"
        // DEF: "DefId;Name;File;Goal;Comment;Created;Changed"
        // QC:  "QCid;Input;Query;Output;Result;Cmp;Mother;Goal;Comment"
        // DBF: "DbFeatId;Name;Pre;QCid;FtNum"
        // CRP: "CrpId;Name;Language;Part;Author;ProjectType;Goal;Created;Changed;DbaseInput;Comments"
        for (var i=0;i<oList.length;i++) {
          var oOneItem = oList[i];
          var sOneName = oOneItem[oItemDesc.listfield];
          var sOneItem = "<li class='" + sPrf + "_" + sOneName + " " + 
                  sPrf + "-available'><a href=\"#\" onclick=\"";
          switch(sListType) {
            case "project": 
              if (parseInt(oOneItem.QueryId,10) === currentCrp) sOneItem = sOneItem.replace('available', 'available active');
              sOneItem += "crpstudio.project.setProject(this, '"+oOneItem.Name+"', '"+ 
                      oOneItem.Language +"', '"+oOneItem.Part+"')\">" + oOneItem.Name; break;
            case "query": 
              if (parseInt(oOneItem.QueryId,10) === currentQry) sOneItem = sOneItem.replace('available', 'available active');
              sOneItem += "crpstudio.project.setCrpItem(this, 'query', "+ 
                      oOneItem.QueryId +")\">" + oOneItem.Name; break;
            case "definition": 
              if (parseInt(oOneItem.DefId,10) === currentDef) sOneItem = sOneItem.replace('available', 'available active');
              sOneItem += "crpstudio.project.setCrpItem(this, 'definition', "+ 
                      oOneItem.DefId +")\">" + oOneItem.Name; break;
            case "constructor": 
              if (parseInt(oOneItem.QCid,10) === currentQc) sOneItem = sOneItem.replace('available', 'available active');
              sOneItem += "crpstudio.project.setCrpItem(this, 'constructor', "+ 
                      oOneItem.QCid +")\">" + oOneItem.QCid + " " +
                      oOneItem.Input + " " + oOneItem.Result; break;
            case "dbfeat": 
              if (parseInt(oOneItem.DbFeatId,10) === currentDbf) sOneItem = sOneItem.replace('available', 'available active');
              sOneItem += "crpstudio.project.setCrpItem(this, 'dbfeat', "+ 
                      oOneItem.DbFeatId +")\">" + oOneItem.Name + 
                      " " + oOneItem.FtNum; break;
          }
          sOneItem += "</a></li>\n";
          arHtml.push(sOneItem);
        }
        // Adapt the QRY-AVAILABLE list
        $(sLoc).not(".divider").not(".heading").remove();
        $(sLoc).last().after(arHtml.join("\n"));
        
        // Reset the status, which is at the bottom-end of this list
        $("#" + sListType + "_status").html("");
      },

      /**
       * getListObject
       *    Access the list for @sListName, and return the object identified
       *    by <sIdField, iValue>
       * 
       * @param {string} sListType
       * @param {string} sIdField
       * @param {int} iValue
       * @returns {object}
       */
      getListObject : function(sListType, sIdField, iValue) {
        var oList = private_methods.getList(sListType);   // JSON type list of objects
        // OLD: if (sListType === "project" || oList === null) return oList;
        if (oList === null) return oList;
        // Walk all the elements of the list
        for (var i=0;i<oList.length;i++) {
          var oOneItem = oList[i];
          var iId = parseInt(oOneItem[sIdField], 10);
          // Check the id
          if (iId === iValue) return oOneItem;
        }
        // Didn't get it
        return null;
      },

      /**
       * setOneItem
       *    Set the value of the item identified by @sItemType/@sKey/@iIdValue
       *    
       * @param {type} sItemType
       * @param {type} sKey
       * @param {type} iIdValue
       * @param {type} sValue
       * @returns {undefined}
       */
      setOneItem : function(sItemType, sKey, iIdValue, sValue) {
        // Get a descriptor object
        var oDescr = private_methods.getItemDescr(sItemType);
        // Get the correct list
        var oList = private_methods.getList(sItemType);
        // Do we have a list??
        if (oList !== null) {
          // Walk all the elements of the list
          for (var i=0;i<oList.length;i++) {
            var oOneItem = oList[i];
            var iId = parseInt(oOneItem[oDescr.id], 10);
            // Check the id
            if (iId === iIdValue) {
              //Change the item's field value
              oList[i][sKey] = sValue;
              break;
            }
          }
        }
        /*
        // Action depends on item type
        switch(sItemType) {
          case "query":
            // Walk all the elements of the list
            for (var i=0;i<prj_qrylist.length;i++) {
              var oOneItem = prj_qrylist[i];
              var iId = parseInt(oOneItem[oDescr.id], 10);
              // Check the id
              if (iId === iIdValue) {
                //Change the item's field value
                prj_qrylist[i][sKey] = sValue;
              }
            }
            break;
          case "definition":
            // Walk all the elements of the list
            for (var i=0;i<prj_deflist.length;i++) {
              var oOneItem = prj_deflist[i];
              var iId = parseInt(oOneItem[oDescr.id], 10);
              // Check the id
              if (iId === iIdValue) {
                //Change the item's field value
                prj_deflist[i][sKey] = sValue;
              }
            }
            break;
          case "dbfeat":
            // Walk all the elements of the list
            for (var i=0;i<prj_dbflist.length;i++) {
              var oOneItem = prj_dbflist[i];
              var iId = parseInt(oOneItem[oDescr.id], 10);
              // Check the id
              if (iId === iIdValue) {
                //Change the item's field value
                prj_dbflist[i][sKey] = sValue;
              }
            }
            break;
          case "constructor":
            // Walk all the elements of the list
            for (var i=0;i<prj_qclist.length;i++) {
              var oOneItem = prj_qclist[i];
              var iId = parseInt(oOneItem[oDescr.id], 10);
              // Check the id
              if (iId === iIdValue) {
                //Change the item's field value
                prj_qclist[i][sKey] = sValue;
              }
            }
            break;
        }
        */

      },

      /**
       * getCrpItem
       *    Look in the list of CrpItems (def/query/dbfeat/qc) for the one
       *    having the @id field iItemId, and return the <a> element where it is
       *    
       * @param {type} sListType
       * @param {type} iItemId
       * @returns {undefined}
       */
      getCrpItem : function(sListType, iItemId) {
        // Access the information object for this type
        var oItemDesc = private_methods.getItemDescr(sListType);
        // Get the NAME of this element
        var oListItem = private_methods.getListObject(sListType, oItemDesc.id, iItemId);
        // Construct the unique class name identifying our target
        var sClass = oItemDesc.prf + "_" + oListItem[oItemDesc.listfield];
        // Get the location identifier for this element: Intersection --> no space after "available"
        var sLoc = "#" + sListType + "_list" + " ." + oItemDesc.prf  + "-available";
        var oFirst = null;
        // Ga alle elementen handmatig af
        $(sLoc).each(function() {
          if (oFirst === null) oFirst = $(this).children(":last").get(0);
          // Check if it has the correct class
          if ($(this).hasClass(sClass)) {
            // Find this element's last child, which is the <a> element
            var oTarget = $(this).children(":last").get(0);
            // Return this
            return oFirst = oTarget;
          }
        });
        // Return the result of the search function
        return oFirst;
      },

      /**
       * getItemObject 
       *    Use the location (the @id) to get an object of the item
       * 
       * @param {type} sLocation
       * @returns {undefined}
       */
      getItemObject : function(sLocation) {
        var oItem = null;
        // Find the correct item
        for (var i=0;i<config.prj_access.length;i++) {
          oItem = config.prj_access[i];
          // Walk through the fields
          for (var j=0;j< oItem.fields.length;j++) {
            if (oItem.fields[j].loc === sLocation) {
              // We found it!
              return {type: oItem.name, key: oItem.fields[j].field};
            }
          }
        }
        // Didn't find it
        return null;
      },

      /**
       * getItemField
       *    Get the location (the <div> id) associated with field @sFieldName in the
       *    list of type @sListType
       * 
       * @param {type} sListType
       * @param {type} sFieldName
       * @returns {undefined}
       */
      getItemFieldLoc : function(sListType, sFieldName) {
        var oItem = private_methods.getItemDescr(sListType);
        // Get the fields object
        var oFields = oItem.fields;
        // Walk all the fields
        for (var i=0;i<oFields.length;i++ ) {
          // Is this the correc field?
          if (oFields[i].field === sFieldName) {
            return oFields[i].loc;
          }
        }
        // Failure
        return "";
      },

      /**
       * createListItem 
       *    Create a new item for the list of type @sListType
       * 
       * @param {type} sListType
       * @param {type} oStart
       * @returns {int}           new item's id (numerical)
       */
      createListItem : function(sListType, oStart) {
        // Get a descriptor object
        var oDescr = private_methods.getItemDescr(sListType);
        // Find the correct list
        var oList = private_methods.getList(sListType);
        var iItemId = private_methods.getNewId(oList, oDescr.id);
        // Start preparing a new object
        var oNew = {}; oNew[oDescr.id] = iItemId.toString();
        // Get the fields array
        var arField = oDescr.fields;
        // Walk all the fields
        for (var i=0;i<arField.length;i++) {
          // Add this field to the object
          var oOneField = arField[i].field; oNew[oOneField] = "";
        }
        // Adapt the fields provided by [oStart]
        for (var propt in oStart) {
          oNew[propt] = oStart[propt];
        }
        // Get the field on which we need to sort
        var sSortField = oDescr.listfield;
        var sSortName = oNew[sSortField].toLowerCase();
        var bAdded = false;
        // Find out where to put the new item
        for (var i=0;i<oList.length;i++) {
          var oThis = oList[i];
          // Should we insert before this item?
          if (oThis[sSortField].toLowerCase() > sSortName) {
            // We must insert here
            oList.splice(i,0,oNew);
            bAdded = true;
            break;
          }
        }
        if (!bAdded) {
          // Add the new item to the correct list
          oList.push(oNew);
        }
        // And adapt the indicated list
        private_methods.setList(sListType, oList);
        // Indicate in the history that this new object must be created
        private_methods.histAddItem(sListType, iItemId);
        // Return the new id
        return iItemId;
      },
      
      /**
       * changePrjName
       *    Make all necessary changes to change the project name visibly and internally
       * 
       * @param {type} sPrjName
       * @returns {undefined}
       */
      changePrjName : function(sPrjName) {
        // Make sure the active class is selected
        currentPrj = sPrjName;
        // Also set the name of the currently selected project in a div
        $("#project_current").text(sPrjName);
        // And set the name of the project in the top-bar div
        $("#top_bar_current_project").text(sPrjName);
      }, 
      
      /**
       * initProject
       *    Initialise a project: clear Qry, Def, Dbf, Qc pointers
       * 
       * @param {type} sLng
       * @param {type} sDir
       * @param {type} sDbase
       * @returns {void}
       */
      initProject : function(sLng, sDir, sDbase) {
        // Invalidate the 'current' setters
        currentQry = -1;
        currentDef = -1;
        currentDbf = -1;
        currentQc = -1;
        // Reset all lists
        prj_deflist = []; prj_qrylist = [];
        prj_qclist  = []; prj_dbflist = [];
        // Clear definition
        $("#def_general").addClass("hidden");
        $("#def_description").html("<i>No definition selected</i>");
        // Clear query
        $("#query_general").addClass("hidden");
        $("#query_description").html("<i>No query selected</i>");
        // Clear constructor
        $("#qc_general").addClass("hidden");
        $("#qc_description").html("<i>No constructor line selected</i>");


        // Do we have a lng (+ optional dir)?
        if ((!sLng || sLng === "") && prj_language ==="") {
          // Show the corpus-selector
          $("#corpus-selector").show();
          // Reset the lng + dir
          crpstudio.project.setCorpus("");
        } else {
          // Make sure sDir is defined
          if (!sDir) sDir = "";
          // Set the lng + dir
          crpstudio.project.setCorpus(sLng, sDir);
          // Set the correct option within the 'corpus-selector'
          var sOption = sLng + ":" + sDir + ":" + sDbase;
          $("#input_lng").val(sOption);
          // Hide the corpus-selector
          // $("#corpus-selector").hide();
        }
        if (!sDbase || sDbase === "") {
          crpstudio.project.resetDbase(false);
        } else {
          crpstudio.project.setDbase(sDbase, sLng, sDir, false);
        }        
      }
    };

    // Define the methods we return publically
    return {
      // Getters for some 'global' variables used by crpstudio.result
      getPrj: function() { return currentPrj;},
      getLng: function() { return currentLng;},
      getDir: function() { return currentDir;},
      getDb: function() { return currentDb;},
      getTab: function() { return loc_tab;},

      /* ---------------------------------------------------------------------------
       * Name: execute
       * Goal: execute the currently set project
       * History:
       * 22/jun/2015  ERK Created
       */
      execute : function(caching) {
        var sPrjName = currentPrj;
        var sUserName = crpstudio.currentUser;        
        // Validate project and user
        if (sPrjName ==="" ) {
          crpstudio.main.debug("project is not defined");
        } else if (sUserName === "") {
          crpstudio.main.debug("user is not defined");
        } else {
          // Find out which language corpus the user has chosen
          var sLng = currentLng;
          var sDir = currentDir;
          var sDbase = currentDb;
          // Validate
          if (!sLng || sLng === "") {
            // Language needs to be set
            $("#project_status").text("First set language");
            $("#input_status").text("First set language");
            // Switch to the language stuff
            crpstudio.project.switchTab("input");
            return;
          }

          // debugging: show where the status appears
          $("#project_status").text("Processing project: " + sPrjName);
          $("#result_status").text("");
          // Switch off export
          for (var i=1;i<=4;i++) { $("#results_export_"+i).addClass("hidden"); }
          // switch to the result tab
          crpstudio.project.switchTab("result_display");
          $("#result_status").text("");
          // Make sure the execute buttons are hidden again
          private_methods.showExeButtons(false);
         // Set the location of the status div
          divStatus = "#result_report";
          // Start creating a request object
          var oExeRequest = {};
          // Create JSON request for the search
          if (sDir === "") {
            if (sDbase === "")
              oExeRequest = {"lng": sLng, "crp": sPrjName, "userid": sUserName, "cache": caching};
            else
              oExeRequest = {"lng": sLng, "crp": sPrjName, "dbase": sDbase, "userid": sUserName, "cache": caching};
          } else {
            if (sDbase ==="")
              oExeRequest = {"lng": sLng, "crp": sPrjName, "dir": sDir, "userid": sUserName, "cache": caching};
            else
              oExeRequest = {"lng": sLng, "crp": sPrjName, "dir": sDir, "dbase": sDbase, "userid": sUserName, "cache": caching};
          }
          // var sExeRequest = "query=" + JSON.stringify(oExeRequest);
          var params = JSON.stringify(oExeRequest);

          // Send the request to /crpstudio/exe?{...}
          // crpstudio.main.getCrpStudioData("exe", sExeRequest, crpstudio.project.processExeCrpStudio, "#result_status");
          crpstudio.main.getCrpStudioData("exe", params, crpstudio.project.processExeCrpStudio, "#result_status");
        }
      },

      /* ---------------------------------------------------------------------------
       * Name: processExeCrpp
       * Goal: callback function for the execution of a project
       * History:
       * 23/jun/2015  ERK Created
       */
      processExeCrpp : function(oResponse, target) {
        // The initial response should contain one object: status
        var status = oResponse.status;
        // Initialisations
        var jobId = "";
        var sUserId = "";
        var sStatusRequest = "";
        // Part of the object is the code (which should be 'started')
        var statusCode = status.code;
        var statusMsg = (status.message) ? (": "+status.message) : "";
        // Set the status
        $(target).html(statusCode+statusMsg);
        // Action depends on the status code
        switch (statusCode.toLowerCase()) {
          case "started":
            // Get the jobid and the userid
            jobId = status.jobid;
            sUserId = status.userid;
            // Create a status request object
            var oStatusRequest = {
              "jobid": jobId,
              "userid": sUserId
            };
            sStatusRequest = JSON.stringify(oStatusRequest);
            // Make the status available within this JavaScript module
            strQstatus = sStatusRequest;
            // Make sure the results are not visible yet
            $("#results").addClass("hidden");
            $("#results").removeClass("active");
            // Hide querylines from viewing
            $("#result_querylines").addClass("hidden");
            // Now issue this request with an interval of 0.5 seconds
            setTimeout(
              function () {
                crpstudio.main.postRequest("statusxq", sStatusRequest, crpstudio.project.processExeCrpp, target);
              }, interval);
            break;
          case "working":
            // Show the current status
            crpstudio.project.doStatus(oResponse);
            // Retrieve the status request object string
            sStatusRequest = strQstatus ;
            // Now issue the same request with an interval of 0.5 seconds
            setTimeout(
              function () {
                crpstudio.main.postRequest("statusxq", sStatusRequest, crpstudio.project.processExeCrpp, target);
              }, interval);
            break;
          case "completed":
            // Signal completion
            $(target).html("Fetching results");
            // Show the final status
            crpstudio.project.doStatus(oResponse);
            // And more completeino
            $(target).html("");
            // Make sure the results are visible
            $("#results").removeClass("hidden");
            $("#results").addClass("active");
            break;
          case "error":
            // Provite an error report
            $(target).html("There was an error");
            break;
          default:
            // Provite a status report showing that we are at a loss

            break;
        }
     /*
      * Returned status is like:
      * {
      "status": {
        "code": "started",
        "message": "{\"total\":705,\"ready\":2,\"start\":\"cmkempe.m4.psdx\",\"count\":10,\"finish\":\"cmthorn.mx4.psdx\"}",
        "userid": "erwin",
        "jobid": "158",
        "checkAgainMs": 200
      }
    }
      */
      },

      /* ---------------------------------------------------------------------------
       * Name: processExeCrpStudio
       * Goal: callback function for the /crpstudio/exe command
       *       The [oResponse] can have the following values:
       *       error    - the content.message (if there was an error)
       *       status   - a JSON object contaning:
       *        code    - the status.code sent by /crpp: error, working, started, completed
       *        message - the status.message (if available)
       *        jobid   - the /crpp internal jobid for this job
       *        userid  - the /crpp internal userid for this job
       *       content  - A JSON object containing
       *        table   - the /crpp returned table, if job was completed
       *        prjlist - adapted "crp-available" list if job was completed
       *        recent  - adapted "crp-recent" item if job was completed
       *        
       * History:
       * 6/jul/2015  ERK Created
       */
      processExeCrpStudio : function(oResponse, target) {
        // The initial response should contain one object: status
        var oStatus = oResponse.status;
        // Initialisations
        var jobId = "";
        var sUserId = "";
        var sStatusRequest = "";
        // Part of the object is the code (which should be 'started')
        var statusCode = oStatus.code;
        var statusMsg = (oStatus.message) ? (": "+oStatus.message) : "";
        // Set the status
        $(target).html(statusCode);
        // Try to get a content object
        // var oContent = (oResponse.content) ? oResponse.content : {};
        // Action depends on the status code
        switch (statusCode.toLowerCase()) {
          case "started":
            // Get the jobid and the userid
            jobId = oStatus.jobid;
            sUserId = (oStatus.userid) ? oStatus.userid : crpstudio.currentUser;
            // Create a status request object
            var oStatusRequest = {
              "jobid": jobId,
              "userid": sUserId
            };
            // sStatusRequest = "query=" + JSON.stringify(oStatusRequest);
            sStatusRequest = JSON.stringify(oStatusRequest);
            // Make the status available within this JavaScript module
            strQstatus = sStatusRequest;
            // Make sure the results are not visible yet
            $("#results").addClass("hidden");
            $("#results").removeClass("active");
            // Hide querylines from viewing
            $("#result_querylines").addClass("hidden");
            // Now issue this request with an interval of 0.5 seconds
            setTimeout(
              function () {
                crpstudio.main.getCrpStudioData("statusxq", sStatusRequest, crpstudio.project.processExeCrpStudio, target);
              }, interval);
            break;
          case "working":
            // Show the current status
            crpstudio.project.doStatus(oResponse);
            // Retrieve the status request object string
            sStatusRequest = strQstatus ;
            // Now issue the same request with an interval of 0.5 seconds
            setTimeout(
              function () {
                crpstudio.main.getCrpStudioData("statusxq", sStatusRequest, crpstudio.project.processExeCrpStudio, target);
              }, interval);
            break;
          case "completed":
            // Signal completion
            $(target).html("Fetching results");
            // Show the final status
            crpstudio.project.doStatus(oResponse);
            // Access the content
            var oContent = oResponse.content;
            // Adapt the CRP-AVAILABLE list
            $("#project_list .crp-available").not(".divider").not(".heading").remove();
            $("#project_list .crp-available").last().after(oContent.prjlist);
            // ADAPT the CRP-RECENT
            $("#project_list .crp-recent").not(".divider").not(".heading").remove();
            $("#project_list .crp-recent").last().after(oContent.recent);
            // And more completion
            $(target).html("");
            // Make sure the results are visible
            $("#results").removeClass("hidden");
            $("#results").addClass("active");
            crpstudio.result.selectResults('querylines');
            break;
          case "error":
            // Switch off the progress indicator
            $("#result_progress").addClass("hidden");
            // But make the "fetching" section available
            $("#result_fetching").removeClass("hidden");        // Provide an error report
            // The actual message code should be in the content
            var oContent = oResponse.content;

            if (oContent.message !== "") {
              var sReport = [];
              // Try to unpack the status
              var arMsgs = oContent.message.split("\n");
              var sFirstMsg = arMsgs[0];
              var oMsgLine = null;
              // Is this a JSON array?
              if (sFirstMsg.charAt(0) === "[") {
                // Assume this is a JSON array, so get the first item
                oMsgLine = JSON.parse(sFirstMsg)[0];
              } else if (sFirstMsg.charAt(0) === "{") {
                oMsgLine = JSON.parse(sFirstMsg);
              }
              // Validate
              if (oMsgLine !== null) {
                // Can we do with this object?
                if (oMsgLine.Type && oMsgLine.Name) {
                  // Use oMsgContent for compatibility with the alternative below
                  var oMsgContent = oMsgLine;
                  sReport.push("<div class=\"status-error large-10 medium-10 small-10 columns\"><h4>Error report:</h4><table>");
                  for (var propThis in oMsgContent) {
                    sReport.push("<tr><td>"+propThis+"</td><td>"+oMsgContent[propThis]+"</td></tr>");
                  }
                  sReport.push("</table></div>");
                } else {
                  // Get the "msg" part
                  if (oMsgLine.msg) {
                    var sMsgContent = oMsgLine.msg;
                    // Is this JSON?
                    if (sMsgContent.charAt(0) === "{") {
                      var oMsgContent = JSON.parse(sMsgContent);
                      sReport.push("<div class=\"status-error large-10 medium-10 small-10 columns\"><h4>Error report:</h4><table>");
                      for (var propThis in oMsgContent) {
                        sReport.push("<tr><td>"+propThis+"</td><td>"+oMsgContent[propThis]+"</td></tr>");
                      }
                      sReport.push("</table></div>");
                    }
                  }
                }
              }
              if (!sReport || sReport === null || sReport.length === 0)
                sReport.push(statusMsg);
              // Show the report
              $(target).html(sReport.join("\n"));
            } else {
              $(target).prepend("There was an error:");
            }
            break;
          default:
            // Provite a status report showing that we are at a loss

            break;
        }
      },

      /* ---------------------------------------------------------------------------
       * Name: doStatus
       * Goal: show the progress of our work
       * 
       * Note: a possible [oContent] when the status is "working" might look like:
       *  "jobid":"820",
       *  "start":"stat-1570-e2-p2.psdx",
       *  "count":62,
       *  "total":448,
       *  "finish":"tillots-b-e3-p1.psdx",
       *  "ready":53
       *  
       * Note: oContent holds a table with results when the status is "completed"
       *  
       * History:
       * 24/jun/2015  ERK Created
       */
      doStatus : function(oResponse) {
        // Get the status part and code
        var sStatusCode = oResponse.status.code;
        // Get the content part of the response object
        var oContent = oResponse.content;
        // find the result_status element
        var divResProgress = $("#result_progress").get(0);
        var divResTable = $("#result_table_1").get(0);
        // Preparet HTML result
        var html = "";
        // Action depends on the status code
        switch (sStatusCode) {
          case "working":
            // Make sure the table is empty
            divResTable.innerHTML = "";
            // Make sure the 'hidden' class is taken away from the progress meters
            $("#result_progress").removeClass("hidden");
            $("#result_fetching").removeClass("hidden");
            // Retrieve the variables from the [oContent] object
            var sStart = oContent.start;
            var sFinish = oContent.finish;
            var iReady = oContent.ready;
            var iCount = oContent.count;
            var iTotal = oContent.total;
            // Calculate percentages
            var iPtcStarted = (iTotal === 0) ? 0 : (iCount * 100 / iTotal);
            var iPtcFinished = (iTotal === 0) ? 0 : (iReady * 100 / iTotal);
            /*
            // Show the status
            var sMsg = "status="+iReady+"-"+iCount+" of "+iTotal;
            crpstudio.main.debug(sMsg);
            // Build html content
            $(divStatus).text(sMsg);
            */
            if (iCount > 0) {
              var divStarted = null;
              var divFinished = null;
              // Find the two "meter" classed elements (<span>) within divResProgress
              var arMeter = divResProgress.getElementsByClassName("meter");
              if (arMeter && arMeter.length > 0) {
                divStarted = arMeter[0];
                divFinished = arMeter[1];
                // Set the correct styles for these elements
                divStarted.setAttribute("style", "width: " + iPtcStarted + "%");
                divFinished.setAttribute("style", "width: " + iPtcFinished + "%");
                // Put something inside the meters: the name of the file processed
                divStarted.innerHTML = sStart;
                divFinished.innerHTML = sFinish;
              }
            }
            break;
          case "completed":
            // Keep track of the status
            $("#result_status").html("Making overview table...");
            // Create a small top table
            crpstudio.result.makeOviewTable(oContent.table);
            // Keep track of the status
            $("#result_status").html("Constructing per-doc results...");
            // Create a large table for view=2
            html = crpstudio.project.makeTablesView2(oContent.table);
            // Position this table in the div for view=2 (per-document view)
            $("#result_table_2").html(html);

            // Keep track of the status
            $("#result_status").html("Constructing per-hit results...");
            // Show the time of this search
            $("#results_info_5").html("<p>Search time: <b>"+(oContent.searchTime / 1000)+" s.</b></p>");
            // Create an initial table for view=1: the 'hits'
            html = crpstudio.project.makeTablesView1(oContent.table);
            // Position this table in the div for view=2 (per-document view)
            $("#result_table_1").html(html);

            // Hide the progress meters
            $("#result_progress").addClass("hidden");
            // Remove the result report
            $("#result_report").html("");
            // Keep track of the status
            $("#result_status").html("");
            // In fact: make the whole "fetching" section hidden
            $("#result_fetching").addClass("hidden");
            // But show the querylines part
            $("#result_querylines").removeClass("hidden");
            // And make sure only one tab page is active -- the others are hidden
            crpstudio.result.showView(1);
            break;
          default:
            // TODO: take default action
            break;
        }

      },

       /* ---------------------------------------------------------------------------
       * Name: makeTablesView1
       * Goal: Make a table of the results per hit
       * 
       * History:
       * 21/jul/2015  ERK Created
       */
      makeTablesView1: function(arTable) {
        var html = [];
        // This is for viewe #1
        var iView = 1;
        // Interpret and show the resulting table
        // The 'table' is an array of QC elements
        for (var i=0; i< arTable.length; i++) {
          // Get this QC element
          var oQC = arTable[i];
          // Get the QC elements
          var arSubs = oQC.subcats;
          var iQC = oQC.qc;
          // Each QC result must be in its own div
          html.push("<div id=\"result_"+iView+"_qc"+iQC+"\" class=\"result-qc hidden\">");
          // Insert a heading for this QC item
          // html.push("<h5>QC "+iQC + "</h5>");
          // Set up a table for the sub-categories
          html.push("<table><thead><th>TOTAL</th>");
          for (var j=0;j<arSubs.length; j++) {
            html.push("<th>" + arSubs[j] + "</th>");
          }
          // Finish the header with sub-categories
          html.push("</thead>");
          // Start the table body
          html.push("<tbody>");
          var sAnyRowArg = "class=\"concordance\" onclick=\"crpstudio.result.showFileHits";
          // Show the one row with results for all files together
          var iCount = oQC.counts[i];
          var iStart = 1;
          var sId = "fh_"+iView+"_qc"+iQC+"_f"+j; 
          var arSubCounts = oQC.counts;
          var sRowArgs = sAnyRowArg + 
                  "("+iStart+","+iCount+",'',"+iQC+",'','#"+sId+"');\"";
          html.push("<tr "+sRowArgs+">");
          html.push("<td>"+iCount+"</td>");
          for (var k=0;k<arSubCounts.length; k++ ) {
            html.push("<td>"+arSubCounts[k]+"</td>");
          }
          html.push("</tr>");
          // Determine the @id for this result
          var iCols = 1+arSubCounts.length;
          // Make a row where the citation will be placed
          html.push("<tr class=\"citationrow hidden\"><td colspan="+iCols+">"+
                  "<div class=\"collapse inline-concordance\" id=\""+sId+
                  "\">Loading...</div></td></tr>");
          // Finish the table
          html.push("</tbody></table>");
          // Finish the div
          html.push("</div>");

          // Make tables for each sub category under this iQC
          for (var j=0;j<arSubs.length; j++) {
            html.push("<div id=\"result_"+iView+"_qcsub_"+iQC+"_"+j+"\" class=\"result-qc-sub hidden\">");
            // Set the heading for this table
            html.push("<table><thead><th>"+arSubs[j]+"</th></thead>");
            // Start the table body
            html.push("<tbody>");
            // One row for the hit-total
            iStart = 1;
            // Determine the @id for this result
            sId = "fh_"+iView+"_qc"+iQC+"_f"+k+"_s"+j;
            sRowArgs = sAnyRowArg  + 
                    "("+iStart+","+arSubCounts[j]+",'',"+iQC+",'"+arSubs[j]+"','#"+sId+"');\"";
            html.push("<tr "+sRowArgs+">");
            html.push("<td>"+arSubCounts[j]+"</td></tr>");
            // Make a row where the citation will be placed
            html.push("<tr class=\"citationrow hidden\"><td>"+
                    "<div class=\"collapse inline-concordance\" id=\""+sId+
                    "\">Loading...</div></td></tr>");
            // Finish this sub-cat-table
            html.push("</tbody></table></div>");
          }
        }
        // Join and return the result
        return html.join("\n");
      },

      /* ---------------------------------------------------------------------------
       * Name: makeTablesView2
       * Goal: Make a large table of the results per document
       * 
       * History:
       * 29/jun/2015  ERK Created
       */
      makeTablesView2: function(arTable) {
        var html = [];
        // this is for view #2
        var iView = 2;
        // Interpret and show the resulting table
        // The 'table' is an array of QC elements
        for (var i=0; i< arTable.length; i++) {
          // Get this QC element
          var oQC = arTable[i];
          // Get the QC elements
          var arSubs = oQC.subcats;
          var iQC = oQC.qc;
          var arHits = oQC.hits;  // Array with 'hit' elements
          // Each QC result must be in its own div
          html.push("<div id=\"result_"+iView+"_qc"+iQC+"\" class=\"result-qc hidden\">");
          // Insert a heading for this QC item
          // html.push("<h5>QC "+iQC + "</h5>");
          // Set up a table for the sub-categories
          html.push("<table><thead><th>text</th><th>TOTAL</th>");
          for (var j=0;j<arSubs.length; j++) {
            html.push("<th>" + arSubs[j] + "</th>");
          }
          // Finish the header with sub-categories
          html.push("</thead>");
          // Start the table body
          html.push("<tbody>");
          var sAnyRowArg = "class=\"concordance\" onclick=\"crpstudio.result.showFileHits";
          // Walk all the hits for this QC
          for (var j=0; j<arHits.length; j++) {
            var sFile = arHits[j].file;
            var iCount = arHits[j].count;
            var iStart = 1;
            var sId = "fh_qc"+iQC+"_f"+j; 
            var arSubCounts = arHits[j].subs;
            var sRowArgs = sAnyRowArg + 
                    "("+iStart+","+iCount+",'"+sFile+"',"+iQC+",'','#"+sId+"');\"";
            html.push("<tr "+sRowArgs+"><td>" + sFile + "</td>");
            html.push("<td>"+iCount+"</td>");
            for (var k=0;k<arSubCounts.length; k++ ) {
              html.push("<td>"+arSubCounts[k]+"</td>");
            }
            html.push("</tr>");
            // Determine the @id for this result
            var iCols = 2+arSubCounts.length;
            // Make a row where the citation will be placed
            html.push("<tr class=\"citationrow hidden\"><td colspan="+iCols+">"+
                    "<div class=\"collapse inline-concordance\" id=\""+sId+
                    "\">Loading...</div></td></tr>");
          }
          // Finish the table
          html.push("</tbody></table>");
          // Finish the div
          html.push("</div>");
          // Make tables for all the sub categories under this iQC
          for (var j=0;j<arSubs.length; j++) {
            html.push("<div id=\"result_"+iView+"_qcsub_"+iQC+"_"+j+"\" class=\"result-qc-sub hidden\">");
            // Set the heading for this table
            html.push("<table><thead><th>text</th><th>"+arSubs[j]+"</th></thead>");
            // Start the table body
            html.push("<tbody>");
            // Walk all the hits
            for (var k=0; k<arHits.length; k++) {
              var sFile = arHits[k].file;
              var arSubCounts = arHits[k].subs;
              var iStart = 1;
              // Determine the @id for this result
              var sId = "fh_qc"+iQC+"_f"+k+"_s"+j;
              var sRowArgs = sAnyRowArg  + 
                      "("+iStart+","+arSubCounts[j]+",'"+sFile+"',"+iQC+",'"+arSubs[j]+"','#"+sId+"');\"";
              html.push("<tr "+sRowArgs+"><td>" + sFile + "</td>");
              html.push("<td>"+arSubCounts[j]+"</td></tr>");
              // Make a row where the citation will be placed
              html.push("<tr class=\"citationrow hidden\"><td colspan=2>"+
                      "<div class=\"collapse inline-concordance\" id=\""+sId+
                      "\">Loading...</div></td></tr>");
            }
            // Finish this sub-cat-table
            html.push("</tbody></table></div>");
          }
        }
        // Join and return the result
        return html.join("\n");
      },

      /* ---------------------------------------------------------------------------
       * Name: switchtab
       * Goal: switch the tab within the [Search] page
       * History:
       * 22/jun/2015  ERK Created
       * 04/aug/2015  ERK Added "sRecentCrp" argument
       */
      switchTab : function(target, sRecentCrp, bForce) {
        crpstudio.main.debug("switching to search tab "+target+" from "+loc_tab);
        if (target !== loc_tab || bForce) {
          // Bookkeeping
          $("#search .content").removeClass("active");
          $("#"+target).addClass("active");
          $("#subnav dd").removeClass("active");
          $("#"+target+"_link").addClass("active");
          // Make sure the global variable is set correctly
          loc_tab = target;
          // Initially hide *all* SELECTORs
          $("#corpus-selector").hide(); $("#dbase-selector").hide();   $("#metadata").hide(); 
          $("#query_editor").hide(); $("#constructor_editor").hide(); $("#definition_editor").hide();
          private_methods.showExeButtons(false);
          // Remove textarea event handlers
          $("#query_general_top").unbind();
          $("#def_general_top").unbind();
          // Capture the current selecting state
          var bSelState = bIsSelecting;

          // Action depends on target 
          switch (target) {
            case "project_editor":
            case "project":
              // Selecting...
              bIsSelecting = true;
              // The execute buttons are shown if there is a current project
              var bHaveProject = (currentPrj!==undefined && currentPrj!=="");
              private_methods.showExeButtons(bHaveProject);
              // The Save button must be shown if the 'dirty' flag is set
              private_methods.showSaveButton(loc_dirty);
              // Possibly *show* the lng/corpus selector
              if (currentPrj!=="" && 
                  (!currentLng || currentLng === "")) {
                // Show it
                $("#corpus-selector").show();
              }
              // Do we have a current project?
              if (currentPrj === "") {
                // Make clear user understands he has to choose
                $("#project_description").removeClass("hidden");
                $("#project_description").html("<i>No project selected</i>");
                $("#project_general").addClass("hidden");
              }
              // Do we have a 'recent' CRP?
              if (sRecentCrp!==undefined && sRecentCrp !== "") {
                // Show the recent ones
                crpstudio.project.sideToggle($("#project_list li.heading.crp-recent").get(0), "crp-recent");
                // $("#project_list li .crp-recent").removeClass("hidden");
                recentcrp = sRecentCrp;
              } 
              // We are open for changes again
              bIsSelecting = bSelState;
              break;
            case "input_editor": 
            case "input":
              /* =========== META selection is for the future
              // Make sure the metadata selector is being shown
              $("#metadata").show();
                  */
              // Show the database selector if this is a database-input 
              if (loc_dbaseInput) {
                // Show the database selector
                $("#dbase-selector").show();
                // Figure out which dbase to show as selected
                if (currentDb && currentDb!=="") {
                  // Select the one with this database setting
                  $("#input_dbase option").filter(
                          function(i,e) {
                            var strText = $(e).val();
                            var arText = strText.split(":");
                            return arText[0] === currentDb; 
                          }).prop("selected", true);
                  // Select the option that starts with the corpus name
                  // $('#input_dbase option[value ^= "' + currentDb+ '"]').attr("selected", true);
                  // Note: this is possible, but less well
                } else {
                  // User must select: deselect everything
                  $("#input_dbase option:selected").attr("selected", false);
                  // Select the element requesting the user to make a choice
                  $("#input_dbase option[index == 0]").attr("selected", true);
                  // This should go to the histAdd
                  // private_methods.histAdd("project", -1, currentPrj, "Source",);
                }
              } else {
                // Show the corpus selector
                $("#corpus-selector").show();
                // Start by deselecting everything
                $("#input_lng option:selected").attr("selected", false);
                // Do we have a 'current' corpus?
                var sLng = currentLng;
                if (sLng && sLng !== "") {
                  // There is a current language specified
                  var sDir = currentDir;
                  if (sDir && sDir !== "") {
                    // A sub-part of the corpus is specified
                    $("#input_lng").val(sLng + ":" + sDir);
                  } else {
                    // No sub-part of the corpus is specified
                    $("#input_lng").val(sLng).first();
                    // Now we need to set the global sDir variable
                    var arCrp = $("#input_lng").val().split(":");
                    currentDir = arCrp[1];
                  }
                }
              }
              // The Save button must be shown if the 'dirty' flag is set
              private_methods.showSaveButton(loc_dirty);
              break;
            case "definitions": case "definition_editor":
              // Prevent undesired change triggers
              bIsSelecting = true;
              // Fill the definitions list
              private_methods.showlist("definition");
              // Show the definition selector
              $("#definition_editor").show();
              // Call setCrpItem() which should check if a 'default' item needs to be shown
              crpstudio.project.setCrpItem(null, "definition");    
              // Switch on event handling in def_general_top to trigger resizing of the Xquery editor
              crpstudio.project.addXqueryResizeEvents("def_general_top");
              // Add event handlers on all INPUT elements under "def_general" to get changes sent to the CRP on the server
              crpstudio.project.addChangeEvents("def_general");
              // The Save button must be shown if the 'dirty' flag is set
              private_methods.showSaveButton(loc_dirty);
              // We are open for changes again
              bIsSelecting = bSelState;
              break;
            case "queries": case "query_editor":
              // Prevent undesired change triggers
              bIsSelecting = true;
              // Fill the query list
              private_methods.showlist("query");
              // Show the query selector
              $("#query_editor").show();
              // Call setCrpItem() which should check if a 'default' item needs to be shown
              crpstudio.project.setCrpItem(null, "query");          
              // Switch on event handling in def_general_top to trigger resizing of the Xquery editor
              crpstudio.project.addXqueryResizeEvents("query_general_top");
              // Add event handlers on all INPUT elements under "def_general" to get changes sent to the CRP on the server
              crpstudio.project.addChangeEvents("query_general");
              // The Save button must be shown if the 'dirty' flag is set
              private_methods.showSaveButton(loc_dirty);
              // We are open for changes again
              bIsSelecting = bSelState;
              break;
            case "constructor": case "constructor_editor":
              // Prevent undesired change triggers
              bIsSelecting = true;
              // Fill the constructor list
              private_methods.showlist("constructor");
              // Show the constructor selector
              $("#constructor_editor").show();
              // Call setCrpItem() which should check if a 'default' item needs to be shown
              crpstudio.project.setCrpItem(null, "constructor");          
              // Add event handlers on all INPUT elements under "def_general" to get changes sent to the CRP on the server
              crpstudio.project.addChangeEvents("qc_general");
              // The Save button must be shown if the 'dirty' flag is set
              private_methods.showSaveButton(loc_dirty);
              // We are open for changes again
              bIsSelecting = bSelState;
              break;
            case "dbfeat": case "dbfeat_editor":
              // Prevent undesired change triggers
              bIsSelecting = true;
              // Fill the constructor list
              private_methods.showlist("dbfeat");
              // Show the constructor selector
              $("#dbfeat_editor").show();
              // Call setCrpItem() which should check if a 'default' item needs to be shown
              crpstudio.project.setCrpItem(null, "dbfeat");          
              // Add event handlers on all INPUT elements under "def_general" to get changes sent to the CRP on the server
              crpstudio.project.addChangeEvents("dbf_general");
              // The Save button must be shown if the 'dirty' flag is set
              private_methods.showSaveButton(loc_dirty);
              // We are open for changes again
              bIsSelecting = bSelState;
              break;
            case "result_display":
              // Other actions
              $(".sub-nav dd").removeClass("active");
              $("#result_link").removeClass("hide");
              $("#result_link").addClass("active");
              // Don't show save button
              private_methods.showSaveButton(false);
              break;
            case "document_display":
              // Other actions
              $(".sub-nav dd").removeClass("active");
              $("#document").removeClass("hide");
              $("#document_link").removeClass("hide");
              $("#document_link").addClass("active");
              // Don't show save button
              private_methods.showSaveButton(false);
              break;
          }
          // When to show the spacer before [result] and [document]
          if (!$("#result_link").hasClass("hide") || !$("#document_link").hasClass("hide")) {
            $("#link-spacer").removeClass("hide");
          }

        }
      },

      /**
       * setCrpItem
       *    User selects the indicated item of a CRP, 
       *    and we need to show the contents of that item
       *    
       * @param {type} target   - pointer to <a> element
       * @param {type} sType    - the kind of item
       * @param {type} iItemId  - numerical id of the item
       * @returns {undefined}   - none
       * @history
       *  8/oct/2015  ERK Created
       *  15/oct/2015 ERK When there is no iItemId, check if a default needs to be shown
       */
      setCrpItem : function(target, sType, iItemId) {
        // Do we need to grab a default item?
        if (!iItemId) {
          // Default id
          iItemId = -1;
          // No itemid is defined, so check if there *is* anything that could be selected
          switch(sType) {
            case "query":
              if (prj_qrylist.length > 0) {
                iItemId = (currentQry>=0) ? currentQry : 1;
              }
              break;
            case "definition":
              if (prj_deflist.length > 0) {
                iItemId = (currentDef>=0) ? currentDef : 1;
              }
              break;
            case "dbfeat":
              if (prj_dbflist.length > 0) {
                iItemId = (currentDbf>=0) ? currentDbf : 1;
              }
              break;
            case "constructor":
              if (prj_qclist.length > 0) {
                iItemId = (currentQc>=0) ? currentQc : 1;
              }
              break;
            case "project":
              if (prj_crplist.length > 0) {
                iItemId = (currentCrp>=0) ? currentCrp : 1;
              }
              break;
            case "dbase":
              break;
          }
          // Calculate the target <a> item...
          if (iItemId>=0) 
            target = private_methods.getCrpItem(sType, iItemId);
        }
        // Validate
        if (iItemId && iItemId >= 0) {
          // Get the <li>
          // var listItem = $(target).parent();
          var listItem = $(target).closest("li");
          // Look at all the <li> children of <ul>
          // var listHost = listItem.parent();
          // Get the <ul> above it
          var listHost = $(target).closest('ul');
          listHost.children('li').each(function() { $(this).removeClass("active"); });
          // Set the "active" class for the one the user has selected
          $(listItem).addClass("active");
          // Find out what kind of item we have
          var oItemDescr = private_methods.getItemDescr(sType);
          // Retrieve the item from the list
          var oItem = private_methods.getListObject(oItemDescr.name, oItemDescr.id, iItemId);
          // Validate
          if (oItem === null) return;
          $("#" + oItemDescr.descr).html("<i>Loading...</i>");
          // Make the General area INvisible
          $("#" + oItemDescr.gen).addClass("hidden");
          // Indicate we are selecting
          var bSelState = bIsSelecting;
          bIsSelecting = true;
          // Make the current item object available globally
          // TODO: doesn't work:  crpstudio.project[oItemDescr.cur] = oItem;
          // Pass on all the item's values to the html component
          for (var i=0;i<oItemDescr.fields.length; i++) {
            var oOneF = oItemDescr.fields[i];
            // Only set non-empty field defs
            if (oOneF.txt !== "") {
              // Get the value of this field
              var sValue = oItem[oOneF.field];
              // Showing it depends on the type
              switch (oOneF.type) {
                case "txt": // text fields
                  $("#" + oOneF.loc).val(sValue);
                  break;
                case "cap": // Caption only
                  $("#" + oOneF.loc).html(sValue);
                  break;
              }
            }
          }
          // We stop loading
          $("#" + oItemDescr.descr).html("");
          // Show the General area of the item again
          $("#" + oItemDescr.gen).removeClass("hidden");

          // QRY: "QueryId;Name;File;Goal;Comment;Created;Changed"
          // DEF: "DefId;Name;File;Goal;Comment;Created;Changed"
          // QC:  "QCid;Input;Query;Output;Result;Cmp;Mother;Goal;Comment"
          // DBF: "DbFeatId;Name;Pre;QCid;FtNum"


          switch (sType) {
            case "query":
              // Set the id of the currently selected query
              currentQry = iItemId;
              // First time?
              if (cmQuery === null) {
                // Fix the max-width to what it is now?
                // $("#query_general_bottom").css("max-width",$("#query_general_bottom").width() + "px" );
                cmQuery = CodeMirror.fromTextArea(
                        document.getElementById("query_general_text"), config.cmStyle1);  
                // Make sure the change event is captured
                cmQuery.on("change", crpstudio.project.xqQueryChanged);
                // Make sure the visibility is okay
                crpstudio.project.setSizes();
              } else {
                cmQuery.setValue($("#query_general_text").val());
              }
              break;
            case "definition":
              // Set the id of the currently selected definition
              currentDef = iItemId;
              // First time?
              if ( cmDef === null) {
                // Fix the max-width to what it is now?
                // $("#def_general_bottom").css("max-width",$("#def_general_bottom").width() + "px" );
                cmDef = CodeMirror.fromTextArea(
                        document.getElementById("def_general_text"), config.cmStyle1);
                            crpstudio.project.setSizes();
                // Make sure the change event is captured
                cmDef.on("change", crpstudio.project.xqDefChanged);
                // Make sure the visibility is okay
                crpstudio.project.setSizes();
              } else {
                cmDef.setValue($("#def_general_text").val());
              }
              break;
            case "dbfeat":
              // Set the id of the currently selected dbfeat
              currentDbf = iItemId;
              // Make sure the visibility is okay
              crpstudio.project.setSizes();
              break;
            case "constructor":
              // Set the id of the currently selected constructor item
              currentQc = iItemId;
              // Is this the first time we are visiting QC?

              // Make sure the visibility is okay
              crpstudio.project.setSizes();
              break;
            case "dbase": 
              break;
            case "project":
              // Set the id of the currently selected definition
              currentCrp = iItemId;
              currentPrj = oItem[oItemDescr.listfield];
              // Make sure the visibility is okay
              crpstudio.project.setSizes();
              break;
          }

        }
        
        // We are no longer selecting
        bIsSelecting = bSelState;
      },

      /**
       * itemListShow 
       *    Re-draw the list of type @sItemType
       *    Put the focus on item @iItemId
       * 
       * @param {string} sItemType
       * @param {int} iItemId
       * @returns {void}
       */
      itemListShow : function(sItemType, iItemId) {
        // Make sure the list is re-drawn
        // Fill the query/definition list, but switch off 'selecting'
        var bSelState = bIsSelecting;
        bIsSelecting = true;
        private_methods.showlist(sItemType);
        // Check value of id
        if (iItemId >=0) {
          // Get the <a> element of the newly to be selected item
          var targetA = private_methods.getCrpItem(sItemType, iItemId);
          // Call setCrpItem() which will put focus on the indicated item
          crpstudio.project.setCrpItem(targetA, sItemType, iItemId);
          // Indicate all went well
          // bOkay = true;
        }
        // Put selstate back
        bIsSelecting = bSelState;
      },

      /* ---------------------------------------------------------------------------
       * Name: setProject
       * Goal: the user chooses a project, so act on this
       * History:
       * 23/jun/2015  ERK Created
       * 04/aug/2015  ERK Added "sLng" and "sDir" arguments
       * 29/sep/2015  ERK Added "sDbase" argument
       */
      setProject : function(target, sPrjName, sLng, sDir, sDbase) {
        // Capture previous selecting state
        //var bSelState = bIsSelecting;
        // Set the previous selection state to 'false'
        var bSelState = false;
        // Are we switching?
        if (sPrjName !== currentPrj) {
          // Is saving needed?
          if (loc_dirty) {
            // Ask user to save changes
            var sMsg = (currentPrj === "") ? "Save changes?" : "Save changes in project ["+currentPrj+"]?";
            var userOk = confirm(sMsg);  
            if (userOk) {
              // Indicate that we are selectiong
              bIsSelecting = true;
              // Get the changes saved
              private_methods.histSave(true);
            } else {
              // Clear the history for this CRP
              private_methods.histClear(currentPrj);
            }
          }
          // Make sure the save button is hidden
          private_methods.showSaveButton(false);      
        }
        var strProject = $(target).text();
        // Make sure download info is hidden
        $("#project_download").addClass("hidden");
        // Get the <li>
        var listItem = $(target).parent();
        // Look at all the <li> children of <ul>
        var listHost = listItem.parent();
        listHost.children('li').each(function() { $(this).removeClass("active");});
        // Set the "active" class for the one the user has selected
        $(listItem).addClass("active");
        // Make internal and visible changes to project name
        private_methods.changePrjName(sPrjName);
        // Status: indicate that we are loading the project
        // EXTINCT: $("#project_status").html("Loading project...");
        $("#project_description").html("<i>Loading project...</i>");
        // Make the General area INvisible
        $("#project_general").addClass("hidden");
        // Initialise project settings
        private_methods.initProject(sLng, sDir, sDbase);
        // Indicate we are no longer selecting
        bIsSelecting = bSelState;

        // Pass on this value to /crpstudio and to /crpp
        var oArgs = { "project": sPrjName,
          "userid": crpstudio.currentUser, 
          "type": "info" };
        // var params = "changes=" + JSON.stringify(oChanges);
        var params = JSON.stringify(oArgs);

        crpstudio.main.getCrpStudioData("load", params, crpstudio.project.processLoad, "#project_description");
      },

      /**
       * removeItemFromList
       *    Remove item @iItemId from the list of type @sItemType
       * 
       * @param {type} sItemType
       * @param {type} iItemId
       * @returns {int}           - Id of the element that should now be selected
       */
      removeItemFromList : function(sItemType, iItemId) {
        // Validate
        if (iItemId <1 || !sItemType || sItemType==="") return -1;
        // Get the correct list
        var oList = private_methods.getList(sItemType);
        // Access the information object for this type
        var oItemDesc = private_methods.getItemDescr(sItemType);    
        // Find out what the correct Id-field is
        var sIdField = oItemDesc.id;
        // Walk the list until we get the correct element
        for (var i=0;i<oList.length;i++) {
          // Check if this is the correct element
          var oThis = oList[i];
          if (parseInt(oThis[sIdField],10) === iItemId) {
            // This is the item that needs to be deleted
            oList.splice(i,1);
            private_methods.setList(sItemType, oList);
            // Check what the next item is that should be selected
            if (oList.length>= i+1) {
              // Return the next item in the list
              oThis = oList[i];
              return parseInt(oThis[sIdField],10);
            } else if (oList.length>0) {
              // Return the *last* item in the list
              oThis = oList[oList.length-1];
              return parseInt(oThis[sIdField],10);
            } else {
              // Nothing is left, so return negatively
              return -1;
            }
          }
        }
        return -1;
      },

      /**
       * xqQueryChanged
       *    Process the changes in the Query editor
       * 
       * @param {type} cm
       * @param {type} change
       * @returns {undefined}
       */
      xqQueryChanged : function(cm, change) {
        // DOn't proceed if we are selecting
        if (bIsSelecting) return;
        // Okay, proceed
        var sValue = cm.getValue();
        $("#query_general_text").text(sValue);
        ctlCurrentId = "query_general_text";
        private_methods.histAdd("query", currentQry, currentPrj,
            "Text", sValue);
      },
      
      /**
       * xqDefChanged
       *    Process the changes in the Definition editor
       * 
       * @param {type} cm
       * @param {type} change
       * @returns {undefined}
       */
      xqDefChanged : function(cm, change) {
        // DOn't proceed if we are selecting
        if (bIsSelecting) return;
        // Okay, proceed
        var sValue = cm.getValue();
        $("#def_general_text").text(sValue);
        ctlCurrentId = "def_general_text";
        private_methods.histAdd("definition", currentDef, currentPrj,
            "Text", sValue);
      },
      
      /**
       * initCrpList
       *    Request the crplist from the /crpstudio service
       * 
       * @returns {void}
       */
      initCrpList : function() {
        // Issue a request to /crpstudio to get the list of CRPs
        var oArgs = { "userid": crpstudio.currentUser, "type": "init", "project": "" };
        var params = JSON.stringify(oArgs);
        crpstudio.main.getCrpStudioData("load", params, crpstudio.project.processCrpList, "");
      },
      /**
       * processCrpList
       *    Receive the CRPLIST from the /crpstudio service
       * 
       * @param {type} response
       * @param {type} target
       * @returns {undefined}
       */
      processCrpList : function(response, target) {
        if (response !== null) {
          // The response is a standard object containing "status" (code) and "content" (code, message)
          var oStatus = response.status;
          var sStatusCode = oStatus.code;
          var oContent = response.content;
          switch (sStatusCode) {
            case "completed":
              prj_crplist = oContent.crplist;
              // Show the recent ones
              crpstudio.project.sideToggle($("#project_list li.heading.crp-recent").get(0), "crp-recent");
              // $("#project_list li .crp-recent").removeClass("hidden");
              break;
          }
        }
      },

      /**
       * processLoad
       *    What to do when a project has been loaded
       *    
       * @param {type} response   JSON object returned from /crpstudio/load
       * @param {type} target
       * @returns {undefined}
       */
      processLoad : function(response, target) {
        if (response !== null) {
          // Remove waiting
          $("#project_description").html("");
          // The response is a standard object containing "status" (code) and "content" (code, message)
          var oStatus = response.status;
          var sStatusCode = oStatus.code;
          var oContent = response.content;
          switch (sStatusCode) {
            case "completed":
              // Get the information passed on about this project
              // Only look at the information we use here
              var bDbaseInput = oContent.dbaseinput; prj_dbaseinput = bDbaseInput;
              var sLanguage = oContent.language; prj_language = sLanguage;
              var sPart = oContent.part; 
              var sDbase = oContent.dbase; 
              var bShowSyntax = oContent.showsyntax;
              // Take out all lists
              prj_deflist = oContent.deflist;
              prj_qrylist = oContent.qrylist;
              prj_qclist = oContent.qclist;
              prj_dbflist = oContent.dbflist;
              prj_crplist = oContent.crplist;
              if (sLanguage !== "")
                crpstudio.project.setCorpus(sLanguage, sPart);

              // Prevent undesired change triggers
              var bSelState = bIsSelecting;
              bIsSelecting = true;
              // Fill the definitions list
              private_methods.showlist("project");
              // Show the definition selector
              $("#project_general_editor").show();
              // Get the <a> element of the newly to be selected item
              var iCrpId = oContent.CrpId;
              var targetA = private_methods.getCrpItem("project", iCrpId);
              // Call setCrpItem() which should check if a 'default' item needs to be shown
              crpstudio.project.setCrpItem(targetA, "project", iCrpId);
              // Add event handlers on all INPUT elements under "project_general" to get changes sent to the CRP on the server
              crpstudio.project.addChangeEvents("project_general");
              // The Save button must be shown if the 'dirty' flag is set
              private_methods.showSaveButton(loc_dirty);
              // We are open for changes again
              bIsSelecting = bSelState;

              // Settings that are *specific* for the project page:
              // Reset dbase by default
              crpstudio.project.resetDbase(false);
              if (bDbaseInput === "True") {
                $("#project_general_dbase").prop("checked", true);
                loc_dbaseInput = true;
                // Check if a database is already specified as input
                if (sDbase) crpstudio.project.setDbase(sDbase);
              } else {
                $("#project_general_dbase").prop("checked", false);
                loc_dbaseInput = false;
              }
              if (bShowSyntax)
                $("#project_general_showsyn").addClass("checked");
              else
                $("#project_general_showsyn").removeClass("checked");

              // Make sure the execute buttons are shown
              private_methods.showExeButtons(true);
              break;
            case "error":
              var sErrorCode = (oContent && oContent.code) ? oContent.code : "(no code)";
              var sErrorMsg = (oContent && oContent.message) ? oContent.message : "(no description)";
              $("#project_status").html("Error: " + sErrorCode);
              $(target).html("Error: " + sErrorMsg);
              break;
            default:
              $("#project_status").html("Error: no reply");
              $(target).html("Error: no reply received from the /crpstudio server");
              break;
          }
        } else {
          $("#project_status").html("ERROR - Failed to load the .crpx result from the server.");
        }    
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
          function() {crpstudio.project.ctlTimer(this, "input");});
        // Checkbox: bind on the click event
        $(sId + " input:checkbox").on("click", 
          function() {crpstudio.project.ctlTimer(this, "input");});
        // Note: do not set the .on("blur") event, because that is not really necessary

        // Add event handlers on all TEXTAREA elements under "project_general"
        $(sId + " textarea").on("change paste input", 
          function() {crpstudio.project.ctlTimer(this, "textarea");});

        // Add event handlers on all SELECT elements under "project_general"
        $(sId + " select").on("change paste input", 
          function() {crpstudio.project.ctlTimer(this, "select");});

      }, 

      /**
       * addXqueryResizeEvents
       *    Add events that help resize the Xquery area below [sItemId]
       * 
       * @param {type} sItemId
       * @returns {undefined}
       */
      addXqueryResizeEvents : function(sItemId) {
        var sId = "#" + sItemId;
        $(sId).bind("mousedown", function() {crpstudio.project.setSizes();});
        $(sId).bind("mousemove", function() {crpstudio.project.setSizes();});
        // Catch the mousedown and mouseup events
        $(sId).bind("mouseup", function() {crpstudio.project.setSizes();});
      },

        /**
       * processCrpChg
       *    Process the reply when changes have been made
       *    
       * @param {type} response   JSON object returned from /crpstudio/crpchg
       * @param {type} target
       * @returns {undefined}
       */
      processCrpChg : function(response, target) {
        if (response !== null) {
          // The response is a standard object containing "status" (code) and "content" (code, message)
          var oStatus = response.status;
          var sStatusCode = oStatus.code;
          var oContent = response.content;
          // Try to retrieve item type
          var sItemType = oContent.itemtype;
          if (!sItemType || sItemType === "") sItemType = "project";
          // Remove waiting
          $("#"+sItemType+"_description").html("");
          switch (sStatusCode) {
            case "completed":
              // Make sure the save button is hidden
              private_methods.showSaveButton(false);
              // Reset the dirty flag
              loc_dirty = false;
              // Reset the new flag
              loc_bNew = false;
              // Have changes been made?
              if (oContent.changed) {
                // Get the information passed on about this project
                var sDateChanged = oContent.datechanged;
                // Get the CRP for which this was done
                var sCrpChanged = oContent.crp;
                if (sItemType === "project") {
                  if (sCrpChanged === currentPrj) {
                    // Put the information on the correct places in the form
                    $("#"+sItemType+"_general_datechanged").html(sDateChanged);
                  }
                  // Show that changes have been made
                  $("#top_bar_saved_project").html(sCrpChanged);
                  $("#top_bar_saved_project").parent().removeClass("hidden");
                  // Wait for some time and then show it again
                  setTimeout(function() {$("#top_bar_saved_project").parent().addClass("hidden");}, 700);
                } else {
                  // Get the key/value/id of the change that took place
                  var sKey = oContent.key;
                  var sValue = oContent.value;
                  var iId = oContent.id;
                  // Actions depend on the type we have
                  switch (sItemType) {
                    case "query":
                      // Perform the change in the JavaScript object
                      private_methods.setOneItem(sItemType, sKey, iId, sValue);
                      // Adapt the date 
                      var qryChanged = private_methods.getItemFieldLoc(sItemType, "Changed");
                      $("#" + qryChanged).html(sDateChanged);
                      break;
                    case "definition":
                      // Perform the change in the JavaScript object
                      private_methods.setOneItem(sItemType, sKey, iId, sValue);
                      // Adapt the date 
                      var defChanged = private_methods.getItemFieldLoc(sItemType, "Changed");
                      $("#" + defChanged).html(sDateChanged);
                      break;
                    case "constructor":
                      // Perform the change in the JavaScript object
                      private_methods.setOneItem(sItemType, sKey, iId, sValue);
                      break;
                    case "dbfeat":
                      // Perform the change in the JavaScript object
                      private_methods.setOneItem(sItemType, sKey, iId, sValue);
                      break;
                  }
                }
              }
              break;
            case "error":
              var sErrorCode = (oContent && oContent.code) ? oContent.code : "(no code)";
              var sErrorMsg = (oContent && oContent.message) ? oContent.message : "(no description)";
              $("#"+sItemType+"_status").html("Error: " + sErrorCode);
              $(target).html("Error: " + sErrorMsg);
              break;
            default:
              $("#"+sItemType+"_status").html("Error: no reply");
              $(target).html("Error: no reply received from the /crpstudio server");
              break;
          }
        } else {
          $("#"+sItemType+"_status").html("Server problem - Failed to process changes in the CRP.");
        }    
      },

      /**
       * uploadFile
       *    Ask user to upload a file (project, corpus, dbase, definition, query)
       * 
       * @param {object} el   
       * @param {string} sItemType
       * @returns {undefined}
       */
      uploadFile : function(el, sItemType) {
        // Make sure download info is hidden
        $("#"+sItemType+"_download").addClass("hidden");
        // Initialise itemmain
        var sItemMain = "";
        switch (sItemType) {
          case "definition": 
          case "query":
            // Get the current project's name
            sItemMain = currentPrj;
            break;
          case "corpus":    // Main corpus to which this file belongs
            // TODO: implement
            break;
        }
        // Get the name of the file
        var oFile = el.files[0];
        // Use the standard readXmlFile function (this reads any TEXT)
        crpstudio.main.readXmlFile(oFile, function(e) {
          // Get the text of the uploaded CRP into a variable
          // var text = encodeURIComponent(e.target.result);
          var text = e.target.result;
          // Signal what we are doing
          $("#"+sItemType+"_description").html("Uploading...");
          // Send this information to the /crpstudio
          //var params = "file=" + oFile.name + "&itemtype=" + sItemType + 
          //        "&itemmain=" + sItemMain + "&userid=" + crpstudio.currentUser +
          //        "&itemtext=" + text;

          // Pass on this value to /crpstudio and to /crpp
          var oArgs = { "file": oFile.name, "itemtype": sItemType, "itemmain": sItemMain,
            "userid": crpstudio.currentUser, "itemtext": text };
          var params = JSON.stringify(oArgs);

          crpstudio.main.getCrpStudioData("upload", params, crpstudio.project.processUpLoad, "#"+sItemType+"_description");
        });
      },
      
      /**
       * processUpLoad
       *    What to do when a project has been loaded
       *    
       * @param {type} response   JSON object returned from /crpstudio/load
       * @param {type} target     The 'description' <div> for this 'item' type
       * @returns {undefined}
       */
      processUpLoad : function(response, target) {
        if (response !== null) {
          // The response is a standard object containing "status" (code) and "content" (code, message)
          var oStatus = response.status;
          var sStatusCode = oStatus.code;
          var oContent = response.content;
          // Obligatory: itemtype
          var sItemType = oContent.itemtype;
          // Remove waiting
          $("#"+sItemType+"_description").html("");
          switch (sStatusCode) {
            case "completed":
              // This is dependent on the item type
              var sAbbr = "";
              switch (sItemType) {
                case "project":     sAbbr = "crp"; prj_crplist = oContent.itemlist; break;
                case "definition":  sAbbr = "def"; prj_deflist = oContent.itemlist; break;
                case "query":       sAbbr = "qry"; prj_qrylist = oContent.itemlist; break;
              }
              // Item-type-independent stuff
              var sItemName = oContent.itemname;
              // Further action really depends on the item type
              switch(sItemType) {
                case "project":
                  // Get the id
                  var iItemId = oContent.itemid;
                  // Get all changed lists
                  prj_deflist = oContent.deflist;
                  prj_qrylist = oContent.qrylist;
                  prj_qclist  = oContent.qclist;
                  prj_dbflist = oContent.dbflist;
                  // Show the list, putting the focus on the new item id
                  crpstudio.project.itemListShow(sItemType, iItemId);

                  break;
                case "definition": case "query":
                  // Get the id
                  var iItemId = oContent.itemid;
                  // Show the list, putting the focus on the new item id
                  crpstudio.project.itemListShow(sItemType, iItemId);

                  // Add the uploaded query/definition to the History List
                  private_methods.histAddItem(sItemType, iItemId);
                  break;
              }
              break;
            case "error":
              var sErrorCode = (oContent && oContent.code) ? oContent.code : "(no code)";
              var sErrorMsg = (oContent && oContent.message) ? oContent.message : "(no description)";
              $("#"+sItemType+"_status").html("Error: " + sErrorCode);
              $(target).html("Error: " + sErrorMsg);
              break;
            default:
              $("#"+sItemType+"_status").html("Error: no reply");
              $(target).html("Error: no reply received from the /crpstudio server");
              break;
          }
        } else {
          $("#"+sItemType+"_status").html("ERROR - Failed to load the .crpx result from the server.");
        }    
      },  

      /**
       * itemInsertLine
       *    Create a <li> element for the indicated list and insert it
       * 
       * @param {type} sItemLine
       * @param {type} sItemName
       * @param {type} sItemType
       * @param {type} sAbbr
       * @returns {undefined}
       */
      itemInsertLine : function(sItemLine, sItemName, sItemType, sAbbr) {
        // Check if there is any reply
        if (sItemLine) {
          // Walk the list of <li> elements with class "crp-available"
          var arPrjItem = $("#"+sItemType+"_list ."+sAbbr+"-available").not(".divider").not(".heading");
          var liBef = null;
          // Start from 0: we are in our own 'section' of "crp-available"
          for (var i=0;i<arPrjItem.size();i++) {
            // It must have a <a> child node
            if (arPrjItem[i].childNodes) {
              var aChild = arPrjItem[i].childNodes.item(0);
              // Should we put our project before this one?
              if (aChild.innerHTML.localeCompare(sItemName)>0) {
                // The list item must come before the current one
                liBef = arPrjItem[i];break;
              }
            }              
          }
          // Did we find any?
          if (liBef === null) {
            // Append it after the divider and heading crp-available
            $("#"+sItemType+"_list ."+sAbbr+"-available").last().append(sItemLine);
          } else {
            $(sItemLine).insertBefore($(liBef));
          }
          return true;
        }    
        // Getting here: failure
        return false;
      },

      /**
       * removeFile
       *    Check which Item is currently selected (if any)
       *    Then remove that item:
       *    (1) from the server --> POST to /crpstudio
       *    (2) from the list here --> done in callback
       * 
       * @param {type} elDummy      - Not used right now
       * @param {string} sItemType  - Type of file to remove
       * @returns {void}            - no return
       */
      removeFile : function(elDummy, sItemType) {
        // Prepare variable
        var oArgs = null; var iItemId = -1; var lstItem = null; var sCrpName = "";
        var sItemMain = "";
        // Make sure download info is hidden
        $("#"+sItemType+"_download").addClass("hidden");
        // Find out which project is currently selected
        sCrpName = currentPrj;
        // Action depends on the type
        switch(sItemType) {
          case "project":
            // There is no real itemmain
            sItemMain = "ROOT";                       // Project is root
            // New method: there is an id
            iItemId = currentCrp;
            break;
          case "dbase":
            // There is no real itemmain
            sItemMain = "ROOT";                       // Databases is root
            // New method: there is an id
            iItemId = currentDbId;
            break;
          case "query":
            // Validate
            iItemId = currentQry;
            sItemMain = currentPrj; // Query is part of a CRP
            break;
          case "definition":
            // Validate
            iItemId = currentDef;
            sItemMain = currentPrj; // Definition is part of a CRP
            break;
          case "dbfeat":
            // Validate
            iItemId = currentDbf;
            sItemMain = currentQc; // DbFeat is part of a QC
            break;
          case "constructor":
            // Validate
            iItemId = currentQc;
            sItemMain = currentPrj; // Constructor is part of a CRP
            break;
          default:
            // Unable to handle this, so leave
            return;
        }
        if (sCrpName && sCrpName !== "") {
          // Action depends on the type
          switch (sItemType) {
            case "project":
              // Check whether we are removing a CRP that has not yet been saved
              if (loc_bNew) {
                // Delete the item from the list
                var iItemNext = crpstudio.project.removeItemFromList(sItemType, iItemId);
                // Show the list, putting the focus on nowhere
                crpstudio.project.itemListShow(sItemType, -1);

                // Reset the name of the current project
                currentPrj = "";
                currentCrp = -1;

                // Indicate that the user needs to make a new selection
                crpstudio.project.switchTab("project_editor", "", true);
                // Reset the new flag
                loc_bNew = false;
                // clear the project history
                private_methods.histClear(currentPrj);
                // Clear the save button
                private_methods.showSaveButton(false);
              } else {
                // Note: /crpstudio must check when the last download of this project was
                // Send removal request to /crpstudio, which checks and passes it on to /crpp
                oArgs = { "itemid": iItemId, "itemtype": sItemType, "itemmain": sItemMain,  
                          "crp": sCrpName, "userid": crpstudio.currentUser };
                // Send the remove request
                var params = JSON.stringify(oArgs);
                crpstudio.main.getCrpStudioData("remove", params, crpstudio.project.processRemove, "#"+sItemType+"_description");      
              }
              break;
            case "query": case "definition": 
              // Make a call to histAdd, which signals the deletion
              private_methods.histAdd(sItemType, iItemId, sCrpName, "delete", "");
              // Delete the item from the list
              var iItemNext = crpstudio.project.removeItemFromList(sItemType, iItemId);
              // Show the list, putting the focus on the new item id
              crpstudio.project.itemListShow(sItemType, iItemNext);

              break;
            case "dbfeat": case "constructor":
              // TODO: check this out!!
              //       Possibly do as above
              //       But for constructor: more checking is needed??
              // Make a call to histAdd
              histAdd(sItemType, iItemId, sCrpName, "delete", "");
              break;
          }
        }
      },
      
      /**
       * processRemove
       *    Brushing up after project has been deleted
       *    NOTE: this is *not* a brush up after CRP parts deletion -- see processCrpChg
       *    
       * @param {type} response   JSON object returned from /crpstudio/remove
       * @param {type} target
       * @returns {undefined}
       */
      processRemove : function(response, target) {
        if (response !== null) {
          // The response is a standard object containing "status" (code) and "content" (code, message)
          var oStatus = response.status;
          var sStatusCode = oStatus.code;
          var oContent = response.content;
          // Preliminmary item type
          var sItemType = "";
          switch (sStatusCode) {
            case "completed":
              // Get all the necessary information from the [content] block
              var sCrpName = oContent.crp;
              var sItemMain = oContent.itemmain;
              var iItemId = oContent.itemid;
              sItemType = oContent.itemtype;
              // Remove waiting
              $("#"+sItemType+"_description").html("");
              // Action depends on type
              switch (sItemType) {
                case "project":
                  // Validate
                  if (sCrpName!==null && sCrpName!==undefined) {
                    // Delete the item from the list
                    var iItemNext = crpstudio.project.removeItemFromList(sItemType, iItemId);
                    // Show the list, putting the focus on nowhere
                    crpstudio.project.itemListShow(sItemType, -1);

                    // Reset the name of the current project
                    currentPrj = "";
                    currentCrp = -1;

                    // Indicate that the user needs to make a new selection
                    crpstudio.project.switchTab("project_editor", "", true);
                  }
                  break;
              }
              break;
            case "error":
              var sErrorCode = (oContent && oContent.code) ? oContent.code : "(no code)";
              var sErrorMsg = (oContent && oContent.message) ? oContent.message : "(no description)";
              $("#"+sItemType+"_status").html("Error: " + sErrorCode);
              $(target).html("Error: " + sErrorMsg);
              break;
            default:
              $("#"+sItemType+"_status").html("Error: no reply");
              $(target).html("Error: no reply received from the /crpstudio server");
              break;
          }
        } else {
          $("#"+sItemType+"_status").html("ERROR - Failed to remove the .crpx result from the server.");
        }    
      },   
      
      /**
       * downloadFile
       *    Check which CRP is currently selected (if any)
       *    Then download that CRP:
       *    (1) from the server --> POST to /crpstudio
       * 
       * @param {type} elDummy
       * @param {string} sFileType
       * @returns {undefined}
       */
      downloadFile : function(elDummy, sFileType) {
        // Access the information object for this type
        var oItemDesc = private_methods.getItemDescr(sFileType);
        var sItemName = "";   // Project, corpus or database name
        var sItemPart = "";   // Part of project, corpus
        var oListItem = null;
        // Action depends on the type
        switch(sFileType) {
          case "project":     // Download CRP
            // Find out which one is currently selected
            sItemName = currentPrj;
            break;
          case "corpus":      // Download corpus
            // Find out which one is currently selected
            sItemName = currentCorpus;
            break;
          case "definition":  // download definitions in Xquery
            // Access the current element from the list
            oListItem = private_methods.getListObject(sFileType, oItemDesc.id, currentDef);
            sItemPart = oListItem[oItemDesc.listfield];
            // Find out which one is currently selected
            sItemName = currentPrj;
            break;
          case "query":       // download definitions in Xquery
            // Access the current element from the list
            oListItem = private_methods.getListObject(sFileType, oItemDesc.id, currentQry);
            sItemPart = oListItem[oItemDesc.listfield];
            // Find out which one is currently selected
            sItemName = currentPrj;
            break;
          case "dbase":       // download database in Xquery
            // Find out which one is currently selected
            sItemName = currentDb;
            break;
        }
        if (sItemName && sItemName !== "") {
          // Note: /crpstudio must check when the last download of this project was
          // Send this information to the /crpstudio
          //var params = "itemname=" + sItemName + "&itempart=" + sItemPart + 
          //        "&itemtype=" + sFileType + "&userid=" + crpstudio.currentUser;
          // Pass on this value to /crpstudio and to /crpp
          var oArgs = { "itemname": sItemName, "itempart": sItemPart,
            "userid": crpstudio.currentUser, "itemtype": sFileType };
          var params = JSON.stringify(oArgs);
          crpstudio.main.getCrpStudioData("download", params, crpstudio.project.processDownload, "#project_description");      
        }
      },  
      
    /**
       * processDownload
       *    Actions after project has been prepared for downloading
       *    
       * @param {type} response   JSON object returned from /crpstudio/download
       * @param {type} target
       * @returns {undefined}
       */
      processDownload : function(response, target) {
        if (response !== null) {
          // The response is a standard object containing "status" (code) and "content" (code, message)
          var oStatus = response.status;
          var sStatusCode = oStatus.code;
          var oContent = response.content;
          // Content must at least contain item type
          var sItemType = oContent.itemtype;
          // if (sItemType === "definition") sItemType = "def";
          // Remove waiting
          $("#"+sItemType+"_description").html("");
          switch (sStatusCode) {
            case "completed":
              // Find out which project has been removed
              var sFile = oContent.file;
              // Validate
              if (sFile && sFile !== null) {
                // Get the name of the file alone
                var fFileName = sFile.substring(sFile.lastIndexOf("/")+1);
                fFileName = fFileName.substring(0, fFileName.lastIndexOf("."));
                // Show the project_download item
                $("#"+sItemType+"_download").removeClass("hidden");
                $("#"+sItemType+"_download_file").html("<a href=\""+sFile + "\""+
                        " target='_blank'\">"+fFileName+"</a>");
              }
              break;
            case "error":
              var sErrorCode = (oContent && oContent.code) ? oContent.code : "(no code)";
              var sErrorMsg = (oContent && oContent.message) ? oContent.message : "(no description)";
              $("#"+sItemType+"_status").html("Error: " + sErrorCode);
              $(target).html("Error: " + sErrorMsg);
              break;
            default:
              $("#"+sItemType+"_status").html("Error: no reply");
              $(target).html("Error: no reply received from the /crpstudio server");
              break;
          }
        } else {
          $("#"+sItemType+"_status").html("ERROR - Failed to download the item.");
        }    
      },     

      /**
       * setCorpus
       *    Set the corpus language (sCorpusName) and the part of the language 
       *    that serves as input (sDirName)
       * 
       * @param {type} sCorpusName
       * @param {type} sDirName
       * @returns {undefined}
       */
      setCorpus : function(sCorpusName, sDirName) {
        if (sDirName === undefined && sCorpusName !== undefined && sCorpusName === "") {
          // Reset the corpus name and dir name in the top section
          $("#top_bar_current_corpus").text("-");
        } else {
          // Set the corpus name and dir name in the top section
          $("#top_bar_current_corpus").text(sCorpusName+":"+sDirName);
          // Set these values also in our own variables
          // NOTE: these are used by crpstudio.result
          currentDir = sDirName;
          currentLng = sCorpusName;

          // Hide the corpus selector if we are in project mode
          switch (loc_tab) {
            case "project_editor":
            case "project":
              // Hide the corpus selector
              $("#corpus-selector").hide();
              break;
            case "input_editor":
            case "input":
              // Determine key, value and id
              var iId = currentCrp;
              // New: pass on the change to histAdd
              private_methods.histAdd("project", iId, currentPrj, "Language", sCorpusName);
              private_methods.histAdd("project", iId, currentPrj, "Part", sDirName);

              /*
              // Pass on this value to /crpstudio and to /crpp
              var sKey = "corpus";
              var sValue = sCorpusName + ":" + sDirName;
              var oArgs = { "crp": currentPrj,
                "userid": crpstudio.currentUser, 
                "key": sKey, "value": sValue };
              // var params = "changes=" + JSON.stringify(oChanges);
              var params = JSON.stringify(oArgs);
              crpstudio.main.getCrpStudioData("crpchg", params, crpstudio.project.processCrpChg, "#project_description");  
                */
              break;
            default:
              // No particular action right now
              break;
          }
        }
      },

      /**
       * setDbase -- select the indicated database as input
       * 
       * @param {type} sDbName
       * @param {type} sLngName
       * @param {type} sDirName
       * @param {type} bChange
       * @returns {undefined}
       */
      setDbase : function(sDbName, sLngName, sDirName, bChange) {
        // Set the corpus name and dir name in the top section
        $("#top_bar_current_dbase").text(sDbName);
        // Set these values also in our own variables
        currentDb = sDbName;
        if (sLngName) currentDbLng = sLngName;
        if (sDirName) currentDbDir = sDirName;
        // Make sure CHANGES are only passed on as /crpchg where this is intended
        if (bChange) {
          // Process the change by calling [histAdd]
          private_methods.histAdd("project", -1, currentPrj,
              "Source", sDbName);

    /*
          // Pass on this value to /crpstudio and to /crpp
          var sKey = "source";
          var sValue = sDbName;
          var oArgs = { "crp": currentPrj,
            "userid": crpstudio.currentUser, "key": sKey, "value": sValue };
          // var params = "changes=" + JSON.stringify(oChanges);
          var params = JSON.stringify(oArgs);
          crpstudio.main.getCrpStudioData("crpchg", params, crpstudio.project.processCrpChg, "#dbase_description");  
          */
        }
      },
      
      /**
       * resetDbase -- reset the current database input
       * 
       * @param {type} bChange
       * @returns {undefined}
       */
      resetDbase : function(bChange) {
        // Set the corpus name and dir name in the top section
        $("#top_bar_current_dbase").text("");
        // Set these values also in our own variables
        currentDb = "";    
        // Only process if we know there are changes
        if (bChange) {
          // Process the change by calling [histAdd]
          private_methods.histAdd("project", -1, currentPrj,
              "Source", "");
          private_methods.histAdd("project", -1, currentPrj,
              "DbaseInput", "False");
        }
      },

      /**
       * setPrjType
       *    Set the project type
       *    
       * @param {type} sPrjType
       * @returns {undefined}
       */
      setPrjType : function(sPrjType) {
        // New method
        ctlCurrent = $("#project_general_prjtype");
        crpstudio.project.ctlTimer($("#project_general_prjtype", "-"));
      },

      /**
       * doCrpItemChange 
       *    Process changes in the crp item (def/query/dbfeat/constructor) identified
       *      by DOM id [sItemId]. Do this in the internally stored CRP item data.
       *    Then return the 'key' that should be used by a /crpchg request to process
       *      the changes into the CRP that is stored on the server
       *      
       * @param {type} sItemId
       * @returns {undefined}
       */
      doCrpItemChange : function(sItemId) {
        // Create an object
        var oBack = {};
        // Find the correct item
        for (var i=0;i<config.prj_access.length;i++) {
          var oItem = config.prj_access[i];
          var iItemId = -1;
          // The integer element id depends on what we have
          switch (oItem.name) {
            case "query": iItemId = currentQry; break;
            case "definition": iItemId = currentDef; break;
            case "dbfeat": iItemId = currentDbf; break;
            case "constructor": iItemId = currentQc; break;
          }
          // Walk all the descriptions in this item
          for (var j=0;j<oItem.fields.length; j++) {
            var oField = oItem.fields[j];
            // Is this the correct field?
            if (sItemId === oField.loc) {
              // We found it: return the information
              oBack.key = oItem.name + "." + oField.field;
              oBack.id = iItemId;
              return oBack;
            }
          }
        }
        // We did not find it, so return an empty string
        return null;
      },
      
      /**
       * ctlTimer
       *    Process a change in one of the form items made by the user
       *    The normal behaviour is to add an item to the history (histAdd)
       *    
       * @param {element} source  - the caller's <div> or <a> or so
       * @param {string}  sType   - the kind of element?
       * @returns {void}
       */
      ctlTimer : function(source, sType) {
        // Clear any previously set timer
        clearTimeout(typingTimer);
        // =============== DEBUG =========
        crpstudio.main.debug("ctlTimer: cleared");
        // ===============================
        var sCallerId = $(source).attr("id");
        var sValue;
        // Value depends on the type
        if ($(source).is("input:checkbox"))
          sValue = ($(source).is(':checked')) ? "True" : "False"; 
        else 
          sValue = $(source).val();
        // Some controls require immediate action
        switch (sCallerId) {
          case "project_general_dbase": 
            var sChbValue = ($(source).is(':checked')) ? "True" : "False"; 
            // Only continue if there is a CHANGE
            if (sChbValue === prj_dbaseinput) return; 
            // Make sure the change is recorded globally
            loc_dbaseInput = (sChbValue === "True");
            prj_dbaseinput = sChbValue;
            // If we are changing to "False", then reset the database specifications
            if (sChbValue === "False") {
              crpstudio.project.resetDbase(true);
            } else {
              // Guide the user to the input specification page where a database must be selected
              crpstudio.project.switchTab("input_editor");
            }
            break;
        }
        // Set the source
        ctlCurrent = source;

        // Find out who we are by looking up the caller's @id value
        var oItem = private_methods.getItemObject(sCallerId);
        // Get the current iItemId
        var iItemId = -1;
        switch(oItem.type) {
          case "query":       iItemId = currentQry; break;
          case "definition":  iItemId = currentDef; break;
          case "constructor": iItemId = currentQc;  break;
          case "dbfeat":      iItemId = currentDbf; break;
          case "project":     iItemId = currentCrp; break;
        }

        // Process the change by calling [histAdd]
        // But if things go wrong, do NOT continue!!
        if (!private_methods.histAdd(oItem.type, iItemId, currentPrj,
            oItem.key, sValue)) return;

        // Check if list needs to be re-drawn
        var oDescr = private_methods.getItemDescr(oItem.type);
        if (oItem.key === oDescr.listfield) {
          // Make sure the list is re-drawn
          crpstudio.project.itemListShow(oItem.type, iItemId);
        }
        // Special follow-up matters after some items have changed
        switch (oItem.type) {
          case "project":
            // Catch change in project name
            switch (oItem.key) {
              case "Name":
                // Make sure the correct project name is shown again
                private_methods.changePrjName(sValue);
                break;
            }
            break;
          case "dbase":
            break;
        }
           
      },
      
      /**
       * doSave - Make sure changes are saved
       * 
       * @returns {undefined}
       */
      doSave : function() { private_methods.histSave(true); },

      /* ---------------------------------------------------------------------------
       * Name: createManual
       * Goal: manually create a project, query, definition and so forth
       * History:
       * 23/jun/2015  ERK Created
       */
      createManual : function(target, sItemType) {
        // Action depends on the kind of item
        switch (sItemType) {
          case "project":
            // Make sure the new query form becomes visible
            $("#project_general_editor").addClass("hidden");
            $("#project_new_create").removeClass("hidden");
            break;
          case "query":
            // Make sure the new query form becomes visible
            $("#query_general_editor").addClass("hidden");
            $("#query_new_create").removeClass("hidden");
            break;
          case "definition":
            // Make sure the new definition form becomes visible
            $("#def_general_editor").addClass("hidden");
            $("#def_new_create").removeClass("hidden");
            break;
        }
      },
      
      /* ---------------------------------------------------------------------------
       * Name: createWizard
       * Goal: create a project through a wizard
       * History:
       * 23/jun/2015  ERK Created
       */
      createWizard : function(target) {
        // Make sure download info is hidden
        $("#project_download").addClass("hidden");
        // Get the <li>
        var listItem = $(target).closest('li');
        // Look at all the <li> children of <ul>
        var listHost = listItem.closest('ul');
        listHost.children('li').each(function() { $(this).removeClass("active");});
        // Set the "active" class for the one the user has selected
        $(listItem).addClass("active");
        // Make sure the new project is being selected
        var strProject = "...name of this project (wizard)";
        currentPrj = strProject;
        // And set the name of the project in the top-bar div
        $("#top_bar_current_project").text("wizard...");
        // Adapt the text of the project description
        $("#project_description").html("<p>You have chosen: <b>" + strProject + "</b></p>");
      },

      /**
       * createItem
       *    Create a new qry/def/dbf/ and so on
       * 
       * @param {type} sItemType
       * @param {type} sAction
       * @returns {undefined}
       */
      createItem : function(sItemType, sAction) {
        var bOkay = false;
        var oDescr = private_methods.getItemDescr(sItemType);
        var sDivPrf = oDescr.divprf;
        // Reset any previous naming
        $("#"+sDivPrf+"_new_name_error").removeClass("error");
        $("#"+sDivPrf+"_new_name_error").addClass("hidden");
        // First look at the action
        switch(sAction) {
          case "new":
            // Check the information provided
            var sItemName = $("#"+sDivPrf+"_new_name").val();
            var sItemGoal = $("#"+sDivPrf+"_new_goal").val();
            var sItemComment = $("#"+sDivPrf+"_new_comment").val();

            // Only the item NAME is obligatory + check the NAME item
            if (sItemName !=="") {
              // Validate: check 
              if (!private_methods.itemNameCheck(sItemType, sItemName)) {
                // Signal that the name is not correct
                $("#"+sDivPrf+"_new_name_error").html("Duplicate: "+sItemName);
                $("#"+sDivPrf+"_new_name_error").addClass("error");
                $("#"+sDivPrf+"_new_name_error").removeClass("hidden");
                return;
              }
              // Determine how the new item will look like
              var oNew = {};
              switch (sItemType) {
                case "project":
                  // NOTE: for the project we have the field "Comments" with a trailing "s" (unlike for the others)
                  oNew.Name = sItemName; oNew.Goal = sItemGoal; oNew.Comments = sItemComment;
                  oNew.Author = crpstudio.currentUser;
                  // The prjtype value needs to be lower-case
                  oNew.ProjectType = config.defPrjType.toLowerCase();
                  // Initialise project settings
                  private_methods.initProject("", "", "");
                  // Indicate a new CRP has been created but not yet saved
                  loc_bNew = true;
                  break;
                case "definition":
                case "query":
                  oNew.Name = sItemName; oNew.Goal = sItemGoal; oNew.Comment = sItemComment;
                  oNew.Text = "-";
                  break;
                case "dbfeat":
                  break;
                case "constructor":
                  break;
              }
              // Create a new item
              var iItemId = private_methods.createListItem(sItemType, oNew);
              
              // Hide the form
              $("#"+sDivPrf+"_new_create").addClass("hidden");
              $("#"+sDivPrf+"_general_editor").removeClass("hidden");

              // Make sure the list is re-drawn
              crpstudio.project.itemListShow(sItemType, iItemId);

            }
            break;
          case "cancel":
            // Return to the current item
            bOkay = true;
            break;
        }
        // Hide the form if all is well
        if (bOkay) {
          $("#"+sDivPrf+"_new_create").addClass("hidden");
          $("#"+sDivPrf+"_general_editor").removeClass("hidden");
        }
      },

      /**
       * sideToggle
       *    Toggle the visibility of the <li> items with the indicated class name
       *    
       * @param {type} target
       * @param {type} sSection
       * @returns {undefined}
       */
      sideToggle : function(target, sSection) {
        // Main action: toggle the indicated section
        $(target).parent().children("."+sSection+":not(.heading):not(.divider)").toggleClass("hidden");
        // Divide section into two parts
        var arSect = sSection.split("-");
        var sPrf = arSect[0]; 
        var sSect = arSect[1];
        /* FUTURE: accordion between new/current/recent
        // Action depends on section
        switch(sSect) {
          case "new":
            $(target).parent().children("."+sPrf+"-current:not(.heading):not(.divider)").toggleClass("hidden");
            $(target).parent().children("."+sPrf+"-recent:not(.heading):not(.divider)").toggleClass("hidden");
            break;
          case "current":
            $(target).parent().children("."+sPrf+"-new:not(.heading):not(.divider)").toggleClass("hidden");
            $(target).parent().children("."+sPrf+"-recent:not(.heading):not(.divider)").toggleClass("hidden");
            break;
          case "recent":
            $(target).parent().children("."+sPrf+"-new:not(.heading):not(.divider)").toggleClass("hidden");
            $(target).parent().children("."+sPrf+"-current:not(.heading):not(.divider)").toggleClass("hidden");
            break;
          case "available":
            break;
        } */
        
      },

      /* ---------------------------------------------------------------------------
       * Name: setSizes
       * Goal: set the size of the id="project" window
       * History:
       * 22/jun/2015  ERK Created
       */
      setSizes : function() {
        // Calculate sh
        var sh = ($(window).innerHeight() - 135) / 2 - 130;
        // Set the minimal height
        var minHeight = 30;
        // Make sure we have a minimal height
        if (sh < minHeight) { sh = minHeight; }
        // Set the top-margin, so that what we show is really LOW
        // DISABLED!!!
        // $("#project").css("margin-top",sh+"px");
        crpstudio.main.setNavigationSize();
        // Set the vertical size of the Xquery editing area
        if ($("#query_general").is(":visible") && cmQuery) {
          var oQueryPos = $("#query_general_bottom").position();
          // Determine the best width and height
          var iHeight = $(window).innerHeight() - oQueryPos.top - 290;
          var iWidth = $("#query_general_comment").width();
          // Set the new width/height
          cmQuery.setSize(iWidth, iHeight);
        }  else if ($("#def_general").is(":visible") && cmDef) {
          var oDefPos = $("#def_general_bottom").position();
          // Determine the best width and height
          var iHeight = $(window).innerHeight() - oDefPos.top - 290;
          var iWidth = $("#def_general_comment").width();
          // Set the new width/height
          cmDef.setSize(iWidth, iHeight);
        }

      },


      /* ---------------------------------------------------------------------------
       * Name: editQC
       * Goal: Start editing the indicated QC line
       * History:
       * 29/jun/2015  ERK Created
       */
      editQC : function(iQC) {
        // TODO: implement

      }
    };
  }($, crpstudio.config));
  
  return crpstudio;
  
} (jQuery, window.crpstudio || {}));

