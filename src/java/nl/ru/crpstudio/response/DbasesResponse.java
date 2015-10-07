/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
package nl.ru.crpstudio.response;

import nl.ru.util.json.JSONArray;
import nl.ru.util.json.JSONObject;

public class DbasesResponse extends BaseResponse {

	@Override
	protected void completeRequest() {
    try {
      // Get the user's settings
      JSONObject oSettings = this.getUserSettings(this.sUserId);
      // Get access to all the databases the user can choose from
      this.getContext().put("dbasetable", this.getDbaseInfo(this.sUserId));
      // Get the explore tab specifications
      this.getContext().put("explorespecs", getExploreSpecsList());
      // Make sure the current user is known
      this.getContext().put("username", servlet.getUserId());
      // Set the most recently used dbase
      String sRecentDb = (oSettings.has("recentdb")) ? oSettings.getString("recentdb") : "";
      this.getContext().put("recentdb-line", this.getDbaseItem(sRecentDb, this.sUserId, "db-recent", null));
      this.getContext().put("recentdb", sRecentDb);
      // Indicate which main tab the user has chosen
      this.getContext().put("maintab", "dbases");
      // Set the initial tab for the databases: overview (=explore)
      String tab = this.getParameter("tabdb", "overview");
      this.getContext().put("tabdb", tab);
      // The initial tab should not show the metaoptions
  		this.getContext().put("showMetaOptions", "no");
      // Now produce the "dbases" tab 
      this.displayHtmlTemplate(this.templateMan.getTemplate("dbases"));
    } catch (Exception ex) {
      logger.DoError("DbasesResponse: could not complete", ex);
      this.displayError("DbasesResponse error: " + ex.getMessage());
    }
	}

	@Override
	protected void logRequest() {
		this.servlet.log("DbasesResponse");
	}

	@Override
	public DbasesResponse duplicate() {
		return new DbasesResponse();
	}

  
}
