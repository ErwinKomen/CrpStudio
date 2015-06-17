/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
package nl.ru.crpstudio.response;

public class ProjectsResponse extends BaseResponse {

	@Override
	protected void completeRequest() {
		this.getContext().put("maintab", "projects");
		this.displayHtmlTemplate(this.templateMan.getTemplate("projects"));
	}

	@Override
	protected void logRequest() {
		this.servlet.log("ProjectsResponse");
	}

	@Override
	public ProjectsResponse duplicate() {
		return new ProjectsResponse();
	}

}
