/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
package nl.ru.crpstudio.response;

import static nl.ru.crpstudio.response.BaseResponse.logger;
import nl.ru.util.json.JSONArray;
import nl.ru.util.json.JSONObject;

public class ProjectsResponse extends BaseResponse {

	@Override
	protected void completeRequest() {
    try {
      // Get access to all the corpora the user can choose from
      this.getContext().put("corpuslist", getCorpusList());
      // Get access to the projects this user can choose from
      this.getContext().put("projecttable", getProjectInfo(this.sUserId));
      // Indicate which main tab the user has chosen
      this.getContext().put("maintab", "projects");
      // Set the initial tab for the search: project
      String tab = this.getParameter("tab", "project");
      this.getContext().put("tab", tab);
      // The initial tab should not show the metaoptions
  		this.getContext().put("showMetaOptions", "no");
      // Make sure the current user is known
      this.getContext().put("username", servlet.getUserId());
      // Now produce the initial search display, with the "project" tab clicked and executed
      this.displayHtmlTemplate(this.templateMan.getTemplate("projects"));
    } catch (Exception ex) {
      logger.DoError("SearchResponse: could not complete", ex);
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

    /**
   * getProjectInfo -- 
   *    Issue a request to the CRPP to get an overview of the projects
   *    that user @sUser has access to
   * 
   * @return -- HTML string containing a table with projects of this user
   */
  private String getProjectInfo(String sUser) {
    StringBuilder sb = new StringBuilder(); // Put everything into a string builder
    try {
      // Prepare the parameters for this request
      this.params.clear();
      this.params.put("userid", sUser);
      // Get the JSON object from /crpp containing the projects of this user
      String response = getCrppResponse("crplist", "", this.params);
      // Interpret the response
      JSONObject oResp = new JSONObject(response);
      if (!oResp.has("status") || !oResp.has("content") || 
          !oResp.getJSONObject("status").getString("code").equals("completed")) return "error";
      // Get the list of CRPs
      JSONArray arCrpList = oResp.getJSONArray("content");
      // Check if anything is defined
      if (arCrpList.length() == 0) {
        // TODO: action if there are no corpus research projects for this user
        //       User must be offered the opportunity to create a new project
        
      } else {
        // The list of CRPs is in a table where each element can be selected
        for (int i = 0 ; i < arCrpList.length(); i++) {
          // Get this CRP item
          JSONObject oCRP = arCrpList.getJSONObject(i);
          boolean bCrpLoaded = oCRP.getBoolean("loaded");
          String sCrpName = oCRP.getString("crp")  + ((bCrpLoaded) ? " (loaded)" : "");
          sb.append("<li><a href=\"#\" onclick='Crpstudio.project.setProject(this, \""+ 
                  oCRP.getString("crp") +"\")'>" + sCrpName + "</a></li>\n");
        }
      }
      // Return the string we made
      return sb.toString();
    } catch (Exception ex) {
      logger.DoError("getCorpusInfo: could not complete", ex);
      return "error (getCorpusInfo)";
    }
  }
  
  /**
   * getCorpusList -- Read the corpus information (which has been read
   *                    from file through CrpUtil) and transform it
   *                    into a list of corpus options (including the parts??)
   * @return -- HTML string containing a table with corpus information
   */
  private String getCorpusList() {
    StringBuilder sb = new StringBuilder(); // Put everything into a string builder
    try {
      // Get the array of corpora
      JSONArray arCorpora = servlet.getCorpora();
      // Check if anything is defined
      if (arCorpora.length() == 0) {
        
      } else {
        // Walk all the language entries
        for (int i = 0 ; i < arCorpora.length(); i++) {
          // Get this object
          JSONObject oCorpus = arCorpora.getJSONObject(i);
          // Read the languages from here
          String sLng = oCorpus.getString("lng");
          String sLngName = oCorpus.getString("name");
          // Read the information from the different parts
          JSONArray arPart = oCorpus.getJSONArray("parts");
          // There should be one option for those who want *everything* from one language
          if (arPart.length()>1) {
            // Set the string to be displayed in the combobox line
            String sShow = sLngName + " (" + sLng + ")";
            // SPecifiy the 'value' for this option
            String sValue = sLng + ":";
            // Enter the combobox line
            sb.append("<option class=\"noprefix\" value=\"" + sValue + "\">" +
                    sShow + "</option>\n");
          }
          // Walk all the parts
          for (int j = 0; j< arPart.length(); j++) {
            // Get this part as an object
            JSONObject oPart = arPart.getJSONObject(j);
            // Get the specification of this part
            String sName = oPart.getString("name");
            String sDir = oPart.getString("dir");
            // Set the string to be displayed in the combobox line
            String sShow = sLngName + " (" + sLng + "): " + sName + " (" + sDir + ")";
            // SPecifiy the 'value' for this option
            String sValue = sLng + ":" + sDir;
            // Enter the combobox line
            sb.append("<option class=\"noprefix\" value=\"" + sValue + "\">" +
                    sShow + "</option>\n");
          }
        }      
      }
      // Return the string we made
      return sb.toString();
    } catch (Exception ex) {
      logger.DoError("getCorpusList: could not complete", ex);
      return "error (getCorpusList)";
    }
  }

}
