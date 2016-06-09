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
import nl.ru.util.StringUtil;
import nl.ru.util.json.JSONObject;

/**
 * UpdateResponse
 *  Retrieve the results that are requested
 *  What the caller gives us is a JSON parameter called "query", containing:
 *    lng     - the language (corpus specification)
 *    prj     - name of the CRP 
 *    userid  - the userid
 *    qc      - the number of the QC line
 *    [dir]   - the sub-directory under the language (more specific corpus specification)
 *    [sub]   - the sub-category (if any)
 *    [files] - list of files to be included
 *    start   - result number to start with
 *    count   - number of results to be returned
 *    type    - kind of info: ‘hits’, ‘context’, ‘syntax’ (or combination)
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
    String sUser;         // Currently logged in user
    String sJobId = "";   // JobId
    String sType = "";    // Type of /update request to be made
    JSONObject oQuery;    // Contents of the request
    
    try {
      // Gather our own parameter(s)
      sUser = servlet.getUserId();
      // Collect the JSON from our caller
      oQuery = new JSONObject(request.getParameter("args"));
      if (!oQuery.has("lng"))     { sendErrorResponse("UpdateResponse: missing @lng");    return;}
      if (!oQuery.has("prj"))     { sendErrorResponse("UpdateResponse: missing @prj");    return;}
      if (!oQuery.has("userid"))  { sendErrorResponse("UpdateResponse: missing @userid"); return;}
      if (!oQuery.has("qc"))      { sendErrorResponse("UpdateResponse: missing @qc");     return;}
      if (!oQuery.has("start"))   { sendErrorResponse("UpdateResponse: missing @start");  return;}
      if (!oQuery.has("count"))   { sendErrorResponse("UpdateResponse: missing @count");  return;}
      if (!oQuery.has("type"))    { sendErrorResponse("UpdateResponse: missing @type");   return;}
      if (!oQuery.has("view"))    { sendErrorResponse("UpdateResponse: missing @view");   return;}
      // Determine the type of results we need to have
      int iView = oQuery.getInt("view");
      switch(iView) {
        case 1: // per hit
        case 2: // per document: 
        case 3: // per group: files belonging to one of the named file-groups (e.g: O23)
          break;
        case 4: // per division: files belonging to one of the named group-divisions (e.g: ME)
          if (!oQuery.has("div")) { sendErrorResponse("UpdateResponse: missing @div for view 3-4");return;}
          break;
        default:
          // This particular view is not known
          sendErrorResponse("UpdateResponse: view "+iView+" is not known"); 
          return;
      }
      
      // Start preparing a /crpp request
      //   Obligatory parameters: 
      //      lng:    3 (or more) letter code of the language 
      //      crp:    Corpus research project name (including extension)
      //      userid: name of user that has done /exe with the CRP
      //      qc:     The Query Constructor line for which we want information
      //      start:  Results should start with @start
      //      count:  The total number of results to be returned
      //      type:   The kind of info (hits, context, syntax -- or combination)
      //   Optional parameters:   
      //      dir:    Directory under the "lng" where the corpus we want to consult resides
      //      sub:    Name of the sub category for which we want results
      //      files:  JSON array of file names to be included
      //      div:    Name of the group-division to be used (for view=3, view=4)
      // =============================================================================
      // Obligatory parameters:
      JSONObject oMyQuery = new JSONObject();
      oMyQuery.put("lng", oQuery.getString("lng"));       // Specify the language
      oMyQuery.put("crp", oQuery.getString("prj"));       // Specify the CRP name
      oMyQuery.put("userid", oQuery.getString("userid")); // Name of the user
      oMyQuery.put("qc", oQuery.getInt("qc"));            // Query constructor line
      oMyQuery.put("start", oQuery.getInt("start"));      // Starting number of results
      oMyQuery.put("count", oQuery.getInt("count"));      // Number of results to be returned
      oMyQuery.put("type", oQuery.getString("type"));     // The type of information we need per hit
      // =============================================================================
      // Optional: sub category specification
      if (oQuery.has("sub")) { oMyQuery.put("sub", oQuery.getString("sub")); }
      // Corpus part of @lng
      if (oQuery.has("dir")) { oMyQuery.put("dir", oQuery.getString("dir")); }     
      // Specification of files
      if (oQuery.has("files")) { oMyQuery.put("files", oQuery.getJSONArray("files")); } 
      // Specification of grouping division (this is Xquery code, which we compress for safe passage)
      if (oQuery.has("div")) { oMyQuery.put("div", StringUtil.compressSafe(oQuery.getString("div"))); } 
      // Optional: locs and locw specification
      if (oQuery.has("locs")) { oMyQuery.put("locs", oQuery.getString("locs")); }
      if (oQuery.has("locw")) { oMyQuery.put("locw", oQuery.getString("locw")); }
      
      // Put my query into the request
      this.params.put("query", oMyQuery);

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
      String sResp = getCrppResponse("update", "", this.params, oMyQuery);
      if (sResp.isEmpty() || !sResp.startsWith("{")) { sendErrorResponse("UpdateResponse: /crpp does not return JSON"); return;}
      
      // Process the response from /crpp, adding to [output]
      processUpdateResponse(sResp, output);
      
      // Send the output to our caller
      sendResponse(output);
    } catch (Exception ex) {
      // Send error to the caller
      sendErrorResponse("UpdateResponse: could not complete: "+ ex.getMessage());
      // Show error ourselves
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
