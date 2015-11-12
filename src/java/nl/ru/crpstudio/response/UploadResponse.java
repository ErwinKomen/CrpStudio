/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
package nl.ru.crpstudio.response;

import java.util.HashMap;
import java.util.Map;
import nl.ru.crpx.tools.FileIO;
import static nl.ru.util.StringUtil.compressSafe;
import static nl.ru.util.StringUtil.decompressSafe;
import nl.ru.util.json.JSONArray;
import nl.ru.util.json.JSONObject;

public class UploadResponse extends BaseResponse {
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
      //    itemtext  - Content of the file that is being uploaded
      //  Optional:
      //    itemmain  - main part (project, corpus) to which the item (query/definition/corpus file) belongs
      // There are three parameters: file, userid, crp
       // Collect the JSON from our POST caller
      JSONObject oQuery = new JSONObject(request.getParameter("args"));
      if (!oQuery.has("userid")) { sendErrorResponse("LoadResponse: missing @userid"); return;}
      if (!oQuery.has("file")) { sendErrorResponse("LoadResponse: missing @file"); return;}
      if (!oQuery.has("itemtype")) { sendErrorResponse("LoadResponse: missing @itemtype"); return;}
      if (!oQuery.has("itemtext")) { sendErrorResponse("LoadResponse: missing @itemtext"); return;}
      
      // There are three parameters: project, userid, type
      sUserId = oQuery.getString("userid");
      sFileName = oQuery.getString("file");
      String sItemType = oQuery.getString("itemtype");
      String sItemMain = "";
      if (oQuery.has("itemmain")) sItemMain = oQuery.getString("itemmain");
      
      // sFileName = this.request.getParameter("file");
      // Validate: all three must be there
      if (sFileName.isEmpty()) { sendErrorResponse("File name of project not specified"); return;}
      // Remove the "/" or "\" from the file name
      sItemName = FileIO.getFileNameWithoutExtension(sFileName);
      // User is also necessary
      // sUserId = this.request.getParameter("userid");
      if (sUserId.isEmpty()) { sendErrorResponse("The userid is not specified"); return; }
      // Obligatory: itemtype
      // String sItemType = this.request.getParameter("itemtype");
      if (sItemType.isEmpty()) { sendErrorResponse("The [itemtype] is not specified"); return; }
      // Optional: itemmain
      // sItemMain = this.request.getParameter("itemmain");
      
      // Other initialisations
      boolean bIsNew = true;
      int iItemId = -1;
      
