/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
package nl.ru.crpstudio.response;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import javax.servlet.http.Part;
import nl.ru.crpstudio.util.UserFile;
import nl.ru.crpx.tools.FileIO;
import static nl.ru.util.StringUtil.compressSafe;
import nl.ru.util.json.JSONArray;
import nl.ru.util.json.JSONObject;

public class DbUploadResponse extends BaseResponse {
	private String sFileName;   // Name of the file to be loaded
  private String sItemName;   // Name of the item that is uploaded (derived from the file name)
  private String sItemText;   // Text of the uploaded stuff

	@Override
	protected void completeRequest() {
    JSONObject oContent = new JSONObject();

    try {
      // Expecting the following parameters:
      //  Obligatory:
      //    userid    - Identifier of the user
      //    file      - Name of the file that is downloaded
      //    itemtype  - Can be: project, definition, query, dbase, corpus
      //    itemmain  - main part (project, corpus) to which the item (dbase/result file) belongs
      //    chunk     - number of this chunk (starting with 1)
      //    total     - total number of chunks to be expected
      // There are three parameters: file, userid, crp
      // Collect the JSON from our POST caller
      Part oPart = request.getPart("fileToUpload");
      JSONObject oQuery = new JSONObject(request.getParameter("args"));
      if (!oQuery.has("userid"))    { sendErrorResponse("LoadResponse: missing @userid"); return;}
      if (!oQuery.has("file"))      { sendErrorResponse("LoadResponse: missing @file"); return;}
      if (!oQuery.has("itemtype"))  { sendErrorResponse("LoadResponse: missing @itemtype"); return;}
      if (!oQuery.has("itemmain"))  { sendErrorResponse("LoadResponse: missing @itemmain"); return;}
      if (!oQuery.has("chunk"))     { sendErrorResponse("LoadResponse: missing @chunk"); return;}
      if (!oQuery.has("total"))     { sendErrorResponse("LoadResponse: missing @total"); return;}
      
      // There are three parameters: project, userid, type
      sUserId = oQuery.getString("userid");
      sFileName = oQuery.getString("file");
      String sItemType = oQuery.getString("itemtype");
      String sItemMain = oQuery.getString("itemmain");
      int iChunk = oQuery.getInt("chunk");
      int iTotal = oQuery.getInt("total");
      
      // Validate: all three must be there
      if (sFileName.isEmpty()) { sendErrorResponse("File name of project not specified"); return;}
      // Remove the "/" or "\" from the file name
      sItemName = FileIO.getFileNameWithoutExtension(sFileName);
      // User is also necessary
      if (sUserId.isEmpty()) { sendErrorResponse("The userid is not specified"); return; }
      // Obligatory: itemtype
      if (sItemType.isEmpty()) { sendErrorResponse("The [itemtype] is not specified"); return; }
      
      // Get a handle to the place where this file needs to be stored
      UserFile oUserFile = getUserFile(sUserId, sFileName, this.getServlet().getErrHandle());
      // Add this chunk to the user file
      oUserFile.AddChunk(oPart, iChunk, iTotal);
      
      // If this is not the last chunk yet, then return one way
      if (!oUserFile.IsReady()) {
        // Adapt the content: insert the number of chunks read
        oContent.put("read", oUserFile.chunk.size());
        oContent.put("total", oUserFile.total);
        // Send the output to our caller
        sendStandardResponse("working", "dbupload is processing chunks", oContent);
      }
      
      // Other initialisations
      boolean bIsNew = true;
      boolean bOverwrite = true;
      int iItemId = -1;
      
      // Type-dependant: determine if this is something new that deserves uploading?
      switch (sItemType) {
        case "results":
          break;
        case "dbase":
          // Get a list of currently loaded databases
          JSONArray arDbList = this.getDbaseList(sUserId);
          // Check if the requested project is already in the list
          for (int i=0;i<arDbList.length(); i++) {
            String sDbThis = arDbList.getJSONObject(i).getString("Name");
            // Is this equal to the requested project?
            if (sDbThis.equals(sItemName) || sDbThis.equals(sItemName + ".xml")) {
              bIsNew = false; break;        
            }          
          }
          break;
        default:
          // NOTE: do *not* include [dbfeat] here -- it makes really no sense uploading/downloading a dbfeat item
          sendErrorResponse("Upload failure: cannot upload itemtype " + sItemType); 
          return;
      }
      if (bOverwrite || bIsNew) {
        // Retrieve the text of the item
        // sItemText = getFileAsValue(oPart);
        // Validate: item text may not be empty
        if (sItemText.isEmpty()) { sendErrorResponse("Upload: The item has no contents"); return;}
        
        // Initialisations for all types
        // (none so far)
      
        // Actual upload actions depend on the item type
        switch (sItemType) {
          case "results":
            break;
          case "dbase":
            // Convert to Base64
            sItemText = compressSafe(sItemText);
            // Send the dbase to /crpp and get a reaction
            oContent = this.sendDbaseToServer(sUserId, sItemName, sItemText);
            // Invalidate the current project list
            servlet.setUserDbList(null);

            // Get the NEW array of databases and the id of this database
            // (this is done by calling /crpp)
            JSONArray arDbList = this.getDbaseList(sUserId);
            int iDbaseId = -1;
            for (int i=0;i<arDbList.length();i++) {
              JSONObject oThis = arDbList.getJSONObject(i);
              if (oThis.getString("Name").equals(sItemName) ||
                  oThis.getString("Name").equals(sItemName+".xml")) {
                // FOund it
                iDbaseId = oThis.getInt("DbaseId");
                break;
              }
            }
            // Add the necessary items to the reply
            oContent.put("itemlist", arDbList);
            oContent.put("itemid", iDbaseId );
            oContent.put("itemname", sItemName);
            oContent.put("itemtype", sItemType);
            break;
          default:
          // NOTE: do *not* include [dbfeat] here -- it makes really no sense uploading/downloading a dbfeat item
            sendErrorResponse("DbUpload failure: cannot upload itemtype " + sItemType); 
            return;
        }

        // Send the output to our caller
        sendStandardResponse("completed", "dbupload completed successfully", oContent);
      } else {
        oContent.put("itemname", "");
        oContent.put("itemtype", sItemType);
        oContent.put("itemline", "");
        // Provide meaningful error message
        sendErrorResponse("The "+sItemType+" is already loaded. It needs to be removed before it can be uploaded again.");
      }

    } catch (Exception ex) {
      sendErrorResponse("DbUploadResponse: could not complete: "+ ex.getMessage());
    }
	}
  
