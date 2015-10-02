/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */

/*globals jQuery, crpstudio, Crpstudio, alert: false, */
var crpstudio = (function ($, crpstudio) {
  "use strict";
  crpstudio.project = (function () {
    // Methods tdbahat are local to [crpstudio.project]
    var private_methods = {
      
    };
    // Methods that are exported by [crpstudio.project] for others
    return {
      
    };
  }($, crpstudio.config));
  
  return crpstudio;
  
}(jQuery, window.crpstudio || {}));

Crpstudio.project = {
  // Local variables within Crpstudio.project
  tab : "project",        // The main tab we are on (equals to "project_editor")
  currentPrj: "",         // The currently being executed project (the CRP name)
  currentLng: "",         // the "lng" parameter of the current project
  currentDir: "",         // the "dir" parameter of the current project
  currentDb: "",          // The database that serves as current input
  currentDbLng: "",       // Language according to current db
  currentDbDir: "",       // Part of language for current db
  strQstatus: "",         // The JSON string passed on to R-server "status"
  divStatus: "",          // The name of the div where the status is to be shown
  recentcrp: "",          // Recently used CRP
  interval: 200,          // Number of milliseconds
  typingTimer: null,      // Timer to make sure we react only X seconds after typing
  doneTypingIntv: 2000,   // Stop-typing interval: 2 seconds
  ctlCurrent: null,       // Current control
  prj_name: "",           // Field value of this project: name
  prj_author: "",         // Field value of this project: author
  prj_prjtype: "",        // Field value of this project: prjtype
  prj_goal: "",           // Field value of this project: goal
  prj_dbaseinput: "",     // Field value of this project: dbaseinput (True/False)
  prj_comments: "",       // Field value of this project: comments
  prj_language: "",       // Field value of this project: comments
  prj_part: "",           // Field value of this project: comments
  prj_dbase: "",          // Field value of this project: comments
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
      var sLng = oCorpusAndDir[0];    // obligatory
      var sDir = oCorpusAndDir[1];    // May be empty
      var sDbase = oCorpusAndDir[2];  // May be empty -- is input database
      var oExeRequest = {};
      // Store these values for posterity (well, for /update requests)
      Crpstudio.project.currentDir = sDir;
      Crpstudio.project.currentLng = sLng;
      Crpstudio.project.currentDb = sDbase;
      // debugging: show where the status appears
      $("#project_status").text("Processing project: " + sPrjName);
      $("#result_status").text("");
      // Switch off export
      for (var i=1;i<=4;i++) { $("#results_export_"+i).addClass("hidden"); }
      // switch to the result tab
      Crpstudio.project.switchTab("result_display");
      $("#result_status").text("");
      // Make sure the execute buttons are hidden again
      Crpstudio.project.showExeButtons(false);
      // Create JSON request for the search
      if (sDir === "") {
        if (sDbase === "")
          oExeRequest = {"lng": sLng, "crp": sPrjName, "userid": sUserName, "cache": caching};
        else
          oExeRequest = {"lng": sLng, "crp": sPrjName, "dbase": sDbase, "userid": sUserName, "cache": caching};
      } else {
        if (sDbase ==="")
          oExeRequest = {"lng": sLng, "crp": sPrjName, "dir": sDir, "userid": sUserName, "cache": caching};
        else
          oExeRequest = {"lng": sLng, "crp": sPrjName, "dir": sDir, "dbase": sDbase, "userid": sUserName, "cache": caching};
      }
      var sExeRequest = "query=" + JSON.stringify(oExeRequest);
      // Set the location of the status div
      Crpstudio.project.divStatus = "#result_report";
      // Methode #1: Initiate the search by sending a request to /crpp/exe?{...}
      // Crpstudio.postRequest("exe", sExeRequest, Crpstudio.project.processExeCrpp, "#result_status");
      // Method #2: send the request to /crpstudio/exe?{...}
      Crpstudio.getCrpStudioData("exe", sExeRequest, Crpstudio.project.processExeCrpStudio, "#result_status");
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
        };
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
   *        prjlist - adapted "crp-available" list if job was completed
   *        recent  - adapted "crp-recent" item if job was completed
   *        
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
    $(target).html(statusCode);
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
        };
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
        // Access the content
        var oContent = oResponse.content;
        // Adapt the CRP-AVAILABLE list
        $("#project_list .crp-available").not(".divider").not(".heading").remove();
        $("#project_list .crp-available").last().after(oContent.prjlist);
        // ADAPT the CRP-RECENT
        $("#project_list .crp-recent").not(".divider").not(".heading").remove();
        $("#project_list .crp-recent").last().after(oContent.recent);
        // And more completion
        $(target).html("");
        // Make sure the results are visible
        $("#results").removeClass("hidden");
        $("#results").addClass("active");
        Crpstudio.result.selectResults('querylines');
        break;
      case "error":
        // Switch off the progress indicator
        $("#result_progress").addClass("hidden");
        // But make the "fetching" section available
        $("#result_fetching").removeClass("hidden");        // Provide an error report
        if (oStatus.message !== "") {
          var sReport = [];
          // Try to unpack the status
          var arMsgs = oStatus.message.split("\n");
          if (arMsgs.length>0) {
            var sFirstMsg = arMsgs[0];
            // Is this JSON?
            if (sFirstMsg.charAt(0) === "{") {
              var oMsgLine = JSON.parse(sFirstMsg);
              // Can we do with this object?
              if (oMsgLine.Type && oMsgLine.Name) {
                // Use oMsgContent for compatibility with the alternative below
                var oMsgContent = oMsgLine;
                sReport.push("<div class=\"status-error large-10 medium-10 small-10 columns\"><h4>Error report:</h4><table>");
                for (var propThis in oMsgContent) {
                  sReport.push("<tr><td>"+propThis+"</td><td>"+oMsgContent[propThis]+"</td></tr>");
                }
                sReport.push("</table></div>");
              } else {
                // Get the "msg" part
                if (oMsgLine.msg) {
                  var sMsgContent = oMsgLine.msg;
                  // Is this JSON?
                  if (sMsgContent.charAt(0) === "{") {
                    var oMsgContent = JSON.parse(sMsgContent);
                    sReport.push("<div class=\"status-error large-10 medium-10 small-10 columns\"><h4>Error report:</h4><table>");
                    for (var propThis in oMsgContent) {
                      sReport.push("<tr><td>"+propThis+"</td><td>"+oMsgContent[propThis]+"</td></tr>");
                    }
                    sReport.push("</table></div>");
                  }
                }
              }
            }
          } 
          if (!sReport || sReport === null || sReport.length === 0)
            sReport.push(statusMsg);
          // Show the report
          $(target).html(sReport.join("\n"));
        } else {
          $(target).prepend("There was an error:");
        }
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
        html = Crpstudio.project.makeTablesView2(oContent.table);
        // Position this table in the div for view=2 (per-document view)
        $("#result_table_2").html(html);
        
        // Keep track of the status
        $("#result_status").html("Constructing per-hit results...")
        // Show the time of this search
        $("#results_info_5").html("<p>Search time: <b>"+(oContent.searchTime / 1000)+" s.</b></p>");
        // Create an initial table for view=1: the 'hits'
        html = Crpstudio.project.makeTablesView1(oContent.table);
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
  makeTablesView1: function(arTable) {
    var html = [];
    // This is for viewe #1
    var iView = 1;
    // Interpret and show the resulting table
    // The 'table' is an array of QC elements
    for (var i=0; i< arTable.length; i++) {
      // Get this QC element
      var oQC = arTable[i];
      // Get the QC elements
      var arSubs = oQC.subcats;
      var iQC = oQC.qc;
      // Each QC result must be in its own div
      html.push("<div id=\"result_"+iView+"_qc"+iQC+"\" class=\"result-qc hidden\">");
      // Insert a heading for this QC item
      // html.push("<h5>QC "+iQC + "</h5>");
      // Set up a table for the sub-categories
      html.push("<table><thead><th>TOTAL</th>");
      for (var j=0;j<arSubs.length; j++) {
        html.push("<th>" + arSubs[j] + "</th>");
      }
      // Finish the header with sub-categories
      html.push("</thead>");
      // Start the table body
      html.push("<tbody>");
      var sAnyRowArg = "class=\"concordance\" onclick=\"Crpstudio.result.showFileHits";
      // Show the one row with results for all files together
      var iCount = oQC.counts[i];
      var iStart = 1;
      var sId = "fh_"+iView+"_qc"+iQC+"_f"+j; 
      var arSubCounts = oQC.counts;
      var sRowArgs = sAnyRowArg + 
              "("+iStart+","+iCount+",'',"+iQC+",'','#"+sId+"');\"";
      html.push("<tr "+sRowArgs+">");
      html.push("<td>"+iCount+"</td>");
      for (var k=0;k<arSubCounts.length; k++ ) {
        html.push("<td>"+arSubCounts[k]+"</td>");
      }
      html.push("</tr>");
      // Determine the @id for this result
      var iCols = 1+arSubCounts.length;
      // Make a row where the citation will be placed
      html.push("<tr class=\"citationrow hidden\"><td colspan="+iCols+">"+
              "<div class=\"collapse inline-concordance\" id=\""+sId+
              "\">Loading...</div></td></tr>")
      // Finish the table
      html.push("</tbody></table>");
      // Finish the div
      html.push("</div>")
      
      // Make tables for each sub category under this iQC
      for (var j=0;j<arSubs.length; j++) {
        html.push("<div id=\"result_"+iView+"_qcsub_"+iQC+"_"+j+"\" class=\"result-qc-sub hidden\">")
        // Set the heading for this table
        html.push("<table><thead><th>"+arSubs[j]+"</th></thead>");
        // Start the table body
        html.push("<tbody>");
        // One row for the hit-total
        iStart = 1;
        // Determine the @id for this result
        sId = "fh_"+iView+"_qc"+iQC+"_f"+k+"_s"+j;
        sRowArgs = sAnyRowArg  + 
                "("+iStart+","+arSubCounts[j]+",'',"+iQC+",'"+arSubs[j]+"','#"+sId+"');\"";
        html.push("<tr "+sRowArgs+">");
        html.push("<td>"+arSubCounts[j]+"</td></tr>");
        // Make a row where the citation will be placed
        html.push("<tr class=\"citationrow hidden\"><td>"+
                "<div class=\"collapse inline-concordance\" id=\""+sId+
                "\">Loading...</div></td></tr>")
        // Finish this sub-cat-table
        html.push("</tbody></table></div>")
      }
    }
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
  makeTablesView2: function(arTable) {
    var html = [];
    // this is for view #2
    var iView = 2;
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
      html.push("<div id=\"result_"+iView+"_qc"+iQC+"\" class=\"result-qc hidden\">");
      // Insert a heading for this QC item
      // html.push("<h5>QC "+iQC + "</h5>");
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
        html.push("<div id=\"result_"+iView+"_qcsub_"+iQC+"_"+j+"\" class=\"result-qc-sub hidden\">")
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
   * 04/aug/2015  ERK Added "sRecentCrp" argument
   */
	switchTab : function(target, sRecentCrp) {
		Crpstudio.debug("switching to search tab "+target+" from "+Crpstudio.project.tab);
		if (target !== Crpstudio.project.tab) {
      // Bookkeeping
			$("#search .content").removeClass("active");
			$("#"+target).addClass("active");
			$("#subnav dd").removeClass("active");
			$("#"+target+"_link").addClass("active");
      // Make sure the global variable is set correctly
      Crpstudio.project.tab = target;
      // Action depends on target 
      switch (target) {
        case "project_executor":
          // Hide the metadata selector
  				$("#metadata").hide();
          // Hide CORPUS SELECTOR and DBASE SELECTOR
          $("#corpus-selector").hide();
          $("#dbase-selector").hide();
          break;
        case "project_editor":
        case "project":
          // Make sure the execute buttons are shown
          Crpstudio.project.showExeButtons(true);
          // Hide the metadata selector
  				$("#metadata").hide();
          // Possibly hide the lng/corpus selector
          if (Crpstudio.project.currentLng && Crpstudio.project.currentLng !== "") {
            // Hide it
            $("#corpus-selector").hide();
          }
          // Hide DBASE SELECTOR
          $("#dbase-selector").hide();
          // Do we have a 'recent' CRP?
          if (sRecentCrp && sRecentCrp !== "") {
            // Show the recent ones
            $("#project_list li .crp-recent").show();
            Crpstudio.project.recentcrp = sRecentCrp;
          } 
          /* Don't do anything with hiding
          else {
            // Just hide the recent ones
            $("#project_list li .crp-recent").hide();
            // But DON'T whipe it!!!
            // Crpstudio.project.recentcrp = "";
          } */
          break;
        case "input_editor": 
        case "input":
          /* =========== META selection is for the future
          // Make sure the metadata selector is being shown
  				$("#metadata").show();
              */
          // Show the database selector if this is a database-input 
          if (Crpstudio.dbaseInput) {
            $("#dbase-selector").show();
            // Hide the corpus selector
            $("#corpus-selector").hide();
            // Figure out which dbase to show as selected
            if (Crpstudio.project.currentDb && Crpstudio.project.currentDb!=="") {
              // Select the one with this database setting
              $("#input_dbase option").filter(
                      function(i,e) {
                        var strText = $(e).val();
                        var arText = strText.split(":");
                        return arText[0] === Crpstudio.project.currentDb; 
                      }).prop("selected", true);
              // Select the option that starts with the corpus name
              // $('#input_dbase option[value ^= "' + Crpstudio.project.currentDb+ '"]').attr("selected", true);
              // Note: this is possible, but less well
            } else {
              // User must select: deselect everything
              $("#input_dbase option:selected").attr("selected", false);
            }
          } else {
            // Show the corpus selector
            $("#corpus-selector").show();
            // Hide the database selector
            $("#dbase-selector").hide();
            // Start by deselecting everything
            $("#input_lng option:selected").attr("selected", false);
            // Do we have a 'current' corpus?
            var sLng = Crpstudio.project.currentLng;
            if (sLng && sLng !== "") {
              // There is a current language specified
              var sDir = Crpstudio.project.currentDir;
              if (sDir && sDir !== "") {
                // A sub-part of the corpus is specified
                $("#input_lng").val(sLng + ":" + sDir);
              } else {
                // No sub-part of the corpus is specified
                $("#input_lng").val(sLng).first();
                // Now we need to set the global sDir variable
                var arCrp = $("#input_lng").val().split(":");
                Crpstudio.project.currentDir = arCrp[1];
              }
            }
          }
          break;
        case "result_display":
          // Hide the metadata
  				$("#metadata").hide();
          // Hide CORPUS SELECTOR
          $("#corpus-selector").hide();
          $("#dbase-selector").hide();            
          // Make sure the execute buttons are hidden
          Crpstudio.project.showExeButtons(false);
          // Other actions
          $(".sub-nav dd").removeClass("active");
          $("#result_link").removeClass("hide");
          $("#result_link").addClass("active");
          break;
        case "document_display":
          // Hide the metadata
  				$("#metadata").hide();
          // Hide CORPUS SELECTOR
          $("#corpus-selector").hide();
          $("#dbase-selector").hide();            
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
			
		}
	},
  
  /* ---------------------------------------------------------------------------
   * Name: setProject
   * Goal: the user chooses a project, so act on this
   * History:
   * 23/jun/2015  ERK Created
   * 04/aug/2015  ERK Added "sLng" and "sDir" arguments
   * 29/sep/2015  ERK Added "sDbase" argument
   */
  setProject : function(target, sPrjName, sLng, sDir, sDbase) {
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
    // EXTINCT: $("#project_status").html("Loading project...");
    $("#project_description").html("<i>Please wait...</i>");
    // Make the General area INvisible
    $("#project_general").addClass("hidden");
    /*
    // Possibly correct Dbase, Lng and Dir
    if (Crpstudio.project.prj_language !== "") sLng = Crpstudio.project.prj_language;
    if (Crpstudio.project.prj_part !== "") sDir = Crpstudio.project.prj_part;
    if (Crpstudio.project.prj_dbase !== "") sDbase = Crpstudio.project.prj_dbase;
    */
    // Do we have a lng (+ optional dir)?
    if ((!sLng || sLng === "") && Crpstudio.project.prj_language ==="") {
      // Show the corpus-selector
      $("#corpus-selector").show();
      // Reset the lng + dir
      Crpstudio.project.setCorpus("");
    } else {
      // Make sure sDir is defined
      if (!sDir) sDir = "";
      // Set the lng + dir
      Crpstudio.project.setCorpus(sLng, sDir);
      // Set the correct option within the 'corpus-selector'
      var sOption = sLng + ":" + sDir + ":" + sDbase;
      $("#input_lng").val(sOption);
      // Hide the corpus-selector
      // $("#corpus-selector").hide();
    }
    if (!sDbase || sDbase === "") {
      Crpstudio.project.resetDbase();
    } else {
      Crpstudio.project.setDbase(sDbase, sLng, sDir, false);
    }
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
          var sName = oContent.name; Crpstudio.project.prj_name = sName;
          var sAuthor = oContent.author; Crpstudio.project.prj_author = sAuthor;
          var sPrjType = oContent.prjtype; Crpstudio.project.prj_prjtype = sPrjType;
          var sGoal = oContent.goal; Crpstudio.project.prj_goal = sGoal;
          var sDateCreated = oContent.datecreated; 
          var sDateChanged = oContent.datechanged;
          var bShowSyntax = oContent.showsyntax;
          var bDbaseInput = oContent.dbaseinput; Crpstudio.project.prj_dbaseinput = bDbaseInput
          var sComments = oContent.comments; Crpstudio.project.prj_comments = sComments;
          var sLanguage = oContent.language; Crpstudio.project.prj_language = sLanguage;
          var sPart = oContent.part; Crpstudio.project.prj_part = sPart;
          var sDbase = oContent.dbase; Crpstudio.project.prj_dbase = sDbase;
          // Experimental
          var iDefCount = oContent.deflist.length;
          var iQryCount = oContent.qrylist.length;
          var iQcCount = oContent.qclist.length;
          var iDbfCount = oContent.dbflist.length;
          $("#project_status").html("defs=" + iDefCount + " qrys=" + iQryCount +
                  " QCs=" + iQcCount + " dbfeatures=" + iDbfCount);
          if (sLanguage !== "")
            Crpstudio.project.setCorpus(sLanguage, sPart);
          // Put the information on the correct places in the form
          $("#project_general_name").val(sName);
          $("#project_general_author").val(sAuthor);
          $("#project_general_prjtype").val(sPrjType.toLowerCase());
          // Reset dbase by default
          Crpstudio.project.resetDbase();
          if (bDbaseInput === "True") {
            $("#project_general_dbase").prop("checked", true);
            Crpstudio.dbaseInput = true;
            // Check if a database is already specified as input
            if (sDbase) Crpstudio.project.setDbase(sDbase);
          } else {
            $("#project_general_dbase").prop("checked", false);
            Crpstudio.dbaseInput = false;
          }
          $("#project_general_goal").val(sGoal);
          $("#project_general_datecreated").html(sDateCreated);
          $("#project_general_datechanged").html(sDateChanged);
          if (bShowSyntax)
            $("#project_general_showsyn").addClass("checked");
          else
            $("#project_general_showsyn").removeClass("checked");
          $("#project_general_comments").val(sComments);
          
          // Add event handlers on all INPUT elements under "project_general"
          $("#project_general input").on("change keydown paste input", 
            function() {Crpstudio.project.ctlTimer(this, "input");});
          $("#project_general input").on("blur", 
            function() {Crpstudio.project.ctlChanged(this, "blurInput");});
            
          // Add event handlers on all TEXTAREA elements under "project_general"
          $("#project_general textarea").on("change keydown paste input", 
            function() {Crpstudio.project.ctlTimer(this, "textarea");});
          $("#project_general textarea").on("blur", 
            function() {Crpstudio.project.ctlChanged(this, "blurTextarea");});
            
          // Add event handlers on all SELECT elements under "project_general"
          $("#project_general select").on("change keydown paste input", 
            function() {Crpstudio.project.ctlTimer(this, "select");});
          $("#project_general select").on("blur", 
            function() {Crpstudio.project.ctlChanged(this, "blurSelect");});
            
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
   * processCrpChg
   *    Process the reply when changes have been made
   *    
   * @param {type} response   JSON object returned from /crpstudio/crpchg
   * @param {type} target
   * @returns {undefined}
   */
  processCrpChg : function(response, target) {
		if (response !== null) {
      // Remove waiting
      $("#project_description").html("");
      // The response is a standard object containing "status" (code) and "content" (code, message)
      var oStatus = response.status;
      var sStatusCode = oStatus.code;
      var oContent = response.content;
      switch (sStatusCode) {
        case "completed":
          // Have changes been made?
          if (oContent.changed) {
            // Get the information passed on about this project
            var sDateChanged = oContent.datechanged;
            // Get the CRP for which this was done
            var sCrpChanged = oContent.crp;
            if (sCrpChanged === Crpstudio.project.currentPrj) {
              // Put the information on the correct places in the form
              $("#project_general_datechanged").html(sDateChanged);
            }
            // Show that changes have been made
            $("#top_bar_saved_project").html(sCrpChanged);
            $("#top_bar_saved_project").parent().removeClass("hidden");
            // Wait for some time and then show it again
            setTimeout(function() {$("#top_bar_saved_project").parent().addClass("hidden");}, 700);
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
			$("#project_status").html("Server problem - Failed to process changes in the CRP.");
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
            // Walk the list of <li> elements with class "crp-available"
            var arPrjItem = $("#project_list .crp-available").not(".divider").not(".heading");
            var liBef = null;
            // Start from 0: we are in our own 'section' of "crp-available"
            for (var i=0;i<arPrjItem.size();i++) {
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
              // Append it after the divider and heading crp-available
              $("#project_list .crp-available").last().append(sPrjLine);
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
            // $("#project_general").addClass("hidden");
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
   * setCorpus
   *    Set the corpus language (sCorpusName) and the part of the language 
   *    that serves as input (sDirName)
   * 
   * @param {type} sCorpusName
   * @param {type} sDirName
   * @returns {undefined}
   */
  setCorpus : function(sCorpusName, sDirName) {
    if (!sDirName && sCorpusName && sCorpusName === "") {
      // Reset the corpus name and dir name in the top section
      $("#top_bar_current_corpus").text("-");
    } else {
      // Set the corpus name and dir name in the top section
      $("#top_bar_current_corpus").text(sCorpusName+":"+sDirName);
      // Set these values also in our own variables
      Crpstudio.project.currentDir = sDirName;
      Crpstudio.project.currentLng = sCorpusName;
      
      // Hide the corpus selector if we are in project mode
      switch (Crpstudio.project.tab) {
        case "project_editor":
        case "project":
          // Hide the corpus selector
          $("#corpus-selector").hide();
          break;
        case "input_editor":
        case "input":
          // Pass on this value to /crpstudio and to /crpp
          var sKey = "corpus";
          var sValue = sCorpusName + ":" + sDirName;
          var oChanges = { "crp": Crpstudio.project.currentPrj,
            "userid": Crpstudio.currentUser, 
            "key": sKey, "value": sValue };
          var params = "changes=" + JSON.stringify(oChanges);
          Crpstudio.getCrpStudioData("crpchg", params, Crpstudio.project.processCrpChg, "#project_description");              
        default:
          // No particular action right now
          break;
      }
    }
  },
  
  /**
   * setDbase -- select the indicated database as input
   * 
   * @param {type} sDbName
   * @param {type} sLngName
   * @param {type} sDirName
   * @param {type} bChange
   * @returns {undefined}
   */
  setDbase : function(sDbName, sLngName, sDirName, bChange) {
    // Set the corpus name and dir name in the top section
    $("#top_bar_current_dbase").text(sDbName);
    // Set these values also in our own variables
    Crpstudio.project.currentDb = sDbName;
    if (sLngName) Crpstudio.project.currentDbLng = sLngName;
    if (sDirName) Crpstudio.project.currentDbDir = sDirName;
    // Make sure CHANGES are only passed on as /crpchg where this is intended
    if (bChange) {
      // Pass on this value to /crpstudio and to /crpp
      var sKey = "source";
      var sValue = sDbName;
      var oChanges = { "crp": Crpstudio.project.currentPrj,
        "userid": Crpstudio.currentUser, 
        "key": sKey, "value": sValue };
      var params = "changes=" + JSON.stringify(oChanges);
      Crpstudio.getCrpStudioData("crpchg", params, Crpstudio.project.processCrpChg, "#project_description");      
    }
  },
  /**
   * resetDbase -- reset the current database input
   * 
   * @returns {undefined}
   */
  resetDbase : function() {
    // Set the corpus name and dir name in the top section
    $("#top_bar_current_dbase").text("");
    // Set these values also in our own variables
    Crpstudio.project.currentDb = "";    
  },
  
  /**
   * setPrjType
   *    Set the project type
   *    
   * @param {type} sPrjType
   * @returns {undefined}
   */
  setPrjType : function(sPrjType) {
    // Pass on this value to /crpstudio and to /crpp
    /*
    var params = "crpname=" + Crpstudio.project.currentPrj + "&userid=" + Crpstudio.currentUser +
            "&key=prjtype&value="+sPrjType;
    Crpstudio.getCrpStudioData("crpchg", params, Crpstudio.project.processCrpChg, "#project_general_prjtype");      
    */
    // New method
    Crpstudio.project.ctlCurrent = $("#project_general_prjtype");
    // Crpstudio.project.ctlTimer($("#project_general_prjtype"));
    Crpstudio.project.ctlTimer($("#project_general_prjtype", "-"));
  },
    
  /**
   * ctlChange
   *    Process changes in the <input>, which is 'source'
   *    
   * @param {type} source
   * @returns {undefined}
   */
  ctlChanged : function(source, sType) {
    // Validate source
    if (!source || source == null) source = Crpstudio.project.ctlCurrent;
    // Clear any previously set timer
    clearTimeout(Crpstudio.project.typingTimer);
    // Find parameters
    var sKey = "";
    var sValue = $(source).val();
    var sKind = (sType && sType != null) ? sType : "-";
    // Determine which 'key' this is
    switch($(source).attr("id")) {
      case "project_general_name": 
        if (sValue === Crpstudio.project.prj_name) return; 
        else Crpstudio.project.prj_name = sValue;
        sKey = "Name"; 
        break;
      case "project_general_author": 
        if (sValue === Crpstudio.project.prj_author) return; 
        else Crpstudio.project.prj_author = sValue;
        sKey = "Author"; break;
      case "project_general_goal": 
        if (sValue === Crpstudio.project.prj_goal) return; 
        else Crpstudio.project.prj_goal = sValue;
        sKey = "Goal"; break;
      case "project_general_comments": 
        if (sValue === Crpstudio.project.prj_comments) return; 
        else Crpstudio.project.prj_comments = sValue;
        sKey = "Comments"; break;
      case "project_general_prjtype": 
        if (sValue === Crpstudio.project.prj_prjtype) return; 
        else Crpstudio.project.prj_prjtype = sValue;
        sKey = "ProjType"; break;
      case "project_general_dbase": 
        sKey = "DbaseInput"; 
        sValue = ($(source).is(':checked')) ? "True" : "False"; 
        if (sValue === Crpstudio.project.prj_dbaseinput) return; 
        else Crpstudio.project.prj_dbaseinput = sValue;
        // ================ DEBUG ===============
        Crpstudio.debug("ctlChanged [" + $(source).attr("id") + "] val=[" + sValue + "] type=[" + sKind + "]");
        // ======================================
        // Make this choice available globally
        Crpstudio.dbaseInput = (sValue === "True");
        // If we are changing to "False", then reset the database specifications
        if (sValue === "False") {
          Crpstudio.project.resetDbase();
        } else {
          // Guide the user to the input specification  page
          Crpstudio.project.switchTab("input");
        }
        break;
      default:
        // Show the source of the key absence
        Crpstudio.debug("ctlChanged cannot handle: [" + $(source).attr("id") + "]");
        return;
    }
    // ===== DEBUGGING ====
    if (sKey === "source") {
      Crpstudio.debug("crpchgDD source to: " + sValue);
    }
    // ====================
    // Pass on this value to /crpstudio and to /crpp
    var oChanges = { "crp": Crpstudio.project.currentPrj,
      "userid": Crpstudio.currentUser, 
      "key": sKey, "value": sValue };
    var params = "changes=" + JSON.stringify(oChanges);
    Crpstudio.getCrpStudioData("crpchg", params, Crpstudio.project.processCrpChg, "#project_description");      
  },
  /**
   * ctlTimer
   *    Call the function ctlChanged(), but only after a fixed time
   *    of inactivity (not typing) has taken place
   *    
   * @param {type}   source
   * @param {string} sType
   * @returns {undefined}
   */
  ctlTimer : function(source, sType) {
    // Clear any previously set timer
    clearTimeout(Crpstudio.project.typingTimer);
    // =============== DEBUG =========
    Crpstudio.debug("ctlTimer: cleared");
    // ===============================
    // Some controls require immediate action
    switch ($(source).attr("id")) {
      case "project_general_dbase": 
        var sValue = ($(source).is(':checked')) ? "True" : "False"; 
        // Only continue if there is a CHANGE
        if (sValue === Crpstudio.project.prj_dbaseinput) return; 
        // Make sure the change is recorded globally
        Crpstudio.dbaseInput = (sValue === "True");
        // If we are changing to "False", then reset the database specifications
        if (sValue === "False") {
          Crpstudio.project.resetDbase();
        } else {
          // Guide the user to the input specification  page
          Crpstudio.project.switchTab("input_editor");
        }
        break;
    }
    // Set the source
    Crpstudio.project.ctlCurrent = source;
    // Call a new timer
    Crpstudio.project.typingTimer = setTimeout(Crpstudio.project.ctlChanged, 
      Crpstudio.project.doneTypingIntv, source, sType);
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
  
  /**
   * sideToggle
   *    Toggle the visibility of the <li> items with the indicated class name
   *    
   * @param {type} target
   * @param {type} sSection
   * @returns {undefined}
   */
  sideToggle : function(target, sSection) {
    $(target).parent().children("."+sSection+":not(.heading):not(.divider)").toggleClass("hidden");
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
    Crpstudio.setNavigationSize();
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
