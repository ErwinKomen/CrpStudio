/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */

/*globals jQuery, crpstudio, erwin, Crpstudio, alert: false, */
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
  ctlCurrentId: "",       // ID of current control
  lstHistory: [],         // List of changes: type, id, crp, key, value
  cmQuery: null,          // 
  cmDef: null,            // 
  prj_name: "",           // Field value of this project: name
  prj_author: "",         // Field value of this project: author
  prj_prjtype: "",        // Field value of this project: prjtype
  prj_goal: "",           // Field value of this project: goal
  prj_dbaseinput: "",     // Field value of this project: dbaseinput (True/False)
  prj_comments: "",       // Field value of this project: comments
  prj_language: "",       // Field value of this project: language
  prj_part: "",           // Field value of this project: part
  prj_dbase: "",          // Field value of this project: dbase
  prj_deflist: null,      // Field value of this project: list of definitions
  prj_qrylist: null,      // Field value of this project: list of queries
  prj_qclist: null,       // Field value of this project: list of QC elements
  prj_dbflist: null,      // Field value of this project: list of database features
  prj_genlist: null,      // Field value of this project: list of 'general' settings
  prj_crplist: null,      // List of currently available CRPs
  qry_current: null,      // Currently loaded Query object
  def_current: null,      // Currently loaded Definition object
  dbf_current: null,      // Currently loaded DbFeat object
  qc_current: null,       // Currently loaded QC object (constructor)
  dirty: false,           // Project needs saving or not
  qry_dirty: false,       // Flag to indicate that the 'Text' area of Query has changed
  def_dirty: false,       // Flag to indicate that the 'Text' area of Definition has changed
  bIsSelecting: false,    // Flag to indicate that selection changes take place
  
  // Object defining the elements of Query, Definition, DbFeat and Constructor
  prj_access: [
    {name: "project", id: "", listfield: "Name", descr: "project_description", prf: "crp",
      gen: "project_general", cur: "crp_current", divprf: "project", fields: [
          { field: "Name",        type: "txt", loc: "project_general_name"}, 
          { field: "Author",      type: "txt", loc: "project_general_author"}, 
          { field: "ProjectType", type: "txt", loc: "project_general_prjtype"}, 
          { field: "Comments",    type: "txt", loc: "project_general_comments"}, 
          { field: "Goal",        type: "txt", loc: "project_general_goal"}, 
          { field: "DbaseInput",  type: "txt", loc: "project_general_dbase"}, 
          { field: "Created",     type: "cap", loc: "project_general_datecreated"}, 
          { field: "Changed",     type: "cap", loc: "project_general_datechanged"}]},
    {name: "query", id: "QueryId", listfield: "Name", descr: "query_description", prf: "qry",
      gen: "query_general", cur: "qry_current", divprf: "query", fields: [
          { field: "Name",        type: "txt", loc: "query_general_name"}, 
          { field: "File",        type: "txt", loc: ""}, 
          { field: "Goal",        type: "txt", loc: "query_general_goal"}, 
          { field: "Comment",     type: "txt", loc: "query_general_comment"}, 
          { field: "Text",        type: "txt", loc: "query_general_text"}, 
          { field: "Created",     type: "cap", loc: "query_general_datecreated"}, 
          { field: "Changed",     type: "cap", loc: "query_general_datechanged"}]},
    {name: "definition",id: "DefId", listfield: "Name", descr: "def_description",  prf: "def",
      gen: "def_general", cur: "def_current", divprf: "def", fields: [
          { field: "Name",        type: "txt", loc: "def_general_name"}, 
          { field: "File",        type: "txt", loc: ""}, 
          { field: "Goal",        type: "txt", loc: "def_general_goal"}, 
          { field: "Comment",     type: "txt", loc: "def_general_comment"}, 
          { field: "Text",        type: "txt", loc: "def_general_text"}, 
          { field: "Created",     type: "cap", loc: "def_general_datecreated"}, 
          { field: "Changed",     type: "cap", loc: "def_general_datechanged"}]},
    {name: "dbfeat", id: "DbFeatId", listfield: "Name", descr: "dbf_description",  prf: "dbf",
      gen: "dbf_general", cur: "dbf_current", divprf: "dbf", fields: [
          { field: "Name",        type: "txt", loc: "dbf_general_name"}, 
          { field: "Pre",         type: "txt", loc: "dbf_general_pre"}, 
          { field: "QCid",        type: "txt", loc: "dbf_general_qcid"}, 
          { field: "FtNum",       type: "txt", loc: "dbf_general_ftnum"}]},
    {name: "constructor", id: "QCid", listfield: "Result", descr: "qc_description",  prf: "qc",
      gen: "qc_general", cur: "qc_current", divprf: "qc", fields: [
          { field: "Input",       type: "txt", loc: "qc_general_input"}, 
          { field: "Query",       type: "txt", loc: "qc_general_query"}, 
          { field: "Output",      type: "txt", loc: "qc_general_output"}, 
          { field: "Result",      type: "txt", loc: "qc_general_result"}, 
          { field: "Cmp",         type: "txt", loc: "qc_general_cmp"}, 
          { field: "Mother",      type: "txt", loc: "qc_general_mother"}, 
          { field: "Goal",        type: "txt", loc: "qc_general_goal"}, 
          { field: "Comment",     type: "txt", loc: "qc_general_comment"}]}
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
     // Set the location of the status div
      Crpstudio.project.divStatus = "#result_report";
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
      // var sExeRequest = "query=" + JSON.stringify(oExeRequest);
      var params = JSON.stringify(oExeRequest);

      // Send the request to /crpstudio/exe?{...}
      // Crpstudio.getCrpStudioData("exe", sExeRequest, Crpstudio.project.processExeCrpStudio, "#result_status");
      Crpstudio.getCrpStudioData("exe", params, Crpstudio.project.processExeCrpStudio, "#result_status");
    }
  },
  
  /**
   * showExeButtons -- show or hide the Execute buttons
   * 
   * @param {type} bShow
   * @returns {undefined}
   */
  showExeButtons : function(bShow) {
    if (bShow) {
      $("#project_executor").removeClass("hidden");
      $("#project_executor_nocache").removeClass("hidden");
    } else {
      $("#project_executor").addClass("hidden");
      $("#project_executor_nocache").addClass("hidden");
    }
  },
  
  /**
   * showSaveButton -- show or hide the SAVE button
   * 
   * @param {type} bShow
   * @returns {undefined}
   */
  showSaveButton : function(bShow) {
    if (bShow) {
      $("#project_saving").removeClass("hidden");
    } else {
      $("#project_saving").addClass("hidden");
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
        // sStatusRequest = "query=" + JSON.stringify(oStatusRequest);
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
	switchTab : function(target, sRecentCrp, bForce) {
		Crpstudio.debug("switching to search tab "+target+" from "+Crpstudio.project.tab);
		if (target !== Crpstudio.project.tab || bForce) {
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
      // Capture the current selecting state
      var bSelState = Crpstudio.project.bIsSelecting;
      
      // Action depends on target 
      switch (target) {
        case "project_editor":
        case "project":
          // Selecting...
          Crpstudio.project.bIsSelecting = true;
          // The execute buttons are shown if there is a current project
          var bHaveProject = (Crpstudio.project.currentPrj!==undefined && Crpstudio.project.currentPrj!=="");
          Crpstudio.project.showExeButtons(bHaveProject);
          // The Save button must be shown if the 'dirty' flag is set
          Crpstudio.project.showSaveButton(Crpstudio.project.dirty);
          // Possibly *show* the lng/corpus selector
          if (Crpstudio.project.currentPrj!=="" && 
              (!Crpstudio.project.currentLng || Crpstudio.project.currentLng === "")) {
            // Show it
            $("#corpus-selector").show();
          }
          // Do we have a current project?
          if (Crpstudio.project.currentPrj === "") {
            // Make clear user understands he has to choose
            $("#project_description").removeClass("hidden");
            $("#project_description").html("<i>No project selected</i>");
            $("#project_general").addClass("hidden");
          }
          // Do we have a 'recent' CRP?
          if (sRecentCrp!==undefined && sRecentCrp !== "") {
            // Show the recent ones
            $("#project_list li .crp-recent").show();
            Crpstudio.project.recentcrp = sRecentCrp;
          } 
          // We are open for changes again
          Crpstudio.project.bIsSelecting = bSelState;
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
              // Select the element requesting the user to make a choice
              $("#input_dbase option[index == 0]").attr("selected", true);
              // This should go to the histAdd
              // Crpstudio.project.histAdd("project", -1, Crpstudio.project.currentPrj, "Source",);
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
          // The Save button must be shown if the 'dirty' flag is set
          Crpstudio.project.showSaveButton(Crpstudio.project.dirty);
          break;
        case "definitions": case "definition_editor":
          // Prevent undesired change triggers
          Crpstudio.project.bIsSelecting = true;
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
          // The Save button must be shown if the 'dirty' flag is set
          Crpstudio.project.showSaveButton(Crpstudio.project.dirty);
          // We are open for changes again
          Crpstudio.project.bIsSelecting = bSelState;
          break;
        case "queries": case "query_editor":
          // Prevent undesired change triggers
          Crpstudio.project.bIsSelecting = true;
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
          // The Save button must be shown if the 'dirty' flag is set
          Crpstudio.project.showSaveButton(Crpstudio.project.dirty);
          // We are open for changes again
          Crpstudio.project.bIsSelecting = bSelState;
          break;
        case "constructor": case "constructor_editor":
          // Prevent undesired change triggers
          Crpstudio.project.bIsSelecting = true;
          // Fill the constructor list
          Crpstudio.project.showlist("constructor");
          // Show the constructor selector
          $("#constructor_editor").show();
          // Call setCrpItem() which should check if a 'default' item needs to be shown
          Crpstudio.project.setCrpItem(null, "constructor");          
          // Add event handlers on all INPUT elements under "def_general" to get changes sent to the CRP on the server
          Crpstudio.project.addChangeEvents("qc_general");
          // The Save button must be shown if the 'dirty' flag is set
          Crpstudio.project.showSaveButton(Crpstudio.project.dirty);
          // We are open for changes again
          Crpstudio.project.bIsSelecting = bSelState;
          break;
        case "dbfeat": case "dbfeat_editor":
          // Prevent undesired change triggers
          Crpstudio.project.bIsSelecting = true;
          // Fill the constructor list
          Crpstudio.project.showlist("dbfeat");
          // Show the constructor selector
          $("#dbfeat_editor").show();
          // Call setCrpItem() which should check if a 'default' item needs to be shown
          Crpstudio.project.setCrpItem(null, "dbfeat");          
          // Add event handlers on all INPUT elements under "def_general" to get changes sent to the CRP on the server
          Crpstudio.project.addChangeEvents("dbf_general");
          // The Save button must be shown if the 'dirty' flag is set
          Crpstudio.project.showSaveButton(Crpstudio.project.dirty);
          // We are open for changes again
          Crpstudio.project.bIsSelecting = bSelState;
          break;
        case "result_display":
          // Other actions
          $(".sub-nav dd").removeClass("active");
          $("#result_link").removeClass("hide");
          $("#result_link").addClass("active");
          // Don't show save button
          Crpstudio.project.showSaveButton(false);
          break;
        case "document_display":
          // Other actions
          $(".sub-nav dd").removeClass("active");
          $("#document").removeClass("hide");
          $("#document_link").removeClass("hide");
          $("#document_link").addClass("active");
          // Don't show save button
          Crpstudio.project.showSaveButton(false);
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
    oList = Crpstudio.project.getList(sListType);
    // Find the prefix
    var oItemDesc = Crpstudio.project.getItemDescr(sListType);
    var sPrf = oItemDesc.prf;
    /*
    switch(sListType) {
      case "query": sPrf = "qry"; oList = Crpstudio.project.prj_qrylist;break;
      case "definition": sPrf = "def"; oList = Crpstudio.project.prj_deflist;break;
      case "constructor": sPrf = "qc"; oList = Crpstudio.project.prj_qclist;break;
      case "dbfeat": sPrf = "dbf"; oList = Crpstudio.project.prj_dbflist;break;
    } */
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
   * setGenList -- create and return an object containing the general settings in oContent
   * 
   * @param {type} oContent
   * @returns {undefined}
   */
  setGenList : function(oContent) {
    var oBack = {};
    oBack.Name = oContent.name;
    oBack.Author = oContent.author;
    oBack.PrjType = oContent.prjtype;
    oBack.Goal = oContent.goal;
    oBack.Created = oContent.datecreated;
    oBack.Changed = oContent.datechanged;
    oBack.DbaseInput = oContent.dbaseinput;
    oBack.Comments = oContent.comments;
    oBack.Language = oContent.language;
    oBack.Part = oContent.part;
    oBack.Dbase = oContent.dbase;
    return oBack;
  },
  
  /**
   * 
   * @param {type} sListType
   * @returns {object}
   */
  getList : function(sListType) {
    var oList = null;   // JSON type list of objects
    // Find the correct list
    switch(sListType) {
      case "project":     oList = Crpstudio.project.prj_genlist; break;
      case "query":       oList = Crpstudio.project.prj_qrylist;break;
      case "definition":  oList = Crpstudio.project.prj_deflist;break;
      case "constructor": oList = Crpstudio.project.prj_qclist;break;
      case "dbfeat":      oList = Crpstudio.project.prj_dbflist;break;
    }
    // Return what we found
    return oList;
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
    var oList = Crpstudio.project.getList(sListType);   // JSON type list of objects
    if (sListType === "project" || oList === null) return oList;
    /*
    // Find the correct list
    switch(sListType) {
      case "project": sPrf = "crp"; oList = Crpstudio.project.prj_genlist; return oList;
      case "query": sPrf = "qry"; oList = Crpstudio.project.prj_qrylist;break;
      case "definition": sPrf = "def"; oList = Crpstudio.project.prj_deflist;break;
      case "constructor": sPrf = "qc"; oList = Crpstudio.project.prj_qclist;break;
      case "dbfeat": sPrf = "dbf"; oList = Crpstudio.project.prj_dbflist;break;
      default: return null;
    } */
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
  
  /**
   * getItemObject 
   *    Use the location (the @id) to get an object of the item
   * 
   * @param {type} sLocation
   * @returns {undefined}
   */
  getItemObject: function(sLocation) {
    var oItem = null;
    // Find the correct item
    for (var i=0;i<Crpstudio.project.prj_access.length;i++) {
      oItem = Crpstudio.project.prj_access[i];
      // Walk through the fields
      for (var j=0;j< oItem.fields.length;j++) {
        if (oItem.fields[j].loc === sLocation) {
          // We found it!
          return {type: oItem.name, key: oItem.fields[j].field};
        }
      }
    }
    // Didn't find it
    return null;
  },
  
  /**
   * getItemValue -- get the value of the indicated item
   *                 use the on-board lists to get it
   * @param {type} sListType
   * @param {type} iItemId
   * @param {type} sCrp
   * @param {type} sKey
   * @returns {undefined}
   */
  getItemValue : function(sListType, iItemId, sCrp, sKey) {
    // Access the information object for this type
    var oItemDesc = Crpstudio.project.getItemDescr(sListType);
    // Access the item from the correct list
    var oListItem = Crpstudio.project.getListObject(sListType, oItemDesc.id, iItemId);
    // Get the value of the indicated field
    return oListItem[sKey];
  },
  
  /**
   * setOneItem
   *    Set the value of the item identified by @sItemType/@sKey/@iIdValue
   *    
   * @param {type} sItemType
   * @param {type} sKey
   * @param {type} iIdValue
   * @param {type} sValue
   * @returns {undefined}
   */
  setOneItem: function(sItemType, sKey, iIdValue, sValue) {
    // Get a descriptor object
    var oDescr = Crpstudio.project.getItemDescr(sItemType);
    // Action depends on item type
    switch(sItemType) {
      case "query":
        // Walk all the elements of the list
        for (var i=0;i<Crpstudio.project.prj_qrylist.length;i++) {
          var oOneItem = Crpstudio.project.prj_qrylist[i];
          var iId = parseInt(oOneItem[oDescr.id], 10);
          // Check the id
          if (iId === iIdValue) {
            //Change the item's field value
            Crpstudio.project.prj_qrylist[i][sKey] = sValue;
          }
        }
        break;
      case "definition":
        // Walk all the elements of the list
        for (var i=0;i<Crpstudio.project.prj_deflist.length;i++) {
          var oOneItem = Crpstudio.project.prj_deflist[i];
          var iId = parseInt(oOneItem[oDescr.id], 10);
          // Check the id
          if (iId === iIdValue) {
            //Change the item's field value
            Crpstudio.project.prj_deflist[i][sKey] = sValue;
          }
        }
        break;
      case "dbfeat":
        // Walk all the elements of the list
        for (var i=0;i<Crpstudio.project.prj_dbflist.length;i++) {
          var oOneItem = Crpstudio.project.prj_dbflist[i];
          var iId = parseInt(oOneItem[oDescr.id], 10);
          // Check the id
          if (iId === iIdValue) {
            //Change the item's field value
            Crpstudio.project.prj_dbflist[i][sKey] = sValue;
          }
        }
        break;
      case "constructor":
        // Walk all the elements of the list
        for (var i=0;i<Crpstudio.project.prj_qclist.length;i++) {
          var oOneItem = Crpstudio.project.prj_qclist[i];
          var iId = parseInt(oOneItem[oDescr.id], 10);
          // Check the id
          if (iId === iIdValue) {
            //Change the item's field value
            Crpstudio.project.prj_qclist[i][sKey] = sValue;
          }
        }
        break;
    }

  },
  
  /**
   * getItemField
   *    Get the location (the <div> id) associated with field @sFieldName in the
   *    list of type @sListType
   * 
   * @param {type} sListType
   * @param {type} sFieldName
   * @returns {undefined}
   */
  getItemFieldLoc: function(sListType, sFieldName) {
    var oItem = Crpstudio.project.getItemDescr(sListType);
    // Get the fields object
    var oFields = oItem.fields;
    // Walk all the fields
    for (var i=0;i<oFields.length;i++ ) {
      // Is this the correc field?
      if (oFields[i].field === sFieldName) {
        return oFields[i].loc;
      }
    }
    // Failure
    return "";
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
    // Capture previous selecting state
    //var bSelState = Crpstudio.project.bIsSelecting;
    // Set the previous selection state to 'false'
    var bSelState = false;
    // Are we switching?
    if (sPrjName !== Crpstudio.project.currentPrj) {
      // Is saving needed?
      if (Crpstudio.project.dirty) {
        // Ask user to save changes
        var userOk = confirm("Save changes in this ["+Crpstudio.project.currentPrj+"]?");  
        if (userOk) {
          // Indicate that we are selectiong
          Crpstudio.project.bIsSelecting = true;
          // Get the changes saved
          Crpstudio.project.histSave(true);
        } else {
          // Clear the history for this CRP
          Crpstudio.project.histClear(Crpstudio.project.currentPrj);
        }
      }
      // Make sure the save button is hidden
      Crpstudio.project.showSaveButton(false);      
    }
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
    $("#project_description").html("<i>Loading project...</i>");
    // Make the General area INvisible
    $("#project_general").addClass("hidden");
    // Invalidate the 'current' setters
    Crpstudio.project.currentQry = -1;
    Crpstudio.project.currentDef = -1;
    Crpstudio.project.currentDbf = -1;
    Crpstudio.project.currentQc = -1;
    /* ============== this does not work
    // Clear the contents of currently loaded query/def/dbfeat/qc
    if (Crpstudio.project.cmDef !== null) Crpstudio.project.cmDef.setValue("");
    if (Crpstudio.project.cmQuery !== null)  Crpstudio.project.cmQuery.setValue("");
    ================= */
    // Clear definition
    $("#def_general").addClass("hidden");
    $("#def_description").html("<i>No definition selected</i>");
    // Clear query
    $("#query_general").addClass("hidden");
    $("#query_description").html("<i>No query selected</i>");
    // Clear constructor
    $("#qc_general").addClass("hidden");
    $("#qc_description").html("<i>No constructor line selected</i>");
    
    
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
      Crpstudio.project.resetDbase(false);
    } else {
      Crpstudio.project.setDbase(sDbase, sLng, sDir, false);
    }
    // Indicate we are no longer selecting
    Crpstudio.project.bIsSelecting = bSelState;
    
    // Pass on this value to /crpstudio and to /crpp
    var oArgs = { "project": sPrjName,
      "userid": Crpstudio.currentUser, 
      "type": "info" };
    // var params = "changes=" + JSON.stringify(oChanges);
    var params = JSON.stringify(oArgs);
    
    Crpstudio.getCrpStudioData("load", params, Crpstudio.project.processLoad, "#project_description");
  },
  
  /**
   * removeItemFromList
   *    Remove item @iItemId from the list of type @sItemType
   * 
   * @param {type} sItemType
   * @param {type} iItemId
   * @returns {int}           - Id of the element that should now be selected
   */
  removeItemFromList : function(sItemType, iItemId) {
    // Validate
    if (iItemId <1 || !sItemType || sItemType==="") return;
    // Get the correct list
    var oList = Crpstudio.project.getList(sItemType);
    // Access the information object for this type
    var oItemDesc = Crpstudio.project.getItemDescr(sItemType);    
    // Find out what the correct Id-field is
    var sIdField = oItemDesc.id;
    // Walk the list until we get the correct element
    for (var i=0;i<oList.length;i++) {
      // Check if this is the correct element
      var oThis = oList[i];
      if (parseInt(oThis[sIdField],10) === iItemId) {
        // This is the item that needs to be deleted
        oList.splice(i,1);
        // Check what the next item is that should be selected
        if (oList.length>= i+1) {
          // Return the next item in the list
          oThis = oList[i];
          return oThis[sIdField];
        } else if (oList.length>0) {
          // Return the *last* item in the list
          oThis = oList[oList.length-1];
          return oThis[sIdField];
        } else {
          // Nothing is left, so return negatively
          return -1;
        }
      }
    }
    return -1;
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
      if (oFirst === null) oFirst = $(this).children(":last").get(0);
      // Check if it has the correct class
      if ($(this).hasClass(sClass)) {
        // Find this element's last child, which is the <a> element
        var oTarget = $(this).children(":last").get(0);
        // Return this
        return oFirst = oTarget;
      }
    });
    // Return the result of the search function
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
      // var listItem = $(target).parent();
      var listItem = $(target).closest("li");
      // Look at all the <li> children of <ul>
      // var listHost = listItem.parent();
      // Get the <ul> above it
      var listHost = $(target).closest('ul');
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
      // Indicate we are selecting
      var bSelState = Crpstudio.project.bIsSelecting;
      Crpstudio.project.bIsSelecting = true;
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
          // Is this the first time we are visiting QC?
          
          // Make sure the visibility is okay
          Crpstudio.project.setSizes();
          break;
        case "dbase": 
          break;
      }

      // We are no longer selecting
      Crpstudio.project.bIsSelecting = bSelState;

    }
  },

  /**
   * xqQueryChanged
   *    Process the changes in the Query editor
   * 
   * @param {type} cm
   * @param {type} change
   * @returns {undefined}
   */
  xqQueryChanged : function(cm, change) {
    // DOn't proceed if we are selecting
    if (Crpstudio.project.bIsSelecting) return;
    // Okay, proceed
    var sValue = cm.getValue();
    $("#query_general_text").text(sValue);
    Crpstudio.project.ctlCurrentId = "query_general_text";
    Crpstudio.project.histAdd("query", Crpstudio.project.currentQry, Crpstudio.project.currentPrj,
        "Text", sValue);
    /*
    Crpstudio.project.ctlTimer($("#query_general_text"), "textarea");
    */
  },
  /**
   * xqDefChanged
   *    Process the changes in the Definition editor
   * 
   * @param {type} cm
   * @param {type} change
   * @returns {undefined}
   */
  xqDefChanged : function(cm, change) {
    // DOn't proceed if we are selecting
    if (Crpstudio.project.bIsSelecting) return;
    // Okay, proceed
    var sValue = cm.getValue();
    $("#def_general_text").text(sValue);
    Crpstudio.project.ctlCurrentId = "def_general_text";
    Crpstudio.project.histAdd("definition", Crpstudio.project.currentDef, Crpstudio.project.currentPrj,
        "Text", sValue);
    /*
    Crpstudio.project.ctlTimer($("#def_general_text"), "textarea");
    */
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
          Crpstudio.project.prj_crplist = oContent.crplist;
          Crpstudio.project.prj_genlist = Crpstudio.project.setGenList(oContent);
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
          Crpstudio.project.resetDbase(false);
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
            
          // Make the General area visible again
          $("#project_general").removeClass("hidden");
          // Make sure the execute buttons are shown
          Crpstudio.project.showExeButtons(true);
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
    $(sId + " input").on("change paste input", 
      function() {Crpstudio.project.ctlTimer(this, "input");});
    // Checkbox: bind on the click event
    $(sId + " input:checkbox").on("click", 
      function() {Crpstudio.project.ctlTimer(this, "input");});
    // Note: do not set the .on("blur") event, because that is not really necessary

    // Add event handlers on all TEXTAREA elements under "project_general"
    $(sId + " textarea").on("change paste input", 
      function() {Crpstudio.project.ctlTimer(this, "textarea");});

    // Add event handlers on all SELECT elements under "project_general"
    $(sId + " select").on("change paste input", 
      function() {Crpstudio.project.ctlTimer(this, "select");});
    
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
      // The response is a standard object containing "status" (code) and "content" (code, message)
      var oStatus = response.status;
      var sStatusCode = oStatus.code;
      var oContent = response.content;
      // Try to retrieve item type
      var sItemType = oContent.itemtype;
      if (!sItemType || sItemType === "") sItemType = "project";
      // Remove waiting
      $("#"+sItemType+"_description").html("");
      switch (sStatusCode) {
        case "completed":
          // Make sure the save button is hidden
          Crpstudio.project.showSaveButton(false);
          // Reset the dirty flag
          Crpstudio.project.dirty = false;
          // Have changes been made?
          if (oContent.changed) {
            // Get the information passed on about this project
            var sDateChanged = oContent.datechanged;
            // Get the CRP for which this was done
            var sCrpChanged = oContent.crp;
            if (sItemType === "project") {
              if (sCrpChanged === Crpstudio.project.currentPrj) {
                // Put the information on the correct places in the form
                $("#"+sItemType+"_general_datechanged").html(sDateChanged);
              }
              // Show that changes have been made
              $("#top_bar_saved_project").html(sCrpChanged);
              $("#top_bar_saved_project").parent().removeClass("hidden");
              // Wait for some time and then show it again
              setTimeout(function() {$("#top_bar_saved_project").parent().addClass("hidden");}, 700);
            } else {
              // Get the key/value/id of the change that took place
              var sKey = oContent.key;
              var sValue = oContent.value;
              var iId = oContent.id;
              // Actions depend on the type we have
              switch (sItemType) {
                case "query":
                  // Perform the change in the JavaScript object
                  Crpstudio.project.setOneItem(sItemType, sKey, iId, sValue);
                  // Adapt the date 
                  var qryChanged = Crpstudio.project.getItemFieldLoc(sItemType, "Changed");
                  $("#" + qryChanged).html(sDateChanged);
                  break;
                case "definition":
                  // Perform the change in the JavaScript object
                  Crpstudio.project.setOneItem(sItemType, sKey, iId, sValue);
                  // Adapt the date 
                  var defChanged = Crpstudio.project.getItemFieldLoc(sItemType, "Changed");
                  $("#" + defChanged).html(sDateChanged);
                  break;
                case "constructor":
                  // Perform the change in the JavaScript object
                  Crpstudio.project.setOneItem(sItemType, sKey, iId, sValue);
                  break;
                case "dbfeat":
                  // Perform the change in the JavaScript object
                  Crpstudio.project.setOneItem(sItemType, sKey, iId, sValue);
                  break;
              }
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
			$("#"+sItemType+"_status").html("Server problem - Failed to process changes in the CRP.");
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
      // var text = encodeURIComponent(e.target.result);
      var text = e.target.result;
      // Signal what we are doing
      $("#"+sItemType+"_description").html("Uploading...");
      // Send this information to the /crpstudio
      //var params = "file=" + oFile.name + "&itemtype=" + sItemType + 
      //        "&itemmain=" + sItemMain + "&userid=" + Crpstudio.currentUser +
      //        "&itemtext=" + text;
      
      // Pass on this value to /crpstudio and to /crpp
      var oArgs = { "file": oFile.name, "itemtype": sItemType, "itemmain": sItemMain,
        "userid": Crpstudio.currentUser, "itemtext": text };
      var params = JSON.stringify(oArgs);
      
      Crpstudio.getCrpStudioData("upload", params, Crpstudio.project.processUpLoad, "#"+sItemType+"_description");
    });
	},
  /**
   * processUpLoad
   *    What to do when a project has been loaded
   *    
   * @param {type} response   JSON object returned from /crpstudio/load
   * @param {type} target     The 'description' <div> for this 'item' type
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
            case "definition": sAbbr = "def"; Crpstudio.project.prj_deflist = oContent.itemlist; break;
            case "query": sAbbr = "qry"; Crpstudio.project.prj_qrylist = oContent.itemlist; break;
          }
          // Item-type-independent stuff
          var sItemName = oContent.itemname;
          // Further action really depends on the item type
          switch(sItemType) {
            case "project":
              // Get the item line from the oContent structure
              var sItemLine = oContent.itemline;
              // Add the item line to the correct <ul> list
              if (!Crpstudio.project.itemInsertLine(sItemLine, sItemName, sItemType, sAbbr))
                $(target).html("Error: could not insert new CRP " + sItemName);
              break;
            case "definition": case "query":
              // Get the id
              var iItemId = oContent.itemid;
              // Fill the query/definition list, but switch off 'selecting'
              var bSelState = Crpstudio.project.bIsSelecting;
              Crpstudio.project.bIsSelecting = true;
              Crpstudio.project.showlist(sItemType);
              Crpstudio.project.bIsSelecting = bSelState;
              // Get the <a> element of the newly to be selected item
              var targetA = Crpstudio.project.getCrpItem(sItemType, iItemId);
              // Call setCrpItem() which will put focus on the indicated item
              Crpstudio.project.setCrpItem(targetA, sItemType, iItemId);
              // Add the uploaded query/definition to the History List
              Crpstudio.project.histAddItem(sItemType, iItemId);
              break;
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
   * itemInsertLine
   *    Create a <li> element for the indicated list and insert it
   * 
   * @param {type} sItemLine
   * @param {type} sItemName
   * @param {type} sItemType
   * @param {type} sAbbr
   * @returns {undefined}
   */
  itemInsertLine : function(sItemLine, sItemName, sItemType, sAbbr) {
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
      return true;
    }    
    // Getting here: failure
    return false;
  },
  
  /**
   * removeFile
   *    Check which Item is currently selected (if any)
   *    Then remove that item:
   *    (1) from the server --> POST to /crpstudio
   *    (2) from the list here --> done in callback
   * 
   * @param {type} elDummy  - Not used right now
   * @param {string} sType  - Type of file to remove
   * @returns {undefined}   - no return
   */
  removeFile : function(elDummy, sItemType) {
    // Prepare variable
    var oArgs = null; var iItemId = -1; var lstItem = null; var sCrpName = "";
    var sItemMain = "";
    // Make sure download info is hidden
    $("#"+sItemType+"_download").addClass("hidden");
    // Find out which project is currently selected
    sCrpName = Crpstudio.project.currentPrj;
    // Action depends on the type
    switch(sItemType) {
      case "project":
        // There is no real itemmain
        sItemMain = "ROOT";                       // Project is root
        break;
      case "dbase":
        // There is no real itemmain
        sItemMain = "ROOT";                       // Databases is root
        break;
      case "query":
        // Validate
        iItemId = Crpstudio.project.currentQry;
        sItemMain = Crpstudio.project.currentPrj; // Query is part of a CRP
        break;
      case "definition":
        // Validate
        iItemId = Crpstudio.project.currentDef;
        sItemMain = Crpstudio.project.currentPrj; // Definition is part of a CRP
        break;
      case "dbfeat":
        // Validate
        iItemId = Crpstudio.project.currentDbf;
        sItemMain = Crpstudio.project.currentQc; // DbFeat is part of a QC
        break;
      case "constructor":
        // Validate
        iItemId = Crpstudio.project.currentQc;
        sItemMain = Crpstudio.project.currentPrj; // Constructor is part of a CRP
        break;
      default:
        // Unable to handle this, so leave
        return;
    }
    if (sCrpName && sCrpName !== "") {
      // Action depends on the type
      switch (sItemType) {
        case "project":
          // Note: /crpstudio must check when the last download of this project was
          // Send removal request to /crpstudio, which checks and passes it on to /crpp
          oArgs = { "itemid": iItemId, "itemtype": sItemType, "itemmain": sItemMain,  
                    "crp": sCrpName, "userid": Crpstudio.currentUser };
          // Send the remove request
          var params = JSON.stringify(oArgs);
          Crpstudio.getCrpStudioData("remove", params, Crpstudio.project.processRemove, "#"+sItemType+"_description");      
          break;
        case "query": case "definition": 
          // Make a call to histAdd, which signals the deletion
          Crpstudio.project.histAdd(sItemType, iItemId, sCrpName, "delete", "");
          // Delete the item from the list
          var iItemNext = Crpstudio.project.removeItemFromList(sItemType, iItemId);
          // Fill the query/definition list, but switch off 'selecting'
          var bSelState = Crpstudio.project.bIsSelecting;
          Crpstudio.project.bIsSelecting = true;
          Crpstudio.project.showlist(sItemType);
          Crpstudio.project.bIsSelecting = bSelState;
          // Can we select the next item?
          if (iItemNext > 0) {
            // Set the new item id
            var iItemNextId = parseInt(iItemNext, 10);
            // Get the <a> element of the newly to be selected item
            var targetA = Crpstudio.project.getCrpItem(sItemType, iItemNextId);
            // Call setCrpItem() which will put focus on the indicated item
            Crpstudio.project.setCrpItem(targetA, sItemType, iItemNextId);
          }
          break;
        case "dbfeat": case "constructor":
          // TODO: check this out!!
          //       Possibly do as above
          //       But for constructor: more checking is needed??
          // Make a call to histAdd
          histAdd(sItemType, iItemId, sCrpName, "delete", "");
          break;
      }
    }
  },
  /**
   * processRemove
   *    Brushing up after project has been deleted
   *    NOTE: this is *not* a brush up after CRP parts deletion -- see processCrpChg
   *    
   * @param {type} response   JSON object returned from /crpstudio/remove
   * @param {type} target
   * @returns {undefined}
   */
  processRemove : function(response, target) {
		if (response !== null) {
      // The response is a standard object containing "status" (code) and "content" (code, message)
      var oStatus = response.status;
      var sStatusCode = oStatus.code;
      var oContent = response.content;
      // Preliminmary item type
      var sItemType = "";
      switch (sStatusCode) {
        case "completed":
          // Get all the necessary information from the [content] block
          var sCrpName = oContent.crp;
          var sItemMain = oContent.itemmain;
          var iItemId = oContent.itemid;
          sItemType = oContent.itemtype;
          // Remove waiting
          $("#"+sItemType+"_description").html("");
          // Action depends on type
          switch (sItemType) {
            case "project":
              // Validate
              if (sCrpName!==null && sCrpName!==undefined) {
                // Remove the project from the list
                $("#"+sItemType+"_list .crp_"+sCrpName).remove();
                // Remove the current project
                Crpstudio.project.currentPrj = "";
                // Indicate that the user needs to make a new selection
                Crpstudio.project.switchTab("project_editor", "", true);
              }
              break;
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
			$("#"+sItemType+"_status").html("ERROR - Failed to remove the .crpx result from the server.");
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
      //var params = "itemname=" + sItemName + "&itempart=" + sItemPart + 
      //        "&itemtype=" + sFileType + "&userid=" + Crpstudio.currentUser;
      // Pass on this value to /crpstudio and to /crpp
      var oArgs = { "itemname": sItemName, "itempart": sItemPart,
        "userid": Crpstudio.currentUser, "itemtype": sFileType };
      var params = JSON.stringify(oArgs);
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
          var oArgs = { "crp": Crpstudio.project.currentPrj,
            "userid": Crpstudio.currentUser, 
            "key": sKey, "value": sValue };
          // var params = "changes=" + JSON.stringify(oChanges);
          var params = JSON.stringify(oArgs);
          Crpstudio.getCrpStudioData("crpchg", params, Crpstudio.project.processCrpChg, "#project_description");  
          break;
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
      // Process the change by calling [histAdd]
      Crpstudio.project.histAdd("project", -1, Crpstudio.project.currentPrj,
          "Source", sDbName);

/*
      // Pass on this value to /crpstudio and to /crpp
      var sKey = "source";
      var sValue = sDbName;
      var oArgs = { "crp": Crpstudio.project.currentPrj,
        "userid": Crpstudio.currentUser, "key": sKey, "value": sValue };
      // var params = "changes=" + JSON.stringify(oChanges);
      var params = JSON.stringify(oArgs);
      Crpstudio.getCrpStudioData("crpchg", params, Crpstudio.project.processCrpChg, "#dbase_description");  
      */
    }
  },
  /**
   * resetDbase -- reset the current database input
   * 
   * @returns {undefined}
   */
  resetDbase : function(bChange) {
    // Set the corpus name and dir name in the top section
    $("#top_bar_current_dbase").text("");
    // Set these values also in our own variables
    Crpstudio.project.currentDb = "";    
    // Only process if we know there are changes
    if (bChange) {
      // Process the change by calling [histAdd]
      Crpstudio.project.histAdd("project", -1, Crpstudio.project.currentPrj,
          "Source", "");
      Crpstudio.project.histAdd("project", -1, Crpstudio.project.currentPrj,
          "DbaseInput", "False");
    }
  },
  
  /**
   * setPrjType
   *    Set the project type
   *    
   * @param {type} sPrjType
   * @returns {undefined}
   */
  setPrjType : function(sPrjType) {
    // New method
    Crpstudio.project.ctlCurrent = $("#project_general_prjtype");
    Crpstudio.project.ctlTimer($("#project_general_prjtype", "-"));
  },
  
  /**
   * histAdd - add one item to the history
   * 
   * @param {type} sType  - project, query, definition etc
   * @param {type} iId    - numerical id of query/def etc
   * @param {type} sCrp   - name of the CRP
   * @param {type} sKey   - field name (e.g. "Goal", "Text")
   * @param {type} sValue - new value of the field
   * @returns {undefined}
   */
  histAdd : function(sType, iId, sCrp, sKey, sValue) {
    // If this is a change in name, then check it immediately
    if (!Crpstudio.project.itemCheck(sType, iId, sKey, sValue)) return;
    // Possibly get the last item of history
    var iSize = Crpstudio.project.lstHistory.length;
    var bAdded = false;
    if (iSize >0) {
      var oLast = Crpstudio.project.lstHistory[iSize-1];
      // Check if this pertains to the same type/id/crp/key
      if (oLast.type === sType && oLast.id === iId && oLast.crp === sCrp &&
              oLast.key === sKey) {
        // We simply adapt the last item
        oLast.value = sValue;
        Crpstudio.project.lstHistory[iSize-1] = oLast;
        bAdded = true;
      }
    } 
    if (!bAdded) {
      // Check what the 'old' value was
      var sOld = Crpstudio.project.getItemValue(sType, iId, sCrp, sKey);
      // We need to *add* a new element: create the element
      var oNew = {type: sType, id: iId, crp: sCrp, key: sKey, value: sValue, old: sOld, saved: false};
      // Add the new element to the list
      Crpstudio.project.lstHistory.push(oNew);
    }
    // Check if the value needs to be adapted in a list
    switch (sKey) {
      case "delete":
      case "create":
        // No changes here
        break;
      default:
        // Change in list
        Crpstudio.project.setOneItem(sType, sKey, iId, sValue);
        // Check if list needs to be re-drawn
        
        break;
    }
    
    // Make sure the save button is shown
    Crpstudio.project.showSaveButton(true);
    // Indicate the project needs saving
    Crpstudio.project.dirty = true;
  },
  
  /**
   * histAddItem
   *    Add all elements of item in the list of @sItemType with @iItemId
   * 
   * @param {type} sItemType
   * @param {type} iItemId
   * @returns {undefined}
   */
  histAddItem : function(sItemType, iItemId) {
    // Validate: the @id must be 1 or higher
    if (!sItemType || !iItemId || iItemId <1) return;
    // Access the information object for this type
    var oItemDesc = Crpstudio.project.getItemDescr(sItemType);
    // Access the item from the correct list
    var oListItem = Crpstudio.project.getListObject(sItemType, oItemDesc.id, iItemId);
    // Start out with a histAdd that signals the creation of a new item
    Crpstudio.project.histAdd(sItemType, iItemId, Crpstudio.project.currentPrj, "create", "")
    // Walk all the fields of this item
    var arFields = oItemDesc.fields;
    for (var i=0;i<arFields.length;i++) {
      // Get the descriptor of this item
      var oFieldDesc = arFields[i];
      // Check if this one needs to be done
      if (oFieldDesc.loc !== "") {
        // Yes, this one needs an addHist treatment
        var sValue = oListItem[oFieldDesc.field];
        // Only add if we really have a value
        if (sValue) 
          Crpstudio.project.histAdd(sItemType, iItemId, Crpstudio.project.currentPrj, oFieldDesc.field, sValue);
      }
    }
    
  },
  
  /**
   * histClear -- Clear the history for the specified project
   * 
   * @param {type} sCrpName
   * @returns {undefined}
   */
  histClear: function(sCrpName) {
    var arHist = Crpstudio.project.lstHistory;
    // Walk all the items in the history
    for (var i=arHist.length-1; i>=0;i--) {
      // Access this item for convenience
      var oItem = arHist[i];
      // Check if this item relates to the indicated CRP
      if (oItem.crp === sCrpName) {
        // Clear this item
        arHist.splice(i,1);
      }
    }
    // Reset the dirty flag if needed
    // if (arHist.length === 0) Crpstudio.project.dirty = false;
    // (No 'if' is needed, perhaps??)
    Crpstudio.project.dirty = false;
  },
  
  /**
   * histSave -- save current history and clear it
   * 
   * @param {type} bClear
   * @returns {undefined}
   */
  histSave : function(bClear) {
    var arSend = [];
    var arHist = Crpstudio.project.lstHistory;
    for (var i=0;i<arHist.length;i++) {
      var oItem = arHist[i];
      if (!oItem.saved && oItem.crp === Crpstudio.project.currentPrj) {
        // Create a new 'key' item
        var sKey = oItem.key;
        if (oItem.type !== "project") sKey = oItem.type + "." + sKey;
        // COpy it -- making use of the adapted key
        arSend.push({key: sKey, id: oItem.id, value: oItem.value});
      }
    }
    // Pass on this value to /crpstudio and to /crpp
    var oChanges = { "crp": Crpstudio.project.currentPrj,
      "userid": Crpstudio.currentUser, "list": arSend };
    var params = JSON.stringify(oChanges);
    // Clear the history list
    if (bClear) 
      Crpstudio.project.lstHistory = [];
    else {
      // At least clear the project history
      Crpstudio.project.histClear(Crpstudio.project.currentPrj);
    }
    // Send the changes
    Crpstudio.getCrpStudioData("crpchg", params, Crpstudio.project.processCrpChg, "#project_description");      
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
    var sChk = $(source).attr("id");
    if (!sChk || sChk === "") source = $("#" + Crpstudio.project.ctlCurrentId);
    // Reset currentid
    Crpstudio.project.ctlCurrentId = "";
    // Clear any previously set timer
    clearTimeout(Crpstudio.project.typingTimer);
    // Find parameters
    var sKey = "";
    var sValue = $(source).val();
    var sKind = (sType && sType !== null) ? sType : "-";
    var iItemId = -1;
    // Determine which 'key' this is
    var sElementId = $(source).attr("id");
    // Validate: do not proceed if there is no valid element selected
    if (sElementId === "") return;
    // COntinue
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
        // Possibly get the value from another source
        if (sElementId.contains("query_")) {
          // Do not accept query text changes if we are selecting
          if (Crpstudio.project.bIsSelecting) return;
          // Get correct value
          sValue = Crpstudio.project.cmQuery.getValue(); 
        } else if (sElementId.contains("def_")) {
          // Do not accept query text changes if we are selecting
          if (Crpstudio.project.bIsSelecting) return;
          // Get correct value
          sValue = Crpstudio.project.cmDef.getValue(); 
        }
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
    var params = JSON.stringify(oChanges);
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
    var sCallerId = $(source).attr("id");
    var sValue;
    // Value depends on the type
    if ($(source).is("input:checkbox"))
      sValue = ($(source).is(':checked')) ? "True" : "False"; 
    else 
      sValue = $(source).val();
    // Some controls require immediate action
    switch (sCallerId) {
      case "project_general_dbase": 
        var sChbValue = ($(source).is(':checked')) ? "True" : "False"; 
        // Only continue if there is a CHANGE
        if (sChbValue === Crpstudio.project.prj_dbaseinput) return; 
        // Make sure the change is recorded globally
        Crpstudio.dbaseInput = (sChbValue === "True");
        Crpstudio.project.prj_dbaseinput = sChbValue;
        // If we are changing to "False", then reset the database specifications
        if (sChbValue === "False") {
          Crpstudio.project.resetDbase(true);
        } else {
          // Guide the user to the input specification page where a database must be selected
          Crpstudio.project.switchTab("input_editor");
        }
        break;
    }
    // Set the source
    Crpstudio.project.ctlCurrent = source;
    
    // Find out who we are by looking up the caller's @id value
    var oItem = Crpstudio.project.getItemObject(sCallerId);
    // Get the current iItemId
    var iItemId = -1;
    switch(oItem.type) {
      case "query": iItemId = Crpstudio.project.currentQry;break;
      case "definition": iItemId = Crpstudio.project.currentDef;break;
      case "constructor": iItemId = Crpstudio.project.currentQc;break;
      case "dbfeat": iItemId = Crpstudio.project.currentDbf;break;
    }
    
    // Process the change by calling [histAdd]
    Crpstudio.project.histAdd(oItem.type, iItemId, Crpstudio.project.currentPrj,
        oItem.key, sValue);
        
    // Not for 'project' type
    switch (oItem.type) {
      case "project":
        break;
      default:
        // Check if list needs to be re-drawn
        var oDescr = Crpstudio.project.getItemDescr(oItem.type);
        if (oItem.key === oDescr.listfield) {
          // Make sure the list is re-drawn
          // Fill the query/definition list, but switch off 'selecting'
          var bSelState = Crpstudio.project.bIsSelecting;
          Crpstudio.project.bIsSelecting = true;
          Crpstudio.project.showlist(oItem.type);
          // Get the <a> element of the newly to be selected item
          var targetA = Crpstudio.project.getCrpItem(oItem.type, iItemId);
          // Call setCrpItem() which will put focus on the indicated item
          Crpstudio.project.setCrpItem(targetA, oItem.type, iItemId);
          // Indicate all went well
          // bOkay = true;
          Crpstudio.project.bIsSelecting = bSelState;
        }
        break;
    }
    
    /* ========== OLD ========
    // OLD BEHAVIOUR: Call a new timer
    Crpstudio.project.typingTimer = setTimeout(Crpstudio.project.ctlChanged, 
      Crpstudio.project.doneTypingIntv, source, sType);
      ======================== */
  },
  /* ---------------------------------------------------------------------------
   * Name: createManual
   * Goal: manually create a project, query, defintion and so forth
   * History:
   * 23/jun/2015  ERK Created
   */
  createManual : function(target, sItemType) {
    // Action depends on the kind of item
    switch (sItemType) {
      case "project":
        // Make sure download info is hidden
        $("#project_download").addClass("hidden");
        // Get the <li>
        // var listItem = $(target).parent();
        var listItem = $(target).closest('li');
        // Look at all the <li> children of <ul>
        // var listHost = listItem.parent();
        var listHost = listItem.closest('ul');
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
        break;
      case "query":
        // Make sure the new query form becomes visible
        $("#query_general_editor").addClass("hidden");
        $("#query_new_create").removeClass("hidden");
        break;
      case "definition":
        // Make sure the new definition form becomes visible
        $("#def_general_editor").addClass("hidden");
        $("#def_new_create").removeClass("hidden");
        break;
    }
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
    var listItem = $(target).closest('li');
    // Look at all the <li> children of <ul>
    var listHost = listItem.closest('ul');
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
   * createItem
   *    Create a new qry/def/dbf/ and so on
   * 
   * @param {type} sItemType
   * @param {type} sAction
   * @returns {undefined}
   */
  createItem : function(sItemType, sAction) {
    var bOkay = false;
    var oDescr = Crpstudio.project.getItemDescr(sItemType);
    var sDivPrf = oDescr.divprf;
    // Reset any previous naming
    $("#"+sDivPrf+"_new_name_error").removeClass("error");
    $("#"+sDivPrf+"_new_name_error").addClass("hidden");
    // First look at the action
    switch(sAction) {
      case "new":
        // Check the information provided
        var sItemName = $("#"+sDivPrf+"_new_name").val();
        var sItemGoal = $("#"+sDivPrf+"_new_goal").val();
        var sItemComment = $("#"+sDivPrf+"_new_comment").val();
        
        // Only the item NAME is obligatory + check the NAME item
        if (sItemName !=="") {
          // Validate: check 
          if (!Crpstudio.project.itemNameCheck(sItemType, sItemName)) {
            // Signal that the name is not correct
            $("#"+sDivPrf+"_new_name_error").html("Duplicate: "+sItemName)
            $("#"+sDivPrf+"_new_name_error").addClass("error");
            $("#"+sDivPrf+"_new_name_error").removeClass("hidden");
            return;
          }
          // Create a new item
          var iItemId = Crpstudio.project.createListItem(sItemType, 
            {Name: sItemName, Goal: sItemGoal, Comment: sItemComment, Text: "-"});
            
          // Hide the form
          switch(sItemType) {
           case "query":
             $("#query_new_create").addClass("hidden");
             $("#query_general_editor").removeClass("hidden");
             break;
           case "definition":
             $("#def_new_create").addClass("hidden");
             $("#def_general_editor").removeClass("hidden");
             break;
          }
        
          // Make sure the list is re-drawn
          // Fill the query/definition list, but switch off 'selecting'
          var bSelState = Crpstudio.project.bIsSelecting;
          Crpstudio.project.bIsSelecting = true;
          Crpstudio.project.showlist(sItemType);
          // Get the <a> element of the newly to be selected item
          var targetA = Crpstudio.project.getCrpItem(sItemType, iItemId);
          // Call setCrpItem() which will put focus on the indicated item
          Crpstudio.project.setCrpItem(targetA, sItemType, iItemId);
          // Indicate all went well
          // bOkay = true;
          Crpstudio.project.bIsSelecting = bSelState;
        }
        break;
      case "cancel":
        // Return to the current item
        bOkay = true;
        break;
    }
    // Hide the form if all is well
    if (bOkay) {
      switch(sItemType) {
        case "query":
          $("#query_new_create").addClass("hidden");
          $("#query_general_editor").removeClass("hidden");
          break;
        case "definition":
          $("#def_new_create").addClass("hidden");
          $("#def_general_editor").removeClass("hidden");
          break;
      }
    }
  },
  
  /**
   * itemNameCheck
   *    Check if name @sItemName already exists for @sItemType
   *    
   * @param {type} sItemType
   * @param {type} sItemName
   * @returns {boolean}       - true if the item is okay (it *not* a duplicate)
   */
  itemNameCheck : function(sItemType, sItemName) {
    // Get the list
    var oList = Crpstudio.project.getList(sItemType);
    // Find out which name need to be checked
    var oDescr = Crpstudio.project.getItemDescr(sItemType);
    var sListField = oDescr.listfield;
    // Walk the list
    for (var i=0;i<oList.length;i++) {
      // Get this item
      var oItem = oList[i];
      if (oItem[sListField] === sItemName) return false;
    }
    // Getting here means we're okay
    return true;
  },
  
  /**
   * itemCheck
   *    Check if item of type @sItemType kan have a @sKey with @sValue
   *    
   * @param {type} sItemType
   * @param {type} iId        - @id value of the item to be checked
   * @param {type} sKey
   * @param {type} sValue
   * @returns {bool}          - Return true if the check is okay
   */
  itemCheck : function(sItemType, iId, sKey, sValue) {
    var bOkay = true;
    // Find out which name needs to be checked
    var oDescr = Crpstudio.project.getItemDescr(sItemType);
    var sListField = oDescr.listfield;
    var sIdField = oDescr.id;
    var sId = iId.toString();
    // Check if this is the listfield
    if (sListField === sKey) {
      // This is the list field, so check the value
      if (sValue.contains(" ")) {
        bOkay = false;
      } else {
        // Check if the name occurs already
        switch (sItemType) {
          case "project":
            var oList = Crpstudio.project.prj_crplist;
            var sCurCrp = Crpstudio.project.currentPrj;
            // Walk the list
            for (var i=0;i<oList.length;i++) {
              // Get this item
              var oItem = oList[i];
              if (oItem["crp"] !== sCurCrp+".crpx") {
                if (oItem["crp"] === sValue+".crpx") { bOkay = false; break; }
              }
            }
            break;
          default:
            var oList = Crpstudio.project.getList(sItemType);
            // Walk the list
            for (var i=0;i<oList.length;i++) {
              // Get this item
              var oItem = oList[i];
              if (oItem[sListField] === sValue && oItem[sIdField] !== sId) { bOkay = false; break; }
            }
            break;
        }
      }
    }
    // Get the name of the <div> for this field
    var sLoc = "";
    for (var i=0;i<oDescr.fields.length;i++) {
      var oFieldDescr = oDescr.fields[i];
      if (oFieldDescr.field === sKey) {
        sLoc = oFieldDescr.loc; break;
      }
    }
    // FOund the loc?>
    if (sLoc !== "") {
      var sLocErr = sLoc + "_error";
      // Action if we're not okay
      if (!bOkay) {
        // Put the location in error mode
        $("#"+sLocErr).addClass("error");
        $("#"+sLocErr).removeClass("hidden");
      } else {
        // Remove possible error mode
        $("#"+sLocErr).removeClass("error");
        $("#"+sLocErr).addClass("hidden");
      }

    }
    
    // Getting here means we're okay
    return bOkay;
  },
  
  /**
   * getNewId 
   *    Create a new id for list @oList, using field @sIdField
   * 
   * @param {type} oList
   * @param {type} sIdField
   * @returns {undefined}
   */
  getNewId : function(oList, sIdField) {
    var iItemId = 0;
    // Validate
    if (oList === null) return 0;
    // Check for trivial case
    if (oList.length===0) iItemId = 1;
    // Walk through all members, looking for the maximum
    for (var i=0;i<oList.length;i++) {
      var oItem = oList[i];
      var iThisId = parseInt(oItem[sIdField],10);
      if (iThisId > iItemId) iItemId = iThisId;
    }
    // Return the result
    return iItemId+1;
  },
  
  /**
   * createListItem 
   *    Create a new item for the list of type @sListType
   * 
   * @param {type} sListType
   * @param {type} oStart
   * @returns {int}           new item's id (numerical)
   */
  createListItem : function(sListType, oStart) {
    // Get a descriptor object
    var oDescr = Crpstudio.project.getItemDescr(sListType);
    // Find the correct list
    var oList = Crpstudio.project.getList(sListType);
    var iItemId = Crpstudio.project.getNewId(oList, oDescr.id);
    // Start preparing a new object
    var oNew = {}; oNew[oDescr.id] = iItemId.toString();
    // Get the fields array
    var arField = oDescr.fields;
    // Walk all the fields
    for (var i=0;i<arField.length;i++) {
      // Add this field to the object
      var oOneField = arField[i].field; oNew[oOneField] = "";
    }
    // Adapt the fields provided by [oStart]
    for (var propt in oStart) {
      oNew[propt] = oStart[propt];
    }
    // Add the new item to the correct list
    oList.push(oNew);
    // Indicate in the history that this new object must be created
    Crpstudio.project.histAddItem(sListType, iItemId);
    // Return the new id
    return iItemId;
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
