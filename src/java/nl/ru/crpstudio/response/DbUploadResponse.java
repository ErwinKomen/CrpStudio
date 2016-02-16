/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
package nl.ru.crpstudio.response;

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
      UserFile oUserFile = getUserFile(sUserId, sFileName, iTotal, this.getServlet().getErrHandle());
      // Add this chunk to the user file
      oUserFile.AddChunk(oPart, iChunk, iTotal);
      
      // If this is not the last chunk yet, then return one way
      if (!oUserFile.IsReady()) {
        // Adapt the content: insert the number of chunks read
        oContent.put("read", oUserFile.chunk.size());
        oContent.put("total", oUserFile.total);
        // Send the output to our caller
        sendStandardResponse("working", "dbupload is processing chunks", oContent);
        // Indicate that this chunk has been sent
        oUserFile.SetSent(iChunk);
        return;
      }
      // Getting here means that the uploading is ready -- files need to be put together
      // Actual upload actions depend on the item type
      switch (sItemType) {
        case "results":
          break;
        case "dbase":
          // Send the dbase to /crpp and get a reaction
          oContent = this.sendDbaseToServer(sUserId, sItemName, oUserFile);
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
  private JSONObject sendDbaseToServer(String sUserId, String sDbName, UserFile oUserFile) {
    JSONObject oContent = null;
    
    try {
      // Send the dbase to /crpp using the correct /dbset parameters
      this.params.clear();
      this.params.put("userid", sUserId);
      this.params.put("name", sDbName);
      this.params.put("overwrite", true);
      this.params.put("total", oUserFile.total);
      // Walk through the whole list that needs uploading
      for (int i=0;i< oUserFile.chunk.size();i++) {
        // Get the text of this chunk
        sItemText = oUserFile.getChunk(i+1);
        // Convert to Base64
        sItemText = compressSafe(sItemText);
        // Send this chunk
        this.params.put("dbchunk", sItemText);
        this.params.put("chunk", i+1);
        String sResp = getCrppPostResponse("dbupload", "", this.params);
        // Make sure the response is positive
        if (sResp.isEmpty() || !sResp.startsWith("{")) {
          sendErrorResponse("Server /crpp gave no valid response on /dbset");
          return null;
        }
        // Get the response to this chunk sending as JSON
        JSONObject oResp = new JSONObject(sResp);
        // Get the status
        if (!oResp.has("status")) sendErrorResponse("Server /crpp gave [status] back");
        // Decypher the status
        JSONObject oStat = oResp.getJSONObject("status");
        // Check the status
        switch (oStat.getString("code")) {
          case "completed":
            // This is okay if we have sent the last one
            if (i+1 < oUserFile.total) {
              // Bad: completed before reaching the end
            } else {
              // Get the content
              oContent = oResp.getJSONObject("content");
            }
            break;
          case "working": 
            // This is okay if we haven't reached the end yet
            if (i+1 >= oUserFile.total) {
              // Bad: we should be ready
              sendErrorResponse("Could not complete sending dbase to /crpp: "+oStat.getString("code"));
            } 
            break;
          case "error":
            sendErrorResponse("Error while sending dbase to /crpp: "+oStat.getString("code"));
            break;
        }
      }
      // Return the content section
      return oContent;
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