      // Type-dependant: determine if this is something new that deserves uploading?
      switch (sItemType) {
        case "project":
          // Get a list of currently loaded projects
          JSONArray arPrjList = this.getProjectList(sUserId);
          // Check if the requested project is already in the list
          for (int i=0;i<arPrjList.length(); i++) {
            String sCrpThis = arPrjList.getJSONObject(i).getString("crp");
            // Is this equal to the requested project?
            if (sCrpThis.equals(sItemName + ".crpx")) {
              bIsNew = false; break;        
            }          
          }
          break;
        case "definition":
          // Check presence of itemmain
          if (sItemMain.isEmpty()) { sendErrorResponse("The [itemmain] is not specified for this definition"); return; }
          crpThis = crpContainer.getCrp(this, sItemMain, sUserId, false);
          // Set the item and return the id of it
          bIsNew = (!this.hasProjectItem(sItemMain, sUserId, sItemName, sItemType));
          break;
        case "query":
          // Check presence of itemmain
          if (sItemMain.isEmpty()) { sendErrorResponse("The [itemmain] is not specified for this definition"); return; }
          crpThis = crpContainer.getCrp(this, sItemMain, sUserId, false);
          // Set the item and return the id of it
          bIsNew = (!this.hasProjectItem(sItemMain, sUserId, sItemName, sItemType));
          break;
        case "corpus":
          break;
        case "dbase":
          break;
        default:
          // NOTE: do *not* include [dbfeat] here -- it makes really no sense uploading/downloading a dbfeat item
          sendErrorResponse("Upload failure: cannot upload itemtype " + sItemType); 
          return;
      }
      if (bIsNew) {
        // Retrieve the text of the item
        // sItemText = this.request.getParameter("itemtext");
        sItemText = oQuery.getString("itemtext");
        // Validate: item text may not be empty
        if (sItemText.isEmpty()) { sendErrorResponse("Upload: The item has no contents"); return;}
        
        // Initialisations for all types
        // (none so far)
      
        // Actual upload actions depend on the item type
        switch (sItemType) {
          case "project":
            // Convert to Base64
            sItemText = compressSafe(sItemText);
            // Send the CRP to /crpp and get a reaction
            oContent = this.sendProjectToServer(sUserId, sItemName, sItemText);
            // Invalidate the current project list
            servlet.setUserCrpList(null);
            
            // Load the project here
            crpThis = crpContainer.getCrp(this, sItemName, sUserId, false);
            // Add the necessary items to the reply
            oContent.put("itemlist", this.makeListOfCrps(sUserId, crpThis));
            oContent.put("itemid", this.crpContainer.getCrpId(this, sItemName, sUserId));
            // oContent.put("itemline", this.getProjectItem(sItemName, false, "", "", ""));
            oContent.put("itemline", "");
            oContent.put("itemname", sItemName);
            oContent.put("itemtype", sItemType);
            // SPecific for project (see 'LoadResponse.java')
            oContent.put("deflist", crpThis.getListDef());
            oContent.put("qrylist", crpThis.getListQuery());
            oContent.put("qclist",  crpThis.getListQC());
            oContent.put("dbflist", crpThis.getListDbFeat());            
            break;
          case "definition":
            // Add the actual item
            iItemId = this.setProjectItem(sItemMain, sUserId, sItemName, sItemText, sItemType);
            // The content must contain: (1) the whole new list of definitions, (2) the DefId of the new one
            oContent.put("itemlist", crpThis.getListDef());
            oContent.put("itemid", iItemId);
            oContent.put("itemname", sItemName);
            oContent.put("itemtype", sItemType);
            oContent.put("itemline", "");
            break;
          case "query":
            // Add the actual item
            iItemId = this.setProjectItem(sItemMain, sUserId, sItemName, sItemText, sItemType);
            // The content must contain: (1) the whole new list of definitions, (2) the QueryId of the new one
            oContent.put("itemlist", crpThis.getListQuery()); // List object of all queries
            oContent.put("itemid", iItemId);                  // The new query's QueryId
            oContent.put("itemname", sItemName);              // Name of the query
            oContent.put("itemtype", sItemType);              // This item: "query"
            oContent.put("itemline", "");
            break;
          default:
          // NOTE: do *not* include [dbfeat] here -- it makes really no sense uploading/downloading a dbfeat item
            sendErrorResponse("Upload failure: cannot upload itemtype " + sItemType); 
            return;
        }

        // Send the output to our caller
        sendStandardResponse("completed", "upload completed successfully", oContent);
      } else {
        oContent.put("itemname", "");
        oContent.put("itemtype", sItemType);
        oContent.put("itemline", "");
        // Provide meaningful error message
        sendErrorResponse("The "+sItemType+" is already loaded. It needs to be removed before it can be uploaded again.");
      }

    } catch (Exception ex) {
      sendErrorResponse("UploadResponse: could not complete: "+ ex.getMessage());
    }
	}
  
  /**
   * sendProjectToServer
   *    Send the indicated project to the /crpp server
   * 
   * @param sUserId   - User id associated with this CRP
   * @param sPrjName  - Name of the CRP
   * @param sPrjText  - Text of the CRP
   * @return          - JSONObject with the "content" section of the /crpp response
   */
  private JSONObject sendProjectToServer(String sUserId, String sPrjName, String sPrjText) {
    try {
      // Send the CRP to /crpp using the correct /crpset parameters
      this.params.clear();
      this.params.put("userid", sUserId);
      this.params.put("name", sPrjName);
      this.params.put("crp", sPrjText);
      this.params.put("overwrite", true);
      String sResp = getCrppPostResponse("crpset", "", this.params);

      // Check the result
      if (sResp.isEmpty() || !sResp.startsWith("{")) sendErrorResponse("Server /crpp gave no valid response on /crpset");
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
      sendErrorResponse("sendProjectToServer could not sent project to server: "+ ex.getMessage());
      return null;
    }
  }

	@Override
	protected void logRequest() {
		this.servlet.log("UploadResponse");
	}

	@Override
	public UploadResponse duplicate() {
		return new UploadResponse();
	}

 
}
