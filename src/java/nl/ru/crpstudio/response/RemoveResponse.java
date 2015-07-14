/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
package nl.ru.crpstudio.response;

import nl.ru.crpx.tools.FileIO;
import static nl.ru.util.StringUtil.escapeHexCoding;
import nl.ru.util.json.JSONArray;
import nl.ru.util.json.JSONObject;

public class RemoveResponse extends BaseResponse {
  private String sPrjName;    // Name of the project to be removed

	@Override
	protected void completeRequest() {
    JSONObject oContent = new JSONObject();

    try {
      // There are three parameters: file, userid, crp
      sPrjName = this.request.getParameter("crpname");
      // Validate: all three must be there
      if (sPrjName.isEmpty()) { sendErrorResponse("Project name is not specified"); return;}
      // Remove the "/" or "\" from the file name
      if (sPrjName.endsWith(".crpx")) 
        sPrjName = FileIO.getFileNameWithoutExtension(sPrjName);
      // User is also necessary
      sUserId = this.request.getParameter("userid");
      if (sUserId.isEmpty()) { sendErrorResponse("The userid is not specified"); return; }
      
      // Prepare a remove request to /crpp using the correct /crpdel parameters
      this.params.clear();
      this.params.put("userid", sUserId);
      this.params.put("name", sPrjName);
      String sResp = getCrppPostResponse("crpdel", "", this.params);

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

      // Get the content part
      oContent = oResp.getJSONObject("content");
      oContent.put("crpname", sPrjName);

      // Send the output to our caller
      sendStandardResponse("completed", "upload completed successfully", oContent);

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
