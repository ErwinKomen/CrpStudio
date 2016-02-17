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
      if (this.isMultiPart(request)) {
        // Get the part that has the file to upload
        oPart = request.getPart("fileToUpload");
      }
      // Collect the JSON from our POST caller
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
      
      // If this has chunk number '0', then this means the user is waiting for confirmation that
      //   we have reset the userfile list
      if (iChunk==0) {
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
      }
      
      // Compress the chunk and put it into place
      oUserFile.CompressChunk(oPart, iChunk, iTotal);
      
      // =============== NEW METHOD ===================
      // Send this chunk to /crpp
      oContent = this.uploadDbaseChunk(oUserFile, iChunk);
      // ==============================================
      
      // If this is not the last chunk yet, then return one way
      if (!oUserFile.IsReady()) {
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
   * sendDbaseToServer
   *    Send the indicated database to the /crpp server
   * 
   * @param sUserId   - User id associated with this dbase
   * @param sDbName  - Name of the dbase
   * @param sDbText  - Text of the dbase
   * @return          - JSONObject with the "content" section of the /crpp response
   */
  /*
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
      
      // Need to have an array of files
      File[] arFile = new File[1];
      String sTmpFile = "/etc/project/"+sUserId+"/tmp.file";
      // Walk through the whole list that needs uploading
      for (int i=0;i< oUserFile.chunk.size();i++) {
        // Get the text of this chunk
        sItemText = oUserFile.getChunk(i+1);
        // Convert to Base64
        sItemText = compressSafe(sItemText);
        // Send this chunk
        this.params.put("dbchunk", sItemText);
        this.params.put("chunk", i+1);
        
        // NEW: Try to upload it as a file
        FileUtil.writeFile(sTmpFile, sItemText, "UTF-8");
        arFile[0] = new File(sTmpFile);
        String sResp = getCrppPostFileResponse("dbupload", "", this.params, arFile);
        
        // OLD: String sResp = getCrppPostResponse("dbupload", "", this.params);
        
        
        // Make sure the response is positive
        if (sResp.isEmpty() || !sResp.startsWith("{")) {
          sendErrorResponse("Server /crpp gave no valid response on /dbupload");
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
              int iError = 1;
              // Bad: completed before reaching the end
            } else {
              // Get the content
              oContent = oResp.getJSONObject("content");
            }
            break;
          case "working": 
            // This is okay if we haven't reached the end yet
            if (i+1 > oUserFile.total) {
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
      sendErrorResponse("sendDbaseToServer could not sent dbase to /crpp: "+ ex.getMessage());
      return null;
    }
  }  */
  
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
      if (!oResp.has("status")) sendErrorResponse("Server /crpp gave [status] back");
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
  

	@Override
	protected void logRequest() {
		this.servlet.log("DbUploadResponse");
	}

	@Override
	public DbUploadResponse duplicate() {
		return new DbUploadResponse();
	}

 
}
