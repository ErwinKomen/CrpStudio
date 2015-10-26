/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
package nl.ru.crpstudio.response;

import java.util.HashMap;
import java.util.Map;
import javax.management.AttributeNotFoundException;
import javax.management.InstanceNotFoundException;
import javax.management.MBeanException;
import javax.management.MalformedObjectNameException;
import javax.management.ReflectionException;
import static nl.ru.util.StringUtil.escapeHexCoding;
import nl.ru.util.json.JSONObject;

/**
 * CrpchgResponse
 *  Process changes in the CRP into the /crpp server
 * 
 *  What the caller gives us is a JSON parameter called "query", containing:
 *    userid  - the userid
 *    crp     - name of the CRP 
 *    key     - the name of the control that changes
 *    value   - the new value
 *    id      - an integer id (-1 for CRP info, positive number for Query/Def etc)
 * 
 * @author Erwin R. Komen
 * @history 4/aug/2015  Created
 *          15/oct/2015 Added @id
 */
public class CrpchgResponse extends BaseResponse {

	@Override
	protected void completeRequest() {
    String sLoggedInUser; // Currently logged in user
    String sCurrentUser;  // User named within the request
    JSONObject oQuery;    // Contents of the request
    
    try {
      // Gather our own parameter(s)
      sLoggedInUser = servlet.getUserId();
      // Collect the JSON from our POST caller
      oQuery = new JSONObject(request.getParameter("args"));
      if (!oQuery.has("userid")) { sendErrorResponse("CrpchgResponse: missing @userid"); return;}
      if (!oQuery.has("crp")) { sendErrorResponse("CrpchgResponse: missing @crp"); return;}
      if (!oQuery.has("key")) { sendErrorResponse("CrpchgResponse: missing @key"); return;}
      if (!oQuery.has("value")) { sendErrorResponse("CrpchgResponse: missing @value"); return;}
      if (!oQuery.has("id")) { sendErrorResponse("CrpchgResponse: missing @id"); return;}
      
      // Get some parameters
      sCurrentUser = oQuery.getString("userid");
      String sCrpThis = oQuery.getString("crp");
      String sKeyName = oQuery.getString("key");
      String sKeyValue = oQuery.getString("value");
      int iIdValue = oQuery.getInt("id");
      
      // ========== DEBUG ==========
      //if (sKeyName.equals("source")) {
      // logger.debug("crpchg source change request to: " + sKeyValue);
      //}
      // ===========================
      
      // Start preparing a /crpp request
      //   Obligatory parameters: 
      //      userid: name of user that has done /exe with the CRP
      //      crp:    Corpus research project name (including extension)
      //      key:    The Query Constructor line for which we want information
      //      value:  Results should start with @start
      // =============================================================================
      // Obligatory parameters:
      JSONObject oMyQuery = new JSONObject();
      oMyQuery.put("userid", sCurrentUser); // Name of the user
      oMyQuery.put("crp", sCrpThis);        // Specify the CRP name
      oMyQuery.put("key", sKeyName);        // Name of the key
      oMyQuery.put("value", sKeyValue);     // Value of the key
      oMyQuery.put("id", iIdValue);         // Value of the id
      if (oQuery.has("files")) { oMyQuery.put("files", oQuery.getJSONArray("files")); } 
      
      // Put my query into the request
      // this.params.put("query", oMyQuery.toString());
      // NOTE: user base64 encoding to package the stringified query
      this.params.clear();
      this.params.put("userid", sCurrentUser);
      this.params.put("crp", sCrpThis);
      this.params.put("key", sKeyName);
      this.params.put("value", escapeHexCoding(sKeyValue));
      this.params.put("id", iIdValue);
      if (oMyQuery.has("files")) this.params.put("files", oMyQuery.getString("files") );

      // Start preparing the output of "completeRequest()", which is a mapping object
      Map<String,Object> output = new HashMap<>();
      output.put("startTime", this.startTime);
      try {
        output.put("memUsageStart", this.servlet.getCurrentMemUsage());
      } catch (MalformedObjectNameException | AttributeNotFoundException
          | InstanceNotFoundException | MBeanException
          | ReflectionException e1) {
        e1.printStackTrace();
      }
      // Issue the request to the /crpp using the 'query' JSON parameter above
      // NOTE: this is a GET request 
      String sResp = getCrppPostResponse("crpchg", "", this.params);
      // String sResp = getCrppResponse("crpchg", "", this.params, oMyQuery);
      if (sResp == null || sResp.isEmpty() || !sResp.startsWith("{")) { sendErrorResponse("CrpchgResponse: /crpp does not return JSON"); return;}
      
      // Check for errors
      JSONObject oResp = new JSONObject(sResp);
      JSONObject oStatus = oResp.getJSONObject("status");
      JSONObject oContent = oResp.getJSONObject("content");
      if (oStatus == null || oStatus.getString("code").equals("error")) {
        sendErrorResponse("CrpchgResponse: " + oContent.getString("msg"));
        return;
      }
      // Have any changes been made?
      boolean bChanged = oContent.getBoolean("changed");
      // Only re-load the CRP if any changes were made
      if (bChanged) {
        // Force to fetch the CRP again from the /crpp
        crpThis = crpContainer.getCrp(this, sCrpThis, sCurrentUser, true);
        if (crpThis == null) { sendErrorResponse("Could not load CRP:\n" + 
                logger.getErrList().toString()); return;}
        // Add the adapted date to the content
        oContent.put("datechanged", crpThis.getDateChanged());
      }
      
      // Send a standard positive response
      sendStandardResponse("completed", "ready", oContent);
    } catch (Exception ex) {
      // Send error to the caller
      sendErrorResponse("CrpchgResponse: could not complete: "+ ex.getMessage());
      // Show error ourselves
      this.displayError("CrpchgResponse error: " + ex.getMessage());
    }
	}

	@Override
	protected void logRequest() {
		this.servlet.log("CrpchgResponse");
	}

	@Override
	public CrpchgResponse duplicate() {
		return new CrpchgResponse();
	}


  
}
