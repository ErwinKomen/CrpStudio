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
    // Get access to all the corpora the user can choose from
    this.getContext().put("corpora", this.servlet.getCorpora());
    // Indicate which main tab the user has chosen
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
