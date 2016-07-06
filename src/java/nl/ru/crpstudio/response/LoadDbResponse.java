/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
package nl.ru.crpstudio.response;

import nl.ru.util.json.JSONArray;
import nl.ru.util.json.JSONObject;

/**
 * LoadDbResponse
 *    This has several functions connected with databases, 
 *    depending on the "type" parameter:
 * 
 *    info    - Loading a database and getting all relevant information about it
 *    dbases  - List of currently available databases
 * 
 * @author Erwin R. Komen
 */
public class LoadDbResponse extends BaseResponse {
  private String dbName;    // Name of the database to be loaded
  private String loadType;  // Type of information to be loaded
  private int iStart;       // Starting number
  private int iCount;       // Number of items
  private int iTotal;       // TOtal number of results in database
  private final int MAX_COLS = 8;
  String sSort;             // COlumn to sort on
  JSONObject oInfo = null;
  JSONObject oDbSettings = null;
  JSONArray arColumns = new JSONArray();
  JSONObject oSettings = null;            // Settings for this user as stored on /crpp

  @Override
  protected void completeRequest() {
    JSONObject oContent = new JSONObject();

    try {
      // Collect the JSON from our POST caller
      JSONObject oQuery = new JSONObject(request.getParameter("args"));
      if (!oQuery.has("userid"))  { sendErrorResponse("LoadDbResponse: missing @userid");   return;}
      if (!oQuery.has("type"))    { sendErrorResponse("LoadDbResponse: missing @type");     return;}

      // There are three parameters: project, userid, type
      loadType  = oQuery.getString("type");
      sUserId   = oQuery.getString("userid");

      // Validate: all two must be there
      if (loadType.isEmpty()) { sendErrorResponse("Specify type of information needed");  return;}
      if (sUserId.isEmpty())  { sendErrorResponse("The userid is not specified");         return; }
      
      // Make sure that the loadtype is returned in the reply
      oContent.put("type", loadType);
      
      // The actual reply depends on the @loadType
      switch(loadType) {
        case "dbases":
          // TODO: Pass on a list of databases and information about them
          oContent.put("dbaselist", this.getDbaseList(sUserId));
          break;
        case "list_settings": // Pass on list-view settings
          // Validate obligatory parameters
          if (!oQuery.has("dbase")) { sendErrorResponse("LoadDbResponse: missing dbase");  return;}
          // Retrieve the parameters
          dbName = oQuery.getString("dbase"); if (dbName.isEmpty()) { sendErrorResponse("Name of database not specified"); return;}
          // Now check which settings are passed on and should be kept for future use
          JSONObject oLvSettings = new JSONObject();
          if (oQuery.has("start")) oLvSettings.put("start", oQuery.getInt("start"));
          if (oQuery.has("count")) oLvSettings.put("count", oQuery.getInt("count"));
          if (oQuery.has("sort")) oLvSettings.put("sort", oQuery.getString("sort"));
          if (oQuery.has("columns")) {
            arColumns = oQuery.getJSONArray("columns");
            if (arColumns.length()>8) {
              // Delete what is above 8
              for (int j=arColumns.length()-1; j>=8;j--) {
                arColumns.remove(j);
              }
            }
            oLvSettings.put("columns", arColumns);
          }
          // Store these settings for this particular (user-dependent) database
          // TODO: code this...
          this.setDbSettings(sUserId, dbName, oLvSettings);
          break;
        case "list_adapt":
          // Adapt the load type
          oContent.put("type", "list");
        case "list":    // Request for a list-view segment
          // Validate obligatory parameters
          if (!oQuery.has("dbase") || !oQuery.has("start") || !oQuery.has("count")) 
            { sendErrorResponse("LoadDbResponse: missing one of: dbase, count, start");  return;}
          // Retrieve the parameters
          dbName = oQuery.getString("dbase"); if (dbName.isEmpty()) { sendErrorResponse("Name of database not specified"); return;}
          iStart = oQuery.getInt("start"); iCount = oQuery.getInt("count");
          // Check if we need to retrieve or to adjust the settings from last time
          if (loadType.equals("list_adapt")) {
            JSONObject oAdapted = new JSONObject();
            oAdapted.put("start", iStart);
            oAdapted.put("count", iCount);
            this.setDbSettings(sUserId, dbName, oAdapted);
            // Also make sure that we actually have access to teh settings
            oDbSettings = this.getDbSettings(sUserId, dbName);
          } else {
            // Retrieve the parameters that were stored from last time
            oDbSettings = this.getDbSettings(sUserId, dbName);
            if (oDbSettings.has("start")) iStart = oDbSettings.getInt("start");
            if (oDbSettings.has("count")) iCount = oDbSettings.getInt("count");
          }
          if (oQuery.has("sort")) {
            sSort = oQuery.getString("sort");
          } else {
            if (oDbSettings.has("sort")) sSort = oDbSettings.getString("sort");
          }
          if (oDbSettings.has("columns")) arColumns = oDbSettings.getJSONArray("columns");
          // Other validations
          if (iCount <=0) iCount = this.servlet.getDbPage();
          if (iStart <=0) iStart = 0;   // Startpoint at '0' means: first entry in database-list
          // Get the requested information from the CRPP
          oInfo = this.getDbaseInfo(sUserId, dbName, iStart, iCount, sSort);
          oContent.put("namedb", dbName);
          if (!sSort.isEmpty()) {
            // Include it in the results
            String sSortColumn = sSort;
            String sSortType = "asc";
            if (sSortColumn.startsWith("-")) { sSortType = "desc"; sSortColumn = sSortColumn.substring(1); }
            if (sSortColumn.startsWith("ft_")) {
              int iFtNum = 0;
              JSONArray arFt = oInfo.getJSONArray("Features");
              for (int j=0;j<arFt.length();j++) {
                if (arFt.getString(j).equals(sSortColumn)) {
                  iFtNum = j;
                  break;
                }
              }
              sSortColumn = "ft:" + iFtNum + ":" + sSortColumn.substring(3);
            }
            oContent.put("sortcolumn", sSortColumn);
            oContent.put("sorttype", sSortType);
          }
          // Retrieve the <General> parameters
          if (!addGeneral(oInfo, oContent)) { sendErrorResponse("Could not copy <General> part"); return;}
          // Set the columns that should be displayed
          if (oQuery.has("columns")) {
            // The caller supplied 'columns', so take them over
            arColumns = oQuery.getJSONArray("columns");
          } else if (arColumns.length()==0) {
            // no columns were supplied, so we set the default ones
            arColumns.put("ResId");
            arColumns.put("Cat");
            arColumns.put("TextId");
            arColumns.put("Locs");
            arColumns.put("Locw");
            arColumns.put("SubType");
            arColumns.put("");
            arColumns.put("");
          } else if (arColumns.length() > MAX_COLS) {
            // Delete what is above 8
            for (int j=arColumns.length()-1; j>=MAX_COLS;j--) {
              arColumns.remove(j);
            }
          }
          oContent.put("columns", arColumns);
          // Retrieve the Count and the Results
          if (oInfo.has("count") && oInfo.has("results")) {
            oContent.put("count", oInfo.getInt("count"));
            oContent.put("results", oInfo.getJSONArray("results"));
          }
          // Get the total number of results and the QC number
          if (oInfo.has("Size")) oContent.put("total", oInfo.getInt("Size"));
          if (oInfo.has("QC")) oContent.put("qc", oInfo.getInt("QC"));
          // Check which information should be passed on to the /crpp storage
          oDbSettings = new JSONObject();
          boolean bPassOn = false;
          if (oQuery.has("columns")) { oDbSettings.put("columns", arColumns); bPassOn = true; }
          if (oQuery.has("sort")) {oDbSettings.put("sort", sSort); bPassOn = true; }
          // If there is anything, pass it on to /crpp
          if (bPassOn) this.setDbSettings(sUserId, dbName, oDbSettings);
          break;
        case "detail":  // Request for a detail-view
          break;
        case "info":    // Request just for the summary information
          // Validate "dbase" parameter
          if (!oQuery.has("dbase")) { sendErrorResponse("LoadDbResponse: missing @dbase");  return;}
          // Retrieve and validate parameter
          dbName = oQuery.getString("dbase"); if (dbName.isEmpty()) { sendErrorResponse("Name of database not specified"); return;}
          
          // Get database information from CRPP
          oInfo = this.getDbaseInfo(sUserId, dbName);
          oContent.put("namedb", dbName);
          // Retrieve the <General> parameters from [oInfo] and put them into [oContent]
          if (!addGeneral(oInfo, oContent)) { sendErrorResponse("Could not copy <General> part"); return;}
          if (oInfo.has("Size")) oContent.put("total", oInfo.getInt("Size"));
          break;
        default:
          sendErrorResponse("Unknown loadtype["+loadType+"]");
          return;
      }

      // Send a standard mapped response to the JavaScript caller
      this.servlet.log("LoadDbResponse - sendStandardResponse 'completed'...");
      sendStandardResponse("completed", "Database has been loaded", oContent);
    } catch (Exception ex) {
      sendErrorResponse("LoadDbResponse: could not complete: "+ ex.getMessage());
    }
  }

