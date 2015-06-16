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
		this.getContext().put("maintab", "home");
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
