/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
package nl.ru.crpstudio.response;

import java.math.BigInteger;
import nl.ru.crpx.tools.FileIO;
import nl.ru.util.json.JSONObject;

public class DownloadResponse extends BaseResponse {
  private String sItemName;   // Name of the item to be downloaded
  private String sItemType;   // Type of the item: project, query, definition, corpus, dbase

	@Override
	protected void completeRequest() {
    JSONObject oContent = new JSONObject();

    try {
      // There are three parameters: file, userid, crp
      sItemName = this.request.getParameter("itemname");
      // Validate: all three must be there
      if (sItemName.isEmpty()) { sendErrorResponse("Project name is not specified"); return;}
      // Remove the "/" or "\" from the file name
      if (sItemName.endsWith(".crpx")) 
        sItemName = FileIO.getFileNameWithoutExtension(sItemName);
      // User is also necessary
      sUserId = this.request.getParameter("userid");
      if (sUserId.isEmpty()) { sendErrorResponse("The userid is not specified"); return; }
      
      // Method validation
      if (servlet.getRequestMethod() == "GET") {
        // We cannot react on a GET request
        sendErrorResponse("The /crpstudio/download method only works with POST");
        return;
      }
      
      // Other initialisations
      String sResp = "";
      JSONObject oResp = null;
      JSONObject oStat = null;
      this.params.clear();
      this.params.put("userid", sUserId);
      
      // The action depends on the item type being requested for download
      switch (sItemType) {
        case "project":
          // Prepare a remove request to /crpp using the correct /crpget parameters
          this.params.put("name", sItemName);
          sResp = getCrppPostResponse("crpget", "", this.params);

          // Check the result
          if (sResp.isEmpty() || !sResp.startsWith("{")) sendErrorResponse("Server /crpp gave no valid response on /crpset");
          // Convert the response to JSON
          oResp = new JSONObject(sResp);
          // Get the status
          if (!oResp.has("status")) sendErrorResponse("Server /crpp gave [status] back");
          // Decypher the status
          oStat = oResp.getJSONObject("status");
          if (!oStat.getString("code").equals("completed"))
            sendErrorResponse("Server /crpp returned status: "+oStat.getString("code"));

          // Get the content part
          oContent = oResp.getJSONObject("content");
          // The content part must contain the CRP
          String sCrpText = oContent.getString("crp");
          // Assume that the method is POST:
          String fileName = "/" + servlet.getUserId() +"/"+sItemName+".crpx" ;
          // Get the URL for the user
          String sUrl = makeFileLocResponse(sCrpText, fileName);
          // Prepare content
          oContent.put("file", sUrl);
          /*
          switch (servlet.getRequestMethod()) {
            case "GET":
              // We cannot react on a GET request
              sendErrorResponse("The /crpstudio/download method only works with POST");
              break;
            case "POST":
              String fileName = "/" + servlet.getUserId() +"/"+sItemName+".crpx" ;
              // Get the URL for the user
              String sUrl = makeFileLocResponse(sCrpText, fileName);
              // Prepare content
              oContent.put("file", sUrl);
              // Send the standard response
              sendStandardResponse("completed", "The CRP can be downloaded", oContent);
              break;
            default:
              sendErrorResponse("The /crpstudio/download method only works with POST");
              return;
          }
                  */
          break;
        case "corpus":
          break;
        case "definition":
          break;
        case "query":
          break;
        case "dbase":
          break;
        default:
          sendErrorResponse("The /crpstudio/download method cannot process type [" + sItemType + "]");
          return;
      }
      // Send the standard response
      sendStandardResponse("completed", "The item [" + sItemType + "] can be downloaded", oContent);


    } catch (Exception ex) {
      sendErrorResponse("RemoveResponse: could not complete: "+ ex.getMessage());
    }
	}

	@Override
	protected void logRequest() {
		this.servlet.log("RemoveResponse");
	}

	@Override
	public DownloadResponse duplicate() {
		return new DownloadResponse();
	}

 
}
