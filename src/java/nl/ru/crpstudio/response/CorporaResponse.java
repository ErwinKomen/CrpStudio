/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
package nl.ru.crpstudio.response;

public class CorporaResponse extends BaseResponse {

	@Override
	protected void completeRequest() {
		this.getContext().put("maintab", "corpora");
		this.displayHtmlTemplate(this.templateMan.getTemplate("corpora"));
	}

	@Override
	protected void logRequest() {
		this.servlet.log("CorporaResponse");
	}

	@Override
	public CorporaResponse duplicate() {
		return new CorporaResponse();
	}

}
