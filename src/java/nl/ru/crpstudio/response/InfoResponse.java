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
    try {
      // Make sure the current user is known
      this.getContext().put("username", servlet.getUserId());
      this.getContext().put("maintab", "about");
      // ==== DEBUG
      // String sAbout = this.getContext().get("aboutUrl").toString();
      String sDebug = this.applyHtmlTemplate(this.templateMan.getTemplate("about"));
      // ========================
      this.displayHtmlTemplate(this.templateMan.getTemplate("about"));
    } catch (Exception ex) {
      this.displayError("InfoResponse error: " + ex.getMessage());      
    }
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
