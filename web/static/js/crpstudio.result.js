/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
/*globals jQuery, crpstudio, alert: false, */
/*jslint browser: true, indent: 2 */
var crpstudio = (function ($, crpstudio) {
  "use strict";
  crpstudio.result = (function ($, config){
    // Variables within the scope of crpstudio.result
    var loc_arTable = null;   // Local copy of the table
    var loc_iCurrentQc = -1;  // Currently selected QC line
    var loc_iCurrentSub = -1; // Currently selected QC sub category
    var loc_sCurrentSub = ""; // String for the currently selected sub
    var loc_view = 1;         // Default view is #1
    var loc_currentFile = ""; // currently selected file
    var loc_numPerPage = 0;       // Number of results per page
    var loc_numPages = 1;         // Number of pages to be shown
    var loc_currentPage = 1;      // Currently selected page
    var loc_numResults = 0;       // Number of results
    var loc_currentElement = null;// Currently selected element
  
    // Define private methods
    var private_methods = {
      
      /* ---------------------------------------------------------------------------
       * Name: addQCline
       * Goal: add a QC line to the result table viewer
       * History:
       * 29/jun/2015  ERK Created
       */
      addQCline : function(iQC, sQcLabel, iTotal, arSubNames, arSubCounts) {
        // Calculate which index this is
        var idxQc = iQC-1;
        // Prepare a string for this row
        //   NB: each row contains: # (number), QC-label, subcat-name, count-for-this-row
        var sSwitchClick = "onclick=\"crpstudio.result.switchToQc("+iQC+")\"";
        var qcRow = "<tr id=\"qcline_"+iQC+"\" class=\"qc-line\">"
        // var qcRow = "<tr id=\"qcline_"+iQC+"\" class=\"qc-line\">"
          +"<td>"+iQC+"</td>"
          +"<td id=\"qc_"+iQC+"\">"+sQcLabel+"</td>"
          +"<td id=\"qc_"+iQC+"\"><a "+ sSwitchClick + ">(all together)</a></td>"
          +"<td id=\"total_"+iQC+"\"><a "+ sSwitchClick + ">"+iTotal+"</a></td>"
          +"<td class=\"control\"><a href=\"#\"  onclick=\"crpstudio.project.editQC("+iQC+")\" class=\"button radius edit\">EDIT</a></td>"
          +"<td class=\"control hidden\"><a href=\"#\"  onclick=\"crpstudio.result.selectResults('results',"
          +iQC+")\" class=\"button radius edit\">DETAILS</a></td>"
          +"</tr>";
        // Add the row to the appropriate table
        $("#queries > tbody").append(qcRow);
        // Add lines for all sub categories
        for (var i=0; i<arSubNames.length;i++) {
          sSwitchClick = "onclick=\"crpstudio.result.switchToQcSub("+iQC+",'"+i+"')\"";
          // Allow switching to a sub-category of a QC
          qcRow = "<tr id=\"qcsub_"+iQC+"_"+i+"\" class=\"qc-sub-line hidden\">"
          // qcRow = "<tr id=\"qcsub_"+iQC+"_"+i+"\" class=\"qc-sub-line hidden\">"
            +"<td>"+iQC+"</td>"
            +"<td id=\"qc_"+iQC+"_"+i+"\">"+sQcLabel+"</td>"
            +"<td id=\"sub_"+iQC+"_"+i+"\"><a "+ sSwitchClick + ">"+arSubNames[i]+"</a></td>"
            +"<td id=\"total_"+iQC+"_"+i+"\"><a "+ sSwitchClick + ">"+arSubCounts[i]+"</a></td>"
            +"<td></td>"
            +"<td class=\"control hidden\"><a href=\"#\"  onclick=\"crpstudio.result.selectResults('results',"
            +iQC+","+i+")\" class=\"button radius edit\">DETAILS</a></td>"
            +"</tr>";
          // Add the row to the appropriate table
          $("#queries > tbody").append(qcRow);
        }
      },      

    /**
     * showHits
     *    Load and show the hits in the indicated <div>
     * 
     * @param {type} iView    The view (which is expected to be "1")
     * @param {type} iStart
     * @param {type} iCount
     * @param {type} iQC
     * @param {type} sSub
     * @param {type} element  Where to show the results
     * @param {type} update   Force updating
     * @returns {undefined}
     */
      showHits : function(iView, iStart, iCount, iQC, sSub, element, update) {
        // Set the current 'element'
        if (element) loc_currentElement = element;
        // Possibly set the number of results
        if (!update) {
          // Set the total number of results
          loc_numResults = iCount;
        }
        // Make sure the <div> is now being shown
        if (element) {
          $(element).parent().parent().removeClass("hidden");
          $(element).html("(working...)");
        }
        // Set "fetching" indicator
        $("#result_status_"+iView).html("<img class=\"icon spinner\" src=\"./static/img/spinner.gif\"> Fetching data...");
        // Get the data for this combination of QC/Subcat/View
        var sType = "context_syntax";
        // Set the amount we are requesting
        var iRequesting = (loc_numPerPage<0) ? loc_numResults : loc_numPerPage;
        // NOTE: make sure the "prj", "lng" and "dir" parameters are passed on
        var oQuery = { "qc": iQC, "sub": sSub, "view": iView,
          "userid": crpstudio.currentUser, "prj": crpstudio.project.getPrj(), 
          "lng": crpstudio.project.getLng(), "dir": crpstudio.project.getDir(), 
          "type": sType, "start": iStart, 
          "count": iRequesting, "files": [ ]};
        // var params = "query=" + JSON.stringify(oQuery);
        var params = JSON.stringify(oQuery);
        crpstudio.main.getCrpStudioData("update", params, crpstudio.result.processFileHits, element);   
      },
      
      /**
       * doPagination
       *    Depending on the @iView, different tasks may need to be done
       *  view=1 (per hit)
       *  
       *  view=2 (per doc)
       *    We receive the number of hits for this doc in @iNumber
       *    Todo: calculate page numbers and process them in result_numpages_2
       *          make <li> children for result_pagebuttons_2 
       * 
       * @param {type} iView
       * @param {type} iNumber
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
            
    // Define what we return publically
    return {
      /* ---------------------------------------------------------------------------
       * Name: makeOviewTable
       * Goal: Make a table with an overview of the results
       * History:
       * 29/jun/2015  ERK Created
       */
      makeOviewTable : function(arTable) {
        loc_arTable = arTable;
        // Clear the previous table
        $("#queries > tbody").html("");
        // The 'table' is an array of QC elements
        for (var i=0; i< arTable.length; i++) {
          // Get this QC element
          var oQC = arTable[i];
          // Get the QC elements
          var arSubs = oQC.subcats;     // Sub-category names/labels
          var iQC = oQC.qc;             // Number of this QC
          var sQcLabel = oQC.result;    // Label for this QC line
          var arHits = oQC.hits;        // Array with 'hit' elements
          var iTotal = oQC.total;       // Total count for this QC
          var arSubCount = oQC.counts;  // Totals per sub-category
          // Add a row for this QC item
          private_methods.addQCline(iQC, sQcLabel, iTotal, arSubs, arSubCount);
        }
        // Make sure no more than 10 lines of data are visible
        // Unfortunately: doesn't work... $("#queries").scrollTableBody({rowsToDisplay:10});
      },
      
      /**
       * showView 
       *    Make sure the indicate [iView] result-pane is 
       *    shown, while the rest is hidden   
       *     
       * 
       * @param {type} iView
       * @returns {undefined}
       */
      showView : function(iView) {
        // SHow the correct item from [contentTabs]
        $("#contentTabs li").each(function(index, value) {
          if ((index+1) === iView) {
            $(this).addClass("active");
            $(this).addClass("disabled");
          } else {
            $(this).removeClass("active");
            $(this).removeClass("disabled");
          }
        });
        // Look at all [result-pane] elements and show the correct one
        $("#results .result-pane").each(function() {
          if (parseInt($(this).find("input.current-view").val(),10) === iView) {
            // Enable this one
            $(this).addClass("active");
            $(this).removeClass("hidden");
          } else {
            // Disable this one
            $(this).removeClass("active");
            $(this).addClass("hidden");
          }
        });
        // Some initialisations are view-specific
        switch (iView) {
          case 3:
            // Make sure to clear the table
            $("#result_table_3").html("");
            // Select the default grouping
            crpstudio.result.doGrouping("standard",3);
            break;
          default:
            // No default matters
            break;
        }
      },
      
      /* ---------------------------------------------------------------------------
       * Name:  doExport
       * Goal:  Trigger the export action of the currently selected part of the results table
       * Note:  We make use of two variables:
       *        loc_iCurrentQc    - currently selected QC index (or -1 if not)
       *        loc_iCurrentSub   - currently selected sub-cat index (or -1 if not)
       * History:
       * 30/jun/2015  ERK Created
       */
      doExport : function(iView) {
        var oBack = null;   // What we will return
        var oQC = null;     // part of the table
        var idxQc = loc_iCurrentQc;
        var idxSub = loc_iCurrentSub;
        var arTable = loc_arTable;

        // The user is always allowed to export (for this version of crpstudio)
        var ask = true;
        // TODO: check if user has "export" permission if your version of crpstudio
        //       and the corpora it holds need this

        // Continue if there is export permission
        if (ask) {
          // Validate: if no QC line is selected, return the WHOLE table
          if (idxQc < 0) {
            oBack = arTable;
          } else {
            // Get the section of the table that is going to be exported
            oQC = arTable[idxQc];
            // Is a particular subcat needed?
            if (idxSub < 0) {
              // We already have what needs to be returned
              oBack = oQC;
            } else {
              // Get the QC elements
              var arSubs = oQC.subcats;     // Sub-category names/labels
              var iQC = oQC.qc;             // Number of this QC
              var sQcLabel = oQC.result;    // Label for this QC line
              var iTotal = oQC.total;       // Total count for this QC
              var arSubCount = oQC.counts;  // Totals per sub-category
              // Create an array with the correct 'hit' elements for this subcat
              var arHits = [];
              var arAll = oQC.hits;        // Array with *all* 'hit' elements (for all subcats)
              for (var i=0; i<arAll.length;i++) {
                var oThis = arAll[i];
                var oNew = {
                        "file": oThis.file, 
                        "count": oThis.count, 
                        "subcount": oThis.subs[idxSub]};
                arHits.push(oNew);
              }

              // Select the correct sub-category
              oBack = { "qc": iQC, 
                        "result": sQcLabel,
                        "total": iTotal,
                        "subcat": arSubs[idxSub],
                        "count": arSubCount[idxSub],
                        "hits": arHits};
            }      
          }

          // Pack what we have into a string
          //var params = "project="+encodeURIComponent(crpstudio.project.getPrj())
          //        + "&table="+ encodeURIComponent(JSON.stringify(oBack))
          //        + "&view=" + iView;
          // Call /crpstudio/export with the information we have gathered
          // 
          // Pass on this value to /crpstudio and to /crpp
          var oArgs = { "project": crpstudio.project.getPrj(), "table": JSON.stringify(oBack),
            "view": iView };
          var params = JSON.stringify(oArgs);

          // Method #1: use POST request
          crpstudio.main.getCrpStudioData("export", params, crpstudio.result.processExport, "#result_status_" + iView);  
        }
      },

      /**
       * processExport
       *    What to do when we return from the Java server to here
       *    
       * @param {type} response
       * @param {type} target
       * @returns {undefined}
       */
      processExport : function(response, target) {
        if (response !== null) {
          // The response should contain a file name
          var fFilePath = response.file;
          var iView = loc_view;
          if (response.view) iView = response.view;
          if (fFilePath !== null) {
            // Get the name of the file alone
            var fFileName = fFilePath.substring(fFilePath.lastIndexOf("/")+1);
            fFileName = fFileName.substring(0, fFileName.lastIndexOf("."));
            // Provide the user with a path where he can download the file from
            $("#results_export_"+iView).removeClass("hidden");
            $("#results_export_file_"+iView).html("<a href=\""+fFilePath + "\""
                  + " target='_blank'\">"+fFileName+"</a>");
          }
          // So far: no action is required
          /*
          if (response.hasOwnProperty("html") && response.html.indexOf("ERROR") > -1) {
            $("#status_"+target).html("ERROR");
            $("#result_"+target).html(response.html);
          } else {
            if (response.hasOwnProperty("html")) {
              $("#result_"+target).html(response.html);
            }
            if (response.hasOwnProperty("hits") && response.hits !== "-1") {
              $("#hits_"+target).html(response.hits);
            }
            if (response.hasOwnProperty("docs") && response.docs !== "-1") {
              $("#docs_"+target).html(response.docs);
            }

            if (response.hasOwnProperty("counting") && response.counting === "true") {
              $("#status_"+target).html("<img class=\"icon spinner\" src=\"../web/img/spinner.gif\"> COUNTING");
              update = true;
            } else {
              $("#status_"+target).html("FINISHED");
            }
          }
          */
        } else {
          $("#status_"+target).html("ERROR");
          $("#result_status_"+iView).html("ERROR - Failed to retrieve result from server.");
        }    
      },
      
       /* ---------------------------------------------------------------------------
       * Name: update
       * Goal: Change result-view:
       *        1 = all hits
       *        2 = hits per document
       *        3 = hits per 'group'
       *        4 = hits per 'division'
       * History:
       * 30/jun/2015  ERK Created
       * 23/jul/2015  ERK Added [oPageChoice]
       */
      update : function(iView, oPageChoice, element) {
        var bSwitching = false;
        // Make sure some element is set
        if (!element) element = loc_currentElement;
        // Are we switching from view?
        if (loc_view && loc_view!== iView) {
          // Yes, we are switching from view
          bSwitching = true;
        }
        // Make sure the view variable is filled in
        loc_view = iView;  
        // Set the correct tab 
        crpstudio.result.showView(iView);
        // Determine the parameters: QC, sub-category
        var iQC = loc_iCurrentQc+1;
        var sLabel = loc_arTable[iQC-1].result;
        var iSub = loc_iCurrentSub;
        // If we are switching, we should make an additional request)
        if (bSwitching) {
          if (iSub && iSub >=0) {
            crpstudio.result.switchToQcSub(iQC, iSub);
          } else {
            crpstudio.result.switchToQc(iQC);
          }
        }

        var sSub = loc_sCurrentSub;
        var sFile = loc_currentFile;
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
          case 1:
            // Show pagination
            $("#result_pagination_"+iView).removeClass("hidden");
            // Determine the total number of results
            var iResultCount = (iSub < 0) ? loc_arTable[iQC-1].total :
                                            loc_arTable[iQC-1].counts[iSub];
            loc_numResults = iResultCount;
            // Determine start and finish
            var iStart = 1;
            var iCount = iResultCount;
            // Possibly adapt start and count
            if (oPageChoice) {
              if (oPageChoice.first) iStart = oPageChoice.first;
              if (oPageChoice.number) iCount = oPageChoice.number;
            }
            // Start showing hits according to the current choices
            private_methods.showHits(iView, iStart, iCount, iQC, sSub, element, true);
            // Give information about what is being shown
            var iRequesting = parseInt( (loc_numPerPage<0) ? iResultCount : loc_numPerPage);
            var sInfo = "QC "+iQC+" ["+sLabel+"]";
            if (sSub && sSub !== "") sInfo = sInfo + " cat=["+sSub+"]";
            sInfo += " #"+iStart+"-"+(iStart+iRequesting-1)+" ("+iResultCount+")";
            $("#results_info_1").html(sInfo);
            break;
          case 2:
            // Show pagination
            $("#result_pagination_"+iView).removeClass("hidden");
            if (oPageChoice) {
              // Determine start and finish
              var iStart = 1;
              var iCount = loc_numPerPage;
              // Possibly adapt start and count
              if (oPageChoice.first) iStart = oPageChoice.first;
              if (oPageChoice.number) iCount = oPageChoice.number;
              // Now make the request in the standard way
              crpstudio.result.showFileHits(iStart, iCount, sFile, iQC, sSub, element, true);
            }
            var sInfo = "QC "+iQC+" ["+sLabel+"]";
            if (sSub && sSub !== "") sInfo += " cat=["+sSub+"]";
            if (sFile && sFile !== "") sInfo += " file=["+sFile+"]";
            $("#results_info_2").html(sInfo);
            break;
          default:
            // Hide pagination
            $("#result_pagination_"+iView).addClass("hidden");
            break;
        }
      },

      /**
     * showFileHits
     *    Load and show the hits in the indicated <div>
     * 
     * @param {type} iStart
     * @param {type} iCount
     * @param {type} sFile
     * @param {type} iQC
     * @param {type} sSub
     * @param {type} element  - Where to show the results
     * @param {bool} update   - True if this is an update of an existing condition
     * @returns {undefined}
     */
      showFileHits : function(iStart, iCount, sFile, iQC, sSub, element, update) {
        var iView = loc_view;    // The view doesn't really matter, does it?
        // Set the current 'element'
        loc_currentElement = element;
        // Possibly set the number of results
        if (!update) {
          // Set the total number of results
          loc_numResults = iCount;
        }
        if ($(element).parent().parent().hasClass("hidden") || (update)) {
          loc_currentFile = sFile;
          // Make sure the <div> is now being shown
          $(element).parent().parent().removeClass("hidden");
          // Remove waiting notification in project description
          $("#result_status_"+iView).html("<img class=\"icon spinner\" src=\"./static/img/spinner.gif\"> Fetching data...");
          // Get the data for this combination of QC/Subcat/View
          var sType = "context_syntax";
          // Set the amount we are requesting
          var iRequesting = (loc_numPerPage<0) ? loc_numResults : loc_numPerPage;
          // NOTE: make sure the "prj", "lng" and "dir" parameters are passed on
          var oQuery = null;
          // If there is no file, we need to set it to NULL
          if (sFile === "")  {
            oQuery = { "qc": iQC, "sub": sSub, "view": iView,
              "userid": crpstudio.currentUser, "prj": crpstudio.project.getPrj(), 
              "lng": crpstudio.project.getLng(), "dir": crpstudio.project.getDir(), 
              "type": sType, "start": iStart, 
              "count": iRequesting, "files": [ ]};
          } else {
            oQuery = { "qc": iQC, "sub": sSub, "view": iView,
              "userid": crpstudio.currentUser, "prj": crpstudio.project.getPrj(), 
              "lng": crpstudio.project.getLng(), "dir": crpstudio.project.getDir(), 
              "type": sType, "start": iStart, 
              "count": iRequesting, "files": [ sFile ]};
          }
          var sLabel = loc_arTable[iQC-1].result;
          var sInfo = "QC "+iQC+" ["+sLabel+"]";
          if (sSub && sSub !== "") sInfo += " cat=["+sSub+"]";
          if (sFile && sFile !== "") sInfo += " file=["+sFile+"]";
          $("#results_info_2").html(sInfo);
          // var params = "query=" + JSON.stringify(oQuery);
          var params = JSON.stringify(oQuery);
          crpstudio.main.getCrpStudioData("update", params, crpstudio.result.processFileHits, element);   
        } else {
          loc_currentFile = sFile;
          // Hide the details
          $(element).parent().parent().addClass("hidden");
        }
      },
      
      /**
       * processFileHits
       *    Process the information requested with an /update request
       *    This request is made when the user is in view=2 (doc view)
       *       and the user presses one of the file-info blobs
       *    
       * @param {type} response   JSON object returned from /crpstudio/update
       * @param {type} target
       * @returns {undefined}
       */
      processFileHits : function(response, target) {
        var iFirstN = -1;
        if (response !== null) {
          var iView = loc_view;
          // Remove waiting notification in project description
          $("#result_status_"+iView).html("<img class=\"icon spinner\" src=\"./static/img/spinner.gif\"> Processing data...");
          // The response is a standard object containing "status" (code) and "content" (code, message)
          var oStatus = response.status;
          var sStatusCode = oStatus.code;
          var oContent = response.content;
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
                // Possibly add filename
                if (iView === 1) {
                  // Need to add the name of the file
                  html.push("[<span class=\"one-example-filename\">"+oRow.file+"</span>]");
                }
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
              $(target).html(sJoinedExample);
              // Set the amount of hits
              // loc_numResults = oContent.length;
              // Show the correct <li> items under "result_pagebuttons_"
              if (iFirstN<0 || iFirstN===1) {
                private_methods.doPagination(iView, loc_numResults);
              }
              // Show we are ready: clear status
              $("#result_status_"+iView).html("");
              break;
            case "error":
              var sErrorCode = (oContent && oContent.code) ? oContent.code : "(no code)";
              var sErrorMsg = (oContent && oContent.message) ? oContent.message : "(no description)";
              $("#result_status_"+iView).html("Error: " + sErrorCode);
              $(target).html("Error: " + sErrorMsg);
              break;
            default:
              $("#result_status"+iView).html("Error: no reply");
              $(target).html("Error: no reply received from the /crpstudio server");
              break;
          }
        } else {
          $("#project_status").html("ERROR - Failed to remove the .crpx result from the server.");
        }    
      },    

      /* ---------------------------------------------------------------------------
       * Name: switchToQc
       * Goal: Action when user clicks this QC line in the results overview table
       * History:
       * 29/jun/2015  ERK Created
       */
      switchToQc : function(iQC) {
        // Get the correct index
        var idxQc = iQC-1;
        // Set the QC line
        loc_iCurrentQc = idxQc;
        loc_iCurrentSub = -1;
        loc_sCurrentSub = "";
        var iView = loc_view;
        // Show the results tab
        // crpstudio.result.selectResults("results");
        // Switch off export
        $("#results_export_"+iView).addClass("hidden");
        // Get the number of QCs
        var iQCcount = loc_arTable.length;
        // Get the number of sub-categories for this one
        var iSubCount = loc_arTable[idxQc].subcats.length;
        // Check the current state of the qc-line
        var bQcActive = $("#queries #qcline_"+iQC).hasClass("active");
        /*
        // Clear or set the "active" state of the QC rows appropriately
        if ($("#queries #qcline_"+iQC).hasClass("active")) {
          // REMOVE the "active" state of the particular qcline
          $("#queries #qcline_"+iQC).removeClass("active");
          // Hide the qcsub_n_m lines, which have class "qc-sub-line"
          $("#queries .qc-sub-line").addClass("hidden");
          // User is already active here. Click means: remove all tables
          // (2) hide the 'result-qc-sub' lines
          $("#result_table_"+iView+" .result-qc-sub").addClass("hidden");
          // (3) toggle the 'hidden' class for this QC line table
          $("#result_"+iView+"_qc"+iQC).toggleClass("hidden");
          // (4) hide the DETAILS buttons for everything
          $("#queries .control").addClass("hidden");
          // Since we are RE-setting, clear the CurrentQc number
          loc_iCurrentQc = -1;
        } else {
        */
          // Switch TO the ACTIVE state for the indicated QC line
          // (1) remove the "active" state for all QC rows
          $("#queries .qc-line").removeClass("active");
          // (2) remove the 'active' state for all QC subcategory rows
          $("#queries .qc-sub-line").removeClass("active");
          // (3) set the 'hidden' state for all QC subcategory rows
          $("#queries .qc-sub-line").addClass("hidden");
          // Is this current QC line active?
          if (bQcActive) {
            // (6) hide the DETAILS buttons for everything
            $("#queries .control").addClass("hidden");
          } else {
            // (4) remove the 'hidden' state for the QC subcategory rows under the current QC line
            for (var i=0;i<iSubCount;i++) {
              $("#queries #qcsub_"+iQC+"_"+i).removeClass("hidden");
            }
            // (5) set the 'active' state for the correct QC row
            $("#queries #qcline_"+iQC).addClass("active");
            // (6) hide the DETAILS buttons for everything
            $("#queries .control").addClass("hidden");
            // (7) Show the DETAILS button for this QC
            $("#queries #qcline_"+iQC+" .control").removeClass("hidden");
          }
          // (8) set all results to 'hidden'
          $("#result_table_"+iView+" .result-qc").addClass("hidden");
          // (9) Show the results for this QC line
          var sResultTargetTable = "#result_"+iView+"_qc"+iQC;
          $(sResultTargetTable).removeClass("hidden");
          // (10) hide the 'result-qc-sub' lines
          $("#result_table_"+iView+" .result-qc-sub").addClass("hidden");
      /*  } */

      },

      /* ---------------------------------------------------------------------------
       * Name: switchToQcSub
       * Goal: Action when user clicks this QC-sub-cat line in the results overview table
       * History:
       * 29/jun/2015  ERK Created
       */
      switchToQcSub : function(iQC, idxSub) {
        // Get the correct index
        var idxQc = iQC-1;
        loc_iCurrentSub = idxSub;
        loc_sCurrentSub = loc_arTable[idxQc].subcats[idxSub];
        // Get the correct view mode
        var iView = loc_view;
        // Show the results tab
        // crpstudio.result.selectResults("results");
        // Switch off export
        $("#results_export_"+iView).addClass("hidden");
        // Get the number of QCs
        var iQCcount = loc_arTable.length;
        // Get the number of sub-categories for this one
        var iSubCount = loc_arTable[idxQc].subcats.length;
        /*
        // Clear and set the "active" state of the QC rows appropriately
        if ($("#queries #qcsub_"+iQC+"_"+idxSub).hasClass("active")) {
          // User is active here. Clicking means: DE-ACTIVATE this qc-sub
          // (1) remove the 'active' state for all QC subcategory rows
          $("#queries .qc-sub-line").removeClass("active");
          // (2) hide the 'result_qc' lines
          $("#result_table_"+iView+" .result-qc").addClass("hidden");
          // (3) hide the 'result-qc-sub' lines
          // $("#result_table .result-qc-sub").addClass("hidden");
          // (4) toggle the chosen result-qc-sub line
          $("#result_"+iView+"_qcsub_"+iQC+"_"+idxSub).toggleClass("hidden");
          // (5) hide the DETAILS buttons for everything
          $("#queries .control").addClass("hidden");
          // (6) show the DETAILS button for this QC
          $("#queries  #qcline_"+iQC+" .control").removeClass("hidden");
        } else {
        */
          // User is NOT active here. Click means: ACTIVATE this subcat (and de-activate all others)
          // (1) remove the 'active' state for all QC subcategory rows
          $("#queries .qc-sub-line").removeClass("active");
          // (2) set the 'active' state of this particular QC subcat row
          $("#queries #qcsub_"+iQC+"_"+idxSub).addClass("active");
          // (3) hide ALL the lines with class 'result_qc'
          $("#result_table_"+iView+" .result-qc").addClass("hidden");
          // (4) hide the 'result-qc-sub' lines
          $("#result_table_"+iView+" .result-qc-sub").addClass("hidden");
          // (5) show the chosen result-qc-sub line
          var sResultTargetTable = "#result_"+iView+"_qcsub_"+iQC+"_"+idxSub;
          $(sResultTargetTable).removeClass("hidden");
          // (6) hide the DETAILS buttons for everything
          $("#queries .control").addClass("hidden");
          // (7) show the DETAILS button for this QC-sub
          $("#queries  #qcsub_"+iQC+"_"+idxSub+" .control").removeClass("hidden");
        /* } */
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
        // Depending on the "view", a target must be specified
        switch (loc_view) {
          case 1:
            // Make sure we hide the table's head
            $("#result_table_1 thead tr").addClass("hidden");
            var target = $("#result_table_1 tbody tr");
            // Make a request for this number
            crpstudio.result.update(loc_view, { first : first, number : number }, target );
            break;
          default:
            // Make a request for this number
            crpstudio.result.update(loc_view, { first : first, number : number } );
            break;
        }
      },

      /**
       * selectResults
       *    Allow switching between 'result_querylines' and 'results'
       *    
       * @param {type} sType
       * @param {type} iQC
       * @param {type} iSub
       * @returns {undefined}
       */
      selectResults : function(sType, iQC, iSub) {
        switch (sType) {
          case "querylines":
            $("#result_querylines").removeClass("hidden");
            $("#results").addClass("hidden");
            break;
          case "results":
            $("#result_querylines").addClass("hidden");
            $("#results").removeClass("hidden");
            break;
          case "nothing":
            $("#result_querylines").addClass("hidden");
            $("#results").addClass("hidden");
            break;
        }
        // Set the QC and SUB variables
        if (iQC) loc_iCurrentQc = iQC-1;
        if (iSub) 
          loc_iCurrentSub = iSub;
        else if (iQC)
          loc_iCurrentSub = -1;
        // Possibly set the current element
        switch(loc_view) {
          case 1:
            // Make sure we hide the table's head
            $("#result_table_1 thead tr").addClass("hidden");
            loc_currentElement = $("#result_table_1 tbody tr");
            break;
        }
        // Possibly call update()
        if (iQC)
          crpstudio.result.update(loc_view);
      },
      
      /**
       * fillGroupings -- fill the combobox with 'grouping' names for the user to choose from
       * 
       * @returns {void}
       */
      fillGroupings : function() {
        var arGrouping = [];
        // First put in the 'standard' grouping
        arGrouping.push("standard");
        // Get the *general* grouping information for this corpus
        var arGroupingGen = crpstudio.project.getMetaList("", "", "groupings");
        // Extract the names
        for (var i=0;i<arGroupingGen.length;i++) {
          arGrouping.push(arGroupingGen[i].name);
        }
        
        // TODO: add user-supplied groupings
        
        // Fill the combobox with the grouping information
        crpstudio.corpora.fillCombo("result_view3_grouping", arGrouping);
        
      },
      
      /**
       * getGrouping
       *    Get the 'value' part of the grouping with the indicated name
       * 
       * @param {string} sGroupingName - Name of the grouping
       * @returns {string}             - Value of the grouping
       */
      getGrouping : function(sGroupingName) {
        // Review the *general* grouping information for this corpus
        var arGroupingGen = crpstudio.project.getMetaList("", "", "groupings");
        // Extract the names
        for (var i=0;i<arGroupingGen.length;i++) {
          // Get this grouping
          var oGrouping = arGroupingGen[i];
          // Is this the one?
          if (oGrouping.name === sGroupingName) {
            // FOund the correct one -- return the value
            return oGrouping.value;
          }
        }
        
        // TODO: add user-supplied groupings
        
        // Return failure
        return "";
      },
      
      /**
       * doGrouping -- Change showing of grouping to the name of the grouping
       *               contained in the <select> box with @id = sComboName
       * 
       * @param {string} sComboName
       * @param {int}    iView
       * @returns {void}
       */
      doGrouping : function(sComboName, iView) {
        // Find out which QC and/or sub-category the user has currently selected
        var iQC = loc_iCurrentQc;
        var sSub = loc_sCurrentSub;
        // Get the value of the combobox
        var sGroupingName = $("#"+sComboName).val();
        // Check result
        if (sGroupingName !== undefined && sGroupingName !== null && sGroupingName !== "") {
          // Keep the user up to date...
          $("#result_status_"+iView).html("Fetching information for grouping: "+sGroupingName+"...");
          var iStart = 0;
          var iRequesting = 1;
          var sType = "grouping";
          // Find the 'value' of the grouping with this name
          var sValue = crpstudio.result.getGrouping(sGroupingName);
          // Find the Xqueruy code for this value
          var sCode = crpstudio.xquery.createGroupingQ(sValue);
          
          // Give the correct command to /crpstudio for grouping information
          var oQuery = { "qc": iQC, "sub": sSub, "view": iView,
            "userid": crpstudio.currentUser, "prj": crpstudio.project.getPrj(), 
            "lng": crpstudio.project.getLng(), "dir": crpstudio.project.getDir(), 
            "type": sType, "start": iStart, 
            "count": iRequesting, "files": [ ],
            "div": sCode};
          // var params = "query=" + JSON.stringify(oQuery);
          var params = JSON.stringify(oQuery);
          crpstudio.main.getCrpStudioData("update", params, crpstudio.result.processGrpHits, "#result_table_3");   
        }
      },
      
      /**
       * processGrpHits -- Accept the table and process it
       * 
       * @param {type} response
       * @param {type} target
       * @returns {undefined}
       */
      processGrpHits : function(response, target) {
        var iFirstN = -1;
        if (response !== null) {
          var iView = loc_view;
          // Remove waiting notification in project description
          $("#result_status_"+iView).html("<img class=\"icon spinner\" src=\"./static/img/spinner.gif\"> Processing data...");
          // The response is a standard object containing "status" (code) and "content" (code, message)
          var oStatus = response.status;
          var sStatusCode = oStatus.code;
          var oContent = response.content;
          switch (sStatusCode) {
            case "completed":
              // The result is in [oContent] 
              var html = crpstudio.result.makeTablesView3(oContent);
              // Position this table in the div for view=2 (per-document view)
              $("#result_table_3").html(html);
              // Set the amount of hits
              // loc_numResults = oContent.length;
              // Show the correct <li> items under "result_pagebuttons_"
              if (iFirstN<0 || iFirstN===1) {
                private_methods.doPagination(iView, loc_numResults);
              }
              // Show we are ready: clear status
              $("#result_status_"+iView).html("");
              break;
            case "error":
              var sErrorCode = (oContent && oContent.code) ? oContent.code : "(no code)";
              var sErrorMsg = (oContent && oContent.message) ? oContent.message : "(no description)";
              $("#result_status_"+iView).html("Error: " + sErrorCode);
              $(target).html("Error: " + sErrorMsg);
              break;
            default:
              $("#result_status"+iView).html("Error: no reply");
              $(target).html("Error: no reply received from the /crpstudio server");
              break;
          }
        } else {
          $("#project_status").html("ERROR - Failed to remove the .crpx result from the server.");
        }    
      },
      
      /**
       * makeTablesView3 -- Make a table of rows (subcat) by columns (group)
       * 
       * @param {type} arTable
       * @returns {String}
       */
      makeTablesView3: function(arTable) {
        var html = [];
        // This is for view #3
        var iView = 3;
        var iQC = 0;
        // Each QC result must be in its own div
        html.push("<div id=\"result_"+iView+"_qc"+iQC+"\" class=\"result-qc \">");
        // This first of all contains an array of group-names
        var arGroups = arTable[0].groups;
        // Create the table header
        html.push("<table><thead><th>Category</td><th>TOTAL</th>");
        for (var j=0;j<arGroups.length; j++) {
          html.push("<th>" + arGroups[j] + "</th>");
        }
        // Finish the header with sub-categories
        html.push("</thead>");
        // Start the table body
        html.push("<tbody>");
        var sAnyRowArg = "class=\"concordance\"";
        // Walk the rows
        for (var i=1; i< arTable.length; i++) {
          // Get this row
          var oRow = arTable[i];
          // Get the subcat name and the array of group-cells
          var sSubCat = oRow.sub;
          var arGroups = oRow.groups;
          html.push("<tr "+sAnyRowArg+">");
          html.push("<td>"+sSubCat+"</td><td>-</td>");
          // Visit all groups
          for (var j=0;j<arGroups.length;j++) {
            // Get this group object
            var oGroup = arGroups[j];
            // Get the count and the files
            var iCount = oGroup.count;
            var arFiles = oGroup.files;
            // Figure out the arguments for this cell (cl,icking)
            var sCellArgs = "onclick=\"crpstudio.result.showOneGroup('"+sSubCat+"','"+oGroup.group+"')\"";
            // Show the results of this cell
            html.push("<td "+sCellArgs+">"+iCount+ "</td>");
          }
          // Finish off the row
          html.push("</tr>");
          // Determine the @id for this result
          var iCols = 2+arGroups.length;
          var sId = "view3_"+sSubCat;
          // Make a row where the citation will be placed
          html.push("<tr class=\"citationrow hidden\"><td colspan="+iCols+">"+
                  "<div class=\"collapse inline-concordance\" id=\""+sId+
                  "\">Loading...</div></td></tr>");
        }
        // Finish the table
        html.push("</tbody></table></div>");
  
        // Join and return the result
        return html.join("\n");
      }      

    };
  }($, crpstudio.config));
  
  return crpstudio;
} (jQuery, window.crpstudio || {}));

