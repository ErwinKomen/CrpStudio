/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
package nl.ru.crpstudio.response;

import nl.ru.crpx.tools.FileIO;
import nl.ru.util.json.JSONObject;

public class UploadResponse extends BaseResponse {
	private String sFileName;   // Name of the file to be loaded
  private String sPrjName;    // Name of the project
  private String sCrpText;    // Type of information to be loaded

	@Override
	protected void completeRequest() {
    JSONObject oContent = new JSONObject();

    try {
      // There are three parameters: file, userid, crp
      sFileName = this.request.getParameter("project");
      sCrpText = this.request.getParameter("crp");
      sUserId = this.request.getParameter("userid");
      
      // Validate: all three must be there
      if (sFileName.isEmpty()) { sendErrorResponse("File name of project not specified"); return;}
      if (sCrpText.isEmpty()) { sendErrorResponse("The CRP has no contents"); return;}
      if (sUserId.isEmpty()) { sendErrorResponse("The userid is not specified"); return; }
      
      // Remove the "/" or "\" from the file name
      sPrjName = FileIO.getFileNameWithoutExtension(sFileName);
      
      // Send the CRP to /crpp using the correct /crpset parameters
      this.params.clear();
      this.params.put("userid", sUserId);
      this.params.put("name", sPrjName);
      this.params.put("crp", sCrpText);
      this.params.put("overwrite", true);
      String sResp = getCrppResponse("crpset", "", this.params);
      
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
      
      // React positively by sending a "projects" response
      BaseResponse br = new ProjectsResponse();
      // Process the request using the appropriate response object
      br.processRequest();
    } catch (Exception ex) {
      sendErrorResponse("UploadResponse: could not complete: "+ ex.getMessage());
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
