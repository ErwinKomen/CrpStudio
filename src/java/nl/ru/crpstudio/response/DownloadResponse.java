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
  private String sItemType;   // Type of the item: project, corpus, dbase
  private String sItemPart;   // Part of an item (definition, query)

	@Override
	protected void completeRequest() {
    JSONObject oContent = new JSONObject();

    try {
      // Expecting the following parameters:
      //  Obligatory:
      //    userid    - Identifier of the user
      //    itemname  - Name of project, corpus or database (not of query/def)
      //    itemtype  - Can be: project, definition, query, dbase, corpus
      //  Optional:
      //    itempart  - part of corpus (...) or project (query name, definition name)
      
      sItemName = this.request.getParameter("itemname");
      // Validate: must have an item name
      if (sItemName.isEmpty()) { sendErrorResponse("Download item name is not specified"); return;}
      // Remove the "/" or "\" from the file name
      if (sItemName.endsWith(".crpx")) 
        sItemName = FileIO.getFileNameWithoutExtension(sItemName);
      // User is also necessary
      sUserId = this.request.getParameter("userid");
      if (sUserId.isEmpty()) { sendErrorResponse("The userid is not specified"); return; }
      // Final necessity: item type
      sItemType = this.request.getParameter("itemtype");
      if (sItemType.isEmpty()) { sendErrorResponse("Download item type is not specified"); return;}
      // Check for item part
      sItemPart = this.request.getParameter("itempart");
      
      // Method validation
      if (servlet.getRequestMethod().equals("GET")) {
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
      
      // Make sure the listener knows who I am
      oContent.put("itemtype", sItemType);
      
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
          // Adaptation: we need to have the itemtype too
          oContent.put("itemtype", sItemType);
          // The content part must contain the CRP
          String sCrpText = oContent.getString("crp");
          // Assume that the method is POST:
          String fileName = "/" + servlet.getUserId() +"/"+sItemName+".crpx" ;
          // Get the URL for the user
          String sUrl = makeFileLocResponse(sCrpText, fileName);
          // Prepare content
          oContent.put("file", sUrl);
          break;
        case "corpus":      // Allow downloading a whole corpus (compressed)
          break;
        case "definition":  // Download a definition as a .xq file
          // Obligatory: itempart
          if (sItemPart.isEmpty())
            sendErrorResponse("DownloadResponse (definition): parameter [itempart] is not specified");
          // Get the indicated definition of the indicated CRP
          String sDefText = this.getProjectDef(sItemName, sUserId, sItemPart);
          // Assume that the method is POST:
          String fileDef = "/" + servlet.getUserId() +"/"+sItemPart+".xq" ;
          // Get the URL for the user
          String sUrlDef = makeFileLocResponse(sDefText, fileDef);
          // Prepare content
          oContent.put("file", sUrlDef);
          break;
        case "query":       // Download a query as a .xq file
          // Obligatory: itempart
          if (sItemPart.isEmpty())
            sendErrorResponse("DownloadResponse (query): parameter [itempart] is not specified");
          // Get the indicated definition of the indicated CRP
          String sQueryText = this.getProjectQuery(sItemName, sUserId, sItemPart);
          // Assume that the method is POST:
          String fileQuery = "/" + servlet.getUserId() +"/"+sItemPart+".xq" ;
          // Get the URL for the user
          String sUrlQuery = makeFileLocResponse(sQueryText, fileQuery);
          // Prepare content
          oContent.put("file", sUrlQuery);
          break;
        case "dbase":       // Download a whole database (compressed)
          break;
        default:
          sendErrorResponse("The /crpstudio/download method cannot process type [" + sItemType + "]");
          return;
      }
      // Send the standard response
      sendStandardResponse("completed", "The item [" + sItemType + "] can be downloaded", oContent);


    } catch (Exception ex) {
      sendErrorResponse("DownloadResponse: could not complete: "+ ex.getMessage());
    }
	}

	@Override
	protected void logRequest() {
		this.servlet.log("DownloadResponse");
	}

	@Override
	public DownloadResponse duplicate() {
		return new DownloadResponse();
	}

 
}
