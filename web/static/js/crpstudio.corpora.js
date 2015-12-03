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
        loc_metaVar = "",         // Name of the metavar selection belonging to the selected corpus
        loc_dirty =  false,       // Corpus information needs saving or not
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
        crpstudio.main.debug("switching to search tab "+target+" from "+loc_tab);
        if (target !== loc_tab || bForce) {
          // Bookkeeping
          $("#search .content").removeClass("active");
          $("#"+target).addClass("active");
          $("#subnav dd").removeClass("active");
          $("#"+target+"_link").addClass("active");
          // Reset the status message in the target
          $("#"+target+"_status").text("");
          // Make sure the global variable is set correctly
          loc_tab = target;
          // Initially hide *all* SELECTORs
          $("#corpus_explore").hide(); $("#corpus_editor").hide(); $("#corpus_grouping").hide();
          
          // Remove textarea event handlers
          /*
          $("#query_general_top").unbind();
          $("#def_general_top").unbind();
          */
          
          // Capture the current selecting state
          var bSelState = bIsSelecting;

          // Action depends on target 
          switch (target) {
            case "corpus_explore": case "crpexplore":
              // Show the explorer
              $("#corpus_explore").show();
              break;
            case "corpus_editor": case "crpeditor":
              // Selecting...
              bIsSelecting = true;
              // Fill the list of editor information
              crpstudio.list.showlist("corpus", currentCor);
              
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
            case "corpus_grouping": case "crpgrouping":
              // Selecting...
              bIsSelecting = true;
              
              // Show the editor selector
              $("#corpus_grouping").show();
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
              var oItem = crpstudio.list.getCrpItem("corpus", iItemId);
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

