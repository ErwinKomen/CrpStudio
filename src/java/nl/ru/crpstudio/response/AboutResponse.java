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
public class AboutResponse extends BaseResponse {
  
	@Override
	protected void completeRequest() {
		this.getContext().put("maintab", "about");
		this.displayHtmlTemplate(this.templateMan.getTemplate("about"));
	}

	@Override
	protected void logRequest() {
		this.servlet.log("AboutResponse");
	}

	@Override
	public AboutResponse duplicate() {
		return new AboutResponse();
	}

}
