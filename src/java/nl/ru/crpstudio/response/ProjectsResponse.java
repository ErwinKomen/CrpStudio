/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
package nl.ru.crpstudio.response;

import static nl.ru.crpstudio.response.BaseResponse.logger;
import nl.ru.util.json.JSONObject;

public class ProjectsResponse extends BaseResponse {

	@Override
	protected void completeRequest() {
    try {
      // Get the user's settings
      JSONObject oSettings = this.getUserSettings(this.sUserId);
      // Get access to all the corpora the user can choose from
      this.getContext().put("corpuslist", getCorpusList());
      // Get access to all the databases the user can choose from
      this.getContext().put("dbaselist", getDbaseList());
      // Get the result tab specifications
      this.getContext().put("tabspecs", getTabSpecsList());
      // Get a specification of project-types
      this.getContext().put("prjtypelist", this.getPrjTypeList());
      // Get access to the projects this user can choose from
      this.getContext().put("projecttable", this.getProjectInfo(this.sUserId));
      // Set the most recently used CRP
      String sRecentCrp = (oSettings.has("recent")) ? oSettings.getString("recent") : "";
      this.getContext().put("recentcrp", this.getProjectItem(sRecentCrp, this.sUserId, "crp-recent"));
      this.getContext().put("recent", sRecentCrp);
      // Indicate which main tab the user has chosen
      this.getContext().put("maintab", "projects");
      // Set the initial tab for the search: project
      String tab = this.getParameter("tab", "project");
      this.getContext().put("tab", tab);
      // The initial tab should not show the metaoptions
  		this.getContext().put("showMetaOptions", "no");
      // Make sure the current user is known
      this.getContext().put("username", servlet.getUserId());
      // ======= DEBUGGING
      // String sDebug = this.applyHtmlTemplate(this.templateMan.getTemplate("projects"));
      // ==================
      
      // Now produce the initial search display, with the "project" tab clicked and executed
      this.displayHtmlTemplate(this.templateMan.getTemplate("projects"));
    } catch (Exception ex) {
      logger.DoError("SearchResponse: could not complete", ex);
      this.displayError("ProjectsResponse error: " + ex.getMessage());
    }
	}

	@Override
	protected void logRequest() {
		this.servlet.log("SearchResponse");
	}

	@Override
	public ProjectsResponse duplicate() {
		return new ProjectsResponse();
	}


}