  @Override
  protected void logRequest() {
    this.servlet.log("LoadDbResponse - logRequest");
  }

  @Override
  public LoadDbResponse duplicate() {
    return new LoadDbResponse();
  }

  /**
   * addGeneral -- add general information from @oInfo to @oContent
   * @param oInfo
   * @param oContent
   * @return 
   */
  private boolean addGeneral(JSONObject oInfo, JSONObject oContent) {
    try {
      JSONArray arFt = new JSONArray();
      String sNamePrj = ""; String sLng = ""; String sDir = "";
      String sDateCreated = ""; String sComments = "";
      int iQC = 1;
      if (oInfo != null) {
        sNamePrj = oInfo.getString("ProjectName");
        sLng = oInfo.getString("Language");
        sDir = oInfo.getString("Part");
        sDateCreated = oInfo.getString("Created");
        sComments = oInfo.getString("Notes");
        arFt = oInfo.getJSONArray("Features");
        if (oInfo.has("QC")) iQC = oInfo.getInt("QC");
      }
      oContent.put("nameprj", sNamePrj);
      oContent.put("lng", sLng);
      oContent.put("dir", sDir);
      oContent.put("qc", iQC);
      oContent.put("datecreated", sDateCreated);
      oContent.put("comments", sComments);
      oContent.put("features", arFt);
      return true;
    } catch (Exception ex) {
      sendErrorResponse("LoadDbResponse: could not complete: " + ex.getMessage());
      return false;
    }
  }
}
