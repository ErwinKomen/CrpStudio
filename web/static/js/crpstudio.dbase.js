/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */

Crpstudio.dbase = {
  // Local variables within Crpstudio.project
  tab : "project",        // The main tab we are on (equals to "project_editor")
  currentDb: "",          // The currently being executed project (the CRP name)
  currentLng: "",         // the "lng" parameter of the current project
  currentDir: "",         // the "dir" parameter of the current project
  divStatus: "",          // The name of the div where the status is to be shown
  recentDb: "",           // Recently used dbase
  interval: 200,          // Number of milliseconds
  typingTimer: null,      // Timer to make sure we react only X seconds after typing
  doneTypingIntv: 2000,   // Stop-typing interval: 2 seconds
  ctlCurrent: null,       // Current control
  
  /**
   * uploadDbFile
   *    Ask user to upload a .xml database file
   * 
   * @param {type} el
   * @returns {undefined}
   */
  uploadDbFile : function(el) {
    // Make sure download info is hidden
    $("#dbase_download").addClass("hidden");
    // Get the name of the file
    var oFile = el.files[0];
    // TODO: convert to .tar.gz
    // 
    // Use the standard readXmlFile function
		Crpstudio.readXmlFile(oFile, function(e) {
      // Get the text of the uploaded CRP into a variable
      var text = encodeURIComponent(e.target.result);
      // Signal what we are doing
      $("#dbase_description").html("Uploading...");
      // Send this information to the /crpstudio
      var params = "file=" + oFile.name + "&userid=" + Crpstudio.currentUser +
              "&db=" + text;
      Crpstudio.getCrpStudioData("upload-db", params, Crpstudio.dbase.processUpLoad, "#dbase_description");
    });
	},
  /**
   * processUpLoad
   *    What to do when a project has been loaded
   *    
   * @param {type} response   JSON object returned from /crpstudio/load
   * @param {type} target
   * @returns {undefined}
   */
  processUpLoad : function(response, target) {
		if (response !== null) {
      // Remove waiting
      $("#dbase_description").html("");
      // The response is a standard object containing "status" (code) and "content" (code, message)
      var oStatus = response.status;
      var sStatusCode = oStatus.code;
      var oContent = response.content;
      switch (sStatusCode) {
        case "completed":
          // If we have succesfully completed *uploading* a file to /crpstudio,
          //    then it must be added to the list
          var sDbLine = oContent.dbline;
          var sDbName = oContent.dbname;
          // Check if there is any reply
          if (sDbLine) {
            // Walk the list of <li> elements with class "db-available"
            var arDbItem = $("#dbase_list .db-available").not(".divider").not(".heading");
            var liBef = null;
            // Start from 0: we are in our own 'section' of "db-available"
            for (var i=0;i<arDbItem.size();i++) {
              // It must have a <a> child node
              if (arDbItem[i].childNodes) {
                var aChild = arDbItem[i].childNodes.item(0);
                // Should we put our dbase before this one?
                if (aChild.innerHTML.localeCompare(sDbName)>0) {
                  // The list item must come before the current one
                  liBef = arDbItem[i];break;
                }
              }              
            }
            // Did we find any?
            if (liBef === null) {
              // Append it after the divider and heading crp-available
              $("#dbase_list .db-available").last().append(sDbLine);
            } else {
              $(sDbLine).insertBefore($(liBef));
            }
          }
          break;
        case "error":
          var sErrorCode = (oContent && oContent.code) ? oContent.code : "(no code)";
          var sErrorMsg = (oContent && oContent.message) ? oContent.message : "(no description)";
          $("#dbase_status").html("Error: " + sErrorCode);
          $(target).html("Error: " + sErrorMsg);
          break;
        default:
          $("#dbase_status").html("Error: no reply");
          $(target).html("Error: no reply received from the /crpstudio server");
          break;
      }
		} else {
			$("#dbase_status").html("ERROR - Failed to upload the result database to the server.");
		}    
  },  
  /**
   * removeDbFile
   *    Check which Db is currently selected (if any)
   *    Then remove that Db:
   *    (1) from the server --> POST to /crpstudio
   *    (2) from the list here --> done in callback
   * 
   * @param {type} elDummy
   * @returns {undefined}
   */
  removeDbFile : function(elDummy) {
    // Make sure download info is hidden
    $("#dbase_download").addClass("hidden");
    // Find out which one is currently selected
    var sDbName = Crpstudio.dbase.currentDb;
    if (sDbName && sDbName !== "") {
      // Note: /crpstudio must check when the last download of this project was
      // Send this information to the /crpstudio
      var params = "dbname=" + sDbName + "&userid=" + Crpstudio.currentUser;
      Crpstudio.getCrpStudioData("remove-db", params, Crpstudio.dbase.processRemove, "#dbase_description");      
    }
  },
  /**
   * processRemove
   *    Brushing up after project has been deleted
   *    
   * @param {type} response   JSON object returned from /crpstudio/remove
   * @param {type} target
   * @returns {undefined}
   */
  processRemove : function(response, target) {
		if (response !== null) {
      // Remove waiting
      $("#dbase_description").html("");
      // The response is a standard object containing "status" (code) and "content" (code, message)
      var oStatus = response.status;
      var sStatusCode = oStatus.code;
      var oContent = response.content;
      switch (sStatusCode) {
        case "completed":
          // Find out which project has been removed
          var sDbName = oContent.dbname;
          // Validate
          if (sDbName) {
            // Remove the project from the list
            $("#dbase_list .db_"+sDbName).remove();
          }
          break;
        case "error":
          var sErrorCode = (oContent && oContent.code) ? oContent.code : "(no code)";
          var sErrorMsg = (oContent && oContent.message) ? oContent.message : "(no description)";
          $("#dbase_status").html("Error: " + sErrorCode);
          $(target).html("Error: " + sErrorMsg);
          break;
        default:
          $("#dbase_status").html("Error: no reply");
          $(target).html("Error: no reply received from the /crpstudio server");
          break;
      }
		} else {
			$("#dbase_status").html("ERROR - Failed to remove the result database from the server.");
		}    
  },   
  /**
   * downloadDbFile
   *    Check which Db is currently selected (if any)
   *    Then download that Db:
   *    (1) from the server --> POST to /crpstudio
   * 
   * @param {type} elDummy
   * @returns {undefined}
   */
  downloadDbFile : function(elDummy) {
    // Find out which one is currently selected
    var sDbName = Crpstudio.dbase.currentDb;
    if (sDbName && sDbName !== "") {
      // Note: /crpstudio must check when the last download of this project was
      // Send this information to the /crpstudio
      var params = "dbname=" + sDbName + "&userid=" + Crpstudio.currentUser;
      Crpstudio.getCrpStudioData("download-db", params, Crpstudio.dbase.processDownload, "#dbase_description");      
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
      $("#dbase_description").html("");
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
            $("#dbase_download").removeClass("hidden");
            $("#dbase_download_file").html("<a href=\""+sFile + "\""+
                    " target='_blank'\">"+fFileName+"</a>");
          }
          break;
        case "error":
          var sErrorCode = (oContent && oContent.code) ? oContent.code : "(no code)";
          var sErrorMsg = (oContent && oContent.message) ? oContent.message : "(no description)";
          $("#dbase_status").html("Error: " + sErrorCode);
          $(target).html("Error: " + sErrorMsg);
          break;
        default:
          $("#project_status").html("Error: no reply");
          $(target).html("Error: no reply received from the /crpstudio server");
          break;
      }
		} else {
			$("#dbase_status").html("ERROR - Failed to download results database.");
		}    
  }  
}