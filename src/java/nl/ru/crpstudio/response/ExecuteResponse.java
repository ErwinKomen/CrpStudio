/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
package nl.ru.crpstudio.response;

import nl.ru.util.json.JSONArray;
import nl.ru.util.json.JSONObject;

/**
 * ExecuteResponse
 *    Prepare and issue a /crpp/exe?{...} request
 *    What the caller gives us are the parameters we need for the request:
 *      crp     - name of the Corpus Research Project
 *      lng     - language to be searched by the CRP
 *      dir     - the part of the corpus to be searched
 *    Parameters we have ourselves:
 *      userid  - name of the user currently logged in
 *      cache   - we decide ourselves whether caching (on the crpp) is on or off
 * 
 * @author Erwin R. Komen
 */
public class ExecuteResponse extends BaseResponse {

	@Override
	protected void completeRequest() {
    try {
      // Make sure the current user is known
      this.getContext().put("username", servlet.getUserId());
      // Indicate which main tab the user has chosen
      this.getContext().put("maintab", "corpora");
      this.displayHtmlTemplate(this.templateMan.getTemplate("corpora"));
    } catch (Exception ex) {
      logger.DoError("CorporaResponse: could not complete", ex);
    }
	}

	@Override
	protected void logRequest() {
		this.servlet.log("CorporaResponse");
	}

	@Override
	public ExecuteResponse duplicate() {
		return new ExecuteResponse();
	}


  
}
