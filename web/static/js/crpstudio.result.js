/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
Crpstudio.result = {
  // Local variables
  loc_arTable : null,   // Local copy of the table
  loc_iCurrentQc : -1,  // Currently selected QC line
  loc_iCurrentSub : -1, // Currently selected QC sub category
  loc_sCurrentSub : "", // String for the currently selected sub
  view : 1,             // Default view is #1
  currentFile : "",     // currently selected file
  numPerPage : 50,      // Number of results per page
  numPages : 1,         // Number of pages to be shown
  currentPage : 1,      // Currently selected page
  numResults : 0,       // Number of results
  
  /* ---------------------------------------------------------------------------
   * Name: makeOviewTable
   * Goal: Make a table with an overview of the results
   * History:
   * 29/jun/2015  ERK Created
   */
  makeOviewTable : function(arTable) {
    Crpstudio.result.loc_arTable = arTable;
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
      Crpstudio.result.addQCline(iQC, sQcLabel, iTotal, arSubs, arSubCount);
    }
  },
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
    var qcRow = "<tr onclick=\"Crpstudio.result.switchToQc("+iQC+")\" id=\"qcline_"+iQC+"\" class=\"qc-line\">"
      +"<td>"+iQC+"</td>"
      +"<td id=\"qc_"+iQC+"\">"+sQcLabel+"</td>"
      +"<td id=\"qc_"+iQC+"\">(all together)</td>"
      +"<td id=\"total_"+iQC+"\">"+iTotal+"</td>"
      +"<td class=\"control\"><button onclick=\"Crpstudio.project.editQC("+iQC+")\" class=\"edit\">EDIT</button></td>"
      +"</tr>";
    // Add the row to the appropriate table
    $("#queries > tbody").append(qcRow);
    // Add lines for all sub categories
    for (var i=0; i<arSubNames.length;i++) {
      // Allow switching to a sub-category of a QC
      qcRow = "<tr onclick=\"Crpstudio.result.switchToQcSub("+iQC+",'"+i+"')\" id=\"qcsub_"+iQC+"_"+i+"\" class=\"qc-sub-line hidden\">"
        +"<td>"+iQC+"</td>"
        +"<td id=\"qc_"+iQC+"_"+i+"\">"+sQcLabel+"</td>"
        +"<td id=\"sub_"+iQC+"_"+i+"\">"+arSubNames[i]+"</td>"
        +"<td id=\"total_"+iQC+"_"+i+"\">"+arSubCounts[i]+"</td>"
        +"</tr>";
      // Add the row to the appropriate table
      $("#queries > tbody").append(qcRow);
    }
  },
  /**
   * showView 
   *    Make sure the indicate [iView] result-pane is 
   *    shown, while the rest is hidden   * 
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
    Crpstudio.result.loc_iCurrentQc = idxQc;
    Crpstudio.result.loc_iCurrentSub = -1;
    Crpstudio.result.loc_sCurrentSub = "";
    var iView = Crpstudio.result.view;
    // Switch off export
    $("#results_export_"+iView).addClass("hidden");
    // Get the number of QCs
    var iQCcount = Crpstudio.result.loc_arTable.length;
    // Get the number of sub-categories for this one
    var iSubCount = Crpstudio.result.loc_arTable[idxQc].subcats.length;
    // Clear and set the "active" state of the QC rows appropriately
    if ($("#queries #qcline_"+iQC).hasClass("active")) {
      // Remove the "active" state of the particular qcline
      $("#queries #qcline_"+iQC).removeClass("active");
      // Hide the qcsub_n_m lines, which have class "qc-sub-line"
      $("#queries .qc-sub-line").addClass("hidden");
      // User is already active here. Click means: remove all tables
      // (2) hide the 'result-qc-sub' lines
      $("#result_table_"+iView+" .result-qc-sub").addClass("hidden");
      // (3) toggle the 'hidden' class for this QC line table
      $("#result_qc"+iQC).toggleClass("hidden");
      // Since we are RE-setting, clear the CurrentQc number
      Crpstudio.result.loc_iCurrentQc = -1;
    } else {
      // Right: we need to switch the active state
      // (1) remove the "active" state for all QC rows
			$("#queries .qc-line").removeClass("active");
      // (2) remove the 'active' state for all QC subcategory rows
			$("#queries .qc-sub-line").removeClass("active");
      // (3) set the 'hidden' state for all QC subcategory rows
			$("#queries .qc-sub-line").addClass("hidden");
      // (4) set the 'active' state for the correct QC row
			$("#queries #qcline_"+iQC).addClass("active");
      // (5) remove the 'hidden' state for the QC subcategory rows under the current QC line
      // $("#queries #qcline_"+iQC+" .qc-sub-line").removeClass("hidden");
      for (var i=0;i<iSubCount;i++) {
        $("#queries #qcsub_"+iQC+"_"+i).removeClass("hidden");
      }
      // (6) set all results to 'hidden'
      $("#result_table_"+iView+" .result-qc").addClass("hidden");
      // (7) Show the results for this QC line
      $("#result_qc"+iQC).removeClass("hidden");
      // (8) hide the 'result-qc-sub' lines
      $("#result_table_"+iView+" .result-qc-sub").addClass("hidden");
    }
      
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
    Crpstudio.result.loc_iCurrentSub = idxSub;
    Crpstudio.result.loc_sCurrentSub = Crpstudio.result.loc_arTable[idxQc].subcats[idxSub];
    // Get the correct view mode
    var iView = Crpstudio.result.view;
    // Switch off export
    $("#results_export_"+iView).addClass("hidden");
    // Get the number of QCs
    var iQCcount = Crpstudio.result.loc_arTable.length;
    // Get the number of sub-categories for this one
    var iSubCount = Crpstudio.result.loc_arTable[idxQc].subcats.length;
    // Clear and set the "active" state of the QC rows appropriately
    if ($("#queries #qcsub_"+iQC+"_"+idxSub).hasClass("active")) {
      // User is active here. Clicking means: de-activate
      // (1) remove the 'active' state for all QC subcategory rows
			$("#queries .qc-sub-line").removeClass("active");
      // (2) hide the 'result_qc' lines
      $("#result_table_"+iView+" .result-qc").addClass("hidden");
      // (3) hide the 'result-qc-sub' lines
      // $("#result_table .result-qc-sub").addClass("hidden");
      // (4) toggle the chosen result-qc-sub line
      $("#result_qcsub_"+iQC+"_"+idxSub).toggleClass("hidden");
    } else {
      // User is NOT active here. Click means: activate this subcat
      // (1) remove the 'active' state for all QC subcategory rows
			$("#queries .qc-sub-line").removeClass("active");
      // (2) set the 'active' state of this particular QC subcat row
      $("#queries #qcsub_"+iQC+"_"+idxSub).addClass("active");
      // (3) hide ALL the lines with class 'result_qc'
      $("#result_table_"+iView+" .result-qc").addClass("hidden");
      // (4) hide the 'result-qc-sub' lines
      $("#result_table_"+iView+" .result-qc-sub").addClass("hidden");
      // (5) show the chosen result-qc-sub line
      $("#result_qcsub_"+iQC+"_"+idxSub).removeClass("hidden");
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
    var idxQc = Crpstudio.result.loc_iCurrentQc;
    var idxSub = Crpstudio.result.loc_iCurrentSub;
    var arTable = Crpstudio.result.loc_arTable;
    
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
      // var params = "table="+ encodeURIComponent(JSON.stringify(oBack));
      var params = "project="+encodeURIComponent(Crpstudio.project.currentPrj)
              + "&table="+ encodeURIComponent(JSON.stringify(oBack));
      // Call /crpstudio/export with the information we have gathered
      // Method #1: use POST request
      Crpstudio.getCrpStudioData("export", params, Crpstudio.result.processExport);  
       
      // Method #2: use GET request 
	
      // window.location = Crpstudio.baseUrl + "export?"+params;
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
      if (fFilePath !== null) {
        // Get the name of the file alone
        var fFileName = fFilePath.substring(fFilePath.lastIndexOf("/")+1);
        fFileName = fFileName.substring(0, fFileName.lastIndexOf("."));
        // Provide the user with a path where he can download the file from
        $("#results_export_1").removeClass("hidden");
        $("#results_export_file_1").html("<a href=\""+fFilePath + 
                " target='_blank'\">"+fFileName+"</a>");
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
			$("#result_"+target).html("ERROR - Failed to retrieve result from server.");
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
  update : function(iView, oPageChoice) {
    // Make sure the view variable is filled in
    Crpstudio.result.view = iView;  
    // Set the correct tab 
    Crpstudio.result.showView(iView);
    // Determine the parameters: QC, sub-category
    var iQC = Crpstudio.result.loc_iCurrentQc;
    var iSub = Crpstudio.result.loc_iCurrentSub;
    var sSub = Crpstudio.result.loc_sCurrentSub;
    // Any pagination information?
    if (oPageChoice && oPageChoice.number) {
      Crpstudio.result.numPerPage = oPageChoice.number;
      // Adapt the pagination
      Crpstudio.result.doPagination(iView,Crpstudio.result.numResults);
    }
    // If and how pagination is shown depends on the view
    switch(iView) {
      case 1:
        // Show pagination
        $("#result_pagination_"+iView).removeClass("hidden");
        break;
      case 2:
        // Show pagination
        $("#result_pagination_"+iView).removeClass("hidden");
        break;
      default:
        // Hide pagination
        $("#result_pagination_"+iView).addClass("hidden");
        break;
    }
    // Determine the type of information needed
    // TODO: make this user-determinable!!
    var sType = "context_syntax";
    // Determine start and finish
    var iStart = 1;
    var iCount = Crpstudio.result.numPerPage;
    var arQcTable = Crpstudio.result.loc_arTable[iQC-1];
    if (iSub<0) {
      iCount = arQcTable.total;
    } else {
      iCount = arQcTable.counts[iSub];
    }
    // Show that we are waiting for data
		$("#result_status_"+iView).html("<img class=\"icon spinner\" src=\"./static/img/spinner.gif\"> Getting data...");
    // Get the data for this combination of QC/Subcat/View
    // NOTE: make sure the "prj", "lng" and "dir" parameters are passed on
    var oQuery = { "qc": iQC, "sub": sSub, "view": iView,
      "userid": Crpstudio.currentUser, "prj": Crpstudio.project.currentPrj, 
      "lng": Crpstudio.project.currentLng, "dir": Crpstudio.project.currentDir, 
      "type": sType, "start": iStart, "count": iCount};
    var params = "query=" + JSON.stringify(oQuery);
    Crpstudio.getCrpStudioData("update", params, Crpstudio.result.processUpdate, "#result_table_"+iView);   
  },
/**
   * processUpdate
   *    Process the information requested with a /update request
   *    
   * @param {type} response   JSON object returned from /crpstudio/update
   * @param {type} target
   * @returns {undefined}
   */
  processUpdate : function(response, target) {
		if (response !== null) {
      var iView = Crpstudio.result.view;
      // Remove waiting notification in project description
      $("#result_status_"+iView).html("<img class=\"icon spinner\" src=\"./static/img/spinner.gif\"> Processing data...");
      // The response is a standard object containing "status" (code) and "content" (code, message)
      var oStatus = response.status;
      var sStatusCode = oStatus.code;
      var oContent = response.content;
      switch (sStatusCode) {
        case "completed":
          // The result is in [oContent] as an array of 'hit' values
          // Access the results' table
          var divResTable = $("result_table_" +iView);
          
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
 * showFileHits
 *    Load and show the hits in the indicated <div>
 * 
 * @param {type} iStart
 * @param {type} iCount
 * @param {type} sFile
 * @param {type} iQC
 * @param {type} sSub
 * @param {type} element Where to show the results
 * @returns {undefined}
 */
  showFileHits : function(iStart, iCount, sFile, iQC, sSub, element) {
    var iView = Crpstudio.result.view;    // The view doesn't really matter, does it?
		if ($(element).parent().parent().hasClass("hidden")) {
      Crpstudio.result.currentFile = sFile;
      // Make sure the <div> is now being shown
      $(element).parent().parent().removeClass("hidden");
      // Remove waiting notification in project description
      $("#result_status_"+iView).html("<img class=\"icon spinner\" src=\"./static/img/spinner.gif\"> Fetching data...");
      // Get the data for this combination of QC/Subcat/View
      var sType = "context_syntax";
      // NOTE: make sure the "prj", "lng" and "dir" parameters are passed on
      var oQuery = { "qc": iQC, "sub": sSub, "view": iView,
        "userid": Crpstudio.currentUser, "prj": Crpstudio.project.currentPrj, 
        "lng": Crpstudio.project.currentLng, "dir": Crpstudio.project.currentDir, 
        "type": sType, "start": iStart, "count": iCount, "files": [ sFile ]};
      var params = "query=" + JSON.stringify(oQuery);
      Crpstudio.getCrpStudioData("update", params, Crpstudio.result.processFileHits, element);   
    } else {
      Crpstudio.result.currentFile = "sFile";
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
		if (response !== null) {
      var iView = Crpstudio.result.view;
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
            var sRowType = (i % 2 == 0) ? " row-even" : "row-odd";            
            html.push("<div class=\"one-example " + sRowType + "\">"+
                      "<div class=\"one-example-context\">")
            // Access this object
            var oRow = oContent[i];
            
            html.push("<b>"+oRow.n+"</b> "+oRow.preC);
            html.push("<span class=\"one-example-hit\">"+oRow.hitC+" </span>");
            // Close "one-example-context"
            html.push(oRow.folC+"</div>");
            // Get the syntax result
            var sSyntax = Crpstudio.result.getSyntax(oRow.hitS);
            html.push("<div class=\"one-example-syntax\">"+ sSyntax +"</div>");
            html.push("</div>")
          }
          // put the results in the target
          $(target).html(html.join("\n"));
          // Set the amount of hits
          Crpstudio.result.numResults = oContent.length;
          // Show the correct <li> items under "result_pagebuttons_"
          Crpstudio.result.doPagination(iView, oContent.length);
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
    var iPages = Math.floor(iNumber / Crpstudio.result.numPerPage);
    // Make sure we can at least show ONE page
    if (iPages <=0) iPages = 1;
    Crpstudio.result.numPages = iPages;   // total number of pages that can be shown
    Crpstudio.result.currentPage = 1;     // currently selected page
    // Set the max pages
    $("#result_numpages_"+iView).html(iPages);
    $("#result_numpages_"+iView).prev().attr("max",iPages);
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
      html.push("[<font color=#800000 size=1>" + oChildren[i].pos + "</font> ");
      html.push(oChildren[i].txt + "]");
    }
    html.push("]</font>");
    return html.join("\n");
  }
};

