/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */

package nl.ru.crpstudio.response;

/**
 *
 * @author Erwin R. Komen
 */
public class InfoResponse extends BaseResponse {
  
	@Override
	protected void completeRequest() {
    // Make sure the current user is known
    this.getContext().put("username", servlet.getUserId());
		this.getContext().put("maintab", "about");
		this.displayHtmlTemplate(this.templateMan.getTemplate("about"));
	}

	@Override
	protected void logRequest() {
		this.servlet.log("InfoResponse");
	}

	@Override
	public InfoResponse duplicate() {
		return new InfoResponse();
	}

}
