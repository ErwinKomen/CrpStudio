/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
package nl.ru.crpstudio.response;

import java.io.File;
import nl.ru.crpx.tools.FileIO;
import static nl.ru.util.StringUtil.escapeHexCoding;
import nl.ru.util.json.JSONArray;
import nl.ru.util.json.JSONObject;

public class RemoveResponse extends BaseResponse {
  private String sItemName;   // Name of the project to be removed
  private String sItemType;   // Type of object to be removed
  private String sItemMain;   // Specification of the main item under which the item to be deleted belongs
  private int iItemId;        // Numerical id of the object to be removed

	@Override
	protected void completeRequest() {
    JSONObject oContent = new JSONObject();
    String sAction = "";    // The action to take for /crpp

    try {
      // Expected JSON format example:
      // { "itemid": 3, 
      //   "itemtype": "query", 
      //   "itemname": "", 
      //   "itemmain": "queryName", 
      //   "userid": "monkey" }
      
      // Collect the JSON from our POST caller
      JSONObject oQuery = new JSONObject(request.getParameter("args"));
      if (!oQuery.has("userid")) { sendErrorResponse("RemoveResponse: missing @userid"); return;}
      if (!oQuery.has("itemname")) { sendErrorResponse("RemoveResponse: missing @itemname"); return;}
      if (!oQuery.has("itemmain")) { sendErrorResponse("RemoveResponse: missing @itemmain"); return;}
      if (!oQuery.has("itemtype")) { sendErrorResponse("RemoveResponse: missing @itemtype"); return;}
      if (!oQuery.has("itemid")) { sendErrorResponse("RemoveResponse: missing @itemid"); return;}
      
      // There are three parameters: project, userid, type
      sUserId = oQuery.getString("userid");
      sItemName = oQuery.getString("itemname");
      sItemType = oQuery.getString("itemtype");
      sItemMain = oQuery.getString("itemmain");
      iItemId = oQuery.getInt("itemid");
      
      // Validate: generally necessary elements
      if (sUserId.isEmpty()) { sendErrorResponse("RemoveResponse: must specify @userid"); return; }
      if (sItemType.isEmpty()) { sendErrorResponse("RemoveResponse: must specify @itemtype"); return; }
      // if (sItemMain.isEmpty()) { sendErrorResponse("RemoveResponse: must specify @itemmain"); return; }
      
      // Start preparing a request to /crpp
      this.params.clear();
      this.params.put("userid", sUserId);
      this.params.put("itemtype", sItemType);
      
      // Further action depends on item type
      switch (sItemType) {
        case "project":     // Remove a CRP
          // Must have item name
          if (sItemName.isEmpty() ) { sendErrorResponse("RemoveResponse: remove project requires @itemname"); return;}
          // Adapt the file name
          if (sItemName.endsWith(".crpx")) 
            sItemName = FileIO.getFileNameWithoutExtension(sItemName);
          // Remove the CRP from the local /crpstudio server
          File fPrjFile = crpContainer.getCrpFile(sItemName, sUserId);
          if (fPrjFile != null && fPrjFile.exists()) fPrjFile.delete();
          // Remove the CRP from the local /crpstudio container 
          crpContainer.removeCrpInfo(sItemName, sUserId);
          // Continue preparing request to /crpp
          this.params.put("itemname", sItemName);
          // Set the action
          sAction = "crpdel";
          break;
        case "query":       // Remove a query from a CRP
          // Must have item id and itemmain
          if (iItemId <1 ) { sendErrorResponse("RemoveResponse: remove project requires @itemid"); return;}
          if (sItemMain.isEmpty() ) { sendErrorResponse("RemoveResponse: remove project requires @itemmain"); return;}
          // Continue preparing request to /crpp
          this.params.put("itemid", iItemId); this.params.put("itemmain", sItemMain);
          // Set the action
          sAction = "itemdel";
          break;
        case "definition":  // Remove definition from CRP
          // Must have item id
          if (iItemId <1 ) { sendErrorResponse("RemoveResponse: remove project requires @itemid"); return;}
          if (sItemMain.isEmpty() ) { sendErrorResponse("RemoveResponse: remove project requires @itemmain"); return;}
          // Continue preparing request to /crpp
          this.params.put("itemid", iItemId); this.params.put("itemmain", sItemMain);
          // Set the action
          sAction = "itemdel";
          break;
        case "constructor": // Remove QC item from QC list
          // Must have item id
          if (iItemId <1  ) { sendErrorResponse("RemoveResponse: remove project requires @itemid"); return;}
          if (sItemMain.isEmpty() ) { sendErrorResponse("RemoveResponse: remove project requires @itemmain"); return;}
          // Continue preparing request to /crpp
          this.params.put("itemid", iItemId); this.params.put("itemmain", sItemMain);
          // Set the action
          sAction = "itemdel";
          break;
        case "dbfeat":      // Remove database feature from list
          // Must have item id
          if (iItemId <1 ) { sendErrorResponse("RemoveResponse: remove project requires @itemid"); return;}
          if (sItemMain.isEmpty() ) { sendErrorResponse("RemoveResponse: remove project requires @itemmain"); return;}
          // Continue preparing request to /crpp
          this.params.put("itemid", iItemId); this.params.put("itemmain", sItemMain);
          // Set the action
          sAction = "itemdel";
          break;
        default:
          // TODO: error response
          break;
      }
      
      // Prepare a remove request to /crpp using the correct parameters
      String sResp = getCrppPostResponse(sAction, "", this.params);

      // Check the result
      if (sResp.isEmpty() || !sResp.startsWith("{")) sendErrorResponse("Server /crpp gave no valid response to " + sAction);
      // Convert the response to JSON
      JSONObject oResp = new JSONObject(sResp);
      // Get the status
      if (!oResp.has("status")) sendErrorResponse("Server /crpp gave [status] back");
      // Decypher the status
      JSONObject oStat = oResp.getJSONObject("status");
      if (!oStat.getString("code").equals("completed"))
        sendErrorResponse("Server /crpp returned status: "+oStat.getString("code"));

      // Get the content part
      oContent = oResp.getJSONObject("content");
      oContent.put("itemtype", sItemType);
      oContent.put("itemname", sItemName);
      oContent.put("itemid", iItemId);

      // Send the output to our caller
      sendStandardResponse("completed", "remove completed successfully", oContent);

    } catch (Exception ex) {
      sendErrorResponse("RemoveResponse: could not complete: "+ ex.getMessage());
    }
	}

	@Override
	protected void logRequest() {
		this.servlet.log("RemoveResponse");
	}

	@Override
	public RemoveResponse duplicate() {
		return new RemoveResponse();
	}

 
}
