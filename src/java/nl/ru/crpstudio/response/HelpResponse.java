/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */

package nl.ru.crpstudio.response;

import java.util.HashMap;
import java.util.Map;

/**
 *
 * @author Erwin R. Komen
 */
public class HelpResponse extends BaseResponse {
  
	@Override
	protected void completeRequest() {
    try {
      String sHelpFile = "";
      // Get the section parameter
      String sSection = this.request.getParameter("section");
      String sType =  this.request.getParameter("type");
      if (sType == null || sType.isEmpty()) sType = "html";
      // Now determine which page should be shown
      switch (sSection) {
        case "general":
        case "corpora":
        case "projects-project_editor":
        case "projects-input_editor":
        case "projects-definition_editor":
        case "projects-query_editor":
        case "projects-constructor_editor":
        case "projects-result_display":
        case "projects-document_display":
        default:
          switch (sType) {
            case "html":
              sHelpFile = labels.getString("help.manual.html");
              break;
            case "pdf":
              sHelpFile = labels.getString("help.manual.pdf");
              break;
          }
      }
      // Start preparing the output of "completeRequest()", which is a mapping object
      Map<String,Object> output = new HashMap<>();
      // Put thd file name on the output
      output.put("file", sHelpFile);
      output.put("section", sSection);
      // Send the output to our caller
      sendResponse(output);
    } catch (Exception ex) {
      this.displayError("HelpResponse error: " + ex.getMessage());      
    }
	}

	@Override
	protected void logRequest() {
		this.servlet.log("HelpResponse");
	}

	@Override
	public HelpResponse duplicate() {
		return new HelpResponse();
	}

}
