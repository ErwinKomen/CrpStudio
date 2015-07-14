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
import static nl.ru.util.StringUtil.escapeHexCoding;
import static nl.ru.util.StringUtil.unescapeHexCoding;
import nl.ru.util.json.JSONArray;
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
      sFileName = this.request.getParameter("file");
      // Validate: all three must be there
      if (sFileName.isEmpty()) { sendErrorResponse("File name of project not specified"); return;}
      // Remove the "/" or "\" from the file name
      sPrjName = FileIO.getFileNameWithoutExtension(sFileName);
      // User is also necessary
      sUserId = this.request.getParameter("userid");
      if (sUserId.isEmpty()) { sendErrorResponse("The userid is not specified"); return; }
      
      // Get a list of currently loaded projects
      JSONArray arPrjList = this.getProjectList(sUserId);
      // Check if the requested project is already in the list
      boolean bIsNew = true;
      for (int i=0;i<arPrjList.length(); i++) {
        String sCrpThis = arPrjList.getJSONObject(i).getString("crp");
        // Is this equal to the requested project?
        if (sCrpThis.equals(sPrjName + ".crpx")) {
          bIsNew = false; break;        
        }          
      }
      if (bIsNew) {

        sCrpText = escapeHexCoding(this.request.getParameter("crp"));

        // String sCrpDefl = unescapeHexCoding(sCrpText);

        // Validate: all three must be there
        if (sCrpText.isEmpty()) { sendErrorResponse("The CRP has no contents"); return;}
      
        // Send the CRP to /crpp using the correct /crpset parameters
        this.params.clear();
        this.params.put("userid", sUserId);
        this.params.put("name", sPrjName);
        this.params.put("crp", sCrpText);
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

        // Get the content part
        oContent = oResp.getJSONObject("content");
        oContent.put("prjline", this.getProjectItem(sPrjName, false));
        oContent.put("crpname", sPrjName);
      } else {
        oContent.put("crpname", "");
        oContent.put("prjline", "");
      }

      
      // output.put("prjline", this.getProjectItem(sPrjName, false));
      // Send the output to our caller
      sendStandardResponse("completed", "upload completed successfully", oContent);

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
