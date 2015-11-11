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
    var currentCorpus = "";
    // Methods that are local to [crpstudio.project]
    var private_methods = {
      
    };
    // Methods that are exported by [crpstudio.project] for others
    return {
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
            "itemtype": "corpus", "userid": crpstudio.main.currentUser };
          // var params = "changes=" + JSON.stringify(oChanges);
          // Crpstudio.getCrpStudioData("crpchg", params, crpstudio.project.processCrpChg, "#project_description");      
          var params = JSON.stringify(oArgs);
          // var params = "itemname=" + sCorpusName + "itemtype=corpus&userid=" + crpstudio.main.currentUser;
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
      }   

    };
  }($, crpstudio.config));
  
  return crpstudio;
  
}(jQuery, window.crpstudio || {}));

