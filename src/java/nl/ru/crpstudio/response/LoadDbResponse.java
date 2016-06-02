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
  JSONObject oInfo = null;
  JSONArray arColumns = new JSONArray();

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
        case "list":    // Request for a list-view segment
          // Validate obligatory parameters
          if (!oQuery.has("dbase") || !oQuery.has("start") || !oQuery.has("count")) 
            { sendErrorResponse("LoadDbResponse: missing one of: dbase, count, start");  return;}
          // Retrieve the parameters
          dbName = oQuery.getString("dbase"); if (dbName.isEmpty()) { sendErrorResponse("Name of database not specified"); return;}
          iStart = oQuery.getInt("start"); iCount = oQuery.getInt("count");
          // Other validations
          if (iCount <=0) iCount = this.servlet.getDbPage();
          if (iStart <=0) iStart = 1;
          // Get the requested information from the CRPP
          oInfo = this.getDbaseInfo(sUserId, dbName, iStart, iCount);
          oContent.put("namedb", dbName);
          // Retrieve the <General> parameters
          if (!addGeneral(oInfo, oContent)) { sendErrorResponse("Could not copy <General> part"); return;}
          // Set the columns that should be displayed
          if (oQuery.has("columns")) {
            // The caller supplied 'columns', so take them over
            arColumns = oQuery.getJSONArray("columns");
          } else {
            // no columns were supplied, so we set the default ones
            arColumns.put("ResId");
            arColumns.put("Cat");
            arColumns.put("TextId");
            arColumns.put("SubType");
            arColumns.put("sentId");
            arColumns.put("constId");
            arColumns.put("");
            arColumns.put("");
          }
          oContent.put("columns", arColumns);
          // Retrieve the Count and the Results
          if (oInfo.has("count") && oInfo.has("results")) {
            oContent.put("count", oInfo.getInt("count"));
            oContent.put("results", oInfo.getJSONArray("results"));
          }
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
          // Retrieve the <General> parameters
          if (!addGeneral(oInfo, oContent)) { sendErrorResponse("Could not copy <General> part"); return;}
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
      if (oInfo != null) {
        sNamePrj = oInfo.getString("ProjectName");
        sLng = oInfo.getString("Language");
        sDir = oInfo.getString("Part");
        sDateCreated = oInfo.getString("Created");
        sComments = oInfo.getString("Notes");
        arFt = oInfo.getJSONArray("Features");
      }
      oContent.put("nameprj", sNamePrj);
      oContent.put("lng", sLng);
      oContent.put("dir", sDir);
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
