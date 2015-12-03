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
        loc_dirty =  false,       // Corpus information needs saving or not
        loc_tab = "overview";     // Currently selected tab name
        //
    // Methods that are local to [crpstudio.project]
    var private_methods = {
      
    };
    // Methods that are exported by [crpstudio.project] for others
    return {
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
              break;
            case "corpus_editor": case "crpeditor":
              // Selecting...
              bIsSelecting = true;
              // Fill the list of editor information
              
              // Show the editor selector
              $("#corpus_editor").show();
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
      },      /* --------------------------------------------------------------
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
          }
        }
      }

    };
  }($, crpstudio.config));
  
  return crpstudio;
  
}(jQuery, window.crpstudio || {}));

