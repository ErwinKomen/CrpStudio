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
import nl.ru.util.json.JSONObject;

/**
 * ResetResponse
 *    Prepare and issue a /crpp/reset?{...} request
 *    Parameters we have ourselves:
 *      userid  - name of the user currently logged in
 *      jobid   - number of this job
 * 
 * @author Erwin R. Komen
 */
public class ResetResponse extends BaseResponse {

	@Override
	protected void completeRequest() {
    String sUser;
    String sJobId = "";
    JSONObject oQuery;
    try {
      // Collect the JSON from our caller
      String sQuery = request.getParameter("args");
      if (sQuery.isEmpty()) { sendErrorResponse("ResetResponse received empty @args"); return;}
      
      oQuery = new JSONObject(sQuery);
      if (!oQuery.has("userid"))  { sendErrorResponse("ResetResponse did not get @userid"); return;}
      if (!oQuery.has("jobid"))   { sendErrorResponse("ResetResponse did not get @jobid"); return;}
      this.params.put("userid", oQuery.getString("userid"));
      this.params.put("jobid", oQuery.getString("jobid"));
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
      String sResp = getCrppResponse("reset", "", this.params, null);
      if (sResp.isEmpty() || !sResp.startsWith("{")) { sendErrorResponse("ResetResponse: /crpp does not return JSON"); return;}
      
      // Process the response from /crpp, adding to [output]
      processQueryResponse(sResp, output);
      
      // Send the output to our caller
      sendResponse(output);
    } catch (Exception ex) {
      logger.DoError("ResetResponse: could not complete", ex);
    }
	}

	@Override
	protected void logRequest() {
		this.servlet.log("ResetResponse");
	}

	@Override
	public ResetResponse duplicate() {
		return new ResetResponse();
	}


  
}
