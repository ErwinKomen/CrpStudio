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
        loc_uploadSize = 512 * 1024, // Size of one chunk for uploading
        sDbUplStatus = "",      // Database upload status request
        loc_view = "db",        // The only view we have is "dbase" view
        loc_numResults = 0,     // Number of results
        loc_numPerPage = 0,     // Number of results selected per page
        loc_numPages = 0,
        loc_currentPage = 0,
        loc_currentDbase = "",  // Name of current database
        loc_recentDbase = "",   // Name of recent dbase
        loc_uploadText = "",    // Text of file that is being uploaded
        loc_oResults = null,    // Object containing the last details for a database list-view
        loc_uploadInfo = null,  // DbUpload information
        loc_xhrUpload = null,   // Upload XmlhttpRequest object
        loc_uploadArgs = null,  // Upload arguments
        loc_uploadStop = false, // Signal stoppinf of uploading
        loc_ctlCurrent= null;   // Current control
    
    // Methods that are local to [crpstudio.dbase]
    var private_methods = {
      /**
       * uploadMeter -- set the indicated upload-meter to the indicated percentage
       * @param {type} iMeter
       * @param {type} fPtc
       * @returns {undefined}
       */
      uploadMeter : function(iMeter, fPtc) {
        // find the result_status element
        var divUplProgress = $("#dbase_expl_upload").get(0);
        // Find the 'meter' within
        var arMeter = divUplProgress.getElementsByClassName("meter");
        // Adapt the meter
        if (arMeter && arMeter.length > iMeter) {
          var divStarted = arMeter[iMeter];
          // Set the correct styles for these elements
          divStarted.setAttribute("style", "width: "+fPtc+"%");
        }        
      },
      /**
       * doPagination
       *    Process pagination
       * 
       * @param {string} iView  - Denotator of this view
       * @param {int} iNumber   - Number of this page
       * @returns {undefined}
       */
      doPagination : function(iView, iNumber) {
        // In all cases: calculate page numbers
        var iPages = Math.floor(iNumber / loc_numPerPage);
        // Make sure we can at least show ONE page
        if (iPages <=0) iPages = 1;
        // Check if we've got the last match
        if (iPages * loc_numPerPage < iNumber) iPages++;
        loc_numPages = iPages;   // total number of pages that can be shown
        loc_currentPage = 1;     // currently selected page
        // Set the max pages
        $("#result_numpages_"+iView).html(iPages);
        $("#result_numpages_"+iView).prev().attr("max",iPages);
        $("#result_numpages_"+iView).prev().val(1);
      },
      /**
       * getSyntax
       *    Given a syntax object, construct an HTML syntax representation
       *    
       * @param {type} oSyntax
       * @returns {String}
       */
      getSyntax : function(oSyntax) {
        var html = [];
        // Get the main part
        html.push("<font face='Courier New' size='2'>");
        html.push("[<font color=#800000 size=1>" + oSyntax.main + "</font> ");
        var oChildren = oSyntax.children;
        for (var i=0;i<oChildren.length;i++) {
          var sTxt = oChildren[i].txt;
          sTxt = sTxt.replace(/\</g, '&lt;');
          sTxt = sTxt.replace(/\>/g, '&gt;');
          html.push("[<font color=#800000 size=1>" + oChildren[i].pos + "</font> ");
          html.push(sTxt + "]");
        }
        html.push("]</font>");
        return html.join("\n");
      }
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
          $("#dbase_main .content").removeClass("active");
          $("#"+target).addClass("active");
          $("#subnav dd").removeClass("active");
          $("#"+target+"_link").addClass("active");
          // Reset the status message in the target
          $("#"+target+"_status").text("");
          // Make sure the global variable is set correctly
          loc_tab = target;
          // Initially hide *all* 'content' children of the dbase_main <div>
          // $("#dbase_main .content").addClass("hidden");
          // $("#dbase_explore").hide(); $("#dbase_editor").hide();
          
          // Capture the current selecting state
          var bSelState = bIsSelecting;

          // Action depends on target 
          switch (target) {
            case "dbase_explore":
              // Selecting...
              bIsSelecting = true;
              
              // Fill the list of editor information
              // TODO: repair this generalized handling...
              // crpstudio.list.showlist("dbase", currentDbs);
              
              // Show the editor selector
              $("#dbase_explore").show();
              // Show the contents of the explorer
              $("#dbase_general_explore").removeClass("hidden");
              $("#dbase_general_editor").addClass("hidden");
              
              // Call setCrpItem() which should check if a 'default' item needs to be shown
              // TODO: repair generalized list handling
              // crpstudio.list.setCrpItem(null, "dbase", -1);    
              
              // NOTE: do *NOT* add change events
              
              break;
            case "dbase_editor":
              // Selecting...
              bIsSelecting = true;
              // Fill the list of editor information
              crpstudio.list.showlist("dbase", currentDbs);
              
              // Show the editor tab-page
              $("#dbase_editor").show();
              // Show the contents of the editor
              $("#dbase_general_explore").addClass("hidden");
              $("#dbase_general_editor").removeClass("hidden");
              // Call setCrpItem() which should check if a 'default' item needs to be shown
              crpstudio.list.setCrpItem(null, "dbase", -1);          

              // Add event handlers on all INPUT elements under "def_general" to get changes sent to the CRP on the server
              crpstudio.dbase.addChangeEvents("dbase_general");

              break;
            case "dbase_listview":
              // Show the listview tab-page
              $("#dbase_listview").show();
              crpstudio.dbase.listView(target, 1, -1);
              break;
            case "dbase_details":
              // Show the details tab-page
              $("#dbase_details").show();
              $(document).foundation('slider', 'reflow');
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
        // SHow what is happening in [dbmain.vm]
        $("#dbase_expl_description").addClass("hidden");
        $("#dbase_expl_status").addClass("hidden");
        // $("#dbase_expl_action").addClass("hidden");
        $("#dbase_expl").removeClass("hidden");
        $("#dbase_expl_summary").html("Loading: " + sDbName + "<br><i>(This may take some time, especially if a new index is created)</i>");
        $("#dbasenav dl dd").removeClass("active");
        $("#dbasenav dl dd").first().addClass("active");
        crpstudio.dbase.switchDbaseView(target, 'summary');
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
        var arHtml = [];

        if (response !== null) {
          // Remove waiting
          $("#dbase_description").html("");
          // The response is a standard object containing "status" (code) and "content" (code, message)
          var oStatus = response.status;
          var sStatusCode = oStatus.code;
          var oContent = response.content;
          switch (sStatusCode) {
            case "completed":
              // Get the information passed on about this database
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
              
              // Also treate the form [dbmain.vm]
              // (1) What type of info are we targetting?
              var sLoadType = oContent.type;
              if (sLoadType === undefined) sLoadType = "info";
              switch(sLoadType) {
                case "info":    // Only display general part
                  arHtml.push("<table>");
                  arHtml.push("<tr><td>Corpus project</td><td colspan=2>"+sNamePrj+"</td></tr>");
                  arHtml.push("<tr><td>Database name</td><td colspan=2>" + sNameDb + "</td></tr>");
                  arHtml.push("<tr><td>Database created</td><td colspan=2>"+sDateCreated+"</td></tr>");
                  arHtml.push("<tr><td>Corpus used</td><td colspan=2>"+sCorpus+"</td></tr>");
                  arHtml.push("<tr><td>Notes</td><td colspan=2>"+sComments+"</td></tr>");
                  if (oContent.total !== undefined) {
                    arHtml.push("<tr><td>Result entries</td><td colspan=2>"+oContent.total+"</td></tr>");
                  }
                  var arFeats = oContent.features;
                  for (var i=0;i<arFeats.length;i++) {
                    arHtml.push("<tr><td>Feature</td><td>"+(i+1)+"</td><td>"+arFeats[i]+"</td></tr>");
                  }
                  arHtml.push("</table>");
                  $("#dbase_expl_summary").html(arHtml.join("\n"));
                  // Make sure the TOTAL is kept
                  loc_numResults = oContent.total;
                  // Initialize the page-size
                  if (loc_numPerPage === 0) {
                    // Retrieve the number from the value of the control
                    loc_numPerPage = parseInt($("#page_size").val());
                  }
                  // Initialize pagination: tell we want to go to page #1
                  private_methods.doPagination('db', loc_numResults);
                  break;
                case "list":    // Listview
                  // Keep the results within [crpstudio.dbase]
                  loc_oResults = oContent;
                  // Make sure the TOTAL is kept
                  if (oContent.total !== undefined) loc_numResults = oContent.total;
                  // Show the results on the correct page
                  crpstudio.dbase.listViewShow("dbaseview_list", oContent);
                  break;
                case "detail":  // Details view
                  // Keep the results within [crpstudio.dbase]
                  loc_oResults = oContent;
                  // Make sure the TOTAL is kept
                  if (oContent.total !== undefined) loc_numResults = oContent.total;
                  // Show the results on the correct page
                  crpstudio.dbase.listViewShow("dbaseview_details", oContent);
                  break;
              }
              
              // Now show the listview button
              // $("#dbase_expl_action").removeClass("hidden");

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
              
              // Create message 
              var sSummaryMsg = "Error:<br>";
              if (sErrorCode.toLowerCase()!=="error") {
                sSummaryMsg += sErrorCode + "<br>";
              }
              sSummaryMsg += "<b>" + sErrorMsg + "</b>";
              $("#dbase_expl_summary").html(sSummaryMsg);
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
       * showListItem -- show or hide an item from the database list
       * 
       * @param {type}  element
       * @param {int}   idx     - index within arResults
       * @param {type}  update
       * @returns {undefined}
       */
      showListItem : function(element, idx, update) {
        // Check whether we need to show or hide
        if ($(element).hasClass("hidden") || (update)) {
          // Tell user to please wait until information is ready
          var sExmpId = element.substring(1) + "_ex";
          // Remove waiting notification in project description
          $("#"+sExmpId).html("<img class=\"icon spinner\" src=\"./static/img/spinner.gif\"> Please wait while the text is fetched...");
          // Make sure the <div> is now being shown
          $(element).removeClass("hidden");
          // Now try to fetch the text
          // (1) Get the entry from [arResults]
          var oContent = loc_oResults;
          var arResults = oContent.results;
          var oResult = arResults[idx];
          var iQC = 1;
          if (oContent.qc !== undefined ) iQC = oContent.qc;
          // (2) Determine the parameters
          var oQuery = { "qc": iQC, "sub": "", "view": 1,
              "userid": crpstudio.currentUser, "prj": oContent.nameprj, 
              "lng": oContent.lng, "dir": oContent.dir, 
              "type": "context_syntax", "start": -1, 
              "locs": oResult.Locs, "locw": oResult.Locw,
              "count": 1, "files": [ oResult.File ]};

          var params = JSON.stringify(oQuery);
          crpstudio.main.getCrpStudioData("update", 
                             params,
                             crpstudio.dbase.processOneHit, sExmpId);   
        } else {
          // Hide the details
          $(element).addClass("hidden");
        }
        
      },
      
      /**
       * processOneHit
       *    Process the information requested with an /update request
       *    We are expecting information to show the line and the syntax of the hit line
       *    
       * @param {type} response   JSON object returned from /crpstudio/update
       * @param {type} target
       * @returns {undefined}
       */
      processOneHit : function(response, target) {
        var iFirstN = -1;
        if (response !== null) {
          // The response is a standard object containing "status" (code) and "content" (code, message)
          var oStatus = response.status;
          var sStatusCode = oStatus.code;
          var oContent = response.content;
          // Remove waiting notification in project description
          $("#"+target).html("Receiving response: "+sStatusCode);
          switch (sStatusCode) {
            case "completed":
              // The result is in [oContent] as an array of 'hit' values
              var html = [];
              for (var i=0;i<oContent.length;i++) {
                // One result is one div
                var sRowType = (i % 2 === 0) ? " row-even" : "row-odd";            
                html.push("<div class=\"one-example " + sRowType + "\">"+
                          "<div class=\"one-example-context\">");
                // Access this object
                var oRow = oContent[i];
                // Possibly get the first "n" value --> this helps determine pagination resetting
                if (iFirstN<0) iFirstN = oRow.n;
                // Add the number of the example            
                html.push("<b>"+oRow.n+"</b> ");
                /*
                // Possibly add filename
                if (iView === 1) {
                  // Need to add the name of the file
                  html.push("[<span class=\"one-example-filename\">"+oRow.file+"</span>]");
                } */
                // Add preceding context
                html.push(oRow.preC);
                html.push("<span class=\"one-example-hit\">"+oRow.hitC+" </span>");
                // Close "one-example-context"
                html.push(oRow.folC+"</div>");
                // Get the syntax result
                var sSyntax = private_methods.getSyntax(oRow.hitS);
                html.push("<div class=\"one-example-syntax\">"+ sSyntax +"</div>");
                // Is there any 'msg' result?
                if (oRow.msg) {
                  // Adapt the message
                  var sMsg = oRow.msg;
                  sMsg = sMsg.replace(/\</g, '&lt;');
                  sMsg = sMsg.replace(/\>/g, '&gt;');
                  // Add it to the output
                  html.push("<div class=\"one-example-msg\">"+ sMsg +"</div>");
                }
                // Finish the "one-example" <div>
                html.push("</div>");
              }
              // Join the results to one string
              var sJoinedExample = html.join("\n");
              // put the results in the target
              $("#"+target).html(sJoinedExample);
              // Set the amount of hits
              // loc_numResults = oContent.length;
              // Show the correct <li> items under "result_pagebuttons_"
              /*
              if (iFirstN<0 || iFirstN===1) {
                private_methods.doPagination(iView, loc_numResults);
              } */
              break;
            case "error":
              var sErrorCode = (oContent && oContent.code) ? oContent.code : "(no code)";
              var sErrorMsg = (oContent && oContent.message) ? oContent.message : "(no description)";
              $("#"+target).html("Error: " + sErrorMsg);
              break;
            default:
              $("#"+target).html("Error: no reply received from the /crpstudio server");
              break;
          }
        } else {
          $("#"+target).html("ERROR - Failed to process /update on crpstudio server.");
        }    
      },          
      
      /**
       * switchDbaseView --
       *    Switch between three Database views: summary, list or detail
       *    
       * @param {type} target
       * @param {type} type
       * @param {type} iStart
       * @param {type} iCount
       * @returns {undefined}
       */
      switchDbaseView : function(target, type, iStart, iCount) {
        if (type === undefined) type = "summary";
        // Initially make all inactive
        $("#dbase_panel_summary").removeClass("active");
        $("#dbase_panel_list").removeClass("active");
        $("#dbase_panel_details").removeClass("active");
        // De-activate all switchboards
        $("#dbase_dashboard .dashboard").addClass("hidden");
        $("#dbase_dashb_"+type).removeClass("hidden");
        switch(type) {
          case "summary":   // Summary view
            // Set it active
            $("#dbase_panel_summary").addClass("active");
            break;
          case "list":      // List view
            // Set it active
            $("#dbase_panel_list").addClass("active");
            // Get the currently selected database
            var sDbName = loc_currentDbase;
            // INterpret the parameters
            var start = 1; var count = -1;
            if (iStart !== undefined) start = iStart;
            if (iCount !== undefined) count = iCount;
            // Pass on the listview request to the /crpstudio server
            var oArgs = { "dbase": sDbName,
              "type": "list", "start": start, "count": count, "userid": crpstudio.currentUser };
            var params = JSON.stringify(oArgs);

            crpstudio.main.getCrpStudioData("loaddb", params, crpstudio.dbase.processLoad, "#dbase_description");            
            break;            
          case "details":    // Details view
            // Set it active
            $("#dbase_panel_details").addClass("active");
            break;
        }
      },
      
      /**
       * listView -- Request the information for a listview
       * 
       * @param {element} target
       * @param {integer} iStart
       * @param {integer} iCount
       * @param {string}  sSort   - Name of column to be sorted
       * @returns {undefined}
       */
      listView : function(target, iStart, iCount, sSort) {
        // Get the currently selected database
        var sDbName = loc_currentDbase;
        // INterpret the parameters
        var start = 1; var count = -1;
        if (iStart !== undefined) start = iStart;
        if (iCount !== undefined) count = iCount;
        // Pass on the listview request to the /crpstudio server
        var oArgs = { "dbase": sDbName, "type": "list", 
          "start": start, "count": count, 
          "userid": crpstudio.currentUser };
        // Check if sort should be added
        if (sSort !== undefined) {
          // Add it
          oArgs["sort"] = sSort;
        }
        // Prepare for sending
        var params = JSON.stringify(oArgs);

        crpstudio.main.getCrpStudioData("loaddb", params, crpstudio.dbase.processLoad, "#dbase_description");
      },
      
      /**
       * getListViewColumnOptions - Create a <select> string with options taken
       *    from arResFields and arFeatures.
       * @param {type} arResFields
       * @param {type} arFeatures
       * @returns {undefined}
       */
      getListViewColumnOptions : function(arResFields, arFeatures) {
        var arHtml = [];
        // First process the non-features
        for (var sKeyName in arResFields) {
          if (!sKeyName.startsWith("ft_"))
            arHtml.push("<option value=\""+sKeyName+"\">"+sKeyName+"</option>");
        }
        // Now process the features
        /*
        for (var sKeyName in arResFields) {
          if (sKeyName.startsWith("ft_")) {
            var sDisplay = sKeyName.substring(3);
            arHtml.push("<option value=\""+sKeyName+"\">"+sDisplay+"</option>");
          }
        }*/
        for (var i=0;i<arFeatures.length;i++) {
          // CHange feature name
          var sFeatName = arFeatures[i];
          if (sFeatName.startsWith("ft_")) {sFeatName = sFeatName.substring(3);}
          arHtml.push("<option value=\"ft:"+i+":"+sFeatName+"\">f: "+sFeatName+"</option>");
        }
        return arHtml.join("\n");
      },
      
      /**
       * getListViewColumnSort 
       *    Provide the Descending/Ascending sort order buttons
       *    
       * @param {string} sColName
       * @param {bool}   bIncludeDel
       * @param {string} sType        - EMpty, 'asc' or 'desc'
       * @returns {String}
       */
      getListViewColumnSort : function(sColName, bIncludeDel, sType) {
        var arHtml = [];
        sColName = sColName.replace(/^ft\./g, "");
        if (sType === undefined) sType = "";
        arHtml.push("<a href=\"#\" onclick=\"crpstudio.dbase.listview_sort_column('"+sColName+"','asc')\"><font color=\""+
                ((sType==='asc') ? "red" : "blue")+"\">▲</font></a>");
        arHtml.push("<a href=\"#\" onclick=\"crpstudio.dbase.listview_sort_column('"+sColName+"','desc')\"><font color=\""+
                ((sType==='desc') ? "red" : "blue")+"\">▼</font></a>");
        if (bIncludeDel) {
          arHtml.push("<a href=\"#\" onclick=\"crpstudio.dbase.listview_sort_column('"+sColName+"','del')\">x</a>");
        }
        return arHtml.join("\n");
      },
      
      /**
       * listViewShow -- create a list of results as defined in [oContent] and show it on [target]
       * 
       * @param {type} target
       * @param {type} oContent
       * @returns {undefined}
       */
      listViewShow : function(target, oContent) {
        var iCount = oContent.count; if (iCount === undefined) iCount = 0;
        var arResults = oContent.results;
        var arColumns = oContent.columns;
        var arHtml = [];
        var sOptions = crpstudio.dbase.getListViewColumnOptions(arResults[0], oContent.features);
        // Set the initial 
        // Produce header for table
        arHtml.push("<table><thead><tr>");
        for (var i=0;i<arColumns.length;i++) {
          arHtml.push("<th id=\"db_list_column_"+(i+1)+"\">");
          // The first column must always be [ResId]
          if (i===0) {
            arHtml.push("ResId</th>");
          } else {
            arHtml.push("<select class=\"show-select meta-small\" ");
            arHtml.push("onchange=\"crpstudio.dbase.set_list_column(");
            arHtml.push( (i+1)+", $(this).val()");
            arHtml.push(")\">"+sOptions+"</select></th>");
          }
        }
        // Add a row for sorting
        arHtml.push("<tr class=\"db_list\">");
        for (var i=0;i<arColumns.length;i++) {
          var sSortThis = "";
          // Check out the situation
          if (oContent.sorttype !== undefined && oContent.sorttype !== "" && oContent.sortcolumn === arColumns[i]) {
            sSortThis = crpstudio.dbase.getListViewColumnSort(arColumns[i], true, oContent.sorttype);
          } else {
            sSortThis = crpstudio.dbase.getListViewColumnSort(arColumns[i], false);
          }
          arHtml.push("<th id=\"db_list_sort_"+(i+1)+"\">"+sSortThis+"</th>");
        }
        arHtml.push("</tr></thead><tbody>");
        // Process each individual result
        for (var i=0;i<iCount;i++) {
          // Get this result
          var oResult = arResults[i];
          // Create an id for this result
          var sId = "dbase_list_"+oResult.ResId;
          // Add the results from this row
          arHtml.push("<tr class='concordance' >");
          for (var j=0;j<arColumns.length;j++) {
            var sValue = "";
            if (arColumns[j] !== "") {
              var sColName = arColumns[j];
              if (sColName.startsWith("ft:")) {
                // Get the number of the features column
                var arCol = sColName.split(":");
                sValue = oResult.Features[arCol[1]]["ft_"+arCol[2]];
              } else if (j===0) {
                // The first item is the ResId, and it should receive a link
                sValue = "<a href=\"#\" onclick=\"crpstudio.dbase.detailview("+oResult.ResId+", "+i+")\">"+oResult[sColName]+"</a>";
              } else {
                sValue = oResult[sColName];
              }
            }
            arHtml.push("<td>"+sValue+"</td>");
          }
          arHtml.push("</tr>");
          
          // Add the features in a hidden row??
          arHtml.push("<tr id="+sId+" class='citationrow hidden'><td colspan='5'>");
          // Insert an overruling div with a traceable ID
          arHtml.push("<div id="+sId+"_s class=\"collapse inline-concordance\">");
          // Insert a div with a 'please wait' message
          arHtml.push("<div id="+sId+"_ex><i>(Please wait while the text is being fetched)</i></div>");
          // Insert a table with information
          arHtml.push("<table><tr><td>Field</td><td>Value</td></tr>");
          // Create table with key/value for features
          for (var sKey in oResult) {
            if (sKey !== "Features") {
              arHtml.push("<tr><td>"+sKey+"</td><td>"+oResult[sKey]+"</td></tr>");
            }
          }
          // Now treat the features separately
          var arFeats = oResult.Features;
          for (var j=0;j<arFeats.length;j++) {
            var sFeatName = oContent.features[j];
            arHtml.push("<tr><td>"+sFeatName+"</td><td>"+arFeats[j][sFeatName]+"</td></tr>");
          }
          // Finish this cell
          arHtml.push("</table></td></tr></div>");
        }
        // Finish the table
        arHtml.push("</tbody></table>");
        // Add table to the list
        $("#" + target).html(arHtml.join("\n"));
        // Select the values for the listview columns
        for (var i=0;i<arColumns.length;i++) {
          var sColumnName = "db_list_column_" + (i+1);
          $("#"+sColumnName+" select").val(arColumns[i]);
        }
        
        // Send the new constellation to /crpstudio for keeps
        var oDbSet = {"columns": arColumns};
        crpstudio.dbase.store_list_settings(oDbSet);
      },
      
      /**
       * detailview
       *    Go to detail view and show the information on the indicated result
       * 
       * @param {int} iResId
       * @param {int} iRow
       * @returns {undefined}
       */
      detailview : function(iResId, iRow) {
        // Make sure we go to the detail view page
        if (loc_tab !== 'dbase_details') crpstudio.dbase.switchTab('dbase_details');
        // Get the results
        var oContent = loc_oResults;
        var arResults = oContent.results;
        var arColumns = oContent.columns;
        // Fetch the correct result
        var oResult = arResults[iRow];
        // Create table with key/value for features
        var arHtml = [];
        arHtml.push("<table>");
        arHtml.push("<tr><td>Text id:</td><td>"+oResult["TextId"]+"</td></tr>");
        arHtml.push("<tr><td>Sentence id:</td><td>"+oResult["Locs"]+"</td></tr>");
        arHtml.push("<tr><td>Constituent id:</td><td>"+oResult["Locw"]+"</td></tr>");
        arHtml.push("<tr><td>Category:</td><td>"+oResult["Cat"]+"</td></tr>");
        arHtml.push("</table>");
        $("#dbdetails_rdonly").html(arHtml.join("\n"));
        $("#dbdetails_resid").text(iResId);
        
        // Collect the features
        arHtml = [];
        var arFeats = oResult.Features;
        for (var j=0;j<arFeats.length;j++) {
          var sFeatName = oContent.features[j];
          var sFeatShort = sFeatName;
          if (sFeatShort.substring(0,3) === "ft_") sFeatShort = sFeatShort.substring(3);
          arHtml.push("<div class='row'><div class='large-2 medium-3 small-4 columns'>");
          arHtml.push("<label class='left inline' for='right-label'>"+sFeatShort+"</label></div>");
          arHtml.push("<div class='large-14 medium-13 small-12 columns'>");
          arHtml.push("<textarea id='dbdetail_"+sFeatName+"' class='left' spellcheck='false' rows='1'>");
          arHtml.push("</textarea></div></div>");
        }
        $("#dbdetails_feats").html(arHtml.join("\n"));
        // Add the feature values
        for (var j=0;j<arFeats.length;j++) {
          var sFeatName = oContent.features[j];
          var sFtId = "dbdetail_" + sFeatName;
          $("#"+sFtId).val(arFeats[j][sFeatName]);
        }
        // Add the range slider
        arHtml = [];
        arHtml.push("<!-- (3) Center-aligned page-chooser and \"GO\" button -->");
        arHtml.push("<div class=\"small-10 medium-11 columns\">");
        arHtml.push("  <div id=\"dbdetails_range\" class=\"range-slider\" data-slider data-options=\"start:"+
                arResults[0].ResId+
                "; end:"+arResults[arResults.length-1].ResId+
                "; initial:"+iResId+
                "; display_selector: #dbdetails_resid;\">");
        arHtml.push("    <span class=\"range-slider-handle\" role=\"slider\" tabindex=\"0\"></span>");
        arHtml.push("    <span class=\"range-slider-active-segment\"></span>");
        arHtml.push("  </div>");
        arHtml.push("</div>");
        arHtml.push("<div class=\"small-2 medium-1 left columns\">");
        arHtml.push("  <input type=\"number\" id=\"dbdetails_resid\" value=\""+iResId+"\" />");
        arHtml.push("</div>");
        $("#dbdetails_select").html(arHtml.join("\n"));
        $(document).foundation('slider', 'reflow');
        
        // Reset the status
        $("#dbdetails_status").addClass("hidden");
      },
      
     /**
       * goToPage
       *    Go to the page that has been selected
       * 
       * @param {type} item
       * @returns {undefined}
       */
      goToPage : function(item) {
        // Find out which page has been selected
        var page = $(item).parent().find(".page-select").val();
        // Get the number per page
        var number = loc_numPerPage;
        // Deal with this just in case
        if (number < 0) number = loc_numResults;
        // Calculate which item number needs to be presented first
        var first = ((page-1) * number) + 1;
        // Provide the user with a path where he can download the file from
        $("#results_export_"+loc_view).addClass("hidden");
        // Make a request for this number
        crpstudio.dbase.update(loc_view, { first : first, number : number } );
      },
      
      /* ---------------------------------------------------------------------------
       * Name: update
       * Goal: Change result-view:
       *        db = list view for database
       * History:
       * 30/jun/2015  ERK Created
       * 23/jul/2015  ERK Added [oPageChoice]
       */
      update : function(iView, oPageChoice) {
        // Make sure the view variable is filled in
        loc_view = iView;  

        // Any pagination information?
        if (oPageChoice && oPageChoice.number && oPageChoice.number !== loc_numPerPage) {
          // Set the amount of results per page
          loc_numPerPage = oPageChoice.number;
          // Adapt the pagination
          private_methods.doPagination(iView,loc_numResults);
        }
        // Double check
        if (loc_numPerPage === 0) {
          // Retrieve the number from the value of the control
          loc_numPerPage = $("#page_size").val();
        }
        // If and how pagination is shown depends on the view
        switch(iView) {
          case 'db':
            // Show pagination
            $("#result_pagination_"+iView).removeClass("hidden");
            // Determine the total number of results
            var iResultCount = 0;
            if (loc_oResults.total === undefined) {
              iResultCount = loc_numResults;
            } else {
              iResultCount = loc_oResults.total;
              loc_numResults = iResultCount;
            }
            // Determine start and finish
            var iStart = 1;
            var iCount = iResultCount;
            // Possibly adapt start and count
            if (oPageChoice) {
              if (oPageChoice.first) iStart = oPageChoice.first;
              if (oPageChoice.number) iCount = oPageChoice.number;
            }
            // Start showing hits according to the current choices
            var oArgs = { "dbase": loc_currentDbase, "type": "list_adapt", 
              "start": iStart, "count": iCount, 
              "userid": crpstudio.currentUser };
            // Prepare for sending
            var params = JSON.stringify(oArgs);
            // Pass on to /crpstudio
            crpstudio.main.getCrpStudioData("loaddb", params, crpstudio.dbase.processLoad, "#dbase_description");
            // Give information about what is being shown
            var iRequesting = parseInt( (loc_numPerPage<0) ? iResultCount : loc_numPerPage);
            var sInfo = "Showing #"+iStart+"-"+(iStart+iRequesting-1)+" ("+iResultCount+")";
            $("#results_info_"+iView).html(sInfo);
            break;
          default:
            // Hide pagination
            $("#result_pagination_"+iView).addClass("hidden");
            break;
        }
      },

      /**
       * store_list_settings
       *    Store the listview settings from [oSettings] in /crpstudio
       * 
       * @param {object} oSettings
       * @returns {void}
       */
      store_list_settings : function(oSettings) {
        // Get the currently selected database
        var sDbName = loc_currentDbase;
        // Pass on the listview request to the /crpstudio server
        var oArgs = { "dbase": sDbName, "type": "list_settings", 
          "userid": crpstudio.currentUser };
        
        // Add elements, depending on what we receive
        if (oSettings.hasOwnProperty('columns')) oArgs.columns = oSettings.columns;
        if (oSettings.hasOwnProperty('start')) oArgs.start = oSettings.start;
        if (oSettings.hasOwnProperty('count')) oArgs.count = oSettings.count;
        if (oSettings.hasOwnProperty('sort')) oArgs.sort = oSettings.sort;
        
        // NOTE: [sort] can be
        //   ascending:        column name
        //   descending: '-' + column name
        //   default:    (empty)

        // Send to /crpstudio: we do NOT expect to be called back!!
        var params = JSON.stringify(oArgs);        
        crpstudio.main.getCrpStudioData("loaddb", params, crpstudio.dbase.processLoad, "#dbase_description");            
        
      },
      
      /**
       * set_list_column
       *    Fill column number [iColNum] with values from [sColName]
       *    
       * @param {type} iColNum
       * @param {type} sColName
       * @returns {undefined}
       */
      set_list_column : function(iColNum, sColName) {
        // Get access to the local copy of the listview contents
        var oContent = loc_oResults;
        // Take the columns from there
        var arColumns = oContent.columns;
        // Adapt the correct column
        arColumns[iColNum-1] = sColName;
        // Put it all back
        oContent.columns = arColumns;
        loc_oResults = oContent;
        // Call the listview show function
        crpstudio.dbase.listViewShow("dbaseview_list", oContent);
      },
      
      /**
       * listview_sort_column
       *    Sort the column with the indicated type: ascending, descending, delete
       * 
       * @param {string} sColName   - Name of the column (for feature: [ft:16:TypeResAdvMain]
       * @param {string} sSortType  - Either 'asc' or 'desc'
       * @returns {undefined}
       */
      listview_sort_column : function(sColName, sSortType) {
        // Prepare a request to re-create the listview results in the indicated way
        var target = this;
        var sSort = sColName;
        // Check if the column name is a feature
        if (sColName.substring(0,3) === "ft:") {
          var arCol = sColName.split(":");
          sSort = "ft_" + arCol[2];        }
        
        // Evaluate the sort-type
        switch(sSortType) {
          case "desc":
            // Indicate other order
            sSort = "-" + sSort;
            break;
          case "del":
            // Indicate removal is required
            sSort = "x_" + sSort;
            break;
          case "asc":
            // No action is needed here
            break;
        }
        // Send the new constellation to /crpstudio for keeps
        // var oDbSet = {"sort": sSort};
        // crpstudio.dbase.store_list_settings(oDbSet);
        crpstudio.dbase.listView(target, 1, -1, sSort);
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
        // Make sure the correct element is active
        crpstudio.list.setSelected(el, sItemType);
        // Initialise itemmain
        var sItemMain = "";
        // Get the name of the file
        var oFile = el.files[0];
        // Determine in how many parts we need to slice it
        var iStep = loc_uploadSize;  // Size is defined above
        var iSize = oFile.size;  // Size of the file
        var iNumChunks = Math.max(Math.ceil(iSize / iStep), 1);
        // Put this information in a local object
        loc_uploadInfo = {"file": oFile, "step": iStep, "size": iSize, 
          "total": iNumChunks, "itemtype": sItemType};
        // Keep track of progress
        $("#dbase_expl_upload").removeClass("hidden");
        $("#dbase_expl_description").addClass("hidden");
        // $("#dbase_expl_action").addClass("hidden");
        $("#dbase_expl").addClass("hidden");
        $("#dbase_expl_upload_status").html("Uploading result dbase is starting up...");
        $("#dbase_expl_upload_status").removeClass("hidden");
        // Adapt the meters
        private_methods.uploadMeter(0,0);
        private_methods.uploadMeter(1,0);
        // Calculate the parameters and put them into a string
        var oArgs = { "file": oFile.name, "itemtype": sItemType, "itemmain": sItemMain,
          "userid": crpstudio.currentUser, "chunk": 0, "total": iNumChunks, "action": "init"};
        // Store the database upload parameters
        loc_uploadArgs = oArgs;
        loc_uploadStop = false;
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
              var iSize= loc_uploadInfo.size;
              var iNumChunks = loc_uploadInfo.total;
              var sItemType = loc_uploadInfo.itemtype;

              // Make sure download info is hidden
              $("#"+sItemType+"_download").addClass("hidden");
              // Initialise itemmain
              var sItemMain = "";
              // Preparations for all the sending...
              var sUrl = crpstudio.config.baseUrl + "dbupload";
              // Calculate the parameters and put them into a string
              var oArgs = loc_uploadArgs;
              var params = "";
              // Now start periodically checking for the status
              oArgs.action = "status";
              oArgs.chunk = 0;
              params = JSON.stringify(oArgs);
              // Set the parameters for this class
              sDbUplStatus = params;
              setTimeout(
                function () {
                  crpstudio.main.getCrpStudioData("dbupload", sDbUplStatus, crpstudio.dbase.uploadStatus, target);
                }, interval);
              // Keep track of progress
              $("#"+sItemType+"_expl_upload").removeClass("hidden");
              $("#"+sItemType+"_expl_upload_status").removeClass("hidden");
              // Tell user we are starting
              $("#dbase_expl_upload_status").html("Sending the first parts...");
              // Set the action to 'send'
              oArgs.action = "send";
              // Prepare sending the first chunk
              oArgs.chunk = 1;
              oArgs.total = iNumChunks;
              params = JSON.stringify(oArgs);
              var fChunk = oFile.slice(0, iStep);
              // Add information to our local variable
              loc_uploadInfo.start = 0;
              loc_uploadInfo.end = iStep;
              loc_uploadInfo.chunks = 1;
              loc_uploadInfo.file = oFile;
              loc_uploadInfo.url = sUrl;
              // Upload this chunk
              crpstudio.dbase.uploadSlice(params, sUrl, fChunk);
              
              // Once /crpstudio/dbupload, action='send' is finished, 
              //   the function crpstudio.dbase.uploadComplete() will be called
              // That function should initiate a new file-slice-send action
              
              /*
              // Loop through the file-slices
              for (var i=0;i<iNumChunks;i++) {
                // Check if action has become 'stop'
                if (loc_uploadStop) break;
                // Get this chunk of the file
                var iStart = iStep * i;   // Byte where it starts
                var fChunk = oFile.slice(iStart, iStart + iStep);   // Possibly add oFile.type
                // adapt the arguments for this chunk
                oArgs.chunk = i+1;
                oArgs.total = iNumChunks;
                params = JSON.stringify(oArgs);
                // Upload this chunk
                crpstudio.dbase.uploadSlice(params, sUrl, fChunk);
              } */
              // Okay, we're ready here
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
      
      /*
       * uploadStatus
       *    Try to upload a large file in chunks
       * 
       * @param {type} el
       * @param {type} sItemType
       * @returns {undefined}
       */
      uploadStatus : function(response, target) {
        var sItemType = "dbase";
        var sItemMain = "";
        if (response !== null) {
          // Remove waiting
          $("#"+sItemType+"_description").html("");
          // The response is a standard object containing "status" (code) and "content" (code, message)
          var oStatus = response.status;
          var sStatusCode = oStatus.code;
          var oContent = response.content;
          switch (sStatusCode) {
            case "stopped":
            case "stopping":
              // Show we are ready
              $("#dbase_expl_upload_status").html("Aborted");
              // Adapt the meters
              private_methods.uploadMeter(0,0);
              private_methods.uploadMeter(1,0);
              // Hide the progress stuff
              $("#dbase_expl_upload").addClass("hidden");
              $("#dbase_expl_description").removeClass("hidden");
              $("#dbase_expl_upload_status").addClass("hidden");            
              break;
            case "working":
              // How much has been received by /crpstudio
              var iPtcStarted = 100 * oContent.read / oContent.total;
              private_methods.uploadMeter(0,iPtcStarted);
              // How much has been received by /crpp
              var iPtcReceived = 100 * oContent.sent / oContent.total;
              private_methods.uploadMeter(1,iPtcReceived);
              // Show the progress
              $("#dbase_expl_upload_status").html(
                      "Sent: "+ iPtcStarted.toFixed(0)+ "% Uploaded "+iPtcReceived.toFixed(0)+"%");
              
              // Calculate the parameters for the next status request and put them into a string
              var oArgs = loc_uploadArgs;
              oArgs.action = "status";
              oArgs.chunk = 0;
              var params = JSON.stringify(oArgs);
              // Set the parameters for this class
              sDbUplStatus = params;
              setTimeout(
                function () {
                  crpstudio.main.getCrpStudioData("dbupload", sDbUplStatus, crpstudio.dbase.uploadStatus, target);
                }, interval);
              break;
          case "completed":
            // Show we are ready
            $("#dbase_expl_upload_status").html("READY");
            // Adapt the meter
            private_methods.uploadMeter(1,100);
            // Hide the progress stuff
            $("#dbase_expl_upload").addClass("hidden");
            $("#dbase_expl_description").removeClass("hidden");
            $("#dbase_expl_upload_status").addClass("hidden");            
            // Retrieve the new db list
            
            break;          } 
        }
      },
      
      /**
       * uploadStop -- Stop the currently going-on dbase uploading process
       * 
       * @returns {undefined}
       */
      uploadStop : function() {
        // Are we already stopping?
        if (loc_uploadStop) return;
        // Signal stopping is needed
        loc_uploadStop = true;
        // Abort the HttpRequest
        loc_xhrUpload.abort();
        // Get the correct parameters
        var oArgs = loc_uploadArgs;
        oArgs.action = "stop";
        oArgs.chunk = 0;
        var params = JSON.stringify(oArgs);
        // Call /crpp with these parameters
        crpstudio.main.getCrpStudioData("dbupload", params, crpstudio.dbase.uploadStatus, "#dbase_expl_upload_status");
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
        loc_xhrUpload = new XMLHttpRequest();
        loc_xhrUpload.addEventListener("load", crpstudio.dbase.uploadComplete, false);
        loc_xhrUpload.addEventListener("error", crpstudio.dbase.uploadFailed, false);
        loc_xhrUpload.addEventListener("abort", crpstudio.dbase.uploadCanceled, false);
        loc_xhrUpload.open('POST', sUrl);
        loc_xhrUpload.send(fd);        
        
        /*
        var xhr = new XMLHttpRequest();
        // xhr.upload.addEventListener("progress", crpstudio.dbase.uploadProgress, false);
        xhr.addEventListener("load", crpstudio.dbase.uploadComplete, false);
        xhr.addEventListener("error", crpstudio.dbase.uploadFailed, false);
        xhr.addEventListener("abort", crpstudio.dbase.uploadCanceled, false);
        xhr.open('POST', sUrl);
        xhr.send(fd);        
        */
      },
      
      /*
      uploadProgress : function(evt) {
        if (evt.lengthComputable) {
          var percentComplete = Math.round(evt.loaded * 100 / evt.total);
          $("#dbase_expl_upload_status").html( percentComplete.toString() + '%');
        }
        else {
          $("#dbase_expl_upload_status").html('unable to compute');
        }      
      },*/
      
      /**
       * uploadComplete -- When one slice of the database has finished uploading
       * 
       * @param {type} evt
       * @returns {undefined}
       */
      uploadComplete : function(evt) {
        /* This event is raised when the server sends back a response */
        var response = JSON.parse(evt.target.response);
        // The response is a standard object containing "status" (code) and "content" (code, message)
        var oStatus = response.status;
        var sStatusCode = oStatus.code;
        var oContent = response.content;
        // Action depends on the status code
        switch (sStatusCode) {
          case "stopped":
            // Show we are ready
            $("#dbase_expl_upload_status").html("Aborted");
            // Adapt the meters
            private_methods.uploadMeter(0,0);
            private_methods.uploadMeter(1,0);
            // Hide the progress stuff
            $("#dbase_expl_upload").addClass("hidden");
            $("#dbase_expl_description").removeClass("hidden");
            $("#dbase_expl_upload_status").addClass("hidden");            
            break;
            /*
          case "completed":
            // Show we are ready
            $("#dbase_expl_upload_status").html("READY");
            // Adapt the meter
            private_methods.uploadMeter(1,100);
            // Hide the progress stuff
            $("#dbase_expl_upload").addClass("hidden");
            $("#dbase_expl_description").removeClass("hidden");
            $("#dbase_expl_upload_status").addClass("hidden");            
            // Retrieve the new db list
            
            break;
            */
          case "working":
              // How much has been received by /crpstudio
              var iPtcStarted = 100 * oContent.read / oContent.total;
              private_methods.uploadMeter(0,iPtcStarted);
              // How much has been received by /crpp
              var iPtcReceived = 100 * oContent.sent / oContent.total;
              private_methods.uploadMeter(1,iPtcReceived);
              // Show the progress
              $("#dbase_expl_upload_status").html(
                      "Sent: "+ iPtcStarted.toFixed(0)+ "% Uploaded "+iPtcReceived.toFixed(0)+"%");
              // Prepare next slice 
              loc_uploadInfo.start = loc_uploadInfo.start + loc_uploadInfo.step;
              loc_uploadInfo.end = loc_uploadInfo.end + loc_uploadInfo.step;
              loc_uploadInfo.chunks = loc_uploadInfo.chunks + 1;
              var oFile = loc_uploadInfo.file;
              var sUrl = loc_uploadInfo.url;
              // Start sending the next slice
              var oArgs = loc_uploadArgs;
              oArgs.action = "send";
              oArgs.chunk = loc_uploadInfo.chunks;
              var params = JSON.stringify(oArgs);
              var fChunk = oFile.slice(loc_uploadInfo.start, loc_uploadInfo.end);
              // Upload this chunk
              crpstudio.dbase.uploadSlice(params, sUrl, fChunk);
              
            break;
          case "error":
            // Show the error
            $("#dbase_expl_upload_status").html(evt.target.responseText);
            break;
        }

      },
      
      /**
       * uploadFailed -- one slice of uploading failed
       * 
       * @param {type} evt
       * @returns {undefined}
       */
      uploadFailed : function(evt) {
        $("#dbase_expl_upload_status").html("There was an error attempting to upload the file.");
      },
      
      /**
       * uploadCanceled -- one slice of uploading was canceled
       * @param {type} evt
       * @returns {undefined}
       */
      uploadCanceled : function(evt) {
        $("#dbase_expl_upload_status").html("The upload has been canceled by the user or the browser dropped the connection.");
      } ,     
      
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
        // Make sure the correct element is active
        crpstudio.list.setSelected(elDummy, sFileType);
        // Access the information object for this type
        var oItemDesc = crpstudio.list.getItemDescr(sFileType);
        var sItemName = "";   // Project, corpus or database name
        var sItemPart = "";   // Part of project, corpus
        var oListItem = null;
        // Action depends on the type
        switch(sFileType) {
          case "dbase":       // download database in Xquery
            $("#dbase_expl_description").addClass("hidden");
            // $("#dbase_expl_action").addClass("hidden");
            $("#dbase_expl").removeClass("hidden");
            $("#dbase_expl_status").removeClass("hidden");
            $("#dbase_expl_status").html("Preparing file for downloading"+
                    "<br><i>(This may take some while, depending on the size...)</i>");
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
          if (sItemType === undefined) sItemType = "dbase";
          // Remove waiting
          $("#"+sItemType+"_description").html("");
          switch (sStatusCode) {
            case "completed":
              $("#dbase_expl_status").html("READY");
              $("#dbase_expl_status").addClass("hidden");
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
              $("#dbase_expl_status").html("Error: " + sErrorMsg);
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
