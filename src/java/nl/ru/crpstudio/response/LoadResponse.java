/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
package nl.ru.crpstudio.response;

import java.io.IOException;
import java.math.BigInteger;
import java.security.SecureRandom;
import java.util.HashMap;
import java.util.Map;
import javax.servlet.ServletOutputStream;
import nl.ru.util.FileUtil;
import nl.ru.util.json.JSONArray;
import nl.ru.util.json.JSONObject;

public class LoadResponse extends BaseResponse {
	private String project;   // Name of the project to be loaded
  private String loadType;  // Type of information to be loaded
	private SecureRandom random = new SecureRandom();

	@Override
	protected void completeRequest() {
    String fileName = "";
    try {
      // Start preparing the output of "completeRequest()", which is a mapping object
      Map<String,Object> output = new HashMap<String,Object>();
      // There are three parameters: project, userid, type
      project = this.request.getParameter("project");
      loadType = this.request.getParameter("type");
      sUserId = this.request.getParameter("userid");
      // Validate: all three must be there
      if (project.isEmpty()) { sendErrorResponse("Name of project not specified"); return;}
      if (loadType.isEmpty()) { sendErrorResponse("Specify type of information needed"); return;}
      if (sUserId.isEmpty()) { sendErrorResponse("The userid is not specified"); return; }
      // Either load the project from /crpp or fetch it from the internal storage
      crpThis = crpContainer.getCrp(this, project, sUserId);
      if (crpThis == null) { sendErrorResponse("Could not load CRP"); return;}
			
			
      // Send the output to our caller
      sendResponse(output);
    } catch (Exception ex) {
      sendErrorResponse("LoadResponse: could not complete: "+ ex.getMessage());
    }
	}

	@Override
	protected void logRequest() {
		this.servlet.log("LoadResponse");
	}

	@Override
	public LoadResponse duplicate() {
		return new LoadResponse();
	}

 
}
