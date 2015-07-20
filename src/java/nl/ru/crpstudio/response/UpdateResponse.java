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
 * UpdateResponse
 *  Retrieve the results that are requested
 *  What the caller gives us is a JSON parameter called "query", containing:
 *    prj     - name of the CRP 
 *    lng     - the language (corpus specification)
 *    dir     - the sub-directory under the language (more specific corpus specification)
 *    qc      - the number of the QC line
 *    sub     - the sub-category (if any)
 *    userid  - the userid
 *    view    - a number indicating the kind of data we want:
 *              1 - per hit
 *              2 - per document
 *              3 - per group
 *              4 - per division
 * 
 * @author Erwin R. Komen
 * @history 15/jul/2015 Created
 */
public class UpdateResponse extends BaseResponse {

	@Override
	protected void completeRequest() {
    String sUser;
    String sJobId = "";
    JSONObject oQuery;
    try {
      // Gather our own parameter(s)
      sUser = servlet.getUserId();
      // Collect the JSON from our caller
      oQuery = new JSONObject(request.getParameter("query"));
      if (!oQuery.has("prj")) { sendErrorResponse("UpdateResponse: missing @prj"); return;}
      if (!oQuery.has("lng")) { sendErrorResponse("UpdateResponse: missing @lng"); return;}
      if (!oQuery.has("dir")) { sendErrorResponse("UpdateResponse: missing @dir"); return;}
      if (!oQuery.has("qc")) { sendErrorResponse("UpdateResponse: missing @qc"); return;}
      if (!oQuery.has("view")) { sendErrorResponse("UpdateResponse: missing @view"); return;}
      if (!oQuery.has("userid")) { sendErrorResponse("UpdateResponse: missing @userid"); return;}
      // NOTE: the variable "sub" is optional
      
      // Start preparing output
      this.params.put("userid", oQuery.getString("userid"));
      this.params.put("prj", oQuery.getString("prj"));  // Specify the CRP name
      this.params.put("lng", oQuery.getString("lng"));  // Specify the language
      this.params.put("dir", oQuery.getString("dir"));  // Specify the part of the language = input corpus
      // Optional: sub category specification
      if (oQuery.has("sub")) { this.params.put("sub", oQuery.getString("sub")); }

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
      String sResp = getCrppResponse("update", "", this.params);
      if (sResp.isEmpty() || !sResp.startsWith("{")) { sendErrorResponse("UpdateResponse: /crpp does not return JSON"); return;}
      
      // Process the response from /crpp, adding to [output]
      // ===============================================
      // TODO: adapt this for the /update response!!!!
      processQueryResponse(sResp, output);
      // ===============================================
      
      // Send the output to our caller
      sendResponse(output);
    } catch (Exception ex) {
      sendErrorResponse("UpdateResponse: could not complete: "+ ex.getMessage());
      this.displayError("UpdateResponse error: " + ex.getMessage());
    }
	}

	@Override
	protected void logRequest() {
		this.servlet.log("UpdateResponse");
	}

	@Override
	public UpdateResponse duplicate() {
		return new UpdateResponse();
	}


  
}
