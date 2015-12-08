/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */

/*globals jQuery, crpstudio, Crpstudio, alert: false, */
var crpstudio = (function ($, crpstudio) {
  "use strict";
  crpstudio.corpora = (function ($, config) {
    var currentCorpus = "",       // Currently selected corpus
        bIsSelecting =  false,    // Flag to indicate that selection changes take place
        currentCor = -1,          // The CorId of the currently selected corpus
        currentMtv = -1,          // The MtvId of the currently selected metavar
        currentGrp = -1,          // The GrpId of the currently selected grouping
        currentGro = -1,          // The GroId of the currently selected group
        loc_metaVar = "",         // Name of the metavar selection belonging to the selected corpus
        loc_dirty =  false,       // Corpus information needs saving or not
        arLng = [],               // Array of language objects: {lng: x, name: y}
        arMtvName = [],           // Array of metavar set names
        arMtvVar = [],            // Array of metavar variables for the currently selected metavar 'set'
        arCmpObject = [],         // Array of comparison symbols and names
        loc_tab = "overview";     // Currently selected tab name
        //
    // Methods that are local to [crpstudio.project]
    var private_methods = {
      
    };
    // Methods that are exported by [crpstudio.project] for others
    return {
      // Getters for some 'global' variables used by crpstudio.result
      getCor: function() { return currentCor;},
      getMtv: function() { return currentMtv;},
      getGrp: function() { return currentGrp;},

      /* ---------------------------------------------------------------------------
       * Name: switchtab
       * Goal: switch the tab within the [Corpora] page
       * History:
       * 02/dec/2015  ERK Created
       */
      switchTab : function(target, bForce) {
        crpstudio.main.debug("switching to corpora tab "+target+" from "+loc_tab);
        if (target !== loc_tab || bForce) {
          var sTarget = target;
          switch(target) {
            case "query_editor": sTarget = "queries"; break;
          }
          // Bookkeeping
          $("#search .content").removeClass("active");
          $("#"+sTarget).addClass("active");
          $("#subnav dd").removeClass("active");
          $("#"+sTarget+"_link").addClass("active");
          // Reset the status message in the target
          $("#"+sTarget+"_status").text("");
          // Make sure the global variable is set correctly
          loc_tab = target;
          // Initially hide *all* SELECTORs
          $("#corpus_explore").hide(); $("#corpus_editor").hide(); 
          $("#corpus_grouping").hide(); $("#corpus_metavar").hide();
          
          // Remove textarea event handlers
          /*
          $("#query_general_top").unbind();
          $("#def_general_top").unbind();
          */
          
          // Capture the current selecting state
          var bSelState = bIsSelecting;

          // Action depends on target 
          switch (target) {
            case "corpus_explore": case "explore":
              // Show the explorer
              $("#corpus_explore").show();
              break;
            case "corpus_editor": case "editor":
              // Selecting...
              bIsSelecting = true;
              // Fill the list of editor information
              crpstudio.list.showlist("corpus", currentCor);
              
              // Fill two comboboxes
              crpstudio.corpora.fillCombo("corpus_general_lng", arLng);
              crpstudio.corpora.fillCombo("corpus_general_metavar", arMtvName);
              
              // Show the editor selector
              $("#corpus_editor").show();
              // Call setCrpItem() which should check if a 'default' item needs to be shown
              crpstudio.list.setCrpItem(null, "corpus", -1);          
              
              // Switch on event handling in def_general_top to trigger resizing of the Xquery editor
              // 
              // Add event handlers on all INPUT elements under "def_general" to get changes sent to the CRP on the server
              crpstudio.corpora.addChangeEvents("corpus_general");
              
              // The Save button must be shown if the 'dirty' flag is set
              // private_methods.showSaveButton(loc_dirty);
              
              // We are open for changes again
              bIsSelecting = bSelState;
              break;
            case "corpus_grouping": case "grouping":
              // Selecting...
              bIsSelecting = true;
              
              // Get the variable set that has been selected
              if (currentMtv < 0 && arMtvName.length>0) currentMtv = 0;
              if (currentMtv>=0) {
                var oItem = crpstudio.list.getListItem("metavar", {"MtvId" : currentMtv});
                var sVarset = oItem.mtvName;
                $("#grouping_general_varset").val(sVarset);
                // Filter the list of variable names for this metavar set
                var arVarName = [];
                var oList = crpstudio.list.getList("metavar");
                for (var i=0;i<oList.length;i++) {
                  var oMtv = oList[i];
                  if (oMtv["MtvId"] === currentMtv) {
                    // Add this variable
                    arVarName.push(oMtv["name"]);
                  }
                }
                // Fill the combobox with this list
                crpstudio.corpora.fillCombo("group_new_variable", arVarName);
              }
              
              // Show the editor selector
              $("#corpus_grouping").show();
              
              // Fill the list with available groupings for this corpus
              // (Select 'currentGrp' if this is already set)
              crpstudio.list.showlist("grouping", currentGrp, currentCor);
              
              // Show the editor selector
              $("#grouping_editor").show();
              // Call setCrpItem() which should check if a 'default' item needs to be shown
              crpstudio.list.setCrpItem(null, "grouping", -1);          
              
              
              // Switch on event handling in def_general_top to trigger resizing of the Xquery editor
              // 
              // Add event handlers on all INPUT elements under "def_general" to get changes sent to the CRP on the server
              crpstudio.corpora.addChangeEvents("grouping_general");
              
              // The Save button must be shown if the 'dirty' flag is set
              // private_methods.showSaveButton(loc_dirty);
              
              
              // We are open for changes again
              bIsSelecting = bSelState;
              break;
            case "corpus_metavar": case "metavar":
              // Selecting...
              bIsSelecting = true;
              
              // Show the editor selector
              $("#corpus_metavar").show();
              // Call setCrpItem() which should check if a 'default' item needs to be shown
              // crpstudio.project.setCrpItem(null, "query");          
              
              // Switch on event handling in def_general_top to trigger resizing of the Xquery editor
              // 
              // Add event handlers on all INPUT elements under "def_general" to get changes sent to the CRP on the server
              // crpstudio.project.addChangeEvents("query_general");
              
              // The Save button must be shown if the 'dirty' flag is set
              // private_methods.showSaveButton(loc_dirty);
              
              
              // We are open for changes again
              bIsSelecting = bSelState;
              break;
          }

        }
      },   
      
      /**
       * jumpMtvToGroupings
       *    Jump from the currently selected metavar to the groupings for this metavar
       * 
       * @param {type} target
       * @returns {undefined}
       */
      jumpMtvToGroupings : function(target) {
        // Set the current metavar set
        currentMtv = crpstudio.corpora.getSelectedMtvId();
        crpstudio.corpora.switchTab("grouping");
      },
      
      /**
       * getSelectedMtvId
       *    Retrieve the MtvId of the currently selected metavar set
       * 
       * @returns {unresolved}
       */
      getSelectedMtvId : function() {
        // Get the name of the currently selected metavar SET
        var sMtv = $("#corpus_general_metavar").val();
        // Find out what the MtvId is belonging to this value
        var oItem = crpstudio.list.getListItem("metavar", {"mtvName": sMtv});
        var iMtvId = -1;
        if (oItem !== null) iMtvId = oItem.MtvId;
        return iMtvId;
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
        // Add event handlers on all INPUT elements under "corpora_general"
        $(sId + " input").on("change paste input", 
          function() {crpstudio.corpora.ctlTimer(this, "input");});
        // Checkbox: bind on the click event
        $(sId + " input:checkbox").on("click", 
          function() {crpstudio.corpora.ctlTimer(this, "input");});
        // Note: do not set the .on("blur") event, because that is not really necessary

        // Add event handlers on all TEXTAREA elements under "corpora_general"
        $(sId + " textarea").on("change paste input", 
          function() {crpstudio.corpora.ctlTimer(this, "textarea");});

        // Add event handlers on all SELECT elements under "corpora_general"
        $(sId + " select").on("change paste input", 
          function() {crpstudio.corpora.ctlTimer(this, "select");});

      }, 

      /* ---------------------------------------------------------------------------
       * Name: createManual
       * Goal: manually create a grouping, group, metavar and so forth
       * History:
       * 8/dec/2015  ERK Created
       */
      createManual : function(target, sItemType) {
        // Action depends on the kind of item
        switch (sItemType) {
          case "grouping":        // New GROUPING
            // Make sure the new query form becomes visible
            $("#grouping_general_editor").addClass("hidden");
            $("#grouping_new_create").removeClass("hidden");
            break;
          case "group":           // New GROUP
            // Make sure the new definition form becomes visible
            $("#group_general_editor").addClass("hidden");
            $("#group_new_create").removeClass("hidden");
            break;
          case "metavar":         // New METAVAR
            // Make sure the new dbfeat form becomes visible
            $("#metavar_general_editor").addClass("hidden");
            $("#metavar_new_create").removeClass("hidden");
            break;
        }
        // Activate the target
        var listHost = crpstudio.list.itemListActivate(target);
        // Follow-up material can use the <ul> listHost
        // ...
      },
      
      /* --------------------------------------------------------------
       * Name: showDescr
       * Goal: show a fuller description of the corpus
       * 
       * @element - the id of the element that needs to be made unhidden
       * History:
       * 18/jun/2015  ERK Created
       */              
      showDescr : function(element) {
        crpstudio.main.debug("showDescr("+element+")");
        if ($(element).parent().parent().hasClass("hidden")) {
          $(element).parent().parent().removeClass("hidden");
        } else {
          $(element).parent().parent().addClass("hidden");
        }
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
        var oDescr = crpstudio.list.getItemDescr(sItemType);
        var sDivPrf = oDescr.divprf;
        // Determine the new name
        var sNewName = "new_name";
        // Reset any previous naming
        $("#"+sDivPrf+"_"+sNewName+"_error").removeClass("error");
        $("#"+sDivPrf+"_"+sNewName+"_error").addClass("hidden");
        // Check the information provided
        var sItemName = $("#"+sDivPrf+"_"+sNewName).val();
        var sItemGoal = $("#"+sDivPrf+"_new_goal").val();
        var sItemComment = $("#"+sDivPrf+"_new_comment").val();
        // First look at the action
        switch(sAction) {
          case "new":

            // Only the item NAME is obligatory + check the NAME item
            if (sItemName !=="") {
              // Validate: check 
              if (!crpstudio.list.itemNameCheck(sItemType, sItemName)) {
                // Signal that the name is not correct
                $("#"+sDivPrf+"_"+sNewName+"_error").html("Duplicate: "+sItemName);
                $("#"+sDivPrf+"_"+sNewName+"_error").addClass("error");
                $("#"+sDivPrf+"_"+sNewName+"_error").removeClass("hidden");
                return;
              }
              // Determine how the new item will look like
              var oNew = {};
              switch (sItemType) {
                case "grouping":
                  oNew.Name = sItemName; oNew.Comment = sItemComment;
                  break;
                case "group":
                  oNew.Name = sItemName; oNew.Comment = sItemComment;
                  break;
                case "metavar":
                  break;
              }
              // Create a new item
              var iItemId = crpstudio.list.createListItem(sItemType, oNew, null);
              
              // Hide the form
              $("#"+sDivPrf+"_new_create").addClass("hidden");
              $("#"+sDivPrf+"_general_editor").removeClass("hidden");

              // Make sure the list is re-drawn
              crpstudio.list.itemListShow(sItemType, iItemId, oNew);
              
              // There may be post-processing (follow-up actions)
              switch (sItemType) {
                case "grouping":
                  break;
              }

            }
            break;
          case "line":
            // Add a new line to the group-constructor
            var oList = crpstudio.list.getList("group");
            var oNew = {};
            oNew.MtvId = currentMtv; oNew.name = sItemName; oNew.comment = sItemComment;
            oNew.var = $("#group_new_variable").val();
            oNew.comp = $("#group_new_comparison").val();
            oNew.value = $("#group_new_value").val();
            var iItemId = crpstudio.list.createListItem("group", oNew, null);
            // Set the current pointer to this group
            currentGro = iItemId;
            
            // Show all the items with the current MtvId and the current "name" in the table
            var arHtml = []; oList = crpstudio.list.getList("group");
            for (var i=0;i<oList.length;i++) {
              var oItem = oList[i];
              // Check if this element should be shown
              if (oItem.MtvId === currentMtv && oItem.name === sItemName) {
                // Element must be shown in table
                arHtml.push("<tr><td>"+oItem["var"]+"</td><td>"+oItem["comp"]+"</td><td>"+oItem["value"]+"</td></tr>");
              }
            }
            // Add item to table
            $("#group_new_table tr").remove();
            $("#group_new_table").append(arHtml.join("\n"));
            
            // TODO: code uitwerken
            
            // Do *not* hide the form!!
            bOkay = false;
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
       * downloadCorpus
       *    Download the indicated project
       *    Then download that CRP:
       *    (1) from the server --> POST to /crpstudio
       * 
       * @param {type} elDummy
       * @returns {undefined}
       */
      downloadCorpus : function(elDummy) {
        // Find out which one is currently selected
        var sCorpusName = currentCorpus;
        if (sCorpusName && sCorpusName !== "") {
          // Note: /crpstudio must check when the last download of this project was
          // Send this information to the /crpstudio
          var oArgs = { "itemname": sCorpusName,
            "itemtype": "corpus", "userid": crpstudio.currentUser };
          // var params = "changes=" + JSON.stringify(oChanges);
          // Crpstudio.getCrpStudioData("crpchg", params, crpstudio.project.processCrpChg, "#project_description");      
          var params = JSON.stringify(oArgs);
          // var params = "itemname=" + sCorpusName + "itemtype=corpus&userid=" + crpstudio.currentUser;
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
          // Remove waiting
          $("#project_description").html("");
          // The response is a standard object containing "status" (code) and "content" (code, message)
          var oStatus = response.status;
          var sStatusCode = oStatus.code;
          var oContent = response.content;
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
                $("#project_download").removeClass("hidden");
                $("#project_download_file").html("<a href=\""+sFile + "\""+
                        " target='_blank'\">"+fFileName+"</a>");
              }
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
          $("#project_status").html("ERROR - Failed to remove the .crpx result from the server.");
        }    
      },
      
      /**
       * setCorItemBefore 
       *    Actions in first part of crpstudio.list.setCrpItem()
       * 
       * @param {type} sType
       * @param {type} iItemId
       * @returns {undefined}
       */
      setCorItemBefore : function(sType, iItemId) {
        switch (sType) {
          case "corpus":
            break;
        }        
        // Indicate we are selecting
        var bSelState = bIsSelecting;
        bIsSelecting = true;
        return bSelState;
      },
      
      /**
       * setCorItemAfter
       *    Actions in second part of crpstudio.list.setCrpItem()
       * 
       * @param {string}  sType
       * @param {int}     iItemId
       * @param {bool}    bSelState
       * @param {object}  oArgs
       * @returns {undefined}
       */
      setCorItemAfter : function(sType, iItemId, bSelState, oArgs) {
        if (iItemId && iItemId >=0) {

          // type-specific actions *AFTER* a corpus change has taken place
          switch (sType) {
            case "corpus":
              // Set the id of the currently selected query
              currentCor = iItemId;
              // Get the name of the metavar selection
              var oItem = crpstudio.list.getListObject("corpus", "CorpusId", iItemId); // crpstudio.list.getCrpItem("corpus", iItemId);
              loc_metaVar = oItem["metavar"];
              // Find the MtvId this selects
              var oCondition = {"mtvName": loc_metaVar};
              var oItemMtv = crpstudio.list.getListItem("metavar", oCondition);
              currentMtv = oItemMtv["MtvId"];
              break;
          }
        } else {
          // SOme actions depend upon the type
          switch (sType) {
            case "corpus":
              break;
          }
          
        }
        // We are no longer selecting
        bIsSelecting = bSelState;
      },
      
      /**
       * fillCombo
       *    Fill a combobox
       * 
       * @param {string}  target     - Name of target Id
       * @param {array}   arElement  - array of strings or of objects
       * @returns {void}
       */
      fillCombo : function(target, arElement) {
        // var sFieldName = "lngname";
        // var arElement = arLng;
        // Clear current contents
        $("#"+target+" option").remove();
        // Create a list
        var arHtml = [];
        // First element requests user to make a choice
        var sMsg = (crpstudio.config.language === "nl") ? "(Maak een keuze)" : "(Please make a choice)";
        arHtml.push("<option value=\"-\">"+sMsg+"</option>");
        // Visit all members of the list
        for (var i=0;i<arElement.length;i++) {
          // Get this element
          var oItem = arElement[i];
          // Does this object exist?
          if (oItem !== null) {
            // Value adding depends on size: 1 or 2 elements
            if (oItem.length) {
              arHtml.push("<option value=\""+oItem+"\">"+oItem+"</option>");
            } else {
              var arMem = Object.keys(oItem);
              arHtml.push("<option value=\""+oItem[arMem[0]]+"\">"+oItem[arMem[1]]+"</option>");
            }
          }
        }
        // Put the created list at the right place
        $("#"+target).append(arHtml.join("\n"));
      },
      
      

      /**
       * setSizes -- Function called upon creation of the page
       * 
       * @returns {undefined}
       */
      setSizes : function() {
        // Issue a request to /crpstudio to get the list of corpora and of metavar parameters
        var oArgs = { "userid": crpstudio.currentUser, "type": "corpora" };
        var params = JSON.stringify(oArgs);
        crpstudio.main.getCrpStudioData("load", params, crpstudio.corpora.processCorporaInit, "");        
      },
      
      /**
       * processCorporaInit
       *    Process fetching corpora tab initialisation information
       * 
       * @param {type} response
       * @param {type} target
       * @returns {undefined}
       */
      processCorporaInit : function(response, target) {
        if (response !== null) {
          // The response is a standard object containing "status" (code) and "content" (code, message)
          var oStatus = response.status;
          var sStatusCode = oStatus.code;
          var oContent = response.content;
          switch (sStatusCode) {
            case "completed":
              crpstudio.crp_edtlist = oContent.corpuslist;
              crpstudio.crp_grplist = oContent.groupinglist;
              crpstudio.crp_mvrlist = oContent.metavarlist;
              // Create a new array of language objects
              arLng = []; var oList = oContent.corpuslist;
              var arChk = [];
              for (var i=0;i<oList.length;i++) {
                // Check if name is in chk
                if (arChk.indexOf(oList[i].lng) <0) {
                  // Add language to check array
                  arChk.push(oList[i].lng);
                  // Create a language object
                  var oLng = { lng: oList[i].lng, name: oList[i].lngName };
                  // Add language object ot array
                  arLng.push(oLng);
                }
              }
              // Create a new array of metavar set names
              arMtvName = [];
              oList = oContent.metavarlist;
              for (var i=0;i<oList.length;i++) {
                // Check if name is in array
                if (arMtvName.indexOf(oList[i].mtvName) <0) {
                  // Add metavar to array
                  arMtvName.push(oList[i].mtvName);
                }
              }
              // Set the global list
              // crpstudio.list.setList("metavar", arMtvName);
              crpstudio.list.setList("metavar", oContent.metavarlist);
              
              // Set the list of comparisons
              arCmpObject = oContent.comparisonlist;
              // Fill the list of comparison operators
              crpstudio.corpora.fillCombo("group_new_comparison", arCmpObject);
              
              // Show the recent ones
              // crpstudio.project.sideToggle($("#project_list li.heading.crp-recent").get(0), "crp-recent");
              break;
            case "error":
              // Get the error code
              var sMsg = "unknown error";
              if (oContent.message) sMsg = oContent.message;
              $("#corpus_status").html(sMsg);
              break;
          }
        }
      }

    };
  }($, crpstudio.config));
  
  return crpstudio;
  
}(jQuery, window.crpstudio || {}));

