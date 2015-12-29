/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
package nl.ru.crpstudio.response;

public class HomeResponse extends BaseResponse {

	@Override
	protected void completeRequest() {
    try {
      // Check if the current user is logged in
      if (this.bUserOkay) {
        this.getContext().put("userokay", "true");
        // Make sure the current user is known
        this.getContext().put("username", servlet.getUserId());
      } else {
        this.getContext().put("userokay", "false");
        // Make sure the current user is RESET
        this.getContext().put("username", "");
      }
      // The userid must be put in the context at any rate
      this.getContext().put("userid", this.sUserId);
      this.getContext().put("maintab", "home");
      // String sCheck = this.getContext().get("userokay").toString();
      String sTst = this.applyHtmlTemplate(this.templateMan.getTemplate("home"));
      this.displayHtmlTemplate(this.templateMan.getTemplate("home"));
    } catch (Exception ex) {
      this.displayError("HomeResponse error: " + ex.getMessage());
    }
	}

	@Override
	protected void logRequest() {
		this.servlet.log("HomeResponse");
	}

	@Override
	public HomeResponse duplicate() {
		return new HomeResponse();
	}

}
