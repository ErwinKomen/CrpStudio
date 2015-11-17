/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */

/*globals jQuery, crpstudio, Crpstudio, alert: false, */
var crpstudio = (function ($, crpstudio) {
  "use strict";
  crpstudio.dbase = (function ($, config) {
    // Local variables within crpstudio.project
    var loc_tab = "project",    // The main tab we are on (equals to "project_editor")
    loc_currentDb= "",          // The currently being executed project (the CRP name)
    loc_currentLng= "",         // the "lng" parameter of the current project
    loc_currentDir= "",         // the "dir" parameter of the current project
    loc_divStatus= "",          // The name of the div where the status is to be shown
    loc_recentDb= "",           // Recently used dbase
    loc_interval= 200,          // Number of milliseconds
    loc_typingTimer= null,      // Timer to make sure we react only X seconds after typing
    loc_doneTypingIntv= 2000,   // Stop-typing interval= 2 seconds
    loc_ctlCurrent= null;       // Current control
    // Methods that are local to [crpstudio.project]
    var private_methods = {
      
    };
    // Methods that are exported by [crpstudio.project] for others
    return {
      /* ---------------------------------------------------------------------------
       * Name: switchtab
       * Goal: switch the tab within the [Databases] page
       * History:
       * 29/sep/2015  ERK Created
       */
      switchTab : function(target, sRecentDb) {
        crpstudio.main.debug("switching to dbase tab "+target+" from "+loc_tab);
        if (target !== loc_tab) {
          $("#search .content").removeClass("active");
          $("#"+target).addClass("active");
          $("#subnav dd").removeClass("active");
          $("#"+target+"_link").addClass("active");
          // Action depends on target 
          switch (target) {
            case "dbase_editor":
              break;
            case "dbase_explore":
              // Do we have a 'recent' db?
              if (sRecentDb && sRecentDb !== "") {
                // Show the recent ones
                $("#project_list li .crp-recent").show();
                loc_recentDb = sRecentDb;
              } 
              break;
            default:
              break;
          }
          // When to show the spacer before [result] and [document]
          if (!$("#result_link").hasClass("hide") || !$("#document_link").hasClass("hide")) {
            $("#link-spacer").removeClass("hide");
          }

          loc_tab = target;
        }
      },
      /* ---------------------------------------------------------------------------
       * Name: setDbase
       * Goal: the user chooses a database, so act on this
       * History:
       * 29/sep/2015  ERK Created
       */
      setDbase : function(target, sDbName, sLng, sDir, sDbase) {
        // Get the <li>
        var listItem = $(target).parent();
        var strDbase = $(target).text();
        // Make sure download info is hidden
        $("#dbase_download").addClass("hidden");
        // Look at all the <li> children of <ul>
        var listHost = listItem.parent();
        listHost.children('li').each(function() { $(this).removeClass("active")});
        // Set the "active" class for the one the user has selected
        $(listItem).addClass("active");
        // Make sure the active class is selected
        loc_currentDb = sDbName;
        // Also set the name of the currently selected project in a div
        $("#dbase_current").text(sDbName);
        // And set the name of the project in the top-bar div
        $("#top_bar_current_dbase").text(sDbName);
        // Status: indicate that we are loading the project
        $("#dbase_description").html("<i>Loading database...</i>");
        // Make the General area INvisible
        $("#dbase_general").addClass("hidden");

        // Issue a request to /crpstudio to load the database (well, the header of it)
        // var params = "dbase=" + sDbName + "&userid=" + crpstudio.currentUser;
        // params += "&type=info";

        var oArgs = { "dbase": sDbName,
          "type": "info", "userid": crpstudio.currentUser };
        var params = JSON.stringify(oArgs);

        Crpstudio.getCrpStudioData("loaddb", params, crpstudio.dbase.processLoad, "#dbase_description");
      },
      /**
       * processLoad
       *    What to do when a database has been loaded
       *    
       * @param {type} response   JSON object returned from /crpstudio/load
       * @param {type} target
       * @returns {undefined}
       */
      processLoad : function(response, target) {
        if (response !== null) {
          // Remove waiting
          $("#dbase_description").html("");
          // The response is a standard object containing "status" (code) and "content" (code, message)
          var oStatus = response.status;
          var sStatusCode = oStatus.code;
          var oContent = response.content;
          switch (sStatusCode) {
            case "completed":
              // Get the information passed on about this project
              var sNameDb = oContent.namedb;
              var sNamePrj = oContent.nameprj;
              var sLng = oContent.lng;
              var sDir = oContent.dir;
              var sCorpus = sLng + ":" + sDir;
              var sDateCreated = oContent.datecreated;
              var sComments = oContent.comments;
              // Put the information on the correct places in the form
              $("#dbase_general_namedb").val(sNameDb);
              $("#dbase_general_nameprj").val(sNamePrj);
              $("#dbase_general_corpus").val(sCorpus);
              $("#dbase_general_datecreated").html(sDateCreated);
              $("#dbase_general_comments").val(sComments);

              // Add event handlers on all INPUT elements under "project_general"
              $("#dbase_general input").on("change keydown paste input", 
                function() {crpstudio.dbase.ctlTimer(this);});

              // Add event handlers on all TEXTAREA elements under "project_general"
              $("#dbase_general textarea").on("change keydown paste input", 
                function() {crpstudio.project.ctlTimer(this);});

              // Add event handlers on all SELECT elements under "project_general"
              $("#dbase_general select").on("change keydown paste input", 
                function() {crpstudio.project.ctlTimer(this);});

              // Make the General area visible again
              $("#dbase_general").removeClass("hidden");
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
          $("#dbase_status").html("ERROR - Failed to load the .xml database from the server.");
        }    
      },  
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
          // var params = "file=" + oFile.name + "&userid=" + crpstudio.currentUser +
          //         "&db=" + text;

          var oArgs = { "file": oFile.name,
            "db": text, "userid": crpstudio.currentUser };
          var params = JSON.stringify(oArgs);

          Crpstudio.getCrpStudioData("upload-db", params, crpstudio.dbase.processUpLoad, "#dbase_description");
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
        var sDbName = loc_currentDb;
        if (sDbName && sDbName !== "") {
          // Note: /crpstudio must check when the last download of this project was
          // Send this information to the /crpstudio
          // var params = "dbname=" + sDbName + "&userid=" + crpstudio.currentUser;

          var oArgs = { "dbname": sDbName,
            "userid": crpstudio.currentUser };
          var params = JSON.stringify(oArgs);      

          Crpstudio.getCrpStudioData("remove-db", params, crpstudio.dbase.processRemove, "#dbase_description");      
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
        var sDbName = loc_currentDb;
        if (sDbName && sDbName !== "") {
          // Note: /crpstudio must check when the last download of this project was
          // Send this information to the /crpstudio
          // var params = "dbname=" + sDbName + "&userid=" + crpstudio.currentUser;

          var oArgs = { "dbname": sDbName,
            "userid": crpstudio.currentUser };
          var params = JSON.stringify(oArgs);

          Crpstudio.getCrpStudioData("download-db", params, crpstudio.dbase.processDownload, "#dbase_description");      
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
      },
      /**
       * ctlChange
       *    Process changes in the <input>, which is 'source'
       *    
       * @param {type} source
       * @returns {undefined}
       */
      ctlChanged : function(source) {
        // Validate source
        if (!source || source === null) source = loc_ctlCurrent;
        // Clear any previously set timer
        clearTimeout(loc_typingTimer);
        // Find parameters
        var sKey = "";
        var sValue = $(source).val();
        // Determine which 'key' this is
        switch($(source).attr("id")) {
          case "dbase_general_namedb": sKey = "Name"; break;
          case "dbase_general_nameprj": sKey = "ProjectName"; break;
          case "dbase_general_lng": sKey = "Language"; break;
          case "dbase_general_dir": sKey = "Part"; break;
          case "dbase_general_comments": sKey = "Notes"; break;
          default: return;
        }
        // Pass on this value to /crpstudio and to /crpp
        var oArgs = { "dbase": loc_currentDb,
          "userid": crpstudio.currentUser, 
          "key": sKey, "value": sValue };
        // var params = "changes=" + JSON.stringify(oChanges);
        var params = JSON.stringify(oArgs);
        Crpstudio.getCrpStudioData("dbchg", params, crpstudio.dbase.processDbChg, "#dbase_description");      
      },  

      /**
       * ctlTimer
       *    Call the function ctlChanged(), but only after a fixed time
       *    of inactivity (not typing) has taken place
       *    
       * @param {type} source
       * @returns {undefined}
       */
      ctlTimer : function(source) {
        // Clear any previously set timer
        clearTimeout(loc_typingTimer);
        // Set the source
        loc_ctlCurrent = source;
        // Call a new timer
        loc_typingTimer = setTimeout(crpstudio.project.ctlChanged, 
          loc_doneTypingIntv);
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
      }
        
    }
  }($, crpstudio.config));
  
  return crpstudio;
  
}(jQuery, window.crpstudio || {}));