  /**
   * sendDbaseToServer
   *    Send the indicated database to the /crpp server
   * 
   * @param sUserId   - User id associated with this dbase
   * @param sDbName  - Name of the dbase
   * @param sDbText  - Text of the dbase
   * @return          - JSONObject with the "content" section of the /crpp response
   */
  private JSONObject sendDbaseToServer(String sUserId, String sDbName, String sDbText) {
    try {
      // Send the dbase to /crpp using the correct /dbset parameters
      this.params.clear();
      this.params.put("userid", sUserId);
      this.params.put("name", sDbName);
      this.params.put("db", sDbText);
      this.params.put("overwrite", true);
      String sResp = getCrppPostResponse("dbset", "", this.params);

      // Check the result
      if (sResp.isEmpty() || !sResp.startsWith("{")) sendErrorResponse("Server /crpp gave no valid response on /dbset");
      // Convert the response to JSON
      JSONObject oResp = new JSONObject(sResp);
      // Get the status
      if (!oResp.has("status")) sendErrorResponse("Server /crpp gave [status] back");
      // Decypher the status
      JSONObject oStat = oResp.getJSONObject("status");
      if (!oStat.getString("code").equals("completed"))
        sendErrorResponse("Server /crpp returned status: "+oStat.getString("code"));
      // Return the content section
      return oResp.getJSONObject("content");
    } catch (Exception ex) {
      sendErrorResponse("sendDbaseToServer could not sent project to server: "+ ex.getMessage());
      return null;
    }
  }

	@Override
	protected void logRequest() {
		this.servlet.log("DbUploadResponse");
	}

	@Override
	public DbUploadResponse duplicate() {
		return new DbUploadResponse();
	}

 
}
