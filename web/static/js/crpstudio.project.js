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
  currentCorpus: "",      // Currently selected corpus
  currentPrj: "",         // The currently being executed project (the CRP name)
  currentLng: "",         // the "lng" parameter of the current project
  currentDir: "",         // the "dir" parameter of the current project
  currentDb: "",          // The database that serves as current input
  currentDbLng: "",       // Language according to current db
  currentDbDir: "",       // Part of language for current db
  currentQry: -1,         // The QueryId of the currently selected query
  currentDef: -1,         // The DefId of the currently selected Definition
  currentQc: -1,          // The QCid of the currently selected QC
  currentDbf: -1,         // The DbFeatId of the currently selected dbfeat
  strQstatus: "",         // The JSON string passed on to R-server "status"
  divStatus: "",          // The name of the div where the status is to be shown
  recentcrp: "",          // Recently used CRP
  interval: 200,          // Number of milliseconds
  typingTimer: null,      // Timer to make sure we react only X seconds after typing
  doneTypingIntv: 2000,   // Stop-typing interval: 2 seconds
  ctlCurrent: null,       // Current control
  cmQuery: null,
  cmDef: null,
  prj_name: "",           // Field value of this project: name
  prj_author: "",         // Field value of this project: author
  prj_prjtype: "",        // Field value of this project: prjtype
  prj_goal: "",           // Field value of this project: goal
  prj_dbaseinput: "",     // Field value of this project: dbaseinput (True/False)
  prj_comments: "",       // Field value of this project: comments
  prj_language: "",       // Field value of this project: comments
  prj_part: "",           // Field value of this project: comments
  prj_dbase: "",          // Field value of this project: comments
  prj_deflist: null,      // Field value of this project: list of definitions
  prj_qrylist: null,      // Field value of this project: list of queries
  prj_qclist: null,       // Field value of this project: list of QC elements
  prj_dbflist: null,      // Field value of this project: list of database features
  qry_current: null,      // Currently loaded Query object
  def_current: null,      // Currently loaded Definition object
  dbf_current: null,      // Currently loaded DbFeat object
  qc_current: null,       // Currently loaded QC object (constructor)
  
  // Object defining the elements of Query, Definition, DbFeat and Constructor
  prj_access: [
    {name: "query", id: "QueryId", listfield: "Name", descr: "query_description", prf: "qry",
      gen: "query_general", cur: "qry_current", fields: [
          { field: "Name", type: "txt", loc: "query_general_name"}, 
          { field: "File", type: "txt", loc: ""}, 
          { field: "Goal", type: "txt", loc: "query_general_goal"}, 
          { field: "Comment", type: "txt", loc: "query_general_comment"}, 
          { field: "Text", type: "txt", loc: "query_general_text"}, 
          { field: "Created", type: "cap", loc: "query_general_datecreated"}, 
          { field: "Changed", type: "cap", loc: "query_general_datechanged"}]},
    {name: "definition",id: "DefId", listfield: "Name", descr: "def_description",  prf: "def",
      gen: "def_general", cur: "def_current", fields: [
          { field: "Name", type: "txt", loc: "def_general_name"}, 
          { field: "File", type: "txt", loc: ""}, 
          { field: "Goal", type: "txt", loc: "def_general_goal"}, 
          { field: "Comment", type: "txt", loc: "def_general_comment"}, 
          { field: "Text", type: "txt", loc: "def_general_text"}, 
          { field: "Created", type: "cap", loc: "def_general_datecreated"}, 
          { field: "Changed", type: "cap", loc: "def_general_datechanged"}]},
    {name: "dbfeat", id: "DbFeatId", listfield: "Name", descr: "dbf_description",  prf: "dbf",
      gen: "dbf_general", cur: "dbf_current", fields: [
          { field: "Name", type: "txt", loc: "dbf_general_name"}, 
          { field: "Pre", type: "txt", loc: "dbf_general_pre"}, 
          { field: "QCid", type: "txt", loc: "dbf_general_qcid"}, 
          { field: "FtNum", type: "txt", loc: "dbf_general_ftnum"}]},
    {name: "constructor", id: "QCid", listfield: "Result", descr: "qc_description",  prf: "qc",
      gen: "qc_general", cur: "qc_current", fields: [
          { field: "Input", type: "txt", loc: "qc_general_input"}, 
          { field: "Query", type: "txt", loc: "qc_general_query"}, 
          { field: "Output", type: "txt", loc: "qc_general_output"}, 
          { field: "Result", type: "txt", loc: "qc_general_result"}, 
          { field: "Cmp", type: "txt", loc: "qc_general_cmp"}, 
          { field: "Mother", type: "txt", loc: "qc_general_mother"}, 
          { field: "Goal", type: "txt", loc: "qc_general_goal"}, 
          { field: "Comment", type: "txt", loc: "qc_general_comment"}]}
  ],
  // Define Xquery highlighting styles
  cmStyle1 : {            
    lineNumbers: true,     matchBrackets: true,  continuousScanning: false, 
    lineWrapping: true,    indentUnit: 2,        tabSize: 2,
    cursorScrollMargin: 2, resetSelectionOnContextMenu: false,
    theme: "xq-light2"
  },
  cmStyle2 : {
    lineNumbers: true,     matchBrackets: true,  continuousScanning: false, 
    lineWrapping: true,    indentUnit: 2,        tabSize: 2,
    cursorScrollMargin: 2, resetSelectionOnContextMenu: false,
    theme: "xq-light"
  },
  
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
      var sLng = Crpstudio.project.currentLng;
      var sDir = Crpstudio.project.currentDir;
      var sDbase = Crpstudio.project.currentDb;
      // Validate
      if (!sLng || sLng === "") {
        // Language needs to be set
        $("#project_status").text("First set language");
        $("#input_status").text("First set language");
        // Switch to the language stuff
        Crpstudio.project.switchTab("input");
        return;
      }
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
      // Start creating a request object
      var oExeRequest = {};
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
        // The actual message code should be in the content
        var oContent = oResponse.content;
        
        if (oContent.message !== "") {
          var sReport = [];
          // Try to unpack the status
          var arMsgs = oContent.message.split("\n");
          var sFirstMsg = arMsgs[0];
          var oMsgLine = null;
          // Is this a JSON array?
          if (sFirstMsg.charAt(0) === "[") {
            // Assume this is a JSON array, so get the first item
            oMsgLine = JSON.parse(sFirstMsg)[0];
          } else if (sFirstMsg.charAt(0) === "{") {
            oMsgLine = JSON.parse(sFirstMsg);
          }
          // Validate
          if (oMsgLine !== null) {
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
      // Initially hide *all* SELECTORs
      $("#corpus-selector").hide(); $("#dbase-selector").hide();   $("#metadata").hide(); 
      $("#query_editor").hide(); $("#constructor_editor").hide(); $("#definition_editor").hide();
      Crpstudio.project.showExeButtons(false);
      // Remove textarea event handlers
      $("#query_general_top").unbind();
      $("#def_general_top").unbind();
      
      // Action depends on target 
      switch (target) {
        case "project_editor":
        case "project":
          // Make sure the execute buttons are shown
          Crpstudio.project.showExeButtons(true);
          // Possibly *show* the lng/corpus selector
          if (!Crpstudio.project.currentLng || Crpstudio.project.currentLng === "") {
            // Show it
            $("#corpus-selector").show();
          }
          // Do we have a 'recent' CRP?
          if (sRecentCrp && sRecentCrp !== "") {
            // Show the recent ones
            $("#project_list li .crp-recent").show();
            Crpstudio.project.recentcrp = sRecentCrp;
          } 
          break;
        case "input_editor": 
        case "input":
          /* =========== META selection is for the future
          // Make sure the metadata selector is being shown
  				$("#metadata").show();
              */
          // Show the database selector if this is a database-input 
          if (Crpstudio.dbaseInput) {
            // Show the database selector
            $("#dbase-selector").show();
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
        case "definitions": case "definition_editor":
          // Fill the definitions list
          Crpstudio.project.showlist("definition");
          // Show the definition selector
          $("#definition_editor").show();
          // Call setCrpItem() which should check if a 'default' item needs to be shown
          Crpstudio.project.setCrpItem(null, "definition");    
          // Switch on event handling in def_general_top to trigger resizing of the Xquery editor
          Crpstudio.project.addXqueryResizeEvents("def_general_top");
          // Add event handlers on all INPUT elements under "def_general" to get changes sent to the CRP on the server
          Crpstudio.project.addChangeEvents("def_general");
          break;
        case "queries": case "query_editor":
          // Fill the query list
          Crpstudio.project.showlist("query");
          // Show the query selector
          $("#query_editor").show();
          // Call setCrpItem() which should check if a 'default' item needs to be shown
          Crpstudio.project.setCrpItem(null, "query");          
          // Switch on event handling in def_general_top to trigger resizing of the Xquery editor
          Crpstudio.project.addXqueryResizeEvents("query_general_top");
          // Add event handlers on all INPUT elements under "def_general" to get changes sent to the CRP on the server
          Crpstudio.project.addChangeEvents("query_general");
          break;
        case "constructor": case "constructor_editor":
          // Fill the constructor list
          Crpstudio.project.showlist("constructor");
          // Show the constructor selector
          $("#constructor_editor").show();
          // Call setCrpItem() which should check if a 'default' item needs to be shown
          Crpstudio.project.setCrpItem(null, "constructor");          
          break;
        case "dbfeat": case "dbfeat_editor":
          // Fill the constructor list
          Crpstudio.project.showlist("dbfeat");
          // Show the constructor selector
          $("#dbfeat_editor").show();
          // Call setCrpItem() which should check if a 'default' item needs to be shown
          Crpstudio.project.setCrpItem(null, "dbfeat");          
          break;
        case "result_display":
          // Other actions
          $(".sub-nav dd").removeClass("active");
          $("#result_link").removeClass("hide");
          $("#result_link").addClass("active");
          break;
        case "document_display":
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
  
  /**
   * showlist -- create a set of <li> items to occur in the "available"
   *             section of one of four different types:
   *             "query", "definition", "constructor" or "dbfeat"
   * Notes: this function should *not* be used for the projectlist
   *        nor for the databaselist. Those lists are created by /crpstudio
   *        and sent here upon request            
   *             
   * @param {string} sListType
   * @returns {void} 
   * @history
   *  6/oct/2015  ERK Created
   *  15/oct/2015 ERK 
   */
  showlist : function(sListType) {
    var oList = null;   // JSON type list of objects
    var sPrf = "";      // Prefix
    var sLoc = "";      // Location on html
    var arHtml = [];    // To gather the output
    
    // Find the correct list
    switch(sListType) {
      case "query": sPrf = "qry"; oList = Crpstudio.project.prj_qrylist;break;
      case "definition": sPrf = "def"; oList = Crpstudio.project.prj_deflist;break;
      case "constructor": sPrf = "qc"; oList = Crpstudio.project.prj_qclist;break;
      case "dbfeat": sPrf = "dbf"; oList = Crpstudio.project.prj_dbflist;break;
    }
    sLoc = "#" + sListType + "_list" + " ." + sPrf + "-available";
    // Calculate a list consisting of <li> items
    // QRY: "QueryId;Name;File;Goal;Comment;Created;Changed"
    // DEF: "DefId;Name;File;Goal;Comment;Created;Changed"
    // QC:  "QCid;Input;Query;Output;Result;Cmp;Mother;Goal;Comment"
    // DBF: "DbFeatId;Name;Pre;QCid;FtNum"
    for (var i=0;i<oList.length;i++) {
      var oOneItem = oList[i];
      var sOneItem = "<li class='" + sPrf + "_" + oOneItem.Name + " " + 
              sPrf + "-available'><a href=\"#\" onclick=\"";
      switch(sListType) {
        case "query": 
          if (parseInt(oOneItem.QueryId,10) === Crpstudio.project.currentQry) sOneItem = sOneItem.replace('available', 'available active');
          sOneItem += "Crpstudio.project.setCrpItem(this, 'query', "+ 
                  oOneItem.QueryId +")\">" + oOneItem.Name; break;
        case "definition": 
          if (parseInt(oOneItem.DefId,10) === Crpstudio.project.currentDef) sOneItem = sOneItem.replace('available', 'available active');
          sOneItem += "Crpstudio.project.setCrpItem(this, 'definition', "+ 
                  oOneItem.DefId +")\">" + oOneItem.Name; break;
        case "constructor": 
          if (parseInt(oOneItem.QCid,10) === Crpstudio.project.currentQc) sOneItem = sOneItem.replace('available', 'available active');
          sOneItem += "Crpstudio.project.setCrpItem(this, 'constructor', "+ 
                  oOneItem.QCid +")\">" + oOneItem.QCid + " " +
                  oOneItem.Input + " " + oOneItem.Result; break;
        case "dbfeat": 
          if (parseInt(oOneItem.DbFeatId,10) === Crpstudio.project.currentDbf) sOneItem = sOneItem.replace('available', 'available active');
          sOneItem += "Crpstudio.project.setCrpItem(this, 'dbfeat', "+ 
                  oOneItem.DbFeatId +")\">" + oOneItem.Name + 
                  " " + oOneItem.FtNum; break;
      }
      sOneItem += "</a></li>\n";
      arHtml.push(sOneItem);
    }
    // Adapt the QRY-AVAILABLE list
    $(sLoc).not(".divider").not(".heading").remove();
    $(sLoc).last().after(arHtml.join("\n"));
  },

  /**
   * getListObject
   *    Access the list for @sListName, and return the object identified
   *    by <sIdField, iValue>
   * 
   * @param {string} sListType
   * @param {string} sIdField
   * @param {int} iValue
   * @returns {object}
   */
  getListObject : function(sListType, sIdField, iValue) {
    var oList = null;   // JSON type list of objects
    // Find the correct list
    switch(sListType) {
      case "query": sPrf = "qry"; oList = Crpstudio.project.prj_qrylist;break;
      case "definition": sPrf = "def"; oList = Crpstudio.project.prj_deflist;break;
      case "constructor": sPrf = "qc"; oList = Crpstudio.project.prj_qclist;break;
      case "dbfeat": sPrf = "dbf"; oList = Crpstudio.project.prj_dbflist;break;
      default: return null;
    }
    // Walk all the elements of the list
    for (var i=0;i<oList.length;i++) {
      var oOneItem = oList[i];
      var iId = parseInt(oOneItem[sIdField], 10);
      // Check the id
      if (iId === iValue) return oOneItem;
    }
    // Didn't get it
    return null;
  },
  
  /**
   * getItemDescr
   *    Get the correct item from "prj_access", which describes the details
   *    of the project's item
   * 
   * @param {type} sListType
   * @returns {object}
   */
  getItemDescr: function(sListType) {
    var oItem = null;
    // Find the correct item
    for (var i=0;i<Crpstudio.project.prj_access.length;i++) {
      oItem = Crpstudio.project.prj_access[i];
      // Check if this is the item
      if (oItem.name === sListType) return oItem;
    }
    // Didn't find it
    return null;
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
    var strProject = $(target).text();
    // Make sure download info is hidden
    $("#project_download").addClass("hidden");
    // Get the <li>
    var listItem = $(target).parent();
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
    // Invalidate the 'current' setters
    Crpstudio.project.currentQry = -1;
    Crpstudio.project.currentDef = -1;
    Crpstudio.project.currentDbf = -1;
    Crpstudio.project.currentQc = -1;
    // Clear the contents of currently loaded query/def/dbfeat/qc
    if (Crpstudio.project.cmDef) Crpstudio.project.cmDef.setValue("");
    if (Crpstudio.project.cmQuery)  Crpstudio.project.cmQuery.setValue("");
    // Clear definition
    $("#def_general").addClass("hidden");
    $("#def_description").html("<i>No definition selected</i>");
    // Clear query
    $("#query_general").addClass("hidden");
    $("#query_description").html("<i>No query selected</i>");
    // Clear constructor
    $("#qc_general").addClass("hidden");
    $("#qc_description").html("<i>No constructor line selected</i>");
    
    
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
   * getCrpItem
   *    Look in the list of CrpItems (def/query/dbfeat/qc) for the one
   *    having the @id field iItemId, and return the <a> element where it is
   *    
   * @param {type} sListType
   * @param {type} iItemId
   * @returns {undefined}
   */
  getCrpItem : function(sListType, iItemId) {
    // Access the information object for this type
    var oItemDesc = Crpstudio.project.getItemDescr(sListType);
    // Get the NAME of this element
    var oListItem = Crpstudio.project.getListObject(sListType, oItemDesc.id, iItemId);
    // Construct the unique class name identifying our target
    var sClass = oItemDesc.prf + "_" + oListItem[oItemDesc.listfield];
    // Get the location identifier for this element: Intersection --> no space after "available"
    var sLoc = "#" + sListType + "_list" + " ." + oItemDesc.prf  + "-available";
    var oFirst = null;
    // Ga alle elementen handmatig af
    $(sLoc).each(function() {
      if (oFirst === null) oFirst = $(this).children(":last").get();
      // Check if it has the correct class
      if ($(this).hasClass(sClass)) {
        // Find this element's last child, which is the <a> element
        var oTarget = $(this).children(":last").get();
        // Return this
        return oFirst = oTarget;
      }
    });
    // Getting here means we are lost...
    return oFirst;
  },
 
  /**
   * setCrpItem
   *    User selects the indicated item of a CRP, 
   *    and we need to show the contents of that item
   *    
   * @param {type} sType    - the kind of item
   * @param {type} iItemId  - numerical id of the item
   * @returns {undefined}   - none
   * @history
   *  8/oct/2015  ERK Created
   *  15/oct/2015 ERK When there is no iItemId, check if a default needs to be shown
   */
  setCrpItem : function(target, sType, iItemId) {
    // Do we need to grab a default item?
    if (!iItemId) {
      // No itemid is defined, so check if there *is* anything that could be selected
      switch(sType) {
        case "query":
          if (Crpstudio.project.prj_qrylist.length > 0) {
            iItemId = (Crpstudio.project.currentQry>=0) ? Crpstudio.project.currentQry : 1;
          }
          break;
        case "definition":
          if (Crpstudio.project.prj_deflist.length > 0) {
            iItemId = (Crpstudio.project.currentDef>=0) ? Crpstudio.project.currentDef : 1;
          }
          break;
        case "dbfeat":
          if (Crpstudio.project.prj_dbflist.length > 0) {
            iItemId = (Crpstudio.project.currentDbf>=0) ? Crpstudio.project.currentDbf : 1;
          }
          break;
        case "constructor":
          if (Crpstudio.project.prj_qclist.length > 0) {
            iItemId = (Crpstudio.project.currentQc>=0) ? Crpstudio.project.currentQc : 1;
          }
          break;
      }
      // Calculate the target <a> item...
      target = Crpstudio.project.getCrpItem(sType, iItemId);
    }
    // Validate
    if (iItemId && iItemId >= 0) {
      // Get the <li>
      var listItem = $(target).parent();
      // Look at all the <li> children of <ul>
      var listHost = listItem.parent();
      listHost.children('li').each(function() { $(this).removeClass("active")});
      // Set the "active" class for the one the user has selected
      $(listItem).addClass("active");
      // Find out what kind of item we have
      var oItemDescr = Crpstudio.project.getItemDescr(sType);
      // Retrieve the item from the list
      var oItem = Crpstudio.project.getListObject(oItemDescr.name, oItemDescr.id, iItemId);
      // Validate
      if (oItem === null) return;
      $("#" + oItemDescr.descr).html("<i>Loading...</i>");
      // Make the General area INvisible
      $("#" + oItemDescr.gen).addClass("hidden");
      // Make the current item object available globally
      Crpstudio.project[oItemDescr.cur] = oItem;
      // Pass on all the item's values to the html component
      for (var i=0;i<oItemDescr.fields.length; i++) {
        var oOneF = oItemDescr.fields[i];
        // Only set non-empty field defs
        if (oOneF.txt !== "") {
          // Get the value of this field
          var sValue = oItem[oOneF.field];
          // Showing it depends on the type
          switch (oOneF.type) {
            case "txt": // text fields
              $("#" + oOneF.loc).val(sValue);
              break;
            case "cap": // Caption only
              $("#" + oOneF.loc).html(sValue);
              break;
          }
        }
      }
      // We stop loading
      $("#" + oItemDescr.descr).html("");
      // Show the General area of the item again
      $("#" + oItemDescr.gen).removeClass("hidden");
      
      // QRY: "QueryId;Name;File;Goal;Comment;Created;Changed"
      // DEF: "DefId;Name;File;Goal;Comment;Created;Changed"
      // QC:  "QCid;Input;Query;Output;Result;Cmp;Mother;Goal;Comment"
      // DBF: "DbFeatId;Name;Pre;QCid;FtNum"
      

      switch (sType) {
        case "query":
          // Set the id of the currently selected query
          Crpstudio.project.currentQry = iItemId;
          // First time?
          if (Crpstudio.project.cmQuery === null) {
            // Fix the max-width to what it is now?
            // $("#query_general_bottom").css("max-width",$("#query_general_bottom").width() + "px" );
            Crpstudio.project.cmQuery = CodeMirror.fromTextArea(
                    document.getElementById("query_general_text"), Crpstudio.project.cmStyle1);  
            // Make sure the change event is captured
            Crpstudio.project.cmQuery.on("change", Crpstudio.project.xqQueryChanged);
            // Make sure the visibility is okay
            Crpstudio.project.setSizes();
          } else {
            Crpstudio.project.cmQuery.setValue($("#query_general_text").val());
          }
          break;
        case "definition":
          // Set the id of the currently selected definition
          Crpstudio.project.currentDef = iItemId;
          // First time?
          if ( Crpstudio.project.cmDef === null) {
            // Fix the max-width to what it is now?
            // $("#def_general_bottom").css("max-width",$("#def_general_bottom").width() + "px" );
            Crpstudio.project.cmDef = CodeMirror.fromTextArea(
                    document.getElementById("def_general_text"), Crpstudio.project.cmStyle1);
                        Crpstudio.project.setSizes();
            // Make sure the change event is captured
            Crpstudio.project.cmDef.on("change", Crpstudio.project.xqDefChanged);
            // Make sure the visibility is okay
            Crpstudio.project.setSizes();
          } else {
            Crpstudio.project.cmDef.setValue($("#def_general_text").val());
          }
          break;
        case "dbfeat":
          // Set the id of the currently selected dbfeat
          Crpstudio.project.currentDbf = iItemId;
          // Make sure the visibility is okay
          Crpstudio.project.setSizes();
          break;
        case "constructor":
          // Set the id of the currently selected constructor item
          Crpstudio.project.currentQc = iItemId;
          // Make sure the visibility is okay
          Crpstudio.project.setSizes();
          break;
        case "dbase": 
          break;
      }


    }
  },

  /**
   * xqQueryChanged
   *    Process the changes in a the Query editor
   * 
   * @param {type} cm
   * @param {type} change
   * @returns {undefined}
   */
  xqQueryChanged : function(cm, change) {
    $("#query_general_text").text(cm.getValue());
    Crpstudio.project.ctlTimer($("#query_general_text"), "textarea");
  },
  /**
   * xqDefChanged
   *    Process the changes in a the Definition editor
   * 
   * @param {type} cm
   * @param {type} change
   * @returns {undefined}
   */
  xqDefChanged : function(cm, change) {
    $("#def_general_text").text(cm.getValue());
    Crpstudio.project.ctlTimer($("#def_general_text"), "textarea");
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
          var iDefCount = oContent.deflist.length; Crpstudio.project.prj_deflist = oContent.deflist;
          var iQryCount = oContent.qrylist.length; Crpstudio.project.prj_qrylist = oContent.qrylist;
          var iQcCount = oContent.qclist.length; Crpstudio.project.prj_qclist = oContent.qclist;
          var iDbfCount = oContent.dbflist.length; Crpstudio.project.prj_dbflist = oContent.dbflist;
          /* =============== DEBUGGING ======================
          $("#project_status").html("defs=" + iDefCount + " qrys=" + iQryCount +
                  " QCs=" + iQcCount + " dbfeatures=" + iDbfCount);
             ================================================ */
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
          Crpstudio.project.addChangeEvents("project_general");
          /*
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
          */
            
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
   * addChangeEvents
   *    Add pointers to ctlTimer() and ctlChanged()
   *    Do this for all [input], [textarea] and [select] elements
   *       that are under DOM element with id [sItemId]
   * 
   * @param {type} sItem
   * @returns {undefined}
   */
  addChangeEvents : function(sItemId) {
    var sId = "#" + sItemId;
    // Add event handlers on all INPUT elements under "project_general"
    $(sId + " input").on("change keydown paste input", 
      function() {Crpstudio.project.ctlTimer(this, "input");});
    $(sId + " input").on("blur", 
      function() {Crpstudio.project.ctlChanged(this, "blurInput");});

    // Add event handlers on all TEXTAREA elements under "project_general"
    $(sId + " textarea").on("change keydown paste input", 
      function() {Crpstudio.project.ctlTimer(this, "textarea");});
    $(sId + " textarea").on("blur", 
      function() {Crpstudio.project.ctlChanged(this, "blurTextarea");});

    // Add event handlers on all SELECT elements under "project_general"
    $(sId + " select").on("change keydown paste input", 
      function() {Crpstudio.project.ctlTimer(this, "select");});
    $(sId + " select").on("blur", 
      function() {Crpstudio.project.ctlChanged(this, "blurSelect");});
    
  }, 
  
  /**
   * addXqueryResizeEvents
   *    Add events that help resize the Xquery area below [sItemId]
   * 
   * @param {type} sItemId
   * @returns {undefined}
   */
  addXqueryResizeEvents : function(sItemId) {
    var sId = "#" + sItemId;
    $(sId).bind("mousedown", function() {Crpstudio.project.setSizes();});
    $(sId).bind("mousemove", function() {Crpstudio.project.setSizes();});
    // Catch the mousedown and mouseup events
    $(sId).bind("mouseup", function() {Crpstudio.project.setSizes();});
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
   * uploadFile
   *    Ask user to upload a file (project, corpus, dbase, definition, query)
   * 
   * @param {object} el   
   * @param {string} sItemType
   * @returns {undefined}
   */
  uploadFile : function(el, sItemType) {
    // Make sure download info is hidden
    $("#"+sItemType+"_download").addClass("hidden");
    // Initialise itemmain
    var sItemMain = "";
    switch (sItemType) {
      case "definition": 
      case "query":
        // Get the current project's name
        sItemMain = Crpstudio.project.currentPrj;
        break;
      case "corpus":    // Main corpus to which this file belongs
        // TODO: implement
        break;
    }
    // Get the name of the file
    var oFile = el.files[0];
    // Use the standard readXmlFile function (this reads any TEXT)
		Crpstudio.readXmlFile(oFile, function(e) {
      // Get the text of the uploaded CRP into a variable
      var text = encodeURIComponent(e.target.result);
      // Signal what we are doing
      $("#"+sItemType+"_description").html("Uploading...");
      // Send this information to the /crpstudio
      var params = "file=" + oFile.name + "&itemtype=" + sItemType + 
              "&itemmain=" + sItemMain + "&userid=" + Crpstudio.currentUser +
              "&itemtext=" + text;
      Crpstudio.getCrpStudioData("upload", params, Crpstudio.project.processUpLoad, "#"+sItemType+"_description");
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
      // The response is a standard object containing "status" (code) and "content" (code, message)
      var oStatus = response.status;
      var sStatusCode = oStatus.code;
      var oContent = response.content;
      // Obligatory: itemtype
      var sItemType = oContent.itemtype;
      // Remove waiting
      $("#"+sItemType+"_description").html("");
      switch (sStatusCode) {
        case "completed":
          // This is dependent on the item type
          var sAbbr = "";
          switch (sItemType) {
            case "project": sAbbr = "crp"; break;
            case "definition": sAbbr = "def"; break;
            case "query": sAbbr = "qry"; break;
          }
          // Item-type-independent stuff
          var sItemName = oContent.itemname;
          // If we have succesfully completed *uploading* an item to /crpstudio,
          //    then it must be added to the list
          var sItemLine = oContent.itemline;
          // Check if there is any reply
          if (sItemLine) {
            // Walk the list of <li> elements with class "crp-available"
            var arPrjItem = $("#"+sItemType+"_list ."+sAbbr+"-available").not(".divider").not(".heading");
            var liBef = null;
            // Start from 0: we are in our own 'section' of "crp-available"
            for (var i=0;i<arPrjItem.size();i++) {
              // It must have a <a> child node
              if (arPrjItem[i].childNodes) {
                var aChild = arPrjItem[i].childNodes.item(0);
                // Should we put our project before this one?
                if (aChild.innerHTML.localeCompare(sItemName)>0) {
                  // The list item must come before the current one
                  liBef = arPrjItem[i];break;
                }
              }              
            }
            // Did we find any?
            if (liBef === null) {
              // Append it after the divider and heading crp-available
              $("#"+sItemType+"_list ."+sAbbr+"-available").last().append(sItemLine);
            } else {
              $(sItemLine).insertBefore($(liBef));
            }
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
			$("#"+sItemType+"_status").html("ERROR - Failed to load the .crpx result from the server.");
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
   * downloadFile
   *    Check which CRP is currently selected (if any)
   *    Then download that CRP:
   *    (1) from the server --> POST to /crpstudio
   * 
   * @param {type} elDummy
   * @returns {undefined}
   */
  downloadFile : function(elDummy, sFileType) {
    // Access the information object for this type
    var oItemDesc = Crpstudio.project.getItemDescr(sFileType);
    var sItemName = "";   // Project, corpus or database name
    var sItemPart = "";   // Part of project, corpus
    var oListItem = null;
    // Action depends on the type
    switch(sFileType) {
      case "project":     // Download CRP
        // Find out which one is currently selected
        sItemName = Crpstudio.project.currentPrj;
        break;
      case "corpus":      // Download corpus
        // Find out which one is currently selected
        sItemName = Crpstudio.project.currentCorpus;
        break;
      case "definition":  // download definitions in Xquery
        // Access the current element from the list
        oListItem = Crpstudio.project.getListObject(sFileType, oItemDesc.id, Crpstudio.project.currentDef);
        sItemPart = oListItem[oItemDesc.listfield];
        // Find out which one is currently selected
        sItemName = Crpstudio.project.currentPrj;
        break;
      case "query":       // download definitions in Xquery
        // Access the current element from the list
        oListItem = Crpstudio.project.getListObject(sFileType, oItemDesc.id, Crpstudio.project.currentQry);
        sItemPart = oListItem[oItemDesc.listfield];
        // Find out which one is currently selected
        sItemName = Crpstudio.project.currentPrj;
        break;
      case "dbase":       // download database in Xquery
        // Find out which one is currently selected
        sItemName = Crpstudio.project.currentDb;
        break;
    }
    if (sItemName && sItemName !== "") {
      // Note: /crpstudio must check when the last download of this project was
      // Send this information to the /crpstudio
      var params = "itemname=" + sItemName + "&itempart=" + sItemPart + 
              "&itemtype=" + sFileType + "&userid=" + Crpstudio.currentUser;
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
    if (!source || source === null) source = Crpstudio.project.ctlCurrent;
    // Clear any previously set timer
    clearTimeout(Crpstudio.project.typingTimer);
    // Find parameters
    var sKey = "";
    var sValue = $(source).val();
    var sKind = (sType && sType !== null) ? sType : "-";
    var iItemId = -1;
    // Determine which 'key' this is
    var sElementId = $(source).attr("id");
    switch(sElementId) {
      case "project_general_name": 
        if (sValue === Crpstudio.project.prj_name) return; 
        else Crpstudio.project.prj_name = sValue;
        sKey = "Name"; break;
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
        // Try to perform a general change function
        var oItem = Crpstudio.project.doCrpItemChange(sElementId);
        // Check the return
        if (oItem === null) {
          // Show the source of the key absence
          Crpstudio.debug("ctlChanged cannot handle: [" + $(source).attr("id") + "]");
          return;
        }
        // Get the key and the id
        sKey = oItem.key; iItemId = oItem.id;
    }
    // ===== DEBUGGING ====
    if (sKey === "source") {
      Crpstudio.debug("crpchgDD source to: " + sValue);
    }
    // ====================
    // Pass on this value to /crpstudio and to /crpp
    var oChanges = { "crp": Crpstudio.project.currentPrj,
      "userid": Crpstudio.currentUser, 
      "key": sKey, "value": sValue, "id": iItemId };
    var params = "changes=" + JSON.stringify(oChanges);
    Crpstudio.getCrpStudioData("crpchg", params, Crpstudio.project.processCrpChg, "#project_description");      
  },
  
  /**
   * doCrpItemChange 
   *    Process changes in the crp item (def/query/dbfeat/constructor) identified
   *      by DOM id [sItemId]. Do this in the internally stored CRP item data.
   *    Then return the 'key' that should be used by a /crpchg request to process
   *      the changes into the CRP that is stored on the server
   *      
   * @param {type} sItemId
   * @returns {undefined}
   */
  doCrpItemChange : function(sItemId) {
    // Create an object
    var oBack = {};
    // Find the correct item
    for (var i=0;i<Crpstudio.project.prj_access.length;i++) {
      var oItem = Crpstudio.project.prj_access[i];
      var iItemId = -1;
      // The integer element id depends on what we have
      switch (oItem.name) {
        case "query": iItemId = Crpstudio.project.currentQry; break;
        case "definition": iItemId = Crpstudio.project.currentDef; break;
        case "dbfeat": iItemId = Crpstudio.project.currentDbf; break;
        case "constructor": iItemId = Crpstudio.project.currentQc; break;
      }
      // Walk all the descriptions in this item
      for (var j=0;j<oItem.fields.length; j++) {
        var oField = oItem.fields[j];
        // Is this the correct field?
        if (sItemId === oField.loc) {
          // We found it: return the information
          oBack.key = oItem.name + "." + oField.field;
          oBack.id = iItemId;
          return oBack;
        }
      }
    }
    // We did not find it, so return an empty string
    return null;
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
    // Set the vertical size of the Xquery editing area
    if ($("#query_general").is(":visible") && Crpstudio.project.cmQuery) {
      var oQueryPos = $("#query_general_bottom").position();
      // Determine the best width and height
      var iHeight = $(window).innerHeight() - oQueryPos.top - 290;
      var iWidth = $("#query_general_comment").width();
      // Set the new width/height
      Crpstudio.project.cmQuery.setSize(iWidth, iHeight);
    }  else if ($("#def_general").is(":visible") && Crpstudio.project.cmDef) {
      var oDefPos = $("#def_general_bottom").position();
      // Determine the best width and height
      var iHeight = $(window).innerHeight() - oDefPos.top - 290;
      var iWidth = $("#def_general_comment").width();
      // Set the new width/height
      Crpstudio.project.cmDef.setSize(iWidth, iHeight);
    }
    
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
