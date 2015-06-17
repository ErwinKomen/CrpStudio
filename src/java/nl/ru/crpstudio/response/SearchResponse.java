/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
package nl.ru.crpstudio.response;

public class SearchResponse extends BaseResponse {

	@Override
	protected void completeRequest() {
		this.getContext().put("maintab", "search");
		this.displayHtmlTemplate(this.templateMan.getTemplate("search"));
	}

	@Override
	protected void logRequest() {
		this.servlet.log("SearchResponse");
	}

	@Override
	public SearchResponse duplicate() {
		return new SearchResponse();
	}

}
