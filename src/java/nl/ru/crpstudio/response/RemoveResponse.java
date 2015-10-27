/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
package nl.ru.crpstudio.response;

import java.io.File;
import nl.ru.crpx.tools.FileIO;
import nl.ru.util.json.JSONObject;

public class RemoveResponse extends BaseResponse {
  private String sCrpName;   // Name of the project to be removed
  private String sItemType;   // Type of object to be removed
  private String sItemMain;   // Specification of the main item under which the item to be deleted belongs
  private int iItemId;        // Numerical id of the object to be removed

	@Override
	protected void completeRequest() {
    JSONObject oContent = new JSONObject();
    String sAction = "";    // The action to take for /crpp

    try {
      // Expected JSON format example:
      // { "itemid":    3, 
      //   "itemtype":  "query", 
      //   "itemmain":  "queryName", 
      //   "crp":       "ParticleA.crpx", 
      //   "userid":    "monkey" }
      
      // Collect the JSON from our POST caller
      JSONObject oQuery = new JSONObject(request.getParameter("args"));
      if (!oQuery.has("userid")) { sendErrorResponse("RemoveResponse: missing @userid"); return;}
      if (!oQuery.has("crp")) { sendErrorResponse("RemoveResponse: missing @crp"); return;}
      if (!oQuery.has("itemmain")) { sendErrorResponse("RemoveResponse: missing @itemmain"); return;}
      if (!oQuery.has("itemtype")) { sendErrorResponse("RemoveResponse: missing @itemtype"); return;}
      if (!oQuery.has("itemid")) { sendErrorResponse("RemoveResponse: missing @itemid"); return;}
      
      // There are three parameters: project, userid, type
      sUserId = oQuery.getString("userid");
      sItemType = oQuery.getString("itemtype");
      sItemMain = oQuery.getString("itemmain");
      sCrpName = oQuery.getString("crp");
      iItemId = oQuery.getInt("itemid");
      
      // Validate: generally necessary elements
      if (sUserId.isEmpty()) { sendErrorResponse("RemoveResponse: must specify @userid"); return; }
      if (sCrpName.isEmpty()) { sendErrorResponse("RemoveResponse: must specify @crp"); return; }
      if (sItemType.isEmpty()) { sendErrorResponse("RemoveResponse: must specify @itemtype"); return; }

      // Adapt the CRP name in all cases so that it does *not* have the .crpx ending
      if (sCrpName.endsWith(".crpx")) sCrpName = FileIO.getFileNameWithoutExtension(sCrpName);
      this.crpThis = crpContainer.getCrp(this, sCrpName, sUserId, false);

      // Start preparing a request to /crpp
      this.params.clear();
      this.params.put("userid", sUserId);
      this.params.put("crp", sCrpName);   this.params.put("itemtype", sItemType);
      this.params.put("itemid", iItemId); this.params.put("itemmain", sItemMain);
      
      // Further action depends on item type
      switch (sItemType) {
        case "project":     // Remove a CRP
          // Remove the CRP from the local /crpstudio server
          File fPrjFile = crpContainer.getCrpFile(sCrpName, sUserId);
          if (fPrjFile != null && fPrjFile.exists()) fPrjFile.delete();
          // Remove the CRP from the local /crpstudio container 
          crpContainer.removeCrpInfo(sCrpName, sUserId);
          // Set the action for /crpp
          sAction = "crpdel";
          break;
        case "query":       // Remove a query from a CRP
          // Must have item id and itemmain
          if (iItemId <1 ) { sendErrorResponse("RemoveResponse: remove project requires @itemid"); return;}
          if (sItemMain.isEmpty() ) { sendErrorResponse("RemoveResponse: remove project requires @itemmain"); return;}
          // Local action: remove the query from the crp
          int iQryIdx = crpThis.getListQueryId(iItemId); if (iQryIdx <0) {sendErrorResponse("RemoveResponse: cannot find query id"); return;}
          JSONObject oQryObj = crpThis.getListQueryItem(iQryIdx); if (oQryObj==null) {sendErrorResponse("RemoveResponse: cannot find query obj"); return;}
          crpThis.delListQueryItem(oQryObj);
          // Set the action
          sAction = "remove";
          break;
        case "definition":  // Remove definition from CRP
          // Must have item id
          if (iItemId <1 ) { sendErrorResponse("RemoveResponse: remove project requires @itemid"); return;}
          if (sItemMain.isEmpty() ) { sendErrorResponse("RemoveResponse: remove project requires @itemmain"); return;}
          // Local action: remove the definition from the crp
          int iDefIdx = crpThis.getListQueryId(iItemId); if (iDefIdx <0) {sendErrorResponse("RemoveResponse: cannot find query id"); return;}
          JSONObject oDefObj = crpThis.getListQueryItem(iDefIdx); if (oDefObj==null) {sendErrorResponse("RemoveResponse: cannot find query obj"); return;}
          crpThis.delListDefItem(oDefObj);
          // Set the action
          sAction = "remove";
          break;
        case "constructor": // Remove QC item from QC list
          // Must have item id
          if (iItemId <1  ) { sendErrorResponse("RemoveResponse: remove project requires @itemid"); return;}
          if (sItemMain.isEmpty() ) { sendErrorResponse("RemoveResponse: remove project requires @itemmain"); return;}
          // TODO: Implement removing QC from constructor
          
          // Set the action
          sAction = "remove";
          break;
        case "dbfeat":      // Remove database feature from list
          // Must have item id
          if (iItemId <1 ) { sendErrorResponse("RemoveResponse: remove project requires @itemid"); return;}
          if (sItemMain.isEmpty() ) { sendErrorResponse("RemoveResponse: remove project requires @itemmain"); return;}
          // TODO: Implement removing QC from constructor line

          // Set the action
          sAction = "remove";
          break;
        default:
          // TODO: error response
          break;
      }
      
      // Prepare a remove request to /crpp using the correct parameters
      String sResp = getCrppPostResponse(sAction, "", this.params);

      // Check the result
      if (sResp == null || sResp.isEmpty() || !sResp.startsWith("{")) sendErrorResponse("Server /crpp gave no valid response to " + sAction);
      // Convert the response to JSON
      JSONObject oResp = new JSONObject(sResp);
      // Get the status
      if (!oResp.has("status")) sendErrorResponse("Server /crpp gave [status] back");
      // Decypher the status
      JSONObject oStat = oResp.getJSONObject("status");
      if (!oStat.getString("code").equals("completed")) {
        String sMsg = oStat.getString("code");
        if (oResp.has("content")) { 
          JSONObject oCnt = oResp.getJSONObject("content");
          if (oCnt.has("message")) sMsg = oCnt.getString("message");
        }
        sendErrorResponse("Server /crpp returned: "+sMsg);
      }

      // Get the content part
      oContent = oResp.getJSONObject("content");
      // Add my own information to the content part
      oContent.put("crp", sCrpName);
      oContent.put("itemtype", sItemType);
      oContent.put("itemmain", sItemMain);
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
