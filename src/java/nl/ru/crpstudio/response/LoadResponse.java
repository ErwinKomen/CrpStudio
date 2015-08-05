/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
package nl.ru.crpstudio.response;

import nl.ru.util.json.JSONObject;

public class LoadResponse extends BaseResponse {
	private String project;   // Name of the project to be loaded
  private String loadType;  // Type of information to be loaded

	@Override
	protected void completeRequest() {
    JSONObject oContent = new JSONObject();

    try {
      // There are three parameters: project, userid, type
      project = this.request.getParameter("project");
      loadType = this.request.getParameter("type");
      sUserId = this.request.getParameter("userid");
      
      // Validate: all three must be there
      if (project.isEmpty()) { sendErrorResponse("Name of project not specified"); return;}
      if (loadType.isEmpty()) { sendErrorResponse("Specify type of information needed"); return;}
      if (sUserId.isEmpty()) { sendErrorResponse("The userid is not specified"); return; }
      
      // Either load the project from /crpp or fetch it from the internal storage
      crpThis = crpContainer.getCrp(this, project, sUserId, false);
      if (crpThis == null) { sendErrorResponse("Could not load CRP:\n" + 
              logger.getErrList().toString()); return;}
			
      // The actual reply depends on the @loadType
      switch(loadType) {
        case "info":
          // Place the 'general CRP parameters in a JSONObject
          oContent.put("name", crpThis.getName());
          oContent.put("author", crpThis.getAuthor());
          oContent.put("prjtype", crpThis.getProjectType());
          oContent.put("goal", crpThis.getGoal());
          oContent.put("datecreated", crpThis.getDateCreated());
          oContent.put("datechanged", crpThis.getDateChanged());
          oContent.put("showsyntax", crpThis.getShowPsd());
          oContent.put("comments", crpThis.getComments());
          break;
        default:
          sendErrorResponse("Unknown loadtype["+loadType+"]");
          return;
      }
      
      // Send a standard mapped response to the JavaScript caller
      sendStandardResponse("completed", "CRP has been loaded", oContent);
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
