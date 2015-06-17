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
    // Check if the current user is logged in
    if (this.bUserOkay)
      this.getContext().put("userokay", "true");
    else
      this.getContext().put("userokay", "false");
    // The user is must be put in the context at any rate
    this.getContext().put("userid", this.sUserId);
		this.getContext().put("maintab", "home");
    String sCheck = this.getContext().get("userokay").toString();
		this.displayHtmlTemplate(this.templateMan.getTemplate("home"));
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
