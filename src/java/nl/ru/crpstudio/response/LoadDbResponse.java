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
      
      // The actual reply depends on the @loadType
      switch(loadType) {
        case "dbases":
          // TODO: Pass on a list of databases and information about them
          oContent.put("dbaselist", this.getDbaseList(sUserId));
          break;
        case "info":
          // Validate "dbase" parameter
          if (!oQuery.has("dbase")) { sendErrorResponse("LoadDbResponse: missing @project");  return;}
          dbName = oQuery.getString("dbase");
          // Name may be empty...
          if (dbName.isEmpty()) { sendErrorResponse("Name of database not specified"); return;}
          
          // Get database information from CRPP
          JSONObject oInfo = this.getDbaseInfo(sUserId, dbName);
          oContent.put("namedb", dbName);
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

 
}
