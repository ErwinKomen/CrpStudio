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
import nl.ru.util.json.JSONArray;
import nl.ru.util.json.JSONObject;

/**
 * ExecuteResponse
 *    Prepare and issue a /crpp/exe?query={...} request
 *    What the caller gives us is a JSON parameter called "query", containing:
 *      crp     - name of the Corpus Research Project
 *      lng     - language to be searched by the CRP
 *      dir     - the part of the corpus to be searched
 *      dbase   - the database that should serve as input
 *      cache   - we decide ourselves whether caching (on the crpp) is on or off
 *    Parameters we have ourselves:
 *      userid  - name of the user currently logged in
 * 
 * @author Erwin R. Komen
 */
public class ExecuteResponse extends BaseResponse {

	@Override
	protected void completeRequest() {
    String sUser;
    String sJobId = "";
    JSONObject oQuery;
    try {
      // Gather our own parameter(s)
      sUser = servlet.getUserId();
      // Collect the JSON from our caller
      oQuery = new JSONObject(request.getParameter("args"));
      if (!oQuery.has("lng"))     { sendErrorResponse("ExecuteResponse: missing @lng"); return;}
      if (!oQuery.has("crp"))     { sendErrorResponse("ExecuteResponse: missing @crp"); return;}
      if (!oQuery.has("userid"))  { sendErrorResponse("ExecuteResponse: missing @userid"); return;}
      
      this.params.put("userid", oQuery.getString("userid"));
      this.params.put("crp", oQuery.getString("crp"));
      // Keep the CRP name for later use
      this.sCrpName = oQuery.getString("crp");
      this.params.put("lng", oQuery.getString("lng"));
      // Optional "dir" parameter
      if (oQuery.has("dir")) { this.params.put("dir", oQuery.getString("dir")); }
      // Optional "dbase" parameter
      if (oQuery.has("dbase")) { this.params.put("dbase", oQuery.getString("dbase")); }
      // Determine the caching
      if (oQuery.has("cache")) { 
        // Take over the caching parameter, if specified by the caller
        this.params.put("cache", oQuery.getBoolean("cache")); 
      } else {
        // Default caching behaviour: we want caching (in the production environment)
        this.params.put("cache", true);
      }
      // Start preparing the output of "completeRequest()", which is a mapping object
      Map<String,Object> output = new HashMap<String,Object>();
      output.put("startTime", this.startTime);
      try {
        output.put("memUsageStart", this.servlet.getCurrentMemUsage());
      } catch (MalformedObjectNameException | AttributeNotFoundException
          | InstanceNotFoundException | MBeanException
          | ReflectionException e1) {
        e1.printStackTrace();
      }
      // Issue the request to the /crpp using the 'query' JSON parameter above
      String sResp = getCrppResponse("exe", "", this.params, null);
      if (sResp.isEmpty() || !sResp.startsWith("{")) { sendErrorResponse("ExecuteResponse: /crpp does not return JSON"); return;}
      
      // Process the response from /crpp, adding to [output]
      processQueryResponse(sResp, output);
      
      // Send the output to our caller
      sendResponse(output);
    } catch (Exception ex) {
      sendErrorResponse("ExecuteResponse: could not complete: "+ ex.getMessage());
      this.displayError("ExecuteResponse error: " + ex.getMessage());
    }
	}

	@Override
	protected void logRequest() {
		this.servlet.log("ExecuteResponse");
	}

	@Override
	public ExecuteResponse duplicate() {
		return new ExecuteResponse();
	}


  
}
