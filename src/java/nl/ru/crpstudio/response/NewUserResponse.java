/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */

package nl.ru.crpstudio.response;

import nl.ru.util.json.JSONObject;

/**
 * NewUserResponse
    Handle new user errors
 * 
 * @author Erwin R. Komen
 */
public class NewUserResponse extends BaseResponse {

  @Override
	protected void completeRequest() {
    JSONObject oContent = new JSONObject();

    try {
      // Get the message
      String sMsg = this.getmessage();
      if (sMsg.isEmpty()) {
        // Make a welcome message
        oContent.put("msg", this.labels.getString("login.welcome"));
        // Send a standard mapped response to the JavaScript caller
        this.servlet.log("LoadResponse - sendStandardResponse 'completed'...");
        sendStandardResponse("completed", "CRP has been loaded", oContent);
      } else {
        // Send standard error response
        sendErrorResponse("New user attempt: " + sMsg); 
      }
    } catch (Exception ex) {
      this.displayError("NewUserResponse error: " + ex.getMessage());      
    }
	}

	@Override
	protected void logRequest() {
		this.servlet.log("NewUserResponse");
	}

	@Override
	public NewUserResponse duplicate() {
		return new NewUserResponse();
	}

}
