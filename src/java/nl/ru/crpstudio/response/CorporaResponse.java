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
      this.getContext().put("corpora", getCorpusInfo());
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
	public CorporaResponse duplicate() {
		return new CorporaResponse();
	}

  /**
   * getCorpusInfo -- Read the corpus information (which has been read
   *                    from file through CrpUtil) and transform it
   *                    into an HTML table
   * @return -- HTML string containing a table with corpus information
   */
  private String getCorpusInfo() {
    StringBuilder sb = new StringBuilder(); // Put everything into a string builder
    try {
      // Get the array of users
      JSONArray arCorpora = servlet.getCrpUtil().getCorpora();
      // Check if anything is defined
      if (arCorpora.length() == 0) {
        
      } else {
        // Start a table
        sb.append("<table><tr></tr>");
        // Check if this user may log in
        for (int i = 0 ; i < arCorpora.length(); i++) {
          // Get this object
          JSONObject oCorpus = arCorpora.getJSONObject(i);
          // Read the languages from here
          String sLng = oCorpus.getString("lng");
          String sLngName = oCorpus.getString("name");
          String sLngEth = oCorpus.getString("eth");
          // Read the information from the different parts
          JSONArray arPart = oCorpus.getJSONArray("parts");
          for (int j = 0; j< arPart.length(); j++) {
            // Get this part as an object
            JSONObject oPart = arPart.getJSONObject(j);
            // Get the specification of this part
            String sName = oPart.getString("name");
            String sDir = oPart.getString("dir");
            String sDescr = oPart.getString("descr");
            String sUrl = oPart.getString("url");
            // Create a line for the table
            sb.append("<tr><td>" + sLng + "</td>"+
                    "<td>" + sLngEth + "</td>"+
                    "<td>" + sName + "</td>"+
                    "<td>" + sDir + "</td>"+
                    "<td>" + sLngName + "</td>"+
                    "<td>" + sDescr + "</td>"+
                    "<td>" + sUrl + "</td></tr>");
          }
        }      
        // Finish table
        sb.append("</table>");
      }
      // Return the string we made
      return sb.toString();
    } catch (Exception ex) {
      logger.DoError("getCorpusInfo: could not complete", ex);
      return "error (getCorpusInfo)";
    }
  }
  
}
