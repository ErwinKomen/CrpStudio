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
        bIsSelecting =  false,  // Flag to indicate that selection changes take place
        currentDbs= -1,         // The id of the currently being executed database
        loc_currentDbase = "",  // Name of current database
        loc_recentDbase = "",   // Name of recent dbase
    loc_ctlCurrent= null;       // Current control
    
    // Methods that are local to [crpstudio.dbase]
    var private_methods = {
      
    };
    // Methods that are exported by [crpstudio.project] for others
    return {
      // Getters for some 'global' variables used by crpstudio.result
      getDbs: function() { return currentDbs;},

      /* ---------------------------------------------------------------------------
       * Name: switchtab
       * Goal: switch the tab within the [Databases] page
       * History:
       * 29/sep/2015  ERK Created
       */
      switchTab : function(target, sRecentDb, bForce) {
        crpstudio.main.debug("switching to dbase tab "+target+" from "+loc_tab);
        if (target !== loc_tab || bForce) {
          $("#search .content").removeClass("active");
          $("#"+target).addClass("active");
          $("#subnav dd").removeClass("active");
          $("#"+target+"_link").addClass("active");
          // Reset the status message in the target
          $("#"+target+"_status").text("");
          // Make sure the global variable is set correctly
          loc_tab = target;
          // Initially hide *all* SELECTORs
          $("#dbase_explore").hide(); $("#dbase_editor").hide();
          
          // Remove textarea event handlers
          /*
          $("#query_general_top").unbind();
          $("#def_general_top").unbind();
          */
          
          // Capture the current selecting state
          var bSelState = bIsSelecting;

          // Action depends on target 
          switch (target) {
            case "dbase_explore":
              // Selecting...
              bIsSelecting = true;
              // Fill the list of editor information
              crpstudio.list.showlist("dbase", currentDbs);
              
              // Show the editor selector
              $("#dbase_explore").show();
              // Show the contents of the explorer
              $("#dbase_general_explore").removeClass("hidden");
              $("#dbase_general_editor").addClass("hidden");
              // Call setCrpItem() which should check if a 'default' item needs to be shown
              crpstudio.list.setCrpItem(null, "dbase", -1);    
              
              // NOTE: do *NOT* add change events
              
              break;
            case "dbase_editor":
              // Selecting...
              bIsSelecting = true;
              // Fill the list of editor information
              crpstudio.list.showlist("dbase", currentDbs);
              
              // Show the editor selector
              $("#dbase_editor").show();
              // Show the contents of the editor
              $("#dbase_general_explore").addClass("hidden");
              $("#dbase_general_editor").removeClass("hidden");
              // Call setCrpItem() which should check if a 'default' item needs to be shown
              crpstudio.list.setCrpItem(null, "dbase", -1);          

              // Add event handlers on all INPUT elements under "def_general" to get changes sent to the CRP on the server
              crpstudio.dbase.addChangeEvents("dbase_general");

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
      
      /**
       * setDbsItemBefore 
       *    Actions in first part of crpstudio.list.setCrpItem()
       * 
       * @param {type} sType
       * @param {type} iItemId
       * @returns {undefined}
       */
      setDbsItemBefore : function(sType, iItemId) {
        switch (sType) {
          case "dbase":
            break;
        }        
        // Indicate we are selecting
        var bSelState = bIsSelecting;
        bIsSelecting = true;
        return bSelState;
      },
      
      /**
       * setDbsItemAfter
       *    Actions in second part of crpstudio.list.setCrpItem()
       * 
       * @param {string}  sType
       * @param {int}     iItemId
       * @param {bool}    bSelState
       * @param {object}  oArgs
       * @returns {undefined}
       */
      setDbsItemAfter : function(sType, iItemId, bSelState, oArgs) {
        if (iItemId && iItemId >=0) {

          // type-specific actions *AFTER* a corpus change has taken place
          switch (sType) {
            case "dbase":
              // Set the id of the currently selected query
              currentDbs = iItemId;
              break;
          }
        } else {
          // SOme actions depend upon the type
          switch (sType) {
            case "dbase":
              break;
          }
          
        }
        // We are no longer selecting
        bIsSelecting = bSelState;
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
        listHost.children('li').each(function() { $(this).removeClass("active");});
        // Set the "active" class for the one the user has selected
        $(listItem).addClass("active");
        // Make sure the active class is selected
        loc_currentDbase = sDbName;
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

        crpstudio.maingetCrpStudioData("loaddb", params, crpstudio.dbase.processLoad, "#dbase_description");
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

              // Add event handlers on all INPUT elements under "dbase_general"
              $("#dbase_general input").on("change keydown paste input", 
                function() {crpstudio.dbase.ctlTimer(this);});

              // Add event handlers on all TEXTAREA elements under "dbase_general"
              $("#dbase_general textarea").on("change keydown paste input", 
                function() {crpstudio.dbase.ctlTimer(this);});

              // Add event handlers on all SELECT elements under "dbase_general"
              $("#dbase_general select").on("change keydown paste input", 
                function() {crpstudio.dbase.ctlTimer(this);});

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
       * processUpLoad
       *    What to do when a database has been loaded
       *    
       * @param {type} response   JSON object returned from /crpstudio/upload
       * @param {type} target     The 'description' <div> for this dbase
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
          // Obligatory: itemtype
          var sItemType = oContent.itemtype;
          // Action depends on the status code
          switch (sStatusCode) {
            case "completed":
              // Adapt the overal list
              crpstudio.dbs_dbslist = oContent.itemlist;
              // Get the id
              var iItemId = oContent.itemid;
              // Show the list, putting the focus on the new item id
              crpstudio.list.itemListShow(sItemType, iItemId);
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
        var sDbName = loc_currentDbase;
        if (sDbName && sDbName !== "") {
          // Note: /crpstudio must check when the last download of this project was
          // Send this information to the /crpstudio
          // var params = "dbname=" + sDbName + "&userid=" + crpstudio.currentUser;

          var oArgs = { "dbname": sDbName,
            "userid": crpstudio.currentUser };
          var params = JSON.stringify(oArgs);      

          crpstudio.main.getCrpStudioData("remove-db", params, crpstudio.dbase.processRemove, "#dbase_description");      
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
        var sDbName = loc_currentDbase;
        if (sDbName && sDbName !== "") {
          // Note: /crpstudio must check when the last download of this project was
          // Send this information to the /crpstudio
          // var params = "dbname=" + sDbName + "&userid=" + crpstudio.currentUser;

          var oArgs = { "dbname": sDbName,
            "userid": crpstudio.currentUser };
          var params = JSON.stringify(oArgs);

          crpstudio.main.getCrpStudioData("download-db", params, crpstudio.dbase.processDownload, "#dbase_description");      
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
        var oArgs = { "dbase": loc_currentDbase,
          "userid": crpstudio.currentUser, 
          "key": sKey, "value": sValue };
        // var params = "changes=" + JSON.stringify(oChanges);
        var params = JSON.stringify(oArgs);
        crpstudio.main.getCrpStudioData("dbchg", params, crpstudio.dbase.processDbChg, "#dbase_description");      
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
        // Add event handlers on all INPUT elements under "dbase_general"
        $(sId + " input").on("change paste input", 
          function() {crpstudio.dbase.ctlTimer(this, "input");});
        // Checkbox: bind on the click event
        $(sId + " input:checkbox").on("click", 
          function() {crpstudio.dbase.ctlTimer(this, "input");});
        // Note: do not set the .on("blur") event, because that is not really necessary

        // Add event handlers on all TEXTAREA elements under "dbase_general"
        $(sId + " textarea").on("change paste input", 
          function() {crpstudio.dbase.ctlTimer(this, "textarea");});

        // Add event handlers on all SELECT elements under "dbase_general"
        $(sId + " select").on("change paste input", 
          function() {crpstudio.dbase.ctlTimer(this, "select");});

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

      /**
       * setSizes -- Function called upon creation of the page
       * 
       * @returns {undefined}
       */
      setSizes : function() {
        // Issue a request to /crpstudio to get the list of corpora and of metavar parameters
        var oArgs = { "userid": crpstudio.currentUser, "type": "dbases" };
        var params = JSON.stringify(oArgs);
        crpstudio.main.getCrpStudioData("load", params, crpstudio.dbase.processDbaseInit, "");        
      },
      
      /**
       * processDbaseInit
       *    Process fetching dbase tab initialisation information
       * 
       * @param {type} response
       * @param {type} target
       * @returns {undefined}
       */
      processDbaseInit : function(response, target) {
        if (response !== null) {
          // The response is a standard object containing "status" (code) and "content" (code, message)
          var oStatus = response.status;
          var sStatusCode = oStatus.code;
          var oContent = response.content;
          switch (sStatusCode) {
            case "completed":
              crpstudio.dbs_edtlist = oContent.dbaselist;
              // Show the recent ones
              // crpstudio.project.sideToggle($("#project_list li.heading.crp-recent").get(0), "crp-recent");
              break;
          }
        }
      }
        
    }
  }($, crpstudio.config));
  
  return crpstudio;
  
}(jQuery, window.crpstudio || {}));
