/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
package nl.ru.crpstudio.response;

import java.io.File;
import javax.servlet.http.Part;
import nl.ru.crpstudio.util.UserFile;
import nl.ru.crpx.tools.FileIO;
import nl.ru.util.ByRef;
import nl.ru.util.FileUtil;
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
    Part oPart = null;

    try {
      // Expecting the following parameters:
      //  Obligatory:
      //    userid    - Identifier of the user
      //    file      - Name of the file that is downloaded
      //    itemtype  - Can be: project, definition, query, dbase, corpus
      //    itemmain  - main part (project, corpus) to which the item (dbase/result file) belongs
      //    chunk     - number of this chunk (starting with 1)
      //    total     - total number of chunks to be expected
      //    action    - one of: {'init', 'send', 'status'}
      // Collect the JSON from our POST caller
      JSONObject oQuery = new JSONObject(request.getParameter("args"));
      if (!oQuery.has("userid"))    { sendErrorResponse("DbUploadResponse: missing @userid"); return;}
      if (!oQuery.has("file"))      { sendErrorResponse("DbUploadResponse: missing @file"); return;}
      if (!oQuery.has("itemtype"))  { sendErrorResponse("DbUploadResponse: missing @itemtype"); return;}
      if (!oQuery.has("itemmain"))  { sendErrorResponse("DbUploadResponse: missing @itemmain"); return;}
      if (!oQuery.has("chunk"))     { sendErrorResponse("DbUploadResponse: missing @chunk"); return;}
      if (!oQuery.has("total"))     { sendErrorResponse("DbUploadResponse: missing @total"); return;}
      if (!oQuery.has("action"))    { sendErrorResponse("DbUploadResponse: missing @type"); return;}
      
      // There are three parameters: project, userid, type
      sUserId = oQuery.getString("userid");
      sFileName = oQuery.getString("file");
      String sItemType = oQuery.getString("itemtype");
      String sItemMain = oQuery.getString("itemmain");
      int iChunk = oQuery.getInt("chunk");
      int iTotal = oQuery.getInt("total");
      String sAction = oQuery.getString("action");    // Type o
      
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
      
      // Make sure content has essential total
      oContent.put("total", iTotal);
      
      // Action depends on [action] parameter
      switch (sAction) {
        case "init":
          // Reset the list
          oUserFile.Clear();
          // Send a signal to /crpp that it needs to initialize
          oContent = this.sendDbUploadInit(sUserId, sFileName, iTotal);
          // Indicate we are ready
          oContent.put("ready", true);
          // Send the output to our caller
          sendStandardResponse("initialized", "dbupload is ready to receive a file", oContent);
          // Leave this function nicely
          return;
        case "stop":  // User pressed a button indicating that we need to stop
          // Make sure WE stop
          oUserFile.Stop();
          // Send a STOP signal to /crpp
          oContent = this.sendDbUploadStop(sUserId, sFileName, iTotal);
          // Tell that we have indeed stopped
          sendStandardResponse("stopping", "dbupload is trying to stop", oContent);
          break;
        case "send":
          // Double check for interrupt
          if (oUserFile.interrupt) {sendStandardResponse("stopping", "dbupload is trying to stop", oContent); return;}
          // Only now read the file to be uploaded
          if (this.isMultiPart(request)) {
            // Get the part that has the file to upload
            oPart = request.getPart("fileToUpload");
          }
          // Compress the chunk and put it into place (in my LOCAL STORE)
          if (!oUserFile.CompressChunk(oPart, iChunk, iTotal)) {
            // Send an error
            sendErrorResponse("Could not compress chunk ["+ iChunk + "/"+ iTotal+"] to /crpp"); return;
          }
          // Indicate we have this
          oUserFile.SetStart(iChunk);
          // Check for interrupt
          if (oUserFile.interrupt) {sendStandardResponse("stopping", "dbupload is trying to stop", oContent);return;}
          // ============== DEBUGGING ==========
          logger.debug("Started: "+oUserFile.getStarted() + "/" + oUserFile.total);
          // ===================================
          // Check whether everything has been started up
          if (oUserFile.getStarted() >= oUserFile.total) {
            // Start sending to server one by one
            for (int i=0;i<oUserFile.total;i++) {
              // Send one chunk
              iChunk = i+1;
              if (!this.sendDbaseChunk(oUserFile, iChunk, oContent)) {
                // Send an error
                sendErrorResponse("Could not send chunk ["+ iChunk + "/"+ iTotal+"] to /crpp"); return;
              }
              // Check for interrupt
              if (oUserFile.interrupt) {sendStandardResponse("stopping", "dbupload is trying to stop", oContent); return;}
              // Indicate that this chunk has been sent
              oUserFile.SetSent(iChunk);
            }
          } else {
            // Not ready to start sending stuff from here to /crpp yet...
            oContent.put("read", oUserFile.getStarted()); // Read into /crpstudio
            oContent.put("sent", oUserFile.getSent());    // 
            sendStandardResponse("working", "dbupload JS to /crpstudio", oContent);
            // Then leave!
            return;
          }
          // Getting here means: all has been sent...
          break;
        case "status":
          // Check for interrupt
          if (oUserFile.interrupt) {sendStandardResponse("stopping", "dbupload is trying to stop", oContent); return;}
          // Get the status
          int iRead = oUserFile.getStarted();
          int iSent = oUserFile.getSent();
          oContent.put("read", iRead);
          oContent.put("sent", iSent);
          oContent.put("total", oUserFile.total);
          String sStatus = (iRead < iTotal || iSent < iTotal) ? "working": "completed";
          // Send this status back to JS
          sendStandardResponse(sStatus, "dbupload status from /crpp", oContent);
          return;
      }
      
      
      // Getting here means that the uploading is ready -- files need to be put together
      // Actual upload actions depend on the item type
      switch (sItemType) {
        case "results":
          break;
        case "dbase":
          // ================ DEBUG =============
          logger.debug("DbUploadResponse: total="+iTotal+ " size=" + oUserFile.chunk.size());
          // ====================================
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
   * uploadDbaseChunk -- upload one chunk to the /crpp server
   * 
   * @param oUserFile
   * @param iChunk
   * @return 
   */
  private JSONObject uploadDbaseChunk(UserFile oUserFile, int iChunk) {
    JSONObject oContent = new JSONObject();
    
    try {
      // Send the dbase to /crpp using the correct /dbset parameters
      this.params.clear();
      this.params.put("userid", sUserId);
      this.params.put("name", oUserFile.name);
      this.params.put("overwrite", true);
      this.params.put("chunk", iChunk);
      this.params.put("total", oUserFile.total);
      this.params.put("start", false);
      
      // Need to have an array of files
      File[] arFile = new File[1];
      arFile[0] = new File(oUserFile.getChunkFileLoc(iChunk));
      
      String sResp = getCrppPostFileResponse("dbupload", "", this.params, arFile);

      // Make sure the response is positive
      if (sResp.isEmpty() || !sResp.startsWith("{")) {
        sendErrorResponse("Server /crpp gave no valid response on /dbupload");
        return null;
      }
      // Get the response to this chunk sending as JSON
      JSONObject oResp = new JSONObject(sResp);
      // Get the status
      if (!oResp.has("status")) { sendErrorResponse("Server /crpp gave [status] back"); return null;}
      // Decypher the status
      JSONObject oStat = oResp.getJSONObject("status");
      // Check the status
      switch (oStat.getString("code")) {
        case "completed":
          // This is okay if we have sent the last one
          if (iChunk < oUserFile.total) {
            int iError = 1;
            // Bad: completed before reaching the end
          } else {
            // Get the content
            oContent = oResp.getJSONObject("content");
          }
          break;
        case "working": 
          // This is okay if we haven't reached the end yet
          if (iChunk > oUserFile.total) {
            // Bad: we should be ready
            sendErrorResponse("Could not complete sending dbase to /crpp: "+oStat.getString("code"));
          } else {
            // Put in meaningful content parameters
            oContent.put("read", oUserFile.chunk.size());
            oContent.put("total", oUserFile.total);
          }
          break;
        case "error":
          sendErrorResponse("Error while sending dbase to /crpp: "+oStat.getString("code"));
          break;
      }

      // Return the content section
      return oContent;
    } catch (Exception ex) {
      sendErrorResponse("uploadDbaseChunk could not sent chunk to /crpp: "+ ex.getMessage());
      return null;
    }
  }
  
  /**
   * getDbUploadStatus -- get the status of this dbupload process from /crpp
   * 
   * @param oUserFile
   * @return 
   */
  private JSONObject getDbUploadStatus(UserFile oUserFile, ByRef<String> sStatus) {
    JSONObject oContent = new JSONObject();
    
    try {
      // Send the dbase to /crpp using the correct /dbset parameters
      this.params.clear();
      this.params.put("userid", sUserId);
      this.params.put("name", oUserFile.name);
      this.params.put("overwrite", true);
      this.params.put("chunk", 0);
      this.params.put("total", oUserFile.total);
      this.params.put("action", "status");
      
      String sResp = getCrppPostResponse("dbupload", "", this.params);

      // Make sure the response is positive
      if (sResp.isEmpty() || !sResp.startsWith("{")) {
        sendErrorResponse("Server /crpp gave no valid response on /dbupload");
        return oContent;
      }
      // Get the response to this chunk sending as JSON
      JSONObject oResp = new JSONObject(sResp);
      // Get the status
      if (!oResp.has("status")) sendErrorResponse("Server /crpp gave [status] back");
      // Decypher the status
      JSONObject oStat = oResp.getJSONObject("status");
      // Store the status
      sStatus.argValue = oStat.getString("code");
      // Check the status
      switch (oStat.getString("code")) {
        case "error":
          sendErrorResponse("Error while sending dbase to /crpp: "+oStat.getString("code"));
          break;
        default:
          // Get the content
          oContent = oResp.getJSONObject("content");
          break;
      }
      // Return the content section
      return oContent;
    } catch (Exception ex) {
      sendErrorResponse("getDbUploadStatus could not get status from /crpp: "+ ex.getMessage());
      return null;
    }
  }
  
  /**
   * sendDbaseChunk -- send one chunk to the /crpp server
   * 
   * @param oUserFile
   * @param iChunk
   * @return 
   */
  private boolean sendDbaseChunk(UserFile oUserFile, int iChunk, JSONObject oContent) {
    try {
      // Send the dbase to /crpp using the correct /dbset parameters
      this.params.clear();
      this.params.put("userid", oUserFile.userId);
      this.params.put("name", oUserFile.name);
      this.params.put("overwrite", true);
      this.params.put("chunk", iChunk);
      this.params.put("total", oUserFile.total);
      this.params.put("start", false);
      this.params.put("action", "send");
      
      // Need to have an array of files
      File[] arFile = new File[1];
      arFile[0] = new File(oUserFile.getChunkFileLoc(iChunk));
      
      String sResp = getCrppPostFileResponse("dbupload", "", this.params, arFile);

      // Make sure the response is positive
      if (sResp.isEmpty() || !sResp.startsWith("{")) {
        sendErrorResponse("Server /crpp gave no valid response on /dbupload");
        return false;
      }
      // Get the response to this chunk sending as JSON
      JSONObject oResp = new JSONObject(sResp);
      // Get the status
      if (!oResp.has("status")) {sendErrorResponse("Server /crpp gave no [status] back"); return false;}
      // Decypher the status
      JSONObject oStat = oResp.getJSONObject("status");
      // Check the status
      switch (oStat.getString("code")) {
        case "completed":
          // This is okay if we have sent the last one
          if (iChunk < oUserFile.total) {
            int iError = 1;
            // Bad: completed before reaching the end
          } else {
            // Get the content
            oContent = oResp.getJSONObject("content");
          }
          break;
        case "working": 
          // This is okay if we haven't reached the end yet
          if (iChunk > oUserFile.total) {
            // Bad: we should be ready
            sendErrorResponse("Could not complete sending dbase to /crpp: "+oStat.getString("code"));
          } else {
            // Put in meaningful content parameters
            oContent.put("read", oUserFile.chunk.size());
            oContent.put("total", oUserFile.total);
          }
          break;
        case "error":
          sendErrorResponse("Error while sending dbase to /crpp: "+oStat.getString("code"));
          break;
      }

      // Return success
      return true;
    } catch (Exception ex) {
      sendErrorResponse("sendDbaseChunk could not sent chunk to /crpp: "+ ex.getMessage());
      return false;
    }
  }
  
  /**
   * sendDbUploadInit
   *    Send the indicated project to the /crpp server
   * 
   * @param sUserId   - User id associated with this CRP
   * @param sDbName   - Name of the result database to be uploaded
   * @param iTotal    - Total number of chunks to be sent
   * @return          - JSONObject with the "content" section of the /crpp response
   */
  private JSONObject sendDbUploadInit(String sUserId, String sDbName, int iTotal) {
    try {
      // Send the CRP to /crpp using the correct /crpset parameters
      this.params.clear();
      this.params.put("userid", sUserId);
      this.params.put("name", sDbName);
      this.params.put("overwrite", true);
      this.params.put("chunk", 0);
      this.params.put("total", iTotal);
      this.params.put("start", true);
      this.params.put("action", "init");
      String sResp = getCrppPostResponse("dbupload", "", this.params);

      // Check the result
      if (sResp.isEmpty() || !sResp.startsWith("{")) sendErrorResponse("Server /crpp gave no valid response on /dbupload");
      // Convert the response to JSON
      JSONObject oResp = new JSONObject(sResp);
      // Get the status
      if (!oResp.has("status")) sendErrorResponse("Server /crpp gave [status] back");
      // Decypher the status
      JSONObject oStat = oResp.getJSONObject("status");
      if (!oStat.getString("code").equals("initialized"))
        sendErrorResponse("Server /crpp returned status: "+oStat.getString("code"));
      // Return the content section
      return oResp.getJSONObject("content");
    } catch (Exception ex) {
      sendErrorResponse("sendDbUploadInit could not sent project to server: "+ ex.getMessage());
      return null;
    }
  }
  
  /**
   * sendDbUploadStop
   *    Send a signal to the /crpp server to discontinue and clear the current upload
   * 
   * @param sUserId   - User id associated with this CRP
   * @param sDbName   - Name of the result database to be uploaded
   * @param iTotal    - Total number of chunks to be sent
   * @return          - JSONObject with the "content" section of the /crpp response
   */
  private JSONObject sendDbUploadStop(String sUserId, String sDbName, int iTotal) {
    try {
      // Send the CRP to /crpp using the correct /crpset parameters
      this.params.clear();
      this.params.put("userid", sUserId);
      this.params.put("name", sDbName);
      this.params.put("overwrite", true);
      this.params.put("chunk", 0);
      this.params.put("total", iTotal);
      this.params.put("start", true);
      this.params.put("action", "stop");
      String sResp = getCrppPostResponse("dbupload", "", this.params);

      // Check the result
      if (sResp.isEmpty() || !sResp.startsWith("{")) sendErrorResponse("Server /crpp gave no valid response on /dbupload");
      // Convert the response to JSON
      JSONObject oResp = new JSONObject(sResp);
      // Get the status
      if (!oResp.has("status")) sendErrorResponse("Server /crpp gave [status] back");
      // Decypher the status
      JSONObject oStat = oResp.getJSONObject("status");
      if (!oStat.getString("code").equals("initialized"))
        sendErrorResponse("Server /crpp returned status: "+oStat.getString("code"));
      // Return the content section
      return oResp.getJSONObject("content");
    } catch (Exception ex) {
      sendErrorResponse("sendDbUploadInit could not stop dbupload to server: "+ ex.getMessage());
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
