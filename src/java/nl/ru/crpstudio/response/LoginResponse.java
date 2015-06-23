/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */

package nl.ru.crpstudio.response;

import nl.ru.util.json.JSONArray;
import nl.ru.util.json.JSONObject;

/**
 * LoginResponse
 *    Allow someone to login
 * 
 * @author Erwin R. Komen
 */
public class LoginResponse extends BaseResponse {
  private String sUserFound;
	@Override
	protected void completeRequest() {
    // Find out who is trying to login
    String s_jUserName = this.request.getParameter("j_username");
    String s_jPassWord = this.request.getParameter("j_password");
    // Check if this person is authorized
    if (getLoginAuthorization(s_jUserName, s_jPassWord)) {
      // Okay this person may log in
      this.bUserOkay = true;
      this.sUserId = sUserFound;
      // Also set it globally
      this.servlet.setUserId(this.sUserId);
      this.servlet.setUserOkay(this.sUserId, this.bUserOkay);
    }
    // Go to the home page
		this.getContext().put("maintab", "home");
    this.getContext().put("userokay", "true");
    this.getContext().put("userid", this.sUserId);
		this.displayHtmlTemplate(this.templateMan.getTemplate("home"));
	}

	@Override
	protected void logRequest() {
		this.servlet.log("LoginResponse");
	}

	@Override
	public LoginResponse duplicate() {
		return new LoginResponse();
	}

  
  /**
   * getLoginAuthorization -- Check the credentials of this user
   * 
   * @param sUser
   * @param sPassword
   * @return 
   */
  private boolean getLoginAuthorization(String sUser, String sPassword) {
    // Get the array of users
    JSONArray arUser = servlet.getCrpUtil().getUsers();
    // Check if this user may log in
    for (int i = 0 ; i < arUser.length(); i++) {
      // Get this object
      JSONObject oUser = arUser.getJSONObject(i);
      // Is this the user?
      if (oUser.get("name").equals(sUser)) {
        // Set the user name
        this.sUserFound = sUser;
        // Check the password
        return (oUser.get("password").equals(sPassword));
      }
    }
    // Getting here means we have no authentication
    return false;
  }
}
