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
    JSONObject oExeRequest = new JSONObject();
    try {
      // Gather our own parameter(s)
      sUser = servlet.getUserId();
      // Collect the JSON from our caller
      oQuery = new JSONObject(request.getParameter("query"));
      if (!oQuery.has("lng")) { logger.DoError("ExecuteResponse: missing @lng"); return;}
      if (!oQuery.has("crp")) { logger.DoError("ExecuteResponse: missing @crp"); return;}
      oExeRequest.put("userid", sUser);
      oExeRequest.put("crp", oQuery.getString("crp"));
      oExeRequest.put("lng", oQuery.getString("lng"));
      if (oQuery.has("dir")) { oExeRequest.put("dir", oQuery.getString("dir")); }
      if (oQuery.has("cache")) { 
        oExeRequest.put("cache", oQuery.getBoolean("cache")); 
      } else {
        oExeRequest.put("cache", true);
      }
      // Prepare parameters
      this.params.clear();
      this.params.put("query", oExeRequest.toString());
      // Prepare output
      Map<String,Object> output = new HashMap<String,Object>();
      output.put("startTime", this.startTime);
      try {
        output.put("memUsageStart", this.servlet.getCurrentMemUsage());
      } catch (MalformedObjectNameException | AttributeNotFoundException
          | InstanceNotFoundException | MBeanException
          | ReflectionException e1) {
        e1.printStackTrace();
      }
      // Issue a request to the /crpp using the 'query' JSON parameter above
      String response = getCrppResponse("exe", "", this.params);
      if (response.isEmpty() || !response.startsWith("{")) { logger.DoError("ExecuteResponse: /crpp does not return JSON"); return;}
      // Interpret the response: expecting a JSON string with "status", "content"
      JSONObject oResp = new JSONObject(response);
      if (!oResp.has("status")) { logger.DoError("ExecuteResponse: /crpp does not return status"); return;}
      // Decypher the status
      JSONObject oStat = oResp.getJSONObject("status");
      // Put the status code and message in the output string we return
      output.put("status", oStat.getString("code"));
      output.put("message", oStat.getString("message"));
      JSONObject oCont = null;
      if (oResp.has("content")) oCont = oResp.getJSONObject("content");
      switch (oStat.getString("code")) {
        case "error":
          logger.DoError("ExecuteResponse: /crpp returns error:"+oCont.getString("message"));
          output.put("error", oCont.getString("message"));
          break;
        case "completed":
          // If the job is already completed, then we need to pass on the results: "table"
          output.put("table",oCont.getJSONArray("table"));
          sJobId = servlet.getUserJob();
          output.put("jobid", sJobId );
          break;
        case "started":
          // Get the jobid
          sJobId = oStat.getString("jobid");
          servlet.setUserJob(sJobId);
          output.put("jobid", sJobId );
          break;
        case "working":
          // Get the jobid (now stored in the content part)
          sJobId = oResp.getString("jobid");
          servlet.setUserJob(sJobId);
          output.put("jobid", sJobId );
          break;
        default:
          output.put("error", "Undefined /crpp status code: ["+oStat.getString("code")+"]");
          break;
      }
      // Send the output to our caller
      sendResponse(output);
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
