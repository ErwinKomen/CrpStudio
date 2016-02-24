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
        interval =  200,        // Number of milliseconds
        sDbUplStatus = "",      // Database upload status request
        loc_currentDbase = "",  // Name of current database
        loc_recentDbase = "",   // Name of recent dbase
        loc_uploadText = "",    // Text of file that is being uploaded
        loc_uploadInfo = null,  // DbUpload information
        loc_ctlCurrent= null;   // Current control
    
    // Methods that are local to [crpstudio.dbase]
    var private_methods = {
      
    };
    // Methods that are exported by [crpstudio.project] for others
    return {
      // Getters for some 'global' variables used by crpstudio.result
      getDbs: function() { return currentDbs;},
      getCurrentDb: function() { return loc_currentDbase;},

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

        crpstudio.main.getCrpStudioData("loaddb", params, crpstudio.dbase.processLoad, "#dbase_description");
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
      
      /*
       * uploadFile
       *    Try to upload a large file in chunks
       * 
       * @param {type} el
       * @param {type} sItemType
       * @returns {undefined}
       */
      uploadFile : function(el, sItemType) {
        // Make sure download info is hidden
        $("#"+sItemType+"_download").addClass("hidden");
        // Initialise itemmain
        var sItemMain = "";
        // Get the name of the file
        var oFile = el.files[0];
        // Determine in how many parts we need to slice it
        var iStep = 1024 * 1024;  // 1 MB chunk size
        var iTotal = oFile.size;  // Size of the file
        var iNumChunks = Math.max(Math.ceil(iTotal / iStep), 1);
        // Put this information in a local object
        loc_uploadInfo = {"file": oFile, "step": iStep, "total": iTotal, 
          "chunks": iNumChunks, "itemtype": sItemType};
        // Keep track of progress
        $("#dbase_expl_upload").removeClass("hidden");
        $("#dbase_expl_upload_status").html("waiting for /crpp...");
        $("#dbase_expl_upload_status").removeClass("hidden");
        // Calculate the parameters and put them into a string
        var oArgs = { "file": oFile.name, "itemtype": sItemType, "itemmain": sItemMain,
          "userid": crpstudio.currentUser, "chunk": 0, "total": iNumChunks, "action": "init"};
        // Send these arguments to the /crpstudio server and wait for a positive response
        var params = JSON.stringify(oArgs);

        crpstudio.main.getCrpStudioData("dbupload", params, crpstudio.dbase.uploadContinue, "#dbase_description");
      },
      
      /*
       * uploadContinue
       *    Try to upload a large file in chunks
       * 
       * @param {type} el
       * @param {type} sItemType
       * @returns {undefined}
       */
      uploadContinue : function(response, target) {
        if (response !== null) {
          // Remove waiting
          $("#"+sItemType+"_description").html("");
          // The response is a standard object containing "status" (code) and "content" (code, message)
          var oStatus = response.status;
          var sStatusCode = oStatus.code;
          var oContent = response.content;
          switch (sStatusCode) {
            case "initialized":
              // Retrieve the information from the local object
              var oFile = loc_uploadInfo.file;
              var iStep = loc_uploadInfo.step;
              var iTotal = loc_uploadInfo.total;
              var iNumChunks = loc_uploadInfo.chunks;
              var sItemType = loc_uploadInfo.itemtype;

              // Make sure download info is hidden
              $("#"+sItemType+"_download").addClass("hidden");
              // Initialise itemmain
              var sItemMain = "";
              // Preparations for all the sending...
              var sUrl = config.baseUrl + "dbupload";
              // Calculate the parameters and put them into a string
              var oArgs = { "file": oFile.name, "itemtype": sItemType, "itemmain": sItemMain,
                "userid": crpstudio.currentUser, "action": "send"};
              var params = "";
              // Keep track of progress
              $("#"+sItemType+"_expl_upload").removeClass("hidden");
              $("#"+sItemType+"_expl_upload_status").removeClass("hidden");
              // Loop through the file-slices
              for (var i=0;i<iNumChunks;i++) {
                // Get this chunk of the file
                var iStart = iStep * i;   // Byte where it starts
                var fChunk = oFile.slice(iStart, iStart + iStep);   // Possibly add oFile.type
                // adapt the arguments for this chunk
                oArgs.chunk = i+1;
                oArgs.total = iNumChunks;
                params = JSON.stringify(oArgs);
                // Upload this chunk
                crpstudio.dbase.uploadSlice(params, sUrl, fChunk);
              }
              /*
              // Now start periodically checking for the status
              oArgs.action = "status";
              oArgs.chunk = 0;
              params = JSON.stringify(oArgs);
              // Set the parameters for this class
              sDbUplStatus = params;
              setTimeout(
                function () {
                  crpstudio.main.getCrpStudioData("dbupload", sDbUplStatus, crpstudio.dbase.uploadContinue, target);
                }, interval);
              */
              // Okay, we're ready here
              break;     
            case "working":
              // Find out where we are in terms of sending from /crpstudio to /crpp
              
              // TODO
              
              // Send an additional request for status information
              setTimeout(
                function () {
                  crpstudio.main.getCrpStudioData("dbupload", sDbUplStatus, crpstudio.dbase.uploadContinue, target);
                }, interval);
              // Okay, we're ready here
              break;
            case "completed":
              // Clean up 
              
              // TODO
              
              break;
            default:
              // SOmething is wrong -- we cannot upload
              var sErrorCode = (oContent && oContent.code) ? oContent.code : "(no code)";
              var sErrorMsg = (oContent && oContent.message) ? oContent.message : "(no description)";
              var sMsg = "Cannot upload.\ncode: " + sErrorCode + "\nMessage: " + sErrorMsg;
              $("#"+sItemType+"_expl_upload_status").html(sMsg);
              break;
          }
        }
      },
      
      /**
       * uploadSlice -- Upload one file or slice to the indicated URL
       * @param {type} sParams
       * @param {type} sUrl
       * @param {type} fBlogOrFile
       * @returns {undefined}
       */
      uploadSlice : function(sParams, sUrl, fBlogOrFile) {        
        var fd = new FormData();
        fd.append("args", sParams);
        fd.append("fileToUpload", fBlogOrFile);
        var xhr = new XMLHttpRequest();
        // xhr.upload.addEventListener("progress", crpstudio.dbase.uploadProgress, false);
        xhr.addEventListener("load", crpstudio.dbase.uploadComplete, false);
        xhr.addEventListener("error", crpstudio.dbase.uploadFailed, false);
        xhr.addEventListener("abort", crpstudio.dbase.uploadCanceled, false);
        xhr.open('POST', sUrl);
        xhr.send(fd);        
      },
      
      uploadProgress : function(evt) {
        if (evt.lengthComputable) {
          var percentComplete = Math.round(evt.loaded * 100 / evt.total);
          $("#dbase_expl_upload_status").html( percentComplete.toString() + '%');
        }
        else {
          $("#dbase_expl_upload_status").html('unable to compute');
        }      
      },
      uploadComplete : function(evt) {
        /* This event is raised when the server sends back a response */
        var response = JSON.parse(evt.target.response);
        // The response is a standard object containing "status" (code) and "content" (code, message)
        var oStatus = response.status;
        var sStatusCode = oStatus.code;
        var oContent = response.content;
        // find the result_status element
        var divUplProgress = $("#dbase_expl_upload").get(0);
        // Find the 'meter' within
        var arMeter = divUplProgress.getElementsByClassName("meter");
        // Action depends on the status code
        switch (sStatusCode) {
          case "completed":
            if (arMeter && arMeter.length > 0) {
              var divStarted = arMeter[0];
              // Set the correct styles for these elements
              divStarted.setAttribute("style", "width: 100%");
            }
            break;
          case "working":
            // Get the percentage of where we are
            var iPtcStarted = 100 * oContent.read / oContent.total;
            if (arMeter && arMeter.length > 0) {
              var divStarted = arMeter[0];
              // Set the correct styles for these elements
              divStarted.setAttribute("style", "width: " + iPtcStarted + "%");
            }
            break;
          case "error":
            break;
        }

        $("#dbase_expl_upload_status").html(evt.target.responseText);
      },
      uploadFailed : function(evt) {
        $("#dbase_expl_upload_status").html("There was an error attempting to upload the file.");
      },
      uploadCanceled : function(evt) {
        $("#dbase_expl_upload_status").html("The upload has been canceled by the user or the browser dropped the connection.");
      } ,     
      
      /**
       * uploadFile
       *    Ask user to upload a file (dbase)
       * 
       * @param {object} el   
       * @param {string} sItemType
       * @returns {undefined}
       */
      uploadFile_ORG : function(el, sItemType) {
        // Make sure download info is hidden
        $("#"+sItemType+"_download").addClass("hidden");
        // Initialise itemmain
        var sItemMain = "";
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
          
          crpstudio.main.getCrpStudioData("upload", params, crpstudio.dbase.processUpLoad, 
          "#"+sItemType+"_description");
        });
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
       * removeItem
       *    Check which Item is currently selected (if any)
       *    Then remove that item:
       *    (1) from the server --> POST to /crpstudio
       *    (2) from the list here --> done in callback
       * 
       * @param {type} elDummy      - Not used right now
       * @param {string} sItemType  - Type of file to remove
       * @returns {void}            - no return
       */
      removeItem : function(elDummy, sItemType) {
        // Prepare variable
        var oArgs = null; var iItemId = -1; var lstItem = null; var sCrpName = "";
        var sItemMain = "";
        // Make sure download info is hidden
        $("#"+sItemType+"_download").addClass("hidden");
        // Find out which project is currently selected
        sCrpName = currentPrj;
        // Action depends on the type
        switch(sItemType) {
          case "dbase":
            // There is no real itemmain
            sItemMain = "ROOT";                       // Databases is root
            // New method: there is an id
            iItemId = currentDbId;
            break;
          default:
            // Unable to handle this, so leave
            return;
        }
        if (sCrpName && sCrpName !== "") {
          var iItemNext = -1;
          // Action depends on the type
          switch (sItemType) {
            case "dbase":
              // Note: /crpstudio must check when the last download of this project was
              // Send removal request to /crpstudio, which checks and passes it on to /crpp
              oArgs = { "itemid": iItemId, "itemtype": sItemType, "itemmain": sItemMain,  
                        "crp": sCrpName, "userid": crpstudio.currentUser };
              // Send the remove request
              var params = JSON.stringify(oArgs);
              crpstudio.main.getCrpStudioData("remove", params, crpstudio.dbase.processRemove, 
              "#"+sItemType+"_description");      

          }
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
        var oItemDesc = crpstudio.list.getItemDescr(sFileType);
        var sItemName = "";   // Project, corpus or database name
        var sItemPart = "";   // Part of project, corpus
        var oListItem = null;
        // Action depends on the type
        switch(sFileType) {
          case "dbase":       // download database in Xquery
            // Find out which one is currently selected
            sItemName = loc_currentDbase;
            break;
        }
        if (sItemName && sItemName !== "") {
          // Pass on an information-object to /crpstudio and to /crpp
          var oArgs = { "itemname": sItemName, "itempart": sItemPart,
            "userid": crpstudio.currentUser, "itemtype": sFileType };
          var params = JSON.stringify(oArgs);
          crpstudio.main.getCrpStudioData("download", params, crpstudio.dbase.processDownload, "#dbase_description");      
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
