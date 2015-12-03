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
  crpstudio.list = (function ($, config) {
    var currentCorpus = "",       // Currently selected corpus
        bIsSelecting = false;     // Selection
    // Methods that are local to [crpstudio.list]
    var private_methods = {
      
    };
    // Methods that are exported by [crpstudio.list] for others
    return {
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
          case "project":     crpstudio.prj_crplist = oList; break;
          case "query":       
            crpstudio.prj_qrylist = oList;
            // Re-do the list on the Constructor editor
            
            break;
          case "definition":  crpstudio.prj_deflist = oList;break;
          case "constructor": crpstudio.prj_qclist = oList; break;
          case "dbfeat":      crpstudio.prj_dbflist = oList;break;
          case "corpus":      crpstudio.crp_edtlist = oList; break;
          case "grouping":    crpstudio.crp_grplist = oList; break;
          case "dbase":       crpstudio.dbs_edtlist = oList; break;
        }
      },
      
      /**
       * getList
       *    Find the indicated list
       * 
       * @param {type} sListType
       * @param {type} sSortField -- optional item
       * @returns {object}    the indicated array/list
       */
      getList : function(sListType, sSortField) {
        var oList = [];   // JSON type list of objects
        // Find the correct list
        switch(sListType) {
          case "project":     oList = crpstudio.prj_crplist; break;
          case "query":       oList = crpstudio.prj_qrylist;break;
          case "definition":  oList = crpstudio.prj_deflist;break;
          case "constructor": oList = crpstudio.prj_qclist;break;
          case "dbfeat":      oList = crpstudio.prj_dbflist;break;
          case "corpus":      oList = crpstudio.crp_edtlist; break;
          case "grouping":    oList = crpstudio.crp_grplist; break;
          case "dbase":       oList = crpstudio.dbs_edtlist; break;
        }
        if (oList === null) oList = [];
        // Check if sorting is needed
        if (sSortField) {
          var oSorted = [];
          // Copy the array
          for (var i=0;i<oList.length;i++) oSorted.push(oList[i]);
          // Sort the array in-place, depending on the type
          if (sSortField === "Name") {
            oSorted.sort( function(a,b) {
              var iCmp = 0;
              var sA = a[sSortField].toLowerCase();
              var sB = b[sSortField].toLowerCase();
              if (sA !== sB)
                iCmp = (sA > sB) ? 1 : 0;
              return iCmp;
            });
          } else {
            oSorted.sort( function(a,b) {
              var iA = parseInt(a[sSortField],10);
              var iB = parseInt(b[sSortField],10);
              var iCmp = iA - iB;
              return iCmp;
            });
          }
          
          // Return the sorted list
          return oSorted;
        } else {
          // Return what we found
          return oList;
        }
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
        var oList = crpstudio.list.getList(sListType);   // JSON type list of objects
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
       * @param {string}  sListType
       * @param {int}     iCurrentId
       * @param {int}     iMainId    - type-dependant id of another item on which I hinge
       * @returns {void} 
       * @history
       *  6/oct/2015  ERK Created
       *  15/oct/2015 ERK 
       */
      showlist : function(sListType, iCurrentId, iMainId) {
        var oList = null;   // JSON type list of objects
        var sPrf = "";      // Prefix
        var sLoc = "";      // Location on html
        var arHtml = [];    // To gather the output

        // Access a descriptor of this list type
        var oItemDesc = crpstudio.list.getItemDescr(sListType);
        // Find the correct list and get a *sorted* copy of it
        oList = crpstudio.list.getList(sListType, oItemDesc.sortfield);
        // Find the prefix
        var sPrf = oItemDesc.prf;
        sLoc = "#" + sListType + "_list" + " ." + sPrf + "-available";
        // Calculate a list consisting of <li> items
        // QRY: "QueryId;Name;File;Goal;Comment;Created;Changed"
        // DEF: "DefId;Name;File;Goal;Comment;Created;Changed"
        // QC:  "QCid;Input;Query;Output;Result;Cmp;Mother;Goal;Comment"
        // DBF: "DbFeatId;Name;Pre;QCid;FtNum"
        // CRP: "CrpId;Name;Language;Part;Author;ProjectType;Goal;Created;Changed;DbaseInput;Comments"
        // CPS: "CorpusId;Name"
        // GRP: "GrpId;Name"
        // MTV: "MtvId;Name"
        // DBS: "DbaseId;Name"
        for (var i=0;i<oList.length;i++) {
          var oOneItem = oList[i];
          var bShow = true;
          // Check if this item should be shown
          switch (sListType) {
            case "dbfeat":
              // Only show the items that have the currently selected QCid
              if (parseInt(oOneItem.QCid,10) !== iMainId) bShow = false;
              break;
          }
          if (bShow) {
            var sOneName = oOneItem[oItemDesc.listfield];
            var sOneItem = "<li class='" + sPrf + "_" + sOneName + " " + 
                    sPrf + "-available'><a href=\"#\" onclick=\"";
            switch(sListType) {
              case "project": 
                if (parseInt(oOneItem.QueryId,10) === iCurrentId) sOneItem = sOneItem.replace('available', 'available active');
                sOneItem += "crpstudio.project.setProject(this, '"+oOneItem.Name+"', '"+ 
                        oOneItem.Language +"', '"+oOneItem.Part+"')\">" + oOneItem.Name; break;
              case "query": 
                if (parseInt(oOneItem.QueryId,10) === iCurrentId) sOneItem = sOneItem.replace('available', 'available active');
                sOneItem += "crpstudio.list.setCrpItem(this, 'query', "+ 
                        oOneItem.QueryId +")\">" + oOneItem.Name; break;
              case "definition": 
                if (parseInt(oOneItem.DefId,10) === iCurrentId) sOneItem = sOneItem.replace('available', 'available active');
                sOneItem += "crpstudio.list.setCrpItem(this, 'definition', "+ 
                        oOneItem.DefId +")\">" + oOneItem.Name; break;
              case "constructor": 
                if (parseInt(oOneItem.QCid,10) === iCurrentId) sOneItem = sOneItem.replace('available', 'available active');
                sOneItem += "crpstudio.list.setCrpItem(this, 'constructor', "+ 
                        oOneItem.QCid +")\">" + 
                        "<div class='list_13'>"+oOneItem.QCid + "</div>" +
                        "<div class='list_23'>"+oOneItem.Input + "</div>" + 
                        "<div class='list_33'>"+oOneItem.Result + "</div>"; break;
              case "dbfeat": 
                if (parseInt(oOneItem.DbFeatId,10) === iCurrentId) sOneItem = sOneItem.replace('available', 'available active');
                sOneItem += "crpstudio.list.setCrpItem(this, 'dbfeat', "+ 
                        oOneItem.DbFeatId +")\">" + 
                        "<div class='list_12'>"+oOneItem.FtNum + "</div>" + 
                        "<div class='list_22'>"+oOneItem.Name + "</div>"; break;
            }
            sOneItem += "</a></li>\n";
            arHtml.push(sOneItem);
          }
        }
        // Adapt the QRY-AVAILABLE list
        $(sLoc).not(".divider").not(".heading").remove();
        $(sLoc).last().after(arHtml.join("\n"));
        
        // Reset the status, which is at the bottom-end of this list
        $("#" + sListType + "_status").html("");
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
        var oItemDesc = crpstudio.list.getItemDescr(sListType);
        // Get the NAME of this element
        var oListItem = crpstudio.list.getListObject(sListType, oItemDesc.id, iItemId);
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
       * setCrpItem
       *    User selects the indicated item of a CRP, 
       *    and we need to show the contents of that item
       *    
       * @param {item} target           - pointer to <a> element
       * @param {string} sType          - the kind of item
       * @param {int} iItemId           - numerical id of the item
       * @param {function} fn_before    - function to call back in first part
       * @param {function} fn_after     - function to call back in second part
       * @returns {undefined}   - none
       * @history
       *  8/oct/2015  ERK Created
       *  15/oct/2015 ERK When there is no iItemId, check if a default needs to be shown
       */
      setCrpItem : function(target, sType, iItemId) {
        // Do we need to grab a default item?
        if (!iItemId || iItemId < 0) {
          // Default id
          iItemId = -1;
          // No itemid is defined, so check if there *is* anything that could be selected
          switch(sType) {
            case "query":
              if (crpstudio.prj_qrylist.length > 0) {
                iItemId = (crpstudio.project.getQry()>=0) ? crpstudio.project.getQry() : parseInt(crpstudio.prj_qrylist[0].QueryId,10);
              }
              break;
            case "definition":
              if (crpstudio.prj_deflist.length > 0) {
                iItemId = (crpstudio.project.getDef()>=0) ? crpstudio.project.getDef() : parseInt(crpstudio.prj_deflist[0].DefId,10);
              }
              break;
            case "dbfeat":
              if (crpstudio.prj_dbflist.length > 0) {
                if (crpstudio.project.getDbf()>=0)
                  iItemId = crpstudio.project.getDbf();
                else
                  iItemId = crpstudio.project.getFirstDbf(crpstudio.project.getQc());
              }
              break;
            case "constructor":
              if (crpstudio.prj_qclist.length > 0) {
                iItemId = (crpstudio.project.getQc()>=0) ? crpstudio.project.getQc() : parseInt(crpstudio.prj_qclist[0].QCid,10);
              }
              break;
            case "project":
              if (crpstudio.prj_crplist.length > 0) {
                iItemId = (crpstudio.project.getCrp()>=0) ? crpstudio.project.getCrp() : parseInt(crpstudio.prj_crplist[0].CrpId,10);
              }
              break;
            case "dbase":
              break;
          }
          // Calculate the target <a> item...
          if (iItemId>=0) 
            target = crpstudio.list.getCrpItem(sType, iItemId);
        }
        // Get the prefix
        var oItemDescr = crpstudio.list.getItemDescr(sType);
        var sPrf = oItemDescr.prf;
        // Get the 'before' and 'after' functions
        var fn_before = oItemDescr.before;
        var fn_after = oItemDescr.after;
        
        // Validate
        if (iItemId && iItemId >= 0) {
          // Make sure we are visible
          $("#"+sPrf+"_general").removeClass("hidden");
          $("#"+sPrf+"_description").html("");
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
          // Retrieve the item from the list
          var oItem = crpstudio.list.getListObject(oItemDescr.name, oItemDescr.id, iItemId);
          // Validate
          if (oItem === null) return;
          $("#" + oItemDescr.descr).html("<i>Loading...</i>");
          // Make the General area INvisible
          $("#" + oItemDescr.gen).addClass("hidden");
          // Indicate we are selecting
          var bSelState = bIsSelecting;
          bIsSelecting = true;
          
          // Anything that needs to be done before we start filling in the values...
          var bSelLocal = fn_before(sType, iItemId);
          
          // Pass on all the item's values to the html component
          for (var i=0;i<oItemDescr.fields.length; i++) {
            var oOneF = oItemDescr.fields[i];
            // Only set non-empty field defs
            if (oOneF.loc !== "") {
              // Get the value of this field
              var sValue = oItem[oOneF.field];
              // Showing it depends on the type
              switch (oOneF.type) {
                case "txt": // text fields
                  $("#" + oOneF.loc).val(sValue);
                  break;
                case "chk": // checkbox items
                  var bValue = (sValue === "True");
                  $("#" + oOneF.loc).prop("checked", bValue);
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
          
          // Create object to pass on as argument
          var oArgs = {};
          switch(sType) {
            case "dbfeat": oArgs.listHost = listHost;break;
            case "project": oArgs.prj = oItem[oItemDescr.listfield];
          }
          
          // Actions to be done after the main part of this function
          fn_after(sType, iItemId, bSelLocal, oArgs);
          
          // We are no longer selecting
          bIsSelecting = bSelState;
        } else {
          // Anything that needs to be done before we start filling in the values...
          var bSelLocal = fn_before(sType, iItemId);

          // Create object to pass on as argument
          var oArgs = {};
          switch(sType) {
            case "dbfeat": break;
            default: break;
          }
          
          // Actions to be done after the main part of this function
          fn_after(sType, iItemId, bSelLocal, oArgs);
        }
        
      },
      
      
      /**
       * itemListShow 
       *    Re-draw the list of type @sItemType
       *    Put the focus on item @iItemId
       * 
       * @param {string} sItemType
       * @param {int} iItemId
       * @param {function} fn_before
       * @param {function} fn_after
       * @returns {void}
       */
      itemListShow : function(sItemType, iItemId) {
        // Make sure the list is re-drawn
        // Fill the query/definition list, but switch off 'selecting'
        var bSelState = bIsSelecting;
        bIsSelecting = true;
        // private_methods.showlist(sItemType);
        crpstudio.list.showlist(sItemType, iItemId);
        // Check value of id
        if (iItemId >=0) {
          // Get the <a> element of the newly to be selected item
          var targetA = crpstudio.list.getCrpItem(sItemType, iItemId);
          // Call setCrpItem() which will put focus on the indicated item
          crpstudio.list.setCrpItem(targetA, sItemType, iItemId);
          // Indicate all went well
          // bOkay = true;
        }
        // Put selstate back
        bIsSelecting = bSelState;
      }
      
      
      
      
    };
  }($, crpstudio.config));
  
  return crpstudio;
  
}(jQuery, window.crpstudio || {}));
