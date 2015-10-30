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
import static nl.ru.util.StringUtil.compressSafe;
import static nl.ru.util.StringUtil.decompressSafe;
import nl.ru.util.json.JSONArray;
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
    boolean bIsList = false;
    
    try {
      // Gather our own parameter(s)
      sLoggedInUser = servlet.getUserId();
      // Collect the JSON from our POST caller
      oQuery = new JSONObject(request.getParameter("args"));
      if (!oQuery.has("userid")) { sendErrorResponse("CrpchgResponse: missing @userid"); return;}
      if (!oQuery.has("crp")) { sendErrorResponse("CrpchgResponse: missing @crp"); return;}
      // Check for 'key' or 'list'
      if (!oQuery.has("key") && oQuery.has("list"))
        bIsList = true;
      else {      
        if (!oQuery.has("key")) { sendErrorResponse("CrpchgResponse: missing @key"); return;}
        if (!oQuery.has("value")) { sendErrorResponse("CrpchgResponse: missing @value"); return;}
        if (!oQuery.has("id")) { sendErrorResponse("CrpchgResponse: missing @id"); return;}
      }
      
      // Get the common parameters
      sCurrentUser = oQuery.getString("userid");
      String sCrpThis = oQuery.getString("crp");
      
      // Start preparing a /crpp request
      //   Obligatory parameters: 
      //      userid: name of user that has done /exe with the CRP
      //      crp:    Corpus research project name (including extension)
      //   Either:
      //      key:    The Query Constructor line for which we want information
      //      value:  Results should start with @start
      //      id:     If this is a query, then QueryId and so on
      //   Or: a list of key/value/id objects
      // =============================================================================
      
      // Start putting my query into the request
      this.params.clear();
      this.params.put("userid", sCurrentUser);
      this.params.put("crp", sCrpThis);

      // Action depends on list or not
      if (bIsList) {
        JSONArray arList = oQuery.getJSONArray("list");
        JSONArray arCoded = new JSONArray();
        // But put hex coding on the values
        for (int i=0;i<arList.length(); i++) {
          JSONObject oThis = arList.getJSONObject(i);
          JSONObject oNew = new JSONObject();
          oNew.put("key", oThis.getString("key"));
          oNew.put("id", oThis.getInt("id"));
          // oNew.put("value", compressSafe(oThis.getString("value")));
          oNew.put("value", oThis.getString("value"));
          arCoded.put(oNew);
          // =-========= DEBUG ==========
          // logger.debug("Added list element: " + oThis.getString("value"));
          // ============================
        }
        // Add the list paramter
        this.params.put("list", compressSafe(arCoded.toString()));
        /*
        String sStart = arCoded.toString();
        String sCoded = compressSafe(sStart);
        String sVerify = decompressSafe(sCoded);
        if (!sStart.equals(sVerify)) {
          // =-========= DEBUG ==========
          logger.debug("Combined list: " + sCoded + " = ["+decompressSafe(sCoded)+"]" );
          // ============================
        }
        this.params.put("list", sCoded);
        */
        if (oQuery.has("files")) {this.params.put("files", compressSafe(oQuery.getJSONArray("files").toString())); }
      } else {
        String sKeyName = oQuery.getString("key");
        String sKeyValue = oQuery.getString("value");
        int iIdValue = oQuery.getInt("id");

        this.params.put("key", sKeyName);
        this.params.put("value", compressSafe(sKeyValue));
        this.params.put("id", iIdValue);
        if (oQuery.has("files")) this.params.put("files", oQuery.getJSONArray("files") );
      }
      

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
      // NOTE: this is a POST request 
      // this.params.clear();
      // this.params.put("query", oMyQuery.toString());
      // Original: send [this.params] String sResp = getCrppPostResponse("crpchg", "", this.params);
      String sResp = getCrppPostResponse("crpchg", "", this.params);
      // String sResp = getCrppPostResponse("crpchg", "", oMyQuery);
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
        // Force to fetch the CRP again from the /crpp: copy from /crpp >> /crpstudio
        crpThis = crpContainer.getCrp(this, sCrpThis, sCurrentUser, true);
        if (crpThis == null) { 
          sendErrorResponse("Could not load CRP:\n" + logger.getErrList().toString()); 
          return;}
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
