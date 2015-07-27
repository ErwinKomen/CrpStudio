/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */

Crpstudio.project = {
  // Local variables within Crpstudio.project
  tab : "project",      // The main tab we are on
  currentPrj: "",       // The currently being executed project (the CRP name)
  currentLng: "",       // the "lng" parameter of the current project
  currentDir: "",       // the "dir" parameter of the current project
  strQstatus: "",       // The JSON string passed on to R-server "status"
  divStatus: "",        // The name of the div where the status is to be shown
  interval: 200,        // Number of milliseconds
  /* ---------------------------------------------------------------------------
   * Name: execute
   * Goal: execute the currently set project
   * History:
   * 22/jun/2015  ERK Created
   */
  execute : function(caching) {
    var sPrjName = Crpstudio.project.currentPrj;
    var sUserName = Crpstudio.currentUser;        
    // Validate project and user
    if (sPrjName ==="" ) {
      Crpstudio.debug("project is not defined");
    } else if (sUserName === "") {
      Crpstudio.debug("user is not defined");
    } else {
      // Find out which language corpus the user has chosen
      var oCorpusAndDir = $("#input_lng").val().split(":");
      var sLng = oCorpusAndDir[0];  // obligatory
      var sDir = oCorpusAndDir[1];  // May be empty
      var oExeRequest = {};
      // Store these values for posterity (well, for /update requests)
      Crpstudio.project.currentDir = sDir;
      Crpstudio.project.currentLng = sLng;
      // debugging: show where the status appears
      $("#project_status").text("Processing project: " + sPrjName);
      $("#result_status").text("");
      // Switch off export
      for (var i=1;i<=4;i++) { $("#results_export_"+i).addClass("hidden"); }
      // switch to the result tab
      Crpstudio.project.switchTab("result");
      $("#result_status").text("");
      // Make sure the execute buttons are hidden again
      Crpstudio.project.showExeButtons(false);
      // Create JSON request for the search
      if (sDir === "")
        oExeRequest = {"lng": sLng, "crp": sPrjName, "userid": sUserName, "cache": caching};
      else
        oExeRequest = {"lng": sLng, "crp": sPrjName, "dir": sDir, "userid": sUserName, "cache": caching};
      var sExeRequest = "query=" + JSON.stringify(oExeRequest);
      // Set the location of the status div
      Crpstudio.project.divStatus = "#result_report";
      // Methode #1: Initiate the search by sending a request to /crpp/exe?{...}
      // Crpstudio.postRequest("exe", sExeRequest, Crpstudio.project.processExeCrpp, "#result_status");
      // Method #2: send the request to /crpstudio/exe?{...}
      Crpstudio.getCrpStudioData("exe", sExeRequest, Crpstudio.project.processExeCrpStudio, "#result_status")
    }
  },
  showExeButtons : function(bShow) {
    if (bShow) {
      $("#project_executor").removeClass("hidden");
      $("#project_executor_nocache").removeClass("hidden");
    } else {
      $("#project_executor").addClass("hidden");
      $("#project_executor_nocache").addClass("hidden");
    }
  },
  /*
  processDebug : function (response, target) {
    // Unpack the response into an object
    var oResponse = JSON.parse(response);
    $("#result_status").text("processdebug is <b>right</b>.");
    var sDummy = "dummy variabele";
  },
  */
  
  /* ---------------------------------------------------------------------------
   * Name: processExeCrpp
   * Goal: callback function for the execution of a project
   * History:
   * 23/jun/2015  ERK Created
   */
  processExeCrpp : function(oResponse, target) {
    // The initial response should contain one object: status
    var status = oResponse.status;
    // Initialisations
    var jobId = "";
    var sUserId = "";
    var sStatusRequest = "";
    // Part of the object is the code (which should be 'started')
    var statusCode = status.code;
    var statusMsg = (status.message) ? (": "+status.message) : "";
    // Set the status
    $(target).html(statusCode+statusMsg);
    // Action depends on the status code
    switch (statusCode.toLowerCase()) {
      case "started":
        // Get the jobid and the userid
        jobId = status.jobid;
        sUserId = status.userid;
        // Create a status request object
        var oStatusRequest = {
          "jobid": jobId,
          "userid": sUserId
        }
        sStatusRequest = JSON.stringify(oStatusRequest);
        // Make the status available within this JavaScript module
        Crpstudio.project.strQstatus = sStatusRequest;
        // Make sure the results are not visible yet
        $("#results").addClass("hidden");
        $("#results").removeClass("active");
        // Hide querylines from viewing
        $("#result_querylines").addClass("hidden");
        // Now issue this request with an interval of 0.5 seconds
        setTimeout(
          function () {
            Crpstudio.postRequest("statusxq", sStatusRequest, Crpstudio.project.processExeCrpp, target);
          }, Crpstudio.project.interval);
        break;
      case "working":
        // Show the current status
        Crpstudio.project.doStatus(oResponse);
        // Retrieve the status request object string
        sStatusRequest = Crpstudio.project.strQstatus ;
        // Now issue the same request with an interval of 0.5 seconds
        setTimeout(
          function () {
            Crpstudio.postRequest("statusxq", sStatusRequest, Crpstudio.project.processExeCrpp, target);
          }, Crpstudio.project.interval);
        break;
      case "completed":
        // Signal completion
        $(target).html("Fetching results");
        // Show the final status
        Crpstudio.project.doStatus(oResponse);
        // And more completeino
        $(target).html("");
        // Make sure the results are visible
        $("#results").removeClass("hidden");
        $("#results").addClass("active");
        break;
      case "error":
        // Provite an error report
        $(target).html("There was an error");
        break;
      default:
        // Provite a status report showing that we are at a loss
        
        break;
    }
 /*
  * Returned status is like:
  * {
  "status": {
    "code": "started",
    "message": "{\"total\":705,\"ready\":2,\"start\":\"cmkempe.m4.psdx\",\"count\":10,\"finish\":\"cmthorn.mx4.psdx\"}",
    "userid": "erwin",
    "jobid": "158",
    "checkAgainMs": 200
  }
}
  */
  },

  /* ---------------------------------------------------------------------------
   * Name: processExeCrpStudio
   * Goal: callback function for the /crpstudio/exe command
   *       The [oResponse] can have the following values:
   *       error    - the content.message (if there was an error)
   *       status   - a JSON object contaning:
   *        code    - the status.code sent by /crpp: error, working, started, completed
   *        message - the status.message (if available)
   *        jobid   - the /crpp internal jobid for this job
   *        userid  - the /crpp internal userid for this job
   *       content  - A JSON object containing
   *        table   - the /crpp returned table, if job was completed
   * History:
   * 6/jul/2015  ERK Created
   */
  processExeCrpStudio : function(oResponse, target) {
    // The initial response should contain one object: status
    var oStatus = oResponse.status;
    // Initialisations
    var jobId = "";
    var sUserId = "";
    var sStatusRequest = "";
    // Part of the object is the code (which should be 'started')
    var statusCode = oStatus.code;
    var statusMsg = (oStatus.message) ? (": "+oStatus.message) : "";
    // Set the status
    $(target).html(statusCode+statusMsg);
    // Try to get a content object
    // var oContent = (oResponse.content) ? oResponse.content : {};
    // Action depends on the status code
    switch (statusCode.toLowerCase()) {
      case "started":
        // Get the jobid and the userid
        jobId = oStatus.jobid;
        sUserId = (oStatus.userid) ? oStatus.userid : Crpstudio.currentUser;
        // Create a status request object
        var oStatusRequest = {
          "jobid": jobId,
          "userid": sUserId
        }
        sStatusRequest = "query=" + JSON.stringify(oStatusRequest);
        // Make the status available within this JavaScript module
        Crpstudio.project.strQstatus = sStatusRequest;
        // Make sure the results are not visible yet
        $("#results").addClass("hidden");
        $("#results").removeClass("active");
        // Hide querylines from viewing
        $("#result_querylines").addClass("hidden");
        // Now issue this request with an interval of 0.5 seconds
        setTimeout(
          function () {
            Crpstudio.getCrpStudioData("statusxq", sStatusRequest, Crpstudio.project.processExeCrpStudio, target);
          }, Crpstudio.project.interval);
        break;
      case "working":
        // Show the current status
        Crpstudio.project.doStatus(oResponse);
        // Retrieve the status request object string
        sStatusRequest = Crpstudio.project.strQstatus ;
        // Now issue the same request with an interval of 0.5 seconds
        setTimeout(
          function () {
            Crpstudio.getCrpStudioData("statusxq", sStatusRequest, Crpstudio.project.processExeCrpStudio, target);
          }, Crpstudio.project.interval);
        break;
      case "completed":
        // Signal completion
        $(target).html("Fetching results");
        // Show the final status
        Crpstudio.project.doStatus(oResponse);
        // And more completeino
        $(target).html("");
        // Make sure the results are visible
        $("#results").removeClass("hidden");
        $("#results").addClass("active");
        break;
      case "error":
        // Provite an error report
        $(target).html("There was an error");
        break;
      default:
        // Provite a status report showing that we are at a loss
        
        break;
    }
  },
  
  /* ---------------------------------------------------------------------------
   * Name: doStatus
   * Goal: show the progress of our work
   * 
   * Note: a possible [oContent] when the status is "working" might look like:
   *  "jobid":"820",
   *  "start":"stat-1570-e2-p2.psdx",
   *  "count":62,
   *  "total":448,
   *  "finish":"tillots-b-e3-p1.psdx",
   *  "ready":53
   *  
   * Note: oContent holds a table with results when the status is "completed"
   *  
   * History:
   * 24/jun/2015  ERK Created
   */
  doStatus : function(oResponse) {
    // Get the status part and code
    var sStatusCode = oResponse.status.code;
    // Get the content part of the response object
    var oContent = oResponse.content;
    // find the result_status element
    var divResProgress = $("#result_progress").get(0);
    var divResTable = $("#result_table_1").get(0);
    // Preparet HTML result
    var html = "";
    // Action depends on the status code
    switch (sStatusCode) {
      case "working":
        // Make sure the table is empty
        divResTable.innerHTML = "";
        // Make sure the 'hidden' class is taken away from the progress meters
        $("#result_progress").removeClass("hidden");
        $("#result_fetching").removeClass("hidden");
        // Retrieve the variables from the [oContent] object
        var sStart = oContent.start;
        var sFinish = oContent.finish;
        var iReady = oContent.ready;
        var iCount = oContent.count;
        var iTotal = oContent.total;
        // Calculate percentages
        var iPtcStarted = (iTotal === 0) ? 0 : (iCount * 100 / iTotal);
        var iPtcFinished = (iTotal === 0) ? 0 : (iReady * 100 / iTotal);
        /*
        // Show the status
        var sMsg = "status="+iReady+"-"+iCount+" of "+iTotal;
        Crpstudio.debug(sMsg);
        // Build html content
        $(Crpstudio.project.divStatus).text(sMsg);
        */
        if (iCount > 0) {
          var divStarted = null;
          var divFinished = null;
          // Find the two "meter" classed elements (<span>) within divResProgress
          var arMeter = divResProgress.getElementsByClassName("meter");
          if (arMeter && arMeter.length > 0) {
            divStarted = arMeter[0];
            divFinished = arMeter[1];
            // Set the correct styles for these elements
            divStarted.setAttribute("style", "width: " + iPtcStarted + "%");
            divFinished.setAttribute("style", "width: " + iPtcFinished + "%");
            // Put something inside the meters: the name of the file processed
            divStarted.innerHTML = sStart;
            divFinished.innerHTML = sFinish;
          }
        }
        break;
      case "completed":
        // Keep track of the status
        $("#result_status").html("Making overview table...")
        // Create a small top table
        Crpstudio.result.makeOviewTable(oContent.table);
        // Keep track of the status
        $("#result_status").html("Constructing per-doc results...")
        // Create a large table for view=2
        html = Crpstudio.project.makeTablesView2(oContent.searchTime, oContent.table);
        // Position this table in the div for view=2 (per-document view)
        $("#result_table_2").html(html);
        
        // Keep track of the status
        $("#result_status").html("Constructing per-hit results...")
        // Create an initial table for view=1: the 'hits'
        html = Crpstudio.project.makeTablesView1(oContent.searchTime, oContent.table);
        // Position this table in the div for view=2 (per-document view)
        $("#result_table_1").html(html);

        // Hide the progress meters
        $("#result_progress").addClass("hidden");
        // Remove the result report
        $("#result_report").html("");
        // Keep track of the status
        $("#result_status").html("")
        // In fact: make the whole "fetching" section hidden
        $("#result_fetching").addClass("hidden");
        // But show the querylines part
        $("#result_querylines").removeClass("hidden");
        // And make sure only one tab page is active -- the others are hidden
        Crpstudio.result.showView(1);
        break;
      default:
        // TODO: take default action
        break;
    }
 
  },
 
   /* ---------------------------------------------------------------------------
   * Name: makeTablesView1
   * Goal: Make a table of the results per hit
   * 
   * History:
   * 21/jul/2015  ERK Created
   */
  makeTablesView1: function(iSearchTime, arTable) {
    var html = [];
    // Nothing to show yet
    html.push("Sorry, view 1 is not yet implemented");
    // Join and return the result
    return html.join("\n");
  },

  /* ---------------------------------------------------------------------------
   * Name: makeTablesView2
   * Goal: Make a large table of the results per document
   * 
   * History:
   * 29/jun/2015  ERK Created
   */
  makeTablesView2: function(iSearchTime, arTable) {
    var html = [];
    // Show the time of this search
    $("#results_time").html("<p>Search time: <b>"+(iSearchTime / 1000)+" s.</b></p>");
    // html.push("<p>Search time: <b>"+iSearchTime+"</b></p>")
    // Interpret and show the resulting table
    // The 'table' is an array of QC elements
    for (var i=0; i< arTable.length; i++) {
      // Get this QC element
      var oQC = arTable[i];
      // Get the QC elements
      var arSubs = oQC.subcats;
      var iQC = oQC.qc;
      var arHits = oQC.hits;  // Array with 'hit' elements
      // Each QC result must be in its own div
      html.push("<div id=\"result_qc"+iQC+"\" class=\"result-qc hidden\">");
      // Insert a heading for this QC item
      html.push("<h5>QC "+iQC + "</h5>");
      // Set up a table for the sub-categories
      html.push("<table><thead><th>text</th><th>TOTAL</th>");
      for (var j=0;j<arSubs.length; j++) {
        html.push("<th>" + arSubs[j] + "</th>");
      }
      // Finish the header with sub-categories
      html.push("</thead>");
      // Start the table body
      html.push("<tbody>");
      var sAnyRowArg = "class=\"concordance\" onclick=\"Crpstudio.result.showFileHits";
      // Walk all the hits for this QC
      for (var j=0; j<arHits.length; j++) {
        var sFile = arHits[j].file;
        var iCount = arHits[j].count;
        var iStart = 1;
        var sId = "fh_qc"+iQC+"_f"+j; 
        var arSubCounts = arHits[j].subs;
        var sRowArgs = sAnyRowArg + 
                "("+iStart+","+iCount+",'"+sFile+"',"+iQC+",'','#"+sId+"');\"";
        html.push("<tr "+sRowArgs+"><td>" + sFile + "</td>");
        html.push("<td>"+iCount+"</td>");
        for (var k=0;k<arSubCounts.length; k++ ) {
          html.push("<td>"+arSubCounts[k]+"</td>");
        }
        html.push("</tr>");
        // Determine the @id for this result
        var iCols = 2+arSubCounts.length;
        // Make a row where the citation will be placed
        html.push("<tr class=\"citationrow hidden\"><td colspan="+iCols+">"+
                "<div class=\"collapse inline-concordance\" id=\""+sId+
                "\">Loading...</div></td></tr>")
      }
      // Finish the table
      html.push("</tbody></table>");
      // Finish the div
      html.push("</div>")
      // Make tables for all the sub categories under this iQC
      for (var j=0;j<arSubs.length; j++) {
        html.push("<div id=\"result_qcsub_"+iQC+"_"+j+"\" class=\"result-qc-sub hidden\">")
        // Set the heading for this table
        html.push("<table><thead><th>text</th><th>"+arSubs[j]+"</th></thead>");
        // Start the table body
        html.push("<tbody>");
        // Walk all the hits
        for (var k=0; k<arHits.length; k++) {
          var sFile = arHits[k].file;
          var arSubCounts = arHits[k].subs;
          var iStart = 1;
          // Determine the @id for this result
          var sId = "fh_qc"+iQC+"_f"+k+"_s"+j;
          var sRowArgs = sAnyRowArg  + 
                  "("+iStart+","+arSubCounts[j]+",'"+sFile+"',"+iQC+",'"+arSubs[j]+"','#"+sId+"');\"";
          html.push("<tr "+sRowArgs+"><td>" + sFile + "</td>");
          html.push("<td>"+arSubCounts[j]+"</td></tr>");
          // Make a row where the citation will be placed
          html.push("<tr class=\"citationrow hidden\"><td colspan=2>"+
                  "<div class=\"collapse inline-concordance\" id=\""+sId+
                  "\">Loading...</div></td></tr>")
        }
        // Finish this sub-cat-table
        html.push("</tbody></table></div>")
      }
    }
    // Join and return the result
    return html.join("\n");
  },
  
  getMyPath : function(divStart) {
    var rightArrowParents = [];
    $(divStart).parents().not('html').each(function() {
        var entry = this.tagName.toLowerCase();
        if (this.className) {
            entry += "." + this.className.replace(/ /g, '.');
        }
        rightArrowParents.push(entry);
    });
    rightArrowParents.reverse();
    return rightArrowParents.join(" > ");
  },
  
  /* ---------------------------------------------------------------------------
   * Name: switchtab
   * Goal: switch the tab within the [Search] page
   * History:
   * 22/jun/2015  ERK Created
   */
	switchTab : function(target) {
		Crpstudio.debug("switching to search tab "+target+" from "+Crpstudio.project.tab);
		if (target !== Crpstudio.project.tab) {
			$("#search .content").removeClass("active");
			$("#"+target).addClass("active");
			$("#subnav dd").removeClass("active");
			$("#"+target+"_link").addClass("active");
      // Action depends on target 
      switch (target) {
        case "execute":
          // Make sure the execute buttons are shown
          Crpstudio.project.showExeButtons(true);
          // Show the metatdata
  				$("#metadata").show();
          break;
        case "project":
          // Make sure the execute buttons are shown
          Crpstudio.project.showExeButtons(true);
  				$("#metadata").show();
          break;
        case "input": 
  				$("#metadata").show();
          break;
        case "result":
          // Hide the metadata
  				$("#metadata").hide();
          // Make sure the execute buttons are hidden
          Crpstudio.project.showExeButtons(false);
          // Other actions
          $(".sub-nav dd").removeClass("active");
          $("#result_link").removeClass("hide");
          $("#result_link").addClass("active");
          break;
        case "document":
          // Hide the metadata
  				$("#metadata").hide();
          // Make sure the execute buttons are hidden
          Crpstudio.project.showExeButtons(false);
          // Other actions
          $(".sub-nav dd").removeClass("active");
          $("#document").removeClass("hide");
          $("#document_link").removeClass("hide");
          $("#document_link").addClass("active");
          break;
      }
      // When to show the spacer before [result] and [document]
			if (!$("#result_link").hasClass("hide") || !$("#document_link").hasClass("hide")) {
				$("#link-spacer").removeClass("hide");
			}
			
			Crpstudio.project.tab = target;
		}
	},
  
  /* ---------------------------------------------------------------------------
   * Name: setProject
   * Goal: the user chooses a project, so act on this
   * History:
   * 23/jun/2015  ERK Created
   */
  setProject : function(target, sPrjName) {
    // Get the <li>
    var listItem = $(target).parent();
    var strProject = $(target).text();
    // Make sure download info is hidden
    $("#project_download").addClass("hidden");
    // Look at all the <li> children of <ul>
    var listHost = listItem.parent();
    listHost.children('li').each(function() { $(this).removeClass("active")});
    // Set the "active" class for the one the user has selected
    $(listItem).addClass("active");
    // Make sure the active class is selected
    Crpstudio.project.currentPrj = sPrjName;
    // Also set the name of the currently selected project in a div
    $("#project_current").text(sPrjName);
    // And set the name of the project in the top-bar div
    $("#top_bar_current_project").text(sPrjName);
    // Status: indicate that we are loading the project
    $("#project_status").html("Loading project...");
    $("#project_description").html("<i>Please wait...</i>");
    // Make the General area invisible
    $("#project_general").addClass("hidden");
    // Issue a request to /crpstudio to load the project
    var params = "project=" + sPrjName + "&userid=" + Crpstudio.currentUser;
    params += "&type=info";
    Crpstudio.getCrpStudioData("load", params, Crpstudio.project.processLoad, "#project_description");
  },
  
  /**
   * processLoad
   *    What to do when a project has been loaded
   *    
   * @param {type} response   JSON object returned from /crpstudio/load
   * @param {type} target
   * @returns {undefined}
   */
  processLoad : function(response, target) {
		if (response !== null) {
      // Remove waiting
      $("#project_description").html("");
      // The response is a standard object containing "status" (code) and "content" (code, message)
      var oStatus = response.status;
      var sStatusCode = oStatus.code;
      var oContent = response.content;
      switch (sStatusCode) {
        case "completed":
          // Get the information passed on about this project
          var sName = oContent.name;
          var sAuthor = oContent.author;
          var sPrjType = oContent.prjtype;
          var sGoal = oContent.goal;
          var sDateCreated = oContent.datecreated;
          var sDateChanged = oContent.datechanged;
          var bShowSyntax = oContent.showsyntax;
          var sComments = oContent.comments;
          // Put the information on the correct places in the form
          $("#project_general_name").val(sName);
          $("#project_general_author").val(sAuthor);
          $("#project_general_prjtype").val(sPrjType);
          $("#project_general_goal").val(sGoal);
          $("#project_general_datecreated").html(sDateCreated);
          $("#project_general_datechanged").html(sDateChanged);
          if (bShowSyntax)
            $("#project_general_showsyn").addClass("checked");
          else
            $("#project_general_showsyn").removeClass("checked");
          $("#project_general_comments").val(sComments);
          
          // Make the General area visible again
          $("#project_general").removeClass("hidden");
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
			$("#project_status").html("ERROR - Failed to load the .crpx result from the server.");
		}    
  },
  
  /**
   * uploadCrpFile
   *    Ask user to upload a .crpx file
   * 
   * @param {type} el
   * @returns {undefined}
   */
  uploadCrpFile : function(el) {
    // Make sure download info is hidden
    $("#project_download").addClass("hidden");
    // Get the name of the file
    var oFile = el.files[0];
    // Use the standard readXmlFile function
		Crpstudio.readXmlFile(oFile, function(e) {
      // Get the text of the uploaded CRP into a variable
      var text = encodeURIComponent(e.target.result);
      // Signal what we are doing
      $("#project_description").html("Uploading...");
      // Send this information to the /crpstudio
      var params = "file=" + oFile.name + "&userid=" + Crpstudio.currentUser +
              "&crp=" + text;
      Crpstudio.getCrpStudioData("upload", params, Crpstudio.project.processUpLoad, "#project_description");
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
      $("#project_description").html("");
      // The response is a standard object containing "status" (code) and "content" (code, message)
      var oStatus = response.status;
      var sStatusCode = oStatus.code;
      var oContent = response.content;
      switch (sStatusCode) {
        case "completed":
          // If we have succesfully completed *uploading* a file to /crpstudio,
          //    then it must be added to the list
          var sPrjLine = oContent.prjline;
          var sCrpName = oContent.crpname;
          // Check if there is any reply
          // if (sPrjLine)
          //   $("#project_list").append(sPrjLine);
          if (sPrjLine) {
            // Walk the list of <li> elements
            var arPrjItem = $("#project_list").children();
            var liBef = null;
            // Skip 0,1,2 -- these are used for New project, Wizard and a dividing line
            for (var i=3;i<arPrjItem.size();i++) {
              // It must have a <a> child node
              if (arPrjItem[i].childNodes) {
                var aChild = arPrjItem[i].childNodes.item(0);
                // Should we put our project before this one?
                if (aChild.innerHTML.localeCompare(sCrpName)>0) {
                  // The list item must come before the current one
                  liBef = arPrjItem[i];break;
                }
              }              
            }
            // Did we find any?
            if (liBef === null) {
              // Append it
              $("#project_list").append(sPrjLine);
            } else {
              $(sPrjLine).insertBefore($(liBef));
            }
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
			$("#project_status").html("ERROR - Failed to load the .crpx result from the server.");
		}    
  },  
  /**
   * removeCrpFile
   *    Check which CRP is currently selected (if any)
   *    Then remove that CRP:
   *    (1) from the server --> POST to /crpstudio
   *    (2) from the list here --> done in callback
   * 
   * @param {type} elDummy
   * @returns {undefined}
   */
  removeCrpFile : function(elDummy) {
    // Make sure download info is hidden
    $("#project_download").addClass("hidden");
    // Find out which one is currently selected
    var sCrpName = Crpstudio.project.currentPrj;
    if (sCrpName && sCrpName !== "") {
      // Note: /crpstudio must check when the last download of this project was
      // Send this information to the /crpstudio
      var params = "crpname=" + sCrpName + "&userid=" + Crpstudio.currentUser;
      Crpstudio.getCrpStudioData("remove", params, Crpstudio.project.processRemove, "#project_description");      
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
      $("#project_description").html("");
      // The response is a standard object containing "status" (code) and "content" (code, message)
      var oStatus = response.status;
      var sStatusCode = oStatus.code;
      var oContent = response.content;
      switch (sStatusCode) {
        case "completed":
          // Find out which project has been removed
          var sCrpName = oContent.crpname;
          // Validate
          if (sCrpName) {
            // Remove the project from the list
            $("#project_list .crp_"+sCrpName).remove();
            // More sure project general is not displayed anymore
            $("#project_general").addClass("hidden");
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
   * downloadCrpFile
   *    Check which CRP is currently selected (if any)
   *    Then download that CRP:
   *    (1) from the server --> POST to /crpstudio
   * 
   * @param {type} elDummy
   * @returns {undefined}
   */
  downloadCrpFile : function(elDummy) {
    // Find out which one is currently selected
    var sCrpName = Crpstudio.project.currentPrj;
    if (sCrpName && sCrpName !== "") {
      // Note: /crpstudio must check when the last download of this project was
      // Send this information to the /crpstudio
      var params = "crpname=" + sCrpName + "&userid=" + Crpstudio.currentUser;
      Crpstudio.getCrpStudioData("download", params, Crpstudio.project.processDownload, "#project_description");      
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
            $("#project_download_file").html("<a href=\""+sFile + 
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
  setCorpus : function(sCorpusName, sDirName) {
    $("#top_bar_current_corpus").text(sCorpusName+":"+sDirName);
  },
  /* ---------------------------------------------------------------------------
   * Name: createManual
   * Goal: manually create a project
   * History:
   * 23/jun/2015  ERK Created
   */
  createManual : function(target) {
    // Make sure download info is hidden
    $("#project_download").addClass("hidden");
    // Get the <li>
    var listItem = $(target).parent();
    // Look at all the <li> children of <ul>
    var listHost = listItem.parent();
    listHost.children('li').each(function() { $(this).removeClass("active")});
    // Set the "active" class for the one the user has selected
    $(listItem).addClass("active");
    // Make sure the new project is being selected
    var strProject = "...name of this project";
    Crpstudio.project.currentPrj = strProject;
    // And set the name of the project in the top-bar div
    $("#top_bar_current_project").text("new...");
    // Adapt the text of the project description
    $("#project_description").html("<p>You have chosen: <b>" + strProject + "</b></p>");
  },
  /* ---------------------------------------------------------------------------
   * Name: createWizard
   * Goal: create a project through a wizard
   * History:
   * 23/jun/2015  ERK Created
   */
  createWizard : function(target) {
    // Make sure download info is hidden
    $("#project_download").addClass("hidden");
    // Get the <li>
    var listItem = $(target).parent();
    // Look at all the <li> children of <ul>
    var listHost = listItem.parent();
    listHost.children('li').each(function() { $(this).removeClass("active")});
    // Set the "active" class for the one the user has selected
    $(listItem).addClass("active");
    // Make sure the new project is being selected
    var strProject = "...name of this project (wizard)";
    Crpstudio.project.currentPrj = strProject;
    // And set the name of the project in the top-bar div
    $("#top_bar_current_project").text("wizard...");
    // Adapt the text of the project description
    $("#project_description").html("<p>You have chosen: <b>" + strProject + "</b></p>");
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
	},
  

  /* ---------------------------------------------------------------------------
   * Name: editQC
   * Goal: Start editing the indicated QC line
   * History:
   * 29/jun/2015  ERK Created
   */
  editQC : function(iQC) {
    // TODO: implement
  }
	  
};
