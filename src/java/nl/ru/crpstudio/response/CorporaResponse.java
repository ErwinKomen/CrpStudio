/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
package nl.ru.crpstudio.response;

import nl.ru.util.json.JSONArray;
import nl.ru.util.json.JSONObject;

public class CorporaResponse extends BaseResponse {

	@Override
	protected void completeRequest() {
    try {
      // Get access to all the corpora the user can choose from
      this.getContext().put("corporatable", this.getCorpusInfo());
      // Make sure the current user is known
      this.getContext().put("username", servlet.getUserId());
      // Get the explore tab specifications
      this.getContext().put("explorespecs", getExploreSpecsList());
      // Indicate which main tab the user has chosen
      this.getContext().put("maintab", "corpora");
      // Set the initial tab for the databases: overview (=explore)
      String tab = this.getParameter("tabcrp", "overview");
      this.getContext().put("tabcrp", tab);
      // Now produce the "corpora" tab 
      this.displayHtmlTemplate(this.templateMan.getTemplate("corpora"));
    } catch (Exception ex) {
      logger.DoError("CorporaResponse: could not complete", ex);
      this.displayError("CorporaResponse error: " + ex.getMessage());
    }
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
