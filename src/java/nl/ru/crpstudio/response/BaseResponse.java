/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
package nl.ru.crpstudio.response;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.StringWriter;
import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.ResourceBundle;
import java.util.SortedSet;
import java.util.TreeSet;
import javax.management.AttributeNotFoundException;
import javax.management.InstanceNotFoundException;
import javax.management.MBeanException;
import javax.management.MalformedObjectNameException;
import javax.management.ReflectionException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import nl.ru.crpstudio.CrpStudio;
import nl.ru.crpstudio.crp.CrpContainer;
import nl.ru.crpstudio.util.ErrHandle;
import nl.ru.crpstudio.util.ExploreSpecifier;
import nl.ru.crpstudio.util.MetadataField;
import nl.ru.crpstudio.util.MultipartUtility;
import nl.ru.crpstudio.util.QryPositionSpecifier;
import nl.ru.crpstudio.util.QryRelationSpecifier;
import nl.ru.crpstudio.util.QryTypeSpecifier;
import nl.ru.crpstudio.util.QueryServiceHandler;
import nl.ru.crpstudio.util.TabSpecifier;
import nl.ru.crpstudio.util.TagsetSpecifier;
import nl.ru.crpstudio.util.TemplateManager;
import nl.ru.crpstudio.util.UserFile;
import nl.ru.crpx.project.CorpusResearchProject;
import nl.ru.crpx.project.CorpusResearchProject.ProjType;
import nl.ru.crpx.tools.FileIO;
import nl.ru.util.ByRef;
import nl.ru.util.FileUtil;
import nl.ru.util.StringUtil;
import nl.ru.util.json.JSONArray;
import nl.ru.util.json.JSONException;
import nl.ru.util.json.JSONObject;
import org.apache.velocity.Template;
import org.apache.velocity.VelocityContext;

/**
 *
 */
public abstract class BaseResponse {

  private final String OUTPUT_ENCODING = "UTF-8";
  static ErrHandle logger;

  protected HttpServletRequest request;
  protected HttpServletResponse response;
  protected CrpStudio servlet;
  private VelocityContext context = new VelocityContext();
  protected ResourceBundle labels;
  protected Locale locale;
  protected String lastUrl = null;
  protected Map<String,Object> params;
  protected String lang;
  protected TemplateManager templateMan;
  protected boolean bUserOkay = false;
  protected String sUserId = "none";
  protected String sJobId = "";
  protected CrpContainer crpContainer;
  protected CorpusResearchProject crpThis;
  protected String sCrpName = "";
  protected String sMessage = "";
  static List<UserFile> lUserFile = new ArrayList<>();
  protected long startTime = new Date().getTime();

  protected BaseResponse() {
  }

  public CrpStudio getServlet() {
          return this.servlet;
  }

  /**
   * Initialise this object with
   * @param argRequest
   * @param argResponse
   * @param argServlet
   */
  public void init(HttpServletRequest argRequest, HttpServletResponse argResponse, CrpStudio argServlet) {
    request = argRequest;
    response = argResponse;
    servlet = argServlet;
    templateMan = argServlet.getTemplateManager();
    logger = argServlet.getErrHandle();
    crpContainer = argServlet.getCrpContainer();
  }

  /**
   * Get the velocity context object
   *
   * @return velocity context
   */
  protected VelocityContext getContext() {
    return context;
  }

  protected void clearContext() {
    context = new VelocityContext();
  }
  
  public void setMessage(String sMsg) {this.sMessage = sMsg;}
  public String getmessage() {return this.sMessage;}

  protected Map<String, Object> getQueryParameters() {
    Map<String, Object> params = new HashMap<String,Object>();
    
    try {
      String query = this.getParameter("query", "");
      query = query.replaceAll("&", "%26");

      int view = this.getParameter("view", 1);

      if (query.length() > 0) {
        try {

          // params.put("patt", query);

          String groupBy = this.getParameter("group_by", "");
          if (groupBy.length() > 0)
            params.put("group", URLDecoder.decode(groupBy, "UTF-8"));

          String sort = this.getParameter("sort", "");
          if (sort.length() > 0) {
            params.put("sort", URLDecoder.decode(sort, "UTF-8"));
          }

          Integer start = this.getParameter("start", -1);
          if (start > -1)
            params.put("start", start);

          Integer end = this.getParameter("end", -1);
          if (end > -1)
            params.put("end", end);

          Integer first = this.getParameter("first", 0);
          if (first > 0)
            params.put("first", first);

          Integer number = this.getParameter("number", 50);
          String docPid = this.getParameter("docpid", "");
          if (docPid.length() == 0)
            params.put("number", number);

          String filter = getFilterString();
          if (filter.length() > 0) {
            params.put("filter", filter);
          }

          if (view == 12)
            params.put("wordsaroundhit", 0);

        } catch (UnsupportedEncodingException e) {
          e.printStackTrace();
        }
      }

      return params;
    } catch (Exception ex) {
      logger.DoError("BaseResponse.getQueryParameters error", ex);
      return params;
    }
	}
	
	private String getFilterString() {
		Map<String,Map<String,List<String>>> filters = new HashMap<String,Map<String,List<String>>>();
    List<MetadataField> fldsMetaData;
    String filter = "";
		
    try {
      // Validate
      fldsMetaData = this.servlet.getMetadataFields();
      // Validate
      if (fldsMetaData == null) return filter;
      // Loop
      for (MetadataField dataField : fldsMetaData) {
        String[] filterValues = this.getParameterValues(dataField.getName(), null);
        if (filterValues != null && filterValues.length > 0) {
          Map<String,List<String>> vals = new HashMap<String,List<String>>();
          List<String> is = new ArrayList<String>();
          List<String> isnot = new ArrayList<String>();
          vals.put("is", is);
          vals.put("isnot", isnot);

          for (int i = 0; i < filterValues.length; i++) {
            String filterValue = "";
            try {
              filterValue = URLDecoder.decode(filterValues[i], "UTF-8");
            } catch (UnsupportedEncodingException e) {
              e.printStackTrace();
            }

            if (filterValue.startsWith("-") || filterValue.startsWith("\"-")) {
              filterValue = filterValue.replaceFirst("-", "");
              vals.get("isnot").add(filterValue);
            } else {
              vals.get("is").add(filterValue);
            }
          }

          if (vals.get("isnot").size() > 0 && vals.get("is").size() == 0) {
            for (String filterValue : dataField.getValues()) {
              filterValue = "\""+filterValue+"\"";
              if (!vals.get("isnot").contains(filterValue) && !vals.get("is").contains(filterValue))
                vals.get("is").add(filterValue);
            }
          } else {
            vals.remove("isnot");
          }

          filters.put(dataField.getName(), vals);
        }
      }

      List<String> filterStrings = new ArrayList<String>();
      if (filters.keySet().size() > 0) {
        for (String field : filters.keySet()) {
          filterStrings.add(field+":("+StringUtil.join(filters.get(field).get("is").toArray(), " OR ").replaceAll("&", "%26")+")");
        }
        filter = "("+StringUtil.join(filterStrings.toArray()," AND ")+")";
      }
      return filter;
    } catch (Exception ex) {
      logger.DoError("BaseResponse.getFilterString error", ex);
      return filter;
    }
	}
	
  /**
   * getCrppResponse --
   *    Issue a request to the /crpp machine and return the response
   * 
   * @param index   - index within /crpp
   * @param trail   - optional trail (not used yet)
   * @param params  - parameters requiring & to be attached to request
   * @return        - string returning the response
   */
	public String getCrppResponse(String index, String trail, Map<String,Object> params, 
          JSONObject oJsonParams) {
    String parameters = "";
    
    // Is JSON defined?
    if (oJsonParams == null) {
      // Take over the parameters
      this.params = params;
      // Are there any parameters?
      if (this.params != null && this.params.size() >0) {
        // Transform the parameters into a JSON object
        JSONObject oParams = new JSONObject();
        for (String sParam : params.keySet()) {
          oParams.put(sParam, params.get(sParam));
        }
        parameters = oParams.toString();
      }
    } else {
      parameters = oJsonParams.toString();
    }
    // Calculate the request URL
		String url = this.labels.getString("crppUrlInternal")+ "/" + index + trail;
    // Keep this URL for reference
		this.lastUrl = url;
    // Calculate the parameter string from [this.params]
		// String parameters = getParameterStringExcept(new String[]{});
		
		if (parameters.length() > 0) {
      try {
        url = url + "?" + URLEncoder.encode(parameters, "UTF-8");
        // URLEncoder.encode(requestUrl, "UTF-8")
      } catch (Exception ex) {
  			ex.printStackTrace();
        return null;
      }
		}
		
		QueryServiceHandler webservice = new QueryServiceHandler(url, 1);
		try {
			String sResp = webservice.makeRequest(new HashMap<String, String[]>());
			return sResp;
		} catch (IOException e) {
			e.printStackTrace();
		}
		return null;
	}
  
  /**
   * getCrppPostFileResponse
   *    Perform a multi-part formdata upload
   * 
   * @param index
   * @param trail
   * @param params
   * @param arUpload
   * @return 
   */
  public String getCrppPostFileResponse(String index, String trail, Map<String, Object> params, File[] arUpload) {
    String parameters = "";
    
    try {
      // Take over the parameters
      this.params = params;
      // Are there any parameters?
      if (this.params.size() >0) {
        // Transform the parameters into a JSON object
        JSONObject oParams = new JSONObject();
        for (String sParam : params.keySet()) {
          // Make sure each parameter is URL-encoded
          String sEsc = URLEncoder.encode(params.get(sParam).toString(), "UTF-8");
          oParams.put(sParam, sEsc);
        }
        // Serialize the JSON into a string
        parameters = oParams.toString();
        // Calculate the request URL
        String url = this.labels.getString("crppUrlInternal")+ "/" + index + trail;
        // Keep this URL for reference
        this.lastUrl = url;
        
        MultipartUtility multipart = new MultipartUtility(url, "UTF-8");
        multipart.addHeaderField("User-Agent", "CodeJava");
        multipart.addHeaderField("Test-Header", "Header-Value");

        multipart.addFormField("args", parameters);
        
        for (int i=0;i<arUpload.length;i++) {
          multipart.addFilePart("fileUpload",arUpload[i]);
        }
        
        List<String> response = multipart.finish();
        String sResp = StringUtil.join(response,"\n");
        return sResp;
      } else 
        return "";
    } catch (Exception ex) {
			ex.printStackTrace();
      return "";
    }
  }  
  public String getCrppPostFileResponse(String index, String trail, Map<String, Object> params, String sContent) {
    String parameters = "";
    
    try {
      // Take over the parameters
      this.params = params;
      // Are there any parameters?
      if (this.params.size() >0) {
        // Transform the parameters into a JSON object
        JSONObject oParams = new JSONObject();
        for (String sParam : params.keySet()) {
          // Make sure each parameter is URL-encoded
          String sEsc = URLEncoder.encode(params.get(sParam).toString(), "UTF-8");
          oParams.put(sParam, sEsc);
        }
        // Serialize the JSON into a string
        parameters = oParams.toString();
        // Calculate the request URL
        String url = this.labels.getString("crppUrlInternal")+ "/" + index + trail;
        // Keep this URL for reference
        this.lastUrl = url;

        QueryServiceHandler webservice = new QueryServiceHandler(url, 1);
        try {
          String sResp = webservice.fileRequest(new HashMap<String, String[]>(), parameters, sContent);
          return sResp;
        } catch (IOException e) {
          e.printStackTrace();
        }
        return "";
      } else 
        return "";
    } catch (Exception ex) {
			ex.printStackTrace();
      return "";
    }
  }
   /**
   * getCrppPostResponse --
   *    Issue a POST request to the /crpp machine and return the response
   * 
   * @param index   - index within /crpp
   * @param trail   - optional trail (not used yet)
   * @param params  - parameters requiring & to be attached to request
   * @return        - string returning the response
   */
	public String getCrppPostResponse(String index, String trail, Map<String,Object> params) {
    try {
      // Take over the parameters
      this.params = params;
      // Are there any parameters?
      if (this.params.size() >0) {
        // Transform the parameters into a JSON object
        JSONObject oParams = new JSONObject();
        for (String sParam : params.keySet()) {
          // Make sure each parameter is URL-encoded
          String sEsc = URLEncoder.encode(params.get(sParam).toString(), "UTF-8");
          oParams.put(sParam, sEsc);
        }
        // Call the function with the JSON object
        return getCrppPostResponse(index, trail, oParams);
      } else 
        return "";
    } catch (Exception ex) {
			ex.printStackTrace();
      return "";
    }
  }
	public String getCrppPostResponse(String index, String trail, JSONObject oParams) {
    String parameters = "";
    
    try {
      // Serialize the JSON into a string
      parameters = oParams.toString();
      // Calculate the request URL
      String url = this.labels.getString("crppUrlInternal")+ "/" + index + trail;
      // Keep this URL for reference
      this.lastUrl = url;

      QueryServiceHandler webservice = new QueryServiceHandler(url, 1);
      try {
        String sResp = webservice.postRequest(new HashMap<String, String[]>(), parameters);
        return sResp;
      } catch (IOException e) {
        e.printStackTrace();
      }
      return "";
    } catch (Exception ex) {
			ex.printStackTrace();
      return "";
    }
	}

   /**
   * getCrppFileResponse --
   *    Issue a POST request to the /crpp machine and return the response
   *    The POST request consists of two parts:
   *    1) Parameters (which are sent as a JSON object
   *    2) File (which is sent as a binary)
   * 
   * @param index   - index within /crpp
   * @param trail   - optional trail (not used yet)
   * @param params  - parameters requiring & to be attached to request
   * @param data    - binary (string) content of a file
   * @return        - string returning the response
   */
	public String getCrppFileResponse(String index, String trail, Map<String,Object> params, 
          String data) {
    String parameters = "";
    
    try {
      // Take over the parameters
      this.params = params;
      // Are there any parameters?
      if (this.params.size() >0) {
        // Transform the parameters into a JSON object
        JSONObject oParams = new JSONObject();
        for (String sParam : params.keySet()) {
          // Make sure each parameter is URL-encoded
          String sEsc = URLEncoder.encode(params.get(sParam).toString(), "UTF-8");
          oParams.put(sParam, sEsc);
        }
        // Serialize the JSON into a string
        parameters = oParams.toString();
      }
      // Calculate the request URL
      String url = this.labels.getString("crppUrlInternal")+ "/" + index + trail;
      // Keep this URL for reference
      this.lastUrl = url;

      QueryServiceHandler webservice = new QueryServiceHandler(url, 1);
      try {
        String response = webservice.fileRequest(new HashMap<String, String[]>(), parameters, data);
        return response;
      } catch (IOException e) {
        e.printStackTrace();
      }
      return null;
    } catch (Exception ex) {
			ex.printStackTrace();
      return null;
    }
	}

  protected String getBlackLabResponse(String corpus, String trail, Map<String,Object> params) {
		String url = this.labels.getString("blsUrlInternal")+ "/" + corpus + trail;
		this.lastUrl = url;
		String parameters = getParameterStringExcept(new String[]{});
		
		if (parameters.length() > 0) {
			url = url + "?" + parameters;
		}
		
		QueryServiceHandler webservice = new QueryServiceHandler(url, 1);
		try {
			String response = webservice.makeRequest(new HashMap<String, String[]>());
			return response;
		} catch (IOException e) {
			e.printStackTrace();
		}
		return null;
	}
 
	protected String getParameterStringExcept(String[] except) {
		String parameters = "";
		
		if (params != null && params.keySet().size() > 0) {
			for (String key : params.keySet()) {
				if (!Arrays.asList(except).contains(key)) {
					if (parameters.length() > 0)
						parameters = parameters + "&" + key + "=" + params.get(key);
					else
						parameters = key + "=" +params.get(key);
				}
			}
		}
		
		parameters = parameters.replaceAll(" ", "%20");
		return parameters;
	}

	/**
	 * Display a specific template, with specific mime type
	 *
	 * @param argT
	 * @param mime
	 */
	protected void displayTemplate(Template argT, String mime) {
		// Set the content headers for the response
		response.setCharacterEncoding(OUTPUT_ENCODING);
		response.setContentType(mime);

		// Merge context into the page template and write to output stream
		try {
			OutputStreamWriter osw = new OutputStreamWriter(response.getOutputStream(), OUTPUT_ENCODING);
			try {
				argT.merge(getContext(), osw);
				osw.flush();
			} finally {
				osw.close();
			}
      this.servlet.log("Display template is finished: " + argT.getName());
		} catch (Exception e) {
			throw new RuntimeException(e);
		}
	}
	
	protected String applyTemplate(Template argT) {
		StringWriter writer = new StringWriter();
        argT.merge( getContext(), writer );
        return writer.toString();
	}
	
	protected String applyHtmlTemplate(Template argT) {
		return applyTemplate(argT);
	}

	/**
	 * Display a template with the XML mime type
	 * @param argT
	 */
	protected void displayHtmlTemplate(Template argT) {
		displayTemplate(argT, "text/html");
	}
  
  protected void displayError(String sMsg) {
    this.getContext().put("errormessage", sMsg);
    this.displayHtmlTemplate(this.templateMan.getTemplate("error"));
  }

	/**
   * processRequest 
   * 
	 * Calls the completeRequest and logRequest implementations
	 */
	final public void processRequest() {
    // Initialize the user id and the user okay
    this.sUserId = servlet.getUserId();
    this.bUserOkay = servlet.getUserOkay(this.sUserId);
    // Get a possible new language
    String sNewLng = this.request.getParameter("lang");
    // Possibly adapt the currently stored language
    if (sNewLng != null && !sNewLng.isEmpty()) {
      // Add it here
      this.lang = sNewLng;
      // Also add it to the current user
      servlet.setUserLang(sUserId, sNewLng);
    } else {
      sNewLng = servlet.getUserLang(sUserId);
      // If this is not empty...
      if (sNewLng != null && !sNewLng.isEmpty())
        this.lang = sNewLng;
    }
      
    // Get the locale from the request
		this.locale = request.getLocale();
		// OLD: this.lang = this.request.getParameter("lang");
		try {
			this.servlet.log("("+this.getClass()+
              ", user=["+sUserId+","+bUserOkay+"]"+
              ", patt="+this.getParameter("query", "")+") Start memory usage: "+this.servlet.getCurrentMemUsage());
		} catch (MalformedObjectNameException | AttributeNotFoundException | InstanceNotFoundException | MBeanException | ReflectionException e) {
			e.printStackTrace();
		}
		
    try {
      if (this.lang != null && !this.lang.equals(this.locale)) {
        this.locale = new Locale(this.lang);
      } else if (this.lang == null) {
        this.lang = this.locale.getLanguage();
      }
      this.labels = ResourceBundle.getBundle("CrpstudioBundle", this.locale);

      this.getContext().put("lang", this.lang);
      this.getContext().put("labels", this.labels);

      logRequest();

      this.params = getQueryParameters();
      if (this.params.keySet().size() > 0)
        this.servlet.log("Query parameters given: "+StringUtil.join(params.keySet().toArray(),", "));

      completeRequest();
    } catch (Exception ex) {
      logger.DoError("BaseResponse.processRequest error", ex);
			ex.printStackTrace();
    }
	}
  
  /**
   * processQueryResponse
   *    Process the response of /crpp/exe or /crpp/statusq
   *    The responses are treated the same way
   * 
   * @param sResp   The JSON string response received from /crpp/exe or /crpp/statusq
   * @param output  We add to the output map for our caller
   */
  public void processQueryResponse(String sResp, Map<String,Object> output) {
    JSONObject oStat = null;
    JSONObject oContent = null;
    String sMsg = "(undefined)";
    try {
            // Interpret the response: expecting a JSON string with "status", "content"
      JSONObject oResp = new JSONObject(sResp);
      if (!oResp.has("status")) { 
        sMsg = "processQueryResponse: /crpp does not return status";
        oStat = new JSONObject(); oStat.put("code", "error"); oStat.put("message", sMsg);
        output.put("status", oStat);
        output.put("error", sMsg); 
        return;
      }
      // Decypher the status
      oStat = oResp.getJSONObject("status");
      // Transfer the status
      output.put("status", oStat);
      if (oResp.has("content")) {
        oContent = oResp.getJSONObject("content");
        // Possibly add some more content
        if (oStat.getString("code").equals("completed")) {
          // Yes, try to get some more content
          oContent.put("prjlist", getProjectInfo(this.sUserId));
          if (oContent.has("query")) {
            // try to get the CRP name from the 'query' object
            JSONObject oQuery = new JSONObject(oContent.getString("query"));
            this.sCrpName = oQuery.getString("crp");
          }
          String sRecent = getProjectItem(this.sCrpName, this.sUserId, "crp-recent");
          logger.debug("crp=["+this.sCrpName+"] user=["+this.sUserId+"] RECENT="+sRecent);
          oContent.put("recent", sRecent);
        }
        if (oContent.has("message")) 
          sMsg = oContent.getString("message");
        else if (oStat.has("message")) {
          sMsg = oStat.getString("message");
          oContent.put("message", sMsg);
        }
        output.put("content", oContent);
      }
      // Put the userid separately in the output string we return
      output.put("userid", this.sUserId);
      
      // Further action depends on the status code we received
      switch (oStat.getString("code")) {
        case "error":
          logger.DoError("processQueryResponse: /crpp returns error: "+sMsg);
          output.put("error", sMsg);
          oStat.put("message", sMsg);
          output.put("status", oStat);
          break;
        case "completed":
          // If the job is already completed, then we need to pass on the results: "table"
          if (oContent != null && oContent.has("table")) {
            // There really is a table in the output
            JSONArray arTable = oContent.getJSONArray("table");
            output.put("table",arTable);
            sJobId = servlet.getUserJob();
            output.put("jobid", sJobId );
          } else {
            // We have received no content, or content without a table - bad...
            output.put("table", "");
            output.put("error", "No table found");
            oStat.put("code", "error"); output.put("status", oStat);
          }
          break;
        case "started":
          // Get the jobid
          sJobId = oStat.getString("jobid");
          servlet.setUserJob(sJobId);
          output.put("jobid", sJobId );
          break;
        case "working":
          // Get the jobid (now stored in the content part)
          sJobId = oContent.getString("jobid");
          servlet.setUserJob(sJobId);
          output.put("jobid", sJobId );
          break;
        default:
          output.put("error", "Undefined /crpp status code: ["+oStat.getString("code")+"]");
          break;
      }
    } catch (Exception ex) {
      logger.DoError("BaseResponse.processQueryResponse error", ex);
    }
  }

  /**
   * processUpdateResponse
   *    Process the response of /crpp/update
   *    The responses are treated the same way
   * 
   * @param sResp   The JSON string response received from /crpp/update
   * @param output  We add to the output map for our caller
   */
  public void processUpdateResponse(String sResp, Map<String,Object> output) {
    JSONObject oStat = null;
    JSONObject oContent =null;
    JSONArray arContent = null;
    String sMsg = "(undefined)";
    try {
      // Interpret the response: expecting a JSON string with "status", "content"
      JSONObject oResp = new JSONObject(sResp);
      if (!oResp.has("status")) { output.put("error", "processUpdateResponse: /crpp does not return status"); return;}
      // Decypher the status
      oStat = oResp.getJSONObject("status");
      // Transfer the status
      output.put("status", oStat);
      // Put the userid separately in the output string we return
      output.put("userid", this.sUserId);
      
      // Further action depends on the status code we received
      switch (oStat.getString("code")) {
        case "error":
          // Check if there is an error message inside 'content'
          if (oResp.has("content")) {
            oContent = oResp.getJSONObject("content");
            if (oContent.has("message")) sMsg = oContent.getString("message");
            // Return the "content" object...
            output.put("content", oContent);
          }
          logger.DoError("processUpdateResponse: /crpp returns error: "+sMsg);
          output.put("error", sMsg);
          break;
        case "completed":
          // If the job is already completed, then we need to pass on the results
          // The results are the JSONArray stored in "content"
          // Each item in the JSONArray is a JSONObject.
          // Obligatory members:
          //    n:    number of this hit
          //    file: file in which this hit occurred (including extension)
          //    locs: sentence id of the hit
          //    locw: constituent id of the hit
          // Optional member:
          //    msg:  CRP-determined user output
          // Type-dependent members:
          //    type="hits"
          //      pre:  text preceding the hit (in hit sentence)
          //      hit:  text of the hit
          //      fol:  text following the hit (in hit sentence)
          //    type="context"
          //      pre:  text preceding the hit (preceding sentences + part of hit sentence)
          //      hit:  text of the hit
          //      fol:  text following the hit (hit sentence + following sentences)
          //    type="syntax"
          //      all:  JSON object with syntax of the whole clause
          //      hit:  JSON object with syntax of the "hit" constituent
          //      NOTE: an example of 'all' + 'hit' is given at the bottom of this page
          //    type="svg"
          //      all:  SVG object with syntax of the whole clause
          //      hit:  SVG object with syntax of the "hit" constituent
          if (oResp.has("content")) {
            arContent = oResp.getJSONArray("content");
            output.put("content", arContent);
            // Also store the contents for future "export" use
            this.servlet.setUpdateContent(arContent);
          } else {
            output.put("error", "No content found");
            oStat.put("code", "error"); output.put("status", oStat);
          }
          break;
        default:
          output.put("error", "Undefined /crpp status code for processUpdateResponse: ["+oStat.getString("code")+"]");
          break;
      }
    } catch (Exception ex) {
      logger.DoError("BaseResponse.processUpdateResponse error", ex);
    }
  }

	/**
	 * Returns the value of a servlet parameter, or the default value
	 *
	 * @param name
	 *            name of the parameter
	 * @param defaultValue
	 *            default value
	 * @return value of the paramater
	 */
	public String getParameter(String name, String defaultValue) {
		// get the trimmed parameter value
		String value = request.getParameter(name);

		if(value != null) {
			value = value.trim();

			// if the parameter value is an empty string
			if (value.length() == 0)
				value = defaultValue;
		} else {
			value = defaultValue;
		}

		return value;
	}

	/**
	 * Returns the value of a servlet parameter, or the default value
	 *
	 * @param name
	 *            name of the parameter
	 * @param defaultValue
	 *            default value
	 * @return value of the paramater
	 */
	public int getParameter(String name, int defaultValue) {
		final String stringToParse = getParameter(name, "" + defaultValue);
		try {
			return Integer.parseInt(stringToParse);
		} catch (NumberFormatException e) {
			return defaultValue;
		}
	}

	public String[] getParameterValues(String name, String defaultValue) {
		String[] values = this.request.getParameterValues(name);

		if(values == null)
//			logger.debug("No values found for label "+name);
			values = new String[]{};

		return values;
	}

	public List<String> getParameterValuesAsList(String name, String defaultValue) {
		return Arrays.asList(getParameterValues(name, defaultValue));
	}

	/**
	 * Returns the value of a servlet parameter, or the default value
	 *
	 * @param name
	 *            name of the parameter
	 * @param defaultValue
	 *            default value
	 * @return value of the paramater
	 */
	public boolean getParameter(String name, boolean defaultValue) {
		return getParameter(name, defaultValue ? "on" : "").equals("on");
	}
	public Integer getParameter(String name, Integer defaultValue) {
		final String stringToParse = getParameter(name, "" + defaultValue);

		return new Integer(stringToParse);
	}


	protected String loadStylesheet(String name) throws IOException {
		// clear string builder
		StringBuilder builder = new StringBuilder();
		builder.delete(0, builder.length());

		BufferedReader br = new BufferedReader(new FileReader(this.servlet.getRealPath() + "WEB-INF/stylesheets/" + name ));

		String line;
		
		this.servlet.log("Loading stylesheet: "+name);

		// read the response from the webservice
		while( (line = br.readLine()) != null )
			builder.append(line);

		br.close();

		return builder.toString();
	}

  /**
   * getCorpusMetaInfo
   *    Get all necessary metadata information related to 
   *    the corpora stored in crp-info.json
   * 
   * @return        JSONObject with information parts
   */
  protected JSONArray getCorpusMetaInfo() {
		SortedSet<String> filters = new TreeSet<>();
		Map<String,String> options = new HashMap<>();
    JSONArray arBack = new JSONArray();
    
    try {
      // Get the total array
      JSONArray arAll = servlet.getMetavarStart();
      // Find the section for this corpus
      for (int i=0;i<arAll.length();i++) {
        // Get this entry
        JSONObject oMetaSet = arAll.getJSONObject(i);
        // Get the name of this corpus
        String sMetaSet = oMetaSet.getString("name");
        // Start preparing this object
        JSONObject oBack = new JSONObject();
        oBack.put("metavarset", sMetaSet);
        // Get the array of variables
        JSONArray arVar = oMetaSet.getJSONArray("variables");
        // Walk all the variables
        for (int j=0;j<arVar.length();j++) {
          // Get this object
          JSONObject oVar = arVar.getJSONObject(j);
          // Get the name and description
          String sFieldName = oVar.getString("name");
          String sFieldDescr = oVar.getString("descr");
          // Tend to filter
          filters.add(sFieldName);
          // Generate option HTML
          String option = "<option value=\"field:"+sFieldName+"\">"+sFieldDescr+"</option>";
          options.put(sFieldName, option);
        }

        // Start creating the metaRule
        String rule = "<div class=\"rule row large-16 medium-16 small-16\">"
          + "<div class=\"large-4 medium-4 small-4 columns\">"
          + "<select class=\"metaLabel\">"
          + "<option value=\"\" disabled=\"true\" selected=\"true\"></option>";

        Iterator<String> it = filters.iterator();
        while (it.hasNext()) {
          rule = rule + options.get(it.next());
        }

        rule = rule + "</select>"
          + "</div>"
          + "<div class=\"large-3 medium-3 small-3 columns\">"
          + "<select class=\"metaOperator\">"
          + "<option value=\"is\" selected=\"true\">"+this.labels.getString("meta.is")+"</option>"
          + "<option value=\"not\">"+this.labels.getString("meta.not")+"</option>"
          + "<option value=\"match\">"+this.labels.getString("meta.match")+"</option>"
          + "<option value=\"nmatch\">"+this.labels.getString("meta.nmatch")+"</option>"
          + "<option value=\"lt\">"+this.labels.getString("meta.lt")+"</option>"
          + "<option value=\"lte\">"+this.labels.getString("meta.lte")+"</option>"
          + "<option value=\"gt\">"+this.labels.getString("meta.gt")+"</option>"
          + "<option value=\"gte\">"+this.labels.getString("meta.gte")+"</option>"
          + "</select>"
          + "</div>"
          + "<div class=\"large-7 medium-7 small-7 columns\">"
          + "<input class=\"metaInput\" type=\"text\">"
          + "</div>"
          + "<div class=\"large-2 medium-2 small-2 columns\">"
          + "<a class=\"meta-min\" onclick=\"crpstudio.input.removeRule(this)\">"
          + "<img src=\"./static/img/minus.png\">"
          + "</a>"
          + "<a class=\"meta-plus\" onclick=\"crpstudio.input.addRule()\">"
          + "<img src=\"./static/img/plus.png\">"
          + "</a>"
          + "</div>"
          + "</div>";

        // Add the metaRule and the filters
        oBack.put("metaRule", rule);
        oBack.put("filters", filters);
          
        // Add this line in the array
        arBack.put(oBack);
      }
      
      // Return the result
      return arBack;
    } catch (Exception ex) {
      logger.DoError("BaseResponse.getCorpusMetaInfo error", ex);
      return arBack;
    }
  }
  
  /**
   * loadMetaDataComponents
   *    Create a blueprint for the input selection that is dependent upon meta data 
   *    The input selection also depends on the corpus.
   *    Solution: 
   *    - use one set per corpus
   *    - pass on *all* sets to the requester
   * 
   */
	protected void loadMetaDataComponents() {
		Map<String,String> options = new HashMap<>();
		Map<String,String> selectFields = new HashMap<>();
		SortedSet<String> filters = new TreeSet<>();
		Map<String,String> filterIds = new HashMap<>();
			
		for (MetadataField dataField : this.servlet.getMetadataFields()) {
			
			//Get display name for field
			String fieldName = dataField.getName();
			if (this.labels.containsKey("metadataFields."+fieldName))
				fieldName = this.labels.getString("metadataFields."+fieldName);
			
			filters.add(fieldName);
			filterIds.put(fieldName, dataField.getName());
			
			//Generate option HTML
			String option = "<option value=\"field:"+dataField.getName()+"\">"+fieldName+"</option>";
			options.put(fieldName, option);
			
			if (dataField.numberOfValues() > 0) {
				
				List<String> vals = new ArrayList<String>();
				Map<String,String> fdOptions = new HashMap<String,String>();
				for (String value : dataField.getValues()) {
					vals.add(value);
					fdOptions.put(value, "<option value=\""+value+"\">"+value+"</option>");
				}

				String select = "<select class=\"metaInput\"><option value=\"\" selected></option>";
				SortedSet<String> keys = new TreeSet<String>(vals);
				for (String fieldValue : keys) {
					select = select+fdOptions.get(fieldValue);
				}
				if (!dataField.isComplete())
					select = select+"<option value=\"other\">"+this.labels.getString("other")+"</option>";
				
				select = select+"</select>";
				selectFields.put(dataField.getName(), select);
			} else {
				String select = "<input class=\"metaInput\" type=\"text\" />";
				selectFields.put(dataField.getName(), select);
			}
		}
		
		String rule = "<div class=\"rule row large-16 medium-16 small-16\">"
			+ "<div class=\"large-4 medium-4 small-4 columns\">"
			+ "<select class=\"metaLabel\">"
			+ "<option value=\"\" disabled=\"true\" selected=\"true\"></option>";
		
		Iterator<String> it = filters.iterator();
		while (it.hasNext()) {
			rule = rule + options.get(it.next());
		}
			
		rule = rule + "</select>"
			+ "</div>"
			+ "<div class=\"large-3 medium-3 small-3 columns\">"
			+ "<select class=\"metaOperator\">"
			+ "<option value=\"is\" selected=\"true\">"+this.labels.getString("meta.is")+"</option>"
			+ "<option value=\"not\">"+this.labels.getString("meta.not")+"</option>"
			+ "</select>"
			+ "</div>"
			+ "<div class=\"large-7 medium-7 small-7 columns\">"
			+ "<input class=\"metaInput\" type=\"text\">"
			+ "</div>"
			+ "<div class=\"large-2 medium-2 small-2 columns\">"
			+ "<a class=\"meta-min\" onclick=\"crpstudio.input.removeRule(this)\">"
			+ "<img src=\"./static/img/minus.png\">"
			+ "</a>"
			+ "<a class=\"meta-plus\" onclick=\"crpstudio.input.addRule()\">"
			+ "<img src=\"./static/img/plus.png\">"
			+ "</a>"
			+ "</div>"
			+ "</div>";

		this.getContext().put("metaRule", rule);
		this.getContext().put("filters", filters);
		this.getContext().put("filterIds", filterIds);
		this.getContext().put("metaOptions",options);
		this.getContext().put("metaSelect",selectFields);
	}

  /**
   * sendErrorResponse
   *    Send a response to the caller containing three parameters:
   *    status  - JSON object containing code "error"
   *    content - JSON object containing code and message
   *    error   - the same error message as above
   * 
   * @param sMsg 
   */
  public void sendErrorResponse(String sMsg) {
    Map<String,Object> output = new HashMap<String,Object>();
    JSONObject oStat = new JSONObject();
    JSONObject oCont = new JSONObject();
    // Prepare the JSON objects for status and content
    oStat.put("code", "error");
    oCont.put("code", "error");
    oCont.put("message", sMsg);
    // Prepare the output parameters
    output.put("status",oStat);
    output.put("content", oCont);
    output.put("error", sMsg);
    // Send the response
    sendResponse(output);
  }
  
  /**
   * sendStandardResponse
   *    Send a response to the caller containing three parameters:
   *    status  - JSON object containing status code
   *    content - JSON object containing message and actual content
   * 
   * @param sStatus   - status code (started, completed, working)
   * @param sMsg      - status message (may be empty)
   * @param oContent  - the actual content to the caller
   */
  protected void sendStandardResponse(String sStatus, String sMsg, JSONObject oContent) {
    Map<String,Object> output = new HashMap<>();
    JSONObject oStat = new JSONObject();
    // Prepare the JSON objects for status and content
    oStat.put("code", sStatus);
    oContent.put("code", sStatus);
    oContent.put("message", sMsg);
    // Prepare the output parameters
    output.put("status",oStat);
    output.put("content", oContent);
    // Send the response
    sendResponse(output);
  }
  
  /**
   * sendResponse
   *    Send the mapping object @output as a well-formed POST response to 
   *    the calling JavaScript application
   * 
   * @param output 
   */
	protected void sendResponse(Map<String,Object> output) {
		long timePassed = new Date().getTime() - this.startTime;
		try {
			this.servlet.log("("+this.getClass()+", patt="+this.getParameter("query", "")+") End memory usage: "+this.servlet.getCurrentMemUsage()+", execution time: "+timePassed);
		} catch (MalformedObjectNameException | AttributeNotFoundException | InstanceNotFoundException | MBeanException | ReflectionException e) {
			e.printStackTrace();
		}
    output.put("timePassed", timePassed);
		JSONObject resp = new JSONObject();
		try {
			for (String key : output.keySet()) {
				resp.put(key, output.get(key));
			}
			response.setHeader("Access-Control-Allow-Origin", "*");
      response.setHeader("Access-Control-Allow-Methods", "POST");
      response.setHeader("Access-Control-Allow-Headers", "Content-Type");
      response.setHeader("Access-Control-Max-Age", "3600");
			response.setContentType("application/x-javascript; charset=utf-8");
			response.getWriter().write(resp.toString());
			response.getWriter().close();
		} catch (JSONException | IOException e) {
			e.printStackTrace();
		}
	}
	
	protected void sendCsvResponse(String csv) {
    response.setHeader("Access-Control-Allow-Methods", "GET");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    response.setHeader("Access-Control-Max-Age", "3600");
    response.setHeader("Content-Type", "text/csv");
    response.setHeader("Content-Disposition", "attachment;filename=\"file.csv\"");

    BufferedWriter writer;
		try {
			writer = new BufferedWriter(new OutputStreamWriter(response.getOutputStream(), "UTF-8"));
      writer.append(csv);
      writer.flush();
		} catch (IOException e) {
			e.printStackTrace();
		}
	}
	/**
   * sendFileLocResponse
   *    Create a file named [fileName] from the data in [contents]
   *    As soon as "outStream.close()" is issued, the user
   *      is presented with a menu asking  him where he wants to save it
   * 
   * @param contents
   * @param fileName 
   */
	public void sendFileLocResponse(String contents, String fileName, String sView) {
    try {
      String sFileUrl = makeFileLocResponse(contents, fileName);
      if (sFileUrl.isEmpty()) {
        sendErrorResponse("FileLoc: Could not prepare file for download: " + fileName);
      } else {
        // Respond with the URL for this file in the reply
        Map<String,Object> output = new HashMap<String,Object>();
        output.put("file", sFileUrl);
        output.put("view", sView);
        sendResponse(output);
      }
    } catch (Exception ex) {
      ex.printStackTrace();
    }
	}
  
  	/**
   * makeFileLocResponse
   *    Create a file named [fileName] from the data in [contents]
   *    As soon as "outStream.close()" is issued, the user
   *      is presented with a menu asking  him where he wants to save it
   * 
   * @param contents
   * @param fileName 
   */
  public String makeFileLocResponse(String contents, String fileName) {
    String sExportPath = "/files";
    try {
      // Create the file location name
      String sWebRoot = servlet.getRealPath();
      // Test for the rightmost character
      String sRightMost = sWebRoot.substring(sWebRoot.length()-1);
      if (sRightMost.equals("/") || sRightMost.equals("\\"))
        sWebRoot = sWebRoot.substring(0, sWebRoot.length()-1);
      String sFileLoc = FileUtil.nameNormalize(sWebRoot + sExportPath+ fileName);
      // Save the contents to the file
      FileUtil.writeFile(sFileLoc, contents, "utf-8");
      // Check for additional unzipping
      if (sFileLoc.endsWith(".gz")) {
        String sUnzipped = sFileLoc.substring(0, sFileLoc.length()-3);
        FileUtil.decompressGzipFile(sFileLoc, sUnzipped);
        sFileLoc = sUnzipped;
        fileName = fileName.substring(0, fileName.length()-3);
      }
      // Create the URL for this file
      String sFileUrl = "http://" + request.getServerName() + ":"+ 
              request.getServerPort() + servlet.getContextRoot() + sExportPath+ fileName;
      // Return the location
      return sFileUrl;
    } catch (Exception ex) {
      ex.printStackTrace();
      return "";
    }
	}
  
  public static String getCurrentTimeStamp() {
    SimpleDateFormat sdfDate = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");//dd/MM/yyyy
    Date now = new Date();
    String strDate = sdfDate.format(now);
    return strDate;
  }
  
  /**
   * setUserOkay - put the values of userid and userokay in the context
   * 
   * @param sUserId
   * @param bOkay 
   */
  public void setUserOkay(String sUserId, boolean bOkay) {
    // Validate: the user must exist, or else things go wrong
    if (sUserId.isEmpty()) return;
    // There is a non-empty user, so continue
    this.getContext().put("userid", sUserId);
    this.getContext().put("userokay", bOkay ? "true" : "false");
  }
  
  /**
   * getGroupings
   *    Get a list of 'groupings' (=divisions) for the indicated @sUser
   *    These should be available in the /etc/project/{username} section
   * @param sUser
   * @return 
   */
  public JSONArray getGroupings(String sUser) {
    JSONArray arGrpList;
    
    try {
      // Start out with a new empty array
      arGrpList = new JSONArray();
      
      // Check if the user has a file defined
      File fGrpInfo = new File ("/etc/project/"+sUser+"/grp-info.json");
      if (fGrpInfo.exists()) {
        // Read the file into a string
        String sGrouping = (new FileUtil()).readFile(fGrpInfo);
        // Make sure this is a JSON object
        if (sGrouping.startsWith("{")) {
          JSONObject oGroupings = new JSONObject(sGrouping);
          arGrpList = oGroupings.getJSONArray("groupings");
        }
      }
      
      
      // Get the list of Groupings
      return arGrpList;
    } catch (Exception ex) {
      logger.DoError("getGroupings: could not complete", ex);
      return null;
    }
  }

  /**
   * getComparisons
   *    Get a list of 'comparisons'
   * 
   * @return 
   */
  public JSONArray getComparisons() {
    JSONArray arCmpList = null;
    String[] arSymbol = labels.getString("group.cmp.symbol").split(",");
    String[] arName = labels.getString("group.cmp.name").split(",");
    
    try {
      arCmpList = new JSONArray();
      for (int i=0;i<arSymbol.length;i++) {
        JSONObject oOne = new JSONObject();
        oOne.put("symbol", arSymbol[i]);
        oOne.put("name", arName[i]);
        arCmpList.put(oOne);
      }
      // Return the list of Comparisons
      return arCmpList;
    } catch (Exception ex) {
      logger.DoError("getComparisons: could not complete", ex);
      return null;
    }
  }
  
  /**
   * getProjectList -- 
   *    Issue a request to the CRPP to get an overview of the projects
   *    that user @sUser has access to
   * 
   * @param sUser
   * @return -- JSON array of items
   */
  public JSONArray getProjectList(String sUser) {
    try {
      // Check if we already have the CrpList for this user
      JSONArray arCrpList = servlet.getUserCrpList();
      if (arCrpList == null) {
        // Prepare the parameters for this request
        this.params.clear();
        this.params.put("userid", sUser);
        // Get the JSON object from /crpp containing the projects of this user
        String sResp = getCrppResponse("crplist", "", this.params,null);
        // Interpret the response
        JSONObject oResp = new JSONObject(sResp);
        if (!oResp.has("status") || !oResp.has("content") || 
            !oResp.getJSONObject("status").getString("code").equals("completed")) return null;
        // Get the resulting list
        arCrpList = oResp.getJSONArray("content");
        // Add it to the user's store
        servlet.setUserCrpList(arCrpList);
      }
      // Get the list of CRPs
      return arCrpList;

    } catch (Exception ex) {
      logger.DoError("getProjectList: could not complete", ex);
      return null;
    }
  }
  
  /**
   * makeListOfCrps -- Make a list of CRPs and put information about 
   *                   the indicated @sCrpName in it
   * 
   * @param sUser
   * @param crpThis
   * @return 
   */
  public JSONArray makeListOfCrps(String sUser, CorpusResearchProject crpThis) {
    String sProjectName;
    String sFullName;
    
    try {
      JSONArray arCrpList = getProjectList(sUser);
      if (crpThis == null) {
        sFullName = "";
      } else {
        // Find the correct CRP
        sProjectName = crpThis.getName();
        sFullName = sProjectName + ".crpx";
      }
      // Walk the list until we find the @sProjectName
      for (int i=0;i<arCrpList.length(); i++) {
        // Is this the one?
        JSONObject oOneItem = arCrpList.getJSONObject(i);
        // Some items need to be duplicated with different names
        String sOneName = oOneItem.getString("crp").replace(".crpx", "");
        oOneItem.put("Name", sOneName);
        // Language and part may not be specified
        String sLng = ""; String sDir = "";
        if (oOneItem.has("lng")) sLng = oOneItem.getString("lng");
        if (oOneItem.has("dir")) sDir = oOneItem.getString("dir");
        oOneItem.put("Language", sLng);
        oOneItem.put("Part", sDir);
        // Check if this is the 'focus' item
        if (oOneItem.getString("crp").equals(sFullName)) {
          // We found it: put additional information from the CRP here          
          oOneItem.put("Author", crpThis.getAuthor());
          oOneItem.put("ProjectType", crpThis.getProjectType().toLowerCase());
          oOneItem.put("Goal", crpThis.getGoal());
          oOneItem.put("Created", crpThis.getDateCreated());
          oOneItem.put("Changed", crpThis.getDateChanged());
          oOneItem.put("Comments", crpThis.getComments());
          oOneItem.put("DbaseInput", crpThis.getDbaseInput());
        }
        // Put the item back into the list
        arCrpList.put(i, oOneItem);
      }
      // Return the complete list
      return arCrpList;
    } catch (Exception ex) {
      logger.DoError("makeListOfCrps: could not complete", ex);
      return null;
    }
  }
  
  /**
   * setProjectItem
   *    Add the indicated query or definition to the indicated project
   * 
   * @param sCrp      - name of the project to which this item belongs
   * @param sUser     - user id
   * @param sItemName - Name of the item
   * @param sItemText - text of the item (definition or query)
   * @param sItemType - either "definition" or "query" or "dbfeat"
   * @return 
   */
  public int setProjectItem(String sCrp, String sUser, String sItemName, String sItemText, String sItemType) {
    int iItemId = -1;  // Id of added query
    
    try {
      // Access the CRP
      CorpusResearchProject crpRequested = crpContainer.getCrp(this, sCrp, sUser, false);
      // Prepare the text: change newlines
      sItemText = sItemText.replace("\r\n", "\n");
      List<String> lstQueryLine = new ArrayList<>();
      lstQueryLine.addAll(Arrays.asList(sItemText.split("\n")));
      
      // Create a new query item from the text
      JSONObject oQthis = new JSONObject();
      // Get the elements of the new object
      oQthis.put("File", sItemName + ".xq");
      oQthis.put("Name", sItemName);
      oQthis.put("Created", getQpart(lstQueryLine, "Created"));
      oQthis.put("Goal", getQpart(lstQueryLine, "Goal"));
      oQthis.put("Comment", getQpart(lstQueryLine, "Comment"));
      oQthis.put("Text", StringUtil.join(lstQueryLine, "\n"));
      
      // Add the new item
      switch(sItemType) {
        case "query":
          iItemId = crpRequested.addListQueryItem(oQthis);
          break;
        case "definition":
          iItemId = crpRequested.addListDefItem(oQthis);
          break;
        case "dbfeat":
          iItemId = crpRequested.addListDbFeatItem(oQthis);
          break;
      }
      
      // Return success
      return iItemId;
    } catch (Exception ex) {
      logger.DoError("setProjectItem: could not complete", ex);
      return -1;
    }
  }
  
  /**
   * removeProject -- Remove the CRP called @sProjectName belonging to
   *    user @sProjectUser. This involves several steps:
   *    1) Removeal of CRP/User from the crpContainer
   *    2) Deletion of the CRP file stored at /crpstudio
   *    3) Renewal of the CRP userlist
   * 
   * @param sProjectName
   * @param sProjectUser
   * @return 
   */
  public boolean removeProject(String sProjectName, String sProjectUser) {
    try {
      // Remove the CRP from the local /crpstudio server
      File fPrjFile = crpContainer.getCrpFile(sProjectName, sProjectUser);
      if (fPrjFile != null && fPrjFile.exists()) fPrjFile.delete();
      // Remove the CRP from the local /crpstudio container 
      crpContainer.removeCrpInfo(sProjectName, sProjectUser);
      // Remove the CRP from the list in crpUtil
      JSONArray arList = getProjectList(sProjectUser); // servlet.getUserCrpList();
      for (int i=arList.length()-1;i>=0;i--) {
        JSONObject oOneItem = arList.getJSONObject(i);
        String sThisCrp = oOneItem.getString("crp");
        if (sThisCrp.equals(sProjectName) || sThisCrp.equals(sProjectName+".crpx")) {
          // Remove it
          arList.remove(i); break;
        }
      }
      servlet.setUserCrpList(arList); 
      // Return positively
      return true;
    } catch (Exception ex) {
      logger.DoError("removeProject: could not complete", ex);
      return false;
    }
  }
  
  /**
   * getQpart
   *    Look in the provided @lstQline for text between 
   *    <sPart> and </sPart> and return this text
   *    Then delete the line containing this text from the list
   * @param lstQline  - List of string lines
   * @param sPart     - The tag to be looked for
   * @return          - Text between open and close tags
   */
  private String getQpart(List<String> lstQline, String sPart) {
    String sOpen = "<" + sPart + ">";
    String sClose = "</" + sPart + ">";
    
    try {
      List<String> lstRemove = new ArrayList<>();
      for (Iterator<String> iter = lstQline.listIterator(); iter.hasNext(); ) {
      // for (int i=0;i<lstQline.size();i++) {
        String sLine = iter.next();
        // Check if the part is in here
        int iStart = sLine.indexOf(sOpen);
        if (iStart >= 0) {
          iStart += sOpen.length();
          int iEnd = sLine.indexOf(sClose);
          if (iEnd >=0) {
            // Retrieve the part
            String sText = sLine.substring(iStart, iEnd );
            // Remove from the list
            iter.remove();
            // lstQline.remove(sLine);
            // Return the text
            return sText;
          } else {
            // The end is not on this line, so get what we have and iterate on
            String sText = sLine.substring(iStart);
            while (iter.hasNext()) {
              // Get next line
              sLine = iter.next();
              // Check for end mark
              iEnd = sLine.indexOf(sClose);
              if (iEnd <0) {
                // This is not the end, so add the line to what we have
                sText += "\n" + sLine;
                // Remove this line
                iter.remove();
              } else {
                // We have the end!
                sText += "\n" + sLine.substring(0, iEnd);
                // Remove the line
                iter.remove();
                // Return the text we have
                return sText;
              }
            }
          }
        }
      }
      // Failure
      return "";
    } catch (Exception ex) {
      logger.DoError("getQpart: could not complete", ex);
      return "";
    }
  }
  
  /**
   * getProjectQuery
   *    Get the CRP from user sUser and return the query with the indicated name
   * 
   * @param sCrp
   * @param sUser
   * @param sQuery
   * @return 
   */
  public String getProjectQuery(String sCrp, String sUser, String sQuery) {
    try {
      // Access the CRP
      CorpusResearchProject crpRequested = crpContainer.getCrp(this, sCrp, sUser, false);
      // Access the query
      JSONObject oQthis = crpRequested.getListQueryByName(sQuery);
      // Convert into .xq format
      StringBuilder sb = new StringBuilder();
      sb.append("(: <Created>" + oQthis.getString("Created") + "</Created> :)\n");
      sb.append("(: <Goal>" + oQthis.getString("Goal") + "</Goal> :)\n");
      sb.append("(: <Comment>" + oQthis.getString("Comment") + "</Comment> :)\n");
      sb.append(oQthis.getString("Text")).append("\n");
      // Return the result
      return sb.toString();
    } catch (Exception ex) {
      logger.DoError("getProjectQuery: could not complete", ex);
      return null;
    }
  }
  
  /**
   * hasProjectItem
   *    Check if project @sCrp of user @sUser has the item of type @sItemType
   *      which is called @sItemName
   * 
   * @param sCrp
   * @param sUser
   * @param sItemName
   * @param sItemType
   * @return 
   */
  public boolean hasProjectItem(String sCrp, String sUser, String sItemName, String sItemType) {
    JSONObject oItem = null;
    
    try {
      // Access the CRP
      CorpusResearchProject crpRequested = crpContainer.getCrp(this, sCrp, sUser, false);
      // Action depends on type
      switch (sItemType) {
        case "query": oItem = crpRequested.getListQueryByName(sItemName); break;
        case "definition": oItem = crpRequested.getListDefByName(sItemName); break;
        case "dbfeat": oItem = crpRequested.getListDbFeatByName(sItemName); break;
      }
      return (oItem != null);
    } catch (Exception ex) {
      logger.DoError("hasProjectItem: could not complete", ex);
      return false;
    }
  }

  /**
   * getProjectDef
   *    Get the CRP from user sUser and return the definition with the indicated name
   * 
   * @param sCrp
   * @param sUser
   * @param sDef
   * @return 
   */
  public String getProjectDef(String sCrp, String sUser, String sDef) {
    try {
      // Access the CRP
      CorpusResearchProject crpRequested = crpContainer.getCrp(this, sCrp, sUser, false);
      // Access the definition
      JSONObject oDthis = crpRequested.getListDefByName(sDef);
      // Convert into .xq format
      StringBuilder sb = new StringBuilder();
      sb.append("(: <Created>" + oDthis.getString("Created") + "</Created> :)\n");
      sb.append("(: <Goal>" + oDthis.getString("Goal") + "</Goal> :)\n");
      sb.append("(: <Comment>" + oDthis.getString("Comment") + "</Comment> :)\n");
      sb.append(oDthis.getString("Text")).append("\n");
      // Return the result
      return sb.toString();
    } catch (Exception ex) {
      logger.DoError("getProjectDef: could not complete", ex);
      return null;
    }
  }

  /**
   * clearDbaseList -- Allow resetting of database list
   * 
   * @param sUser 
   */
  public void clearDbaseList(String sUser) {
    servlet.setUserDbList(null);
  }
  
  /**
   * getDbaseList -- 
   *    Issue a request to the CRPP to get an overview of the databases
   *    that user @sUser has access to
   * 
   * @param sUser
   * @return -- JSON array of items
   */
  public JSONArray getDbaseList(String sUser) {
    JSONArray arDbNewList = servlet.getUserDbList();
    JSONArray arDbList = null;
    
    try {
      // Check if we already have the dblist for this user
      if (arDbNewList == null) {
        arDbNewList = new JSONArray();
        // Prepare the parameters for this request
        this.params.clear();
        this.params.put("userid", sUser);
        // Get the JSON object from /crpp containing the projects of this user
        String sResp = getCrppResponse("dblist", "", this.params,null);
        // Interpret the response
        JSONObject oResp = new JSONObject(sResp);
        if (!oResp.has("status") || !oResp.has("content") || 
            !oResp.getJSONObject("status").getString("code").equals("completed")) return null;
        // Get the list
        arDbList = oResp.getJSONArray("content");
        // Transform the list
        for (int i=0;i<arDbList.length();i++) {
          // First of all: copy any settings that are already supplied by /crpp/dblist
          JSONObject oDbItem = arDbList.getJSONObject(i);
          // Second: add my own settings
          oDbItem.put("DbaseId", i+1);
          oDbItem.put("Name", oDbItem.getString("dbase"));
          // Add to new list
          arDbNewList.put(oDbItem);
        }
        // Save it for future use
        servlet.setUserDbList(arDbNewList);
      }
      // Get the list of CRPs
      return arDbNewList;

    } catch (Exception ex) {
      logger.DoError("getDbaseList: could not complete", ex);
      return null;
    }
  }
  
  /**
   * getInternalList -- 
   *    Issue a request to the CRPP to get an overview of the definitions
   *    that user @sUser has access to in project @sCrpName
   * 
   * @param sUser     - Id of the user
   * @param sCrpName  - Name of the CRP
   * @param sType     - Kind of list: def, query, qc
   * @return -- JSON array of items
   * @history
   *  1/oct/2015  ERK Created for Java
   */
  public JSONArray getInternalList(String sUser, String sCrpName, String sType) {
    try {
      // Prepare the parameters for this request
      this.params.clear();
      this.params.put("userid", sUser);
      this.params.put("crpname", sCrpName);
      this.params.put("type", sType);
      // Get the JSON object from /crpp containing the projects of this user
      String sResp = getCrppResponse("getlist", "", this.params,null);
      // Interpret the response
      JSONObject oResp = new JSONObject(sResp);
      if (!oResp.has("status") || !oResp.has("content") || 
          !oResp.getJSONObject("status").getString("code").equals("completed")) return null;
      // Get the list of CRPs
      return oResp.getJSONArray("content");

    } catch (Exception ex) {
      logger.DoError("getInternalList: could not complete", ex);
      return null;
    }
  }
  
  /**
   * getDbSettings
   *    Find out what is user-specific for this dbase
   *    E.g. sort column, head column names etc
   * 
   * @param sUser
   * @param sDbName
   * @return 
   */
  public JSONObject getDbSettings(String sUser, String sDbName) {
    try {
      // Get the user settings
      JSONObject oSettings = getUserSettings(sUser);
      if (oSettings == null || !oSettings.has("dbases")) return null;
      JSONArray arDbases = oSettings.getJSONArray("dbases");
      // Find my dbase
      for (int i=0;i<arDbases.length(); i++) {
        JSONObject oDbase = arDbases.getJSONObject(i);
        if (oDbase.getString("dbase").equals(sDbName)) {
          // Return this information
          return oDbase;
        }
      }
      // Getting here means failure
      return null;
    } catch (Exception ex) {
      logger.DoError("getDbSettings: could not complete", ex);
      return null;
    }
  }
  
  /**
   * setDbSettings
   *    Adapt the [dbase] part of the settings for a particular user
   * 
   * @param sUser
   * @param sDbName
   * @param oDbase
   * @return 
   */
  public JSONObject setDbSettings(String sUser, String sDbName, JSONObject oDbase) {
    try {
        // Prepare the parameters for this request
      this.params.clear();
      this.params.put("userid", sUser);
      if (!oDbase.has("name")) oDbase.put("name", sDbName);
      this.params.put("dbase", oDbase);
      // Get the JSON object from /crpp containing the projects of this user
      String sResp = getCrppResponse("settings", "", this.params,null);
      // Interpret the response
      JSONObject oResp = new JSONObject(sResp);
      if (!oResp.has("status") || !oResp.has("content") || 
          !oResp.getJSONObject("status").getString("code").equals("completed")) return null;
      // Get the list of CRPs
      JSONObject oSettings = oResp.getJSONObject("content");
      if (oSettings == null || !oSettings.has("dbases")) return null;
      JSONArray arDbases = oSettings.getJSONArray("dbases");
      // Find my dbase
      for (int i=0;i<arDbases.length(); i++) {
        oDbase = arDbases.getJSONObject(i);
        if (oDbase.getString("dbase").equals(sDbName)) {
          // Return this information
          return oDbase;
        }
      }
      // Getting here means failure
      return null;
    } catch (Exception ex) {
      logger.DoError("setDbSettings: could not complete", ex);
      return null;
    }  
  }
  
  /**
   * getUserSettings
   *    Request the "settings.json" object from the /crpp server
   * 
   * @param sUser
   * @return 
   */
  public JSONObject getUserSettings(String sUser) {
    try {
      // Prepare the parameters for this request
      this.params.clear();
      this.params.put("userid", sUser);
      // Get the JSON object from /crpp containing the projects of this user
      String sResp = getCrppResponse("settings", "", this.params,null);
      // Interpret the response
      JSONObject oResp = new JSONObject(sResp);
      if (!oResp.has("status") || !oResp.has("content") || 
          !oResp.getJSONObject("status").getString("code").equals("completed")) return null;
      // Get the list of CRPs
      return oResp.getJSONObject("content");

    } catch (Exception ex) {
      logger.DoError("getUserSettings: could not complete", ex);
      return null;
    }
  }
  /**
   * getProjectInfo -- 
   *    Issue a request to the CRPP to get an overview of the projects
   *    that user @sUser has access to
   * 
   * @param sUser
   * @return -- HTML string containing a table with projects of this user
   */
  public String getProjectInfo(String sUser) {
    StringBuilder sb = new StringBuilder(); // Put everything into a string builder
    try {
      // Get the list
      JSONArray arCrpList = getProjectList(sUser);

      // Check if anything is defined
      if (arCrpList.length() == 0) {
        // TODO: action if there are no corpus research projects for this user
        //       User must be offered the opportunity to create a new project
        
      } else {
        // The list of CRPs is in a table where each element can be selected
        for (int i = 0 ; i < arCrpList.length(); i++) {
          String sLng = "";
          String sDir = "";
          String sDbase = "";
          // Get this CRP item
          JSONObject oCRP = arCrpList.getJSONObject(i);
          boolean bCrpLoaded = oCRP.getBoolean("loaded");
          // Possibly get lng+dir
          if (oCRP.has("lng")) sLng = oCRP.getString("lng");
          if (oCRP.has("dir")) sDir = oCRP.getString("dir");
          if (oCRP.has("dbase")) sDbase = oCRP.getString("dbase");
          String sOneCrpName = FileIO.getFileNameWithoutExtension(oCRP.getString("crp"));
          sb.append(getProjectItem(sOneCrpName, bCrpLoaded, sLng, sDir, sDbase));
        }
      }
      // Return the string we made
      return sb.toString();
    } catch (Exception ex) {
      logger.DoError("getCorpusInfo: could not complete", ex);
      return "error (getCorpusInfo)";
    }
  }
  
  /**
   * getListItem
   *    Get an item for the 
   * 
   * @param sItemName
   * @param sItemType
   * @return 
   */
  /*
  public String getListItem(String sItemName, String sItemType) {
    try {
      
    } catch (Exception ex) {
      logger.DoError("getListItem: could not complete", ex);
      return "";
    }
  }
  */
  
  /**
   * getProjectItem
   *    Produce one <li> for the project-list
   *    If only the CRP is given, then look in the list to find details
   * 
   * @param sCrp
   * @param bLoaded
   * @param sLng
   * @param sDir
   * @param sDbase
   * @return 
   */
  public String getProjectItem(String sCrp, boolean bLoaded, String sLng, String sDir, String sDbase) {
    String sOneCrpName = sCrp  + ((bLoaded) ? " (loaded)" : "");
    return "<li class='crp_"+sCrp+" crp-available'><a href=\"#\" onclick='crpstudio.project.setProject(this, \""+ 
                  sCrp +"\", \""+sLng+"\", \""+sDir+"\", \""+sDbase+"\")'>" + sOneCrpName + "</a></li>\n";
  }
  public String getProjectItem(String sCrp, String sUser, String sType) {
    try {
      // Possibly adapt [sCrp]
      if (!sCrp.endsWith(".crpx")) sCrp += ".crpx";
      // Get the list
      JSONArray arCrpList = getProjectList(sUser);
      // The list of CRPs is in a table where each element can be selected
      for (int i = 0 ; i < arCrpList.length(); i++) {
        String sLng = "";
        String sDir = "";
        String sDbase = "";
        // Get this CRP item
        JSONObject oCRP = arCrpList.getJSONObject(i);
        boolean bCrpLoaded = oCRP.getBoolean("loaded");
        // Possibly get lng+dir
        if (oCRP.has("lng")) sLng = oCRP.getString("lng");
        if (oCRP.has("dir")) sDir = oCRP.getString("dir");
        // Is this the CRP we are looking for?
        String sOneCrpName = oCRP.getString("crp").toLowerCase();
        // Get any database directly from the CRP
        // This does not work: if (oCRP.has("dbase")) sDbase = oCRP.getString("dbase");
        if (sCrp.toLowerCase().equals(sOneCrpName)) {
          sOneCrpName = FileIO.getFileNameWithoutExtension(sCrp)  + ((bCrpLoaded) ? " (loaded)" : "");
          return "<li class='crp_"+sCrp+" "+sType+" hidden'><a href=\"#\" onclick='crpstudio.project.setProject(this, \""+ 
                  sOneCrpName +"\", \""+sLng+"\", \""+sDir+"\", \""+sDbase+"\")'>" + sOneCrpName + "</a></li>\n";
        }
      }
      // Getting here means we have nothing
      return "";
    } catch (Exception ex) {
      logger.DoError("getProjectItem: could not complete", ex);
      return "error (getProjectItem)";
    }
  }
  
  /**
   * getDbaseSelList --    
   *    Get a list of database selections for the user
   * @param sUser
   * @return -- HTML string containing a table with database information for [dbasesel.vm]
   */
  public String getDbaseSelList(String sUser, String sType) {
    StringBuilder sb = new StringBuilder(); // Put everything into a string builder
    try {
      // Get the list
      JSONArray arDbList = getDbaseList(sUser);

      // Check if anything is defined
      if (arDbList.length() == 0) {
        // TODO: action if there are no corpus research projects for this user
        //       User must be offered the opportunity to create a new project
        
      } else {
        // The first item is a prompt to the user to make a selection
        sb.append("<option class=\"noprefix\" value=\"-\" >(Make a selection)</option>\n");
        // The list of database is in a table where each element can be selected
        for (int i = 0 ; i < arDbList.length(); i++) {
          // Get this database item
          JSONObject oDbase = arDbList.getJSONObject(i);
          // Possibly get lng+dir
          String sLng = (oDbase.has("lng")) ? oDbase.getString("lng") : "[none]";
          String sDir = (oDbase.has("dir")) ? oDbase.getString("dir") : "[none]";
          String sDbase = oDbase.getString("dbase");
          // Set the string to be displayed in the combobox line
          String sShow = sDbase + " (" + sLng + ":" + sDir + ")";
          // Output depends on sType
          switch(sType) {
            case "option":    // Use <option> elements
              // Enter the combobox line
              sb.append("<option class=\"noprefix\" value=\"" + sDbase + 
                      "\" onclick='crpstudio.project.setDbase(\"" + 
                      sDbase + "\", \"" + sLng + "\", \"" + sDir + "\", true)' >" +
                      sShow + "</option>\n");
              break;
            case "checkbox":  // Use <li> elements of type "checkbox"
              // Enter the checkbox line
              String sId = "dbase_id_" + i;
              sb.append("<li><a id=\"" + sId + 
                      "\" href=\"#\" onclick='crpstudio.project.setDbase(\"" + 
                      sDbase + "\", \"" + sLng + "\", \"" + sDir + "\", true)' >" +
                      sShow + "</a></li>\n");
              break;
          }
        }
      }
      // Return the string we made
      return sb.toString();      
    } catch (Exception ex) {
      logger.DoError("getDbaseList: could not complete", ex);
      return "error (getDbaseList)";
    }
  }
  
  /**
   * getDbaseInfo -- Make a request to CRPP for database [sDbName]
   *    owned by user [sUser].
   *    Return the full path of the .xml.gz database
   * 
   * @param sUser
   * @param sDbName
   * @param iStart
   * @param iCount
   * @param sSort
   * @return 
   */
  public JSONObject getDbaseInfo(String sUser, String sDbName, int iStart, 
          int iCount, String sSort) {
    JSONObject oInfo = null;
    
    try {
      // Prepare a download request to /crpp using the correct /dbinfo parameters
      this.params.clear();
      this.params.put("userid", sUser);
      this.params.put("name", sDbName);
      this.params.put("start", iStart);
      this.params.put("count", iCount);
      this.params.put("sort", sSort);
      String sResp = getCrppPostResponse("dbinfo", "", this.params);
      
      // Check the result
      if (sResp.isEmpty() || !sResp.startsWith("{")) sendErrorResponse("Server /crpp gave no valid response on /dbinfo");
      // Convert the response to JSON
      JSONObject oResp = new JSONObject(sResp);
      // Get the status
      if (!oResp.has("status")) sendErrorResponse("Server /crpp gave [status] back");
      // Decypher the status
      JSONObject oStat = oResp.getJSONObject("status");
      if (!oStat.getString("code").equals("completed"))
        sendErrorResponse("Server /crpp returned status: ["+oStat.getString("code")+
                "] and message: [" + oStat.getString("message")+"]");

      // Get the content part
      JSONObject oContent = oResp.getJSONObject("content");
      // Get the General part at any rate
      if (oContent.has("General")) {
        JSONObject oGeneral = oContent.getJSONObject("General");
        // Put in all the elements of general
        oInfo = new JSONObject();
        oInfo.put("ProjectName", oGeneral.getString("ProjectName"));
        oInfo.put("Created", oGeneral.getString("Created"));
        oInfo.put("Language", oGeneral.getString("Language"));
        oInfo.put("Part", oGeneral.getString("Part"));
        oInfo.put("Notes", oGeneral.getString("Notes"));
        oInfo.put("Features", oGeneral.getJSONArray("Features"));
        int iQC = 1;
        if (oInfo.has("QC")) iQC = oGeneral.getInt("QC");
        oInfo.put("QC", iQC);
      }
      // Get results, if there are any
      if (oContent.has("Count") && oContent.has("Results")) {
        // Copy the information
        oInfo.put("count", oContent.getInt("Count"));
        oInfo.put("results", oContent.getJSONArray("Results"));
      }
    
      return oInfo;
    } catch (Exception ex) {
      logger.DoError("getDbaseInfo: could not complete", ex);
      return null;
    }
  }

  /**
   * getDbaseInfo -- Make a request to CRPP for database [sDbName]
   *    owned by user [sUser].
   *    Return the full path of the .xml.gz database
   * 
   * @param sUser
   * @param sDbName
   * @return 
   */
  public JSONObject getDbaseInfo(String sUser, String sDbName) {
    JSONObject oInfo = null;
    
    try {
      // Prepare a download request to /crpp using the correct /dbinfo parameters
      this.params.clear();
      this.params.put("userid", sUser);
      this.params.put("name", sDbName);
      this.params.put("start", -1);
      this.params.put("count", 0);
      String sResp = getCrppPostResponse("dbinfo", "", this.params);
      
      // Check the result
      if (sResp.isEmpty() || !sResp.startsWith("{")) sendErrorResponse("Server /crpp gave no valid response on /dbinfo");
      // Convert the response to JSON
      JSONObject oResp = new JSONObject(sResp);
      // Get the status
      if (!oResp.has("status")) sendErrorResponse("Server /crpp gave [status] back");
      // Decypher the status
      JSONObject oStat = oResp.getJSONObject("status");
      if (!oStat.getString("code").equals("completed"))
        sendErrorResponse("Server /crpp returned status: ["+oStat.getString("code")+
                "] and message: [" + oStat.getString("message")+"]");

      // Get the content part
      JSONObject oContent = oResp.getJSONObject("content");
      if (oContent.has("General")) {
        JSONObject oGeneral = oContent.getJSONObject("General");
        // Put in all the elements of general
        oInfo = new JSONObject();
        oInfo.put("ProjectName", oGeneral.getString("ProjectName"));
        oInfo.put("Created", oGeneral.getString("Created"));
        oInfo.put("Language", oGeneral.getString("Language"));
        oInfo.put("Part", oGeneral.getString("Part"));
        oInfo.put("Notes", oGeneral.getString("Notes"));
        oInfo.put("Features", oGeneral.getJSONArray("Features"));
      }
      if (oContent.has("Size"))
        oInfo.put("Size", oContent.getInt("Size"));
    
      return oInfo;
    } catch (Exception ex) {
      logger.DoError("getDbaseInfo: could not complete", ex);
      return null;
    }
  }
 
  /**
   * getDbaseInfo -- 
   *    Issue a request to the CRPP to get an overview of the databases
   *    that user @sUser has access to
   * 
   * @param sUser
   * @return -- HTML string containing a table with databases of this user
   */
  public String getDbaseInfo(String sUser, boolean bForce) {
    if (bForce) {
      servlet.setUserDbList(null);
    }
    return getDbaseInfo(sUser);
  }
  public String getDbaseInfo(String sUser) {
    StringBuilder sb = new StringBuilder(); // Put everything into a string builder
    try {
      // Get the list
      JSONArray arDbList = getDbaseList(sUser);

      // Check if anything is defined
      if (arDbList.length() == 0) {
        // TODO: action if there are no corpus research projects for this user
        //       User must be offered the opportunity to create a new project
        
      } else {
        // The list of CRPs is in a table where each element can be selected
        for (int i = 0 ; i < arDbList.length(); i++) {
          String sLng = "";
          String sDir = "";
          // Get this database item
          JSONObject oDbase = arDbList.getJSONObject(i);
          // Possibly get lng+dir
          if (oDbase.has("lng")) sLng = oDbase.getString("lng");
          if (oDbase.has("dir")) sDir = oDbase.getString("dir");
          String sOneDbName = FileIO.getFileNameWithoutExtension(oDbase.getString("dbase"));
          sb.append(getDbaseItem(sOneDbName, sUser, "db-available", arDbList));
        }
      }
      // Return the string we made
      return sb.toString();
    } catch (Exception ex) {
      logger.DoError("getDbaseInfo: could not complete", ex);
      return "error (getDbaseInfo)";
    }
  }
  
  /**
   * getDbaseItem
   *    Produce one <li> for the dbase-list
   *    If only the dbase name is given, then look in the list to find details
   * 
   * @param sDbase
   * @param sUser
   * @param sType
   * @return 
   */
  public String getDbaseItem(String sDbase, String sUser, String sType, JSONArray arDbList) {
    try {
      // Possibly adapt [sDbase]
      if (!sDbase.endsWith(".xml")) sDbase += ".xml";
      // Get the list
      if (arDbList == null) arDbList = getDbaseList(sUser);
      // The list of Dbases is in a table where each element can be selected
      for (int i = 0 ; i < arDbList.length(); i++) {
        String sLng = "";
        String sDir = "";
        // Get this CRP item
        JSONObject oDbase = arDbList.getJSONObject(i);
        // Possibly get lng+dir
        if (oDbase.has("lng")) sLng = oDbase.getString("lng");
        if (oDbase.has("dir")) sDir = oDbase.getString("dir");
        String sDbName = oDbase.getString("dbase");
        // Is this the CRP we are looking for?
        if (sDbase.toLowerCase().equals(sDbName.toLowerCase())) {
          return "<li class='db_"+sDbase+" "+sType+"'><a href=\"#\" onclick='crpstudio.dbase.setDbase(this, \""+ 
                  sDbase +"\", \""+sLng+"\", \""+sDir+"\")'>" + sDbase + "</a></li>\n";
        }
      }
      // Getting here means we have nothing
      return "";
    } catch (Exception ex) {
      logger.DoError("getDbaseItem: could not complete", ex);
      return "error (getDbaseItem)";
    }
  }
  
  /**
   * getPrjTypeList
   *    Return an <option> list of selectable prjtype elements
   * 
   * @return 
   */
  public String getPrjTypeList() {
    StringBuilder sb = new StringBuilder(); // Put everything into a string builder

    try {
      // Add a first line
      sb.append("<option value=\"\">(Choose)</option>");
      // Walk through all project types
      ProjType[] arPrjType = ProjType.values();
      for (int i=0;i<arPrjType.length;i++) {
        // Get this project type
        String sPrjType = ProjType.getName(arPrjType[i]).trim();
        // Make sure empty lines are *not* allowed
        if (!sPrjType.equals("")) {
          // Enter the combobox line
          sb.append("<option value=\"" + sPrjType.toLowerCase() + "\"" + 
                  " onclick='crpstudio.project.setPrjType(\"" + sPrjType + "\")' >" +
                  sPrjType + "</option>\n");
        }
      }
      // Return the result
      return sb.toString();
    } catch (Exception ex) {
      logger.DoError("getPrjTypeList: could not complete", ex);
      return "error (getPrjTypeList)";
    }
  }
  
  /**
   * getQryTypeList
   *    Create an <option> list of possible query types that can be created
   * 
   * @return 
   */
  public String getQryTypeList() {
    StringBuilder sb = new StringBuilder(); // Put everything into a string builder

    try {
      // Add a first line
      sb.append("<option value=\"\">(Choose)</option>");
      // Get a list of query type definitions
      LinkedList<QryTypeSpecifier> lstQryType = getQryTypeSpecsList();
      // Walk the list
      for (int i=0;i<lstQryType.size();i++) {
        // Append information on this list
        sb.append("<option value=\""+lstQryType.get(i).getName()+"\">"+lstQryType.get(i).getTitle()+"</option>");
      }

      // Return the result
      return sb.toString();
    } catch (Exception ex) {
      logger.DoError("getQryTypeList: could not complete", ex);
      return "error (getQryTypeList)";
    }
  }
  
  /**
   * getQryPositionList
   *    Create an <option> list of possible query positions that can be chosen
   * 
   * @return 
   */
  public String getQryPositionList() {
    StringBuilder sb = new StringBuilder(); // Put everything into a string builder

    try {
      // Add a first line
      sb.append("<option value=\"\">(Choose)</option>");
      // Get a list of query type definitions
      LinkedList<QryPositionSpecifier> lstQryPosition = getQryPositionSpecsList();
      // Walk the list
      for (int i=0;i<lstQryPosition.size();i++) {
        // Append information on this list
        sb.append("<option value=\""+lstQryPosition.get(i).getName()+"\">"+
                lstQryPosition.get(i).getTitle()+"</option>");
      }

      // Return the result
      return sb.toString();
    } catch (Exception ex) {
      logger.DoError("getQryPositionList: could not complete", ex);
      return "error (getQryPositionList)";
    }
  }
  
  /**
   * getQryUnicityList
   *    Create an <option> list of possible query positions that can be chosen
   * 
   * @return 
   */
  public String getQryUnicityList() {
    StringBuilder sb = new StringBuilder(); // Put everything into a string builder

    try {
      // DO NOT Add a first line -- one option MUST be chosen
      // sb.append("<option value=\"\">(Choose)</option>");
      // Get a list of query type definitions
      LinkedList<QryPositionSpecifier> lstQryUnicity = getQryUnicitySpecsList();
      // Walk the list
      for (int i=0;i<lstQryUnicity.size();i++) {
        // Append information on this list
        sb.append("<option value=\""+lstQryUnicity.get(i).getName()+"\">"+
                lstQryUnicity.get(i).getTitle()+"</option>");
      }

      // Return the result
      return sb.toString();
    } catch (Exception ex) {
      logger.DoError("getQryUnicityList: could not complete", ex);
      return "error (getQryUnicityList)";
    }
  }

  /**
   * getQryRelationList
   *    Create an <option> list of possible query relations that can be chosen
   * 
   * @return 
   */
  public String getQryRelationList() {
    StringBuilder sb = new StringBuilder(); // Put everything into a string builder

    try {
      // Add a first line
      sb.append("<option value=\"\">(Choose)</option>");
      // Get a list of query type definitions
      LinkedList<QryRelationSpecifier> lstQryRelation = getQryRelationSpecsList();
      // Walk the list
      for (int i=0;i<lstQryRelation.size();i++) {
        // Append information on this list
        sb.append("<option value=\""+lstQryRelation.get(i).getName()+"\">"+lstQryRelation.get(i).getTitle()+"</option>");
      }

      // Return the result
      return sb.toString();
    } catch (Exception ex) {
      logger.DoError("getQryRelationList: could not complete", ex);
      return "error (getQryRelationList)";
    }
  }
  
  /**
   * getQueryList
   *    Return an <option> list of selectable query elements
   * 
   * @param prjThis
   * @return 
   */
  public String getQueryList(CorpusResearchProject prjThis) {
    StringBuilder sb = new StringBuilder(); // Put everything into a string builder

    try {
      // Get all the queries for the current CRP
      List<JSONObject> lstQry = prjThis.getListQuery();
      // Add a first line
      sb.append("<option value=\"\">(Choose)</option>");
      // Walk this list
      for (int i=0;i<lstQry.size();i++) {
        // Access this item in the list
        JSONObject oThis = lstQry.get(i);
        // Get the name of this query
        String sQryName = oThis.getString("Name");
        // Enter the combobox line
        sb.append("<option value=\"" + sQryName + "\" >"+sQryName + "</option>\n");
      }
      // Return the result
      return sb.toString();
    } catch (Exception ex) {
      logger.DoError("getQueryList: could not complete", ex);
      return "error (getQueryList)";
    }
  }
  
  /**
   * getCorpusList -- Read the corpus information (which has been read
   *                    from file through CrpUtil) and transform it
   *                    into a list of corpus options (including the parts??)
   * @return -- HTML string containing a table with corpus information
   */
  public String getCorpusList() {
    StringBuilder sb = new StringBuilder(); // Put everything into a string builder
    try {
      // Get the array of corpora
      JSONArray arCorpora = servlet.getCorpora();
      // Check if anything is defined
      if (arCorpora.length() == 0) {
        
      } else {
        // The first item is a prompt to the user to make a selection
        sb.append("<option class=\"noprefix\" value=\"-\" >(Make a selection)</option>\n");
        // Walk all the language entries
        for (int i = 0 ; i < arCorpora.length(); i++) {
          // Get this object
          JSONObject oCorpus = arCorpora.getJSONObject(i);
          // Read the languages from here
          String sLng = oCorpus.getString("lng");
          String sLngName = oCorpus.getString("name");
          // Read the information from the different parts
          JSONArray arPart = oCorpus.getJSONArray("parts");
          // There should be one option for those who want *everything* from one language
          if (arPart.length()>1) {
            // Set the string to be displayed in the combobox line
            String sShow = sLngName + " (" + sLng + ")";
            // SPecifiy the 'value' for this option
            String sValue = sLng + ":";
            // Enter the combobox line
            sb.append("<option class=\"noprefix\" value=\"" + sValue + 
                    "\" onclick='crpstudio.project.setCorpus(\"lng_dir\", \"" + sLng + "\", \"\")' >" +
                    sShow + "</option>\n");
          }
          // Walk all the parts
          for (int j = 0; j< arPart.length(); j++) {
            // Get this part as an object
            JSONObject oPart = arPart.getJSONObject(j);
            // Get the specification of this part
            String sName = oPart.getString("name");
            String sDir = oPart.getString("dir");
            // Set the string to be displayed in the combobox line
            String sShow = sLngName + " (" + sLng + "): " + sName + " (" + sDir + ")";
            // SPecifiy the 'value' for this option
            String sValue = sLng + ":" + sDir;
            // Enter the combobox line
            sb.append("<option class=\"noprefix\" value=\"" + sValue + 
                    "\" onclick='crpstudio.project.setCorpus(\"lng_dir\", \"" + sLng + "\", \""+ sDir + "\")' >" +
                    sShow + "</option>\n");
          }
        }      
      }
      // Return the string we made
      return sb.toString();
    } catch (Exception ex) {
      logger.DoError("getCorpusList: could not complete", ex);
      return "error (getCorpusList)";
    }
  }
  /**
   * getCorpusInfo -- Read the corpus information (which has been read
   *                    from file through CrpUtil) and transform it
   *                    into an HTML table
   * @return -- HTML string containing a table with corpus information
   */
  public String getCorpusInfo() {
    StringBuilder sb = new StringBuilder(); // Put everything into a string builder
    try {
      // Get the array of users
      JSONArray arCorpora = servlet.getCorpora();
      // Check if anything is defined
      if (arCorpora.length() == 0) {
        
      } else {
        // Provide necessary starting div
        sb.append("<div class=\"large-16 medium-16 small-16\">\n"+
                "<div id=\"perhit\" class=\"result-pane tab-pane active lightbg haspadding\">\n"+
                "<div class=\"gradient\"></div>\n");
        // Start a table
        sb.append("<table>\n");
        // Headings of the table
        sb.append("<thead>\n" +
          "<tr class=\"tbl_head\">\n" +
            "<th class=\"tbl_conc_left\">" + labels.getString("corpora.index")+"</th>\n"+
            "<th class=\"tbl_conc_hit\">" + labels.getString("corpora.eth")+"</th>\n"+
            "<th class=\"tbl_conc_right\">" + labels.getString("corpora.name")+"</th>\n"+
            "<th class=\"tbl_lemma\">" + labels.getString("corpora.dir")+"</th>\n"+
            "<th class=\"tbl_pos\">" + labels.getString("corpora.lng")+"</th>\n"+
          "</tr></thead>\n");
        // start table body
        sb.append("<tbody>\n");
        // Check if this user may log in
        for (int i = 0 ; i < arCorpora.length(); i++) {
          // Get this object
          JSONObject oCorpus = arCorpora.getJSONObject(i);
          // Read the languages from here
          String sLng = oCorpus.getString("lng");
          String sLngName = oCorpus.getString("name");
          String sLngEth = oCorpus.getString("eth");
          // Read the information from the different parts
          JSONArray arPart = oCorpus.getJSONArray("parts");
          for (int j = 0; j< arPart.length(); j++) {
            // Get this part as an object
            JSONObject oPart = arPart.getJSONObject(j);
            // Get the specification of this part
            String sName = oPart.getString("name");
            String sDir = oPart.getString("dir");
            String sDescr = oPart.getString("descr");
            String sUrl = oPart.getString("url");
            // Create a line for the table
            String sLinkId = "crp_" + (i+1) + "_" + (j+1);
            sb.append("<tr class=\"concordance\" onclick=\"crpstudio.corpora.showDescr('#" + sLinkId + "');\">\n"+
                    "<td>" + sLng + "</td>"+
                    "<td>" + sLngEth + "</td>"+
                    "<td>" + sName + "</td>"+
                    "<td>" + sDir + "</td>"+
                    "<td>" + sLngName + "</td></tr>\n");
            // Check if downloading is possible for this one
            String sDownLoad = "";
            if (oPart.has("psdx")) 
              sDownLoad += "<br>download: <a href='#' onclick=\"crpstudio.corpora.download('"+
                      oPart.getString("psdx")+"')\">psdx (in .tar.gz)</a>";
            if (oPart.has("folia")) 
              sDownLoad += "<br>download: <a href='#' onclick=\"crpstudio.corpora.download('"+
                      oPart.getString("folia")+"')\">folia (in .tar.gz)</a>";
            sb.append("<tr  class=\"citationrow hidden\">"+
                    "<td colspan='5'><div class=\"collapse inline-concordance\" id=\"" + sLinkId +"\">" + 
                    sDescr + "<br>see: <a href='" + sUrl + "'>"+ sUrl + "</a>"+ sDownLoad +
                    "</div></td></tr>\n");
          }
        }      
        // Finish table
        sb.append("</tbody></table>\n");
        // Finish div
        sb.append("</div></div>\n");
      }
      // Return the string we made
      return sb.toString();
    } catch (Exception ex) {
      logger.DoError("getCorpusInfo: could not complete", ex);
      return "error (getCorpusInfo)";
    }
  }
  
  /**
   * makeMetaVarList
   *    Convert the list of meta-variables into a list with id's
   * 
   * @return 
   */
  public boolean makeMetaVarList() {
    int iMtvId = 0;    // Unique identifier per metavar section
    
    try {
      // Get the array of corpora
      JSONArray arStart = servlet.getMetavarStart();
      JSONArray arBack = new JSONArray();
      // Validate
      if (arStart == null) return false;
      // Walk the list
      for (int i = 0 ; i < arStart.length(); i++) { 
        // Get this object
        JSONObject oStart = arStart.getJSONObject(i);  
        String sMtvName = oStart.getString("name");
        // Create new id
        iMtvId += 1; int iVarId = 0;
        // Get and walk the variables 
        JSONArray arVar = oStart.getJSONArray("variables");
        for (int j=0;j<arVar.length();j++) {
          JSONObject oVar = arVar.getJSONObject(j);
          // Add all needed information
          iVarId += 1;
          oVar.put("MtvId", iMtvId);
          oVar.put("VarId", iVarId);
          oVar.put("mtvName", sMtvName);
          // Put the result into an array
          arBack.put(oVar);
          // NOTE: each item now has the following members:
          //       MtvId, VarId, mtvName, name, descr, loc, value
        }
        // Put the resulting array back
        servlet.setMetavars(arBack);
      }
      // Return success
      return true;
    } catch (Exception ex) {
      logger.DoError("makeMetaVarList: could not complete", ex);
      return false;
    }
  }
  
  /**
   * makeCorpusParts
   *    If the list of corpora (servlet.getCorpora) has not been 
   *      transformed into a list of corpus-parts, then do this now
   * 
   * @return 
   */
  public boolean makeCorpusParts() {
    int iCorpusId = 0;    // Unique identifier per corpus-part
    
    try {
      // Get the array of corpora
      JSONArray arCorpora = servlet.getCorpora();
      // Validate
      if (arCorpora == null) return false;
      // Get the corpus parts
      JSONArray arCorpusParts = servlet.getCorpusParts();
      // Check if it has been made already
      if (arCorpusParts == null) {
        // Create a new array
        arCorpusParts = new JSONArray();
        // Walk the list of corpora
        for (int i = 0 ; i < arCorpora.length(); i++) {
          // Get this object
          JSONObject oCorpus = arCorpora.getJSONObject(i);
          // Read the languages from here
          String sLng = oCorpus.getString("lng");
          String sLngName = oCorpus.getString("name");
          String sLngEth = oCorpus.getString("eth");
          // Read the information from the different parts
          JSONArray arPart = oCorpus.getJSONArray("parts");
          for (int j = 0; j< arPart.length(); j++) {
            // Get this part as an object
            JSONObject oPart = arPart.getJSONObject(j);
            // Get the specification of this part
            String sName = oPart.getString("name");
            String sDir = oPart.getString("dir");
            String sDescr = oPart.getString("descr");
            String sUrl = oPart.getString("url");
            // Create an object with all the information of this corpus-part
            JSONObject oCorpusPart = new JSONObject();
            iCorpusId +=1;
            oCorpusPart.put("CorpusId", iCorpusId);
            oCorpusPart.put("lng", sLng);
            oCorpusPart.put("lngName", sLngName);
            oCorpusPart.put("lngEth", sLngEth);
            oCorpusPart.put("part", sName);
            oCorpusPart.put("dir", sDir);
            oCorpusPart.put("descr", sDescr);
            oCorpusPart.put("url", sUrl);
            String sMetaVar = "";
            if (oPart.has("metavar")) sMetaVar = oPart.getString("metavar");
            oCorpusPart.put("metavar", sMetaVar);
            // Add this to the corpus-parts list
            arCorpusParts.put(oCorpusPart);
          }
        }
        // Set the corpus parts array we made
        servlet.setCorpusParts(arCorpusParts);
      }
      // Return success
      return true;
    } catch (Exception ex) {
      logger.DoError("makeCorpusParts: could not complete", ex);
      return false;
    }
  }

  /**
   * getTabSpecsList
   *    Make a list of tab-specification for the results page
   * 
   * @return 
   */
  public LinkedList<TabSpecifier> getTabSpecsList() {
    LinkedList<TabSpecifier> tabs = new LinkedList<>();
    String[] fields = labels.getString("result.tab.names").split(",");
    for (int i=0;i<fields.length;i++) {
      TabSpecifier tabThis = new TabSpecifier(fields[i].trim(), i+1);
      tabs.add(tabThis);
    }
    // Return the result
    return(tabs);
  }
  
  /**
   * getExploreSpecsList
   *    Make a list of explorer side-nav-specification for the "projects" sub pages
   * 
   * @return 
   */
  public LinkedList<ExploreSpecifier> getExploreSpecsList() {
    LinkedList<ExploreSpecifier> tabs = new LinkedList<>();
    String[] arTitle = labels.getString("explore.tab.title").split(",");
    String[] arName = labels.getString("explore.tab.names").split(",");
    String[] arAbbr = labels.getString("explore.tab.abbr").split(",");
    String[] arSection = labels.getString("explore.tab.section").split(",");
    for (int i=0;i<arName.length;i++) {
      ExploreSpecifier tabThis = new ExploreSpecifier(arTitle[i].trim(), arName[i].trim(), arAbbr[i].trim(), arSection[i].trim());
      tabs.add(tabThis);
    }
    // Return the result
    return(tabs);
  }
  
  /**
   * getQryTypeSpecsList
   *    Make a list of query type specifications
   * 
   * @return 
   */
  public LinkedList<QryTypeSpecifier> getQryTypeSpecsList() {
    LinkedList<QryTypeSpecifier> tabs = new LinkedList<>();
    String[] arTitle = labels.getString("query.type.title").split(",");
    String[] arName = labels.getString("query.type.name").split(",");
    for (int i=0;i<arName.length;i++) {
      QryTypeSpecifier tabThis = new QryTypeSpecifier(arTitle[i].trim(), arName[i].trim());
      tabs.add(tabThis);
    }
    // Return the result
    return(tabs);
  }
  
  /**
   * getQryPositionSpecsList
   *    Make a list of query position specifications
   * 
   * @return 
   */
  public LinkedList<QryPositionSpecifier> getQryPositionSpecsList() {
    LinkedList<QryPositionSpecifier> tabs = new LinkedList<>();
    String[] arTitle = labels.getString("query.position.title").split(",");
    String[] arName = labels.getString("query.position.name").split(",");
    String[] arDef = labels.getString("query.position.def").split(",");
    for (int i=0;i<arName.length;i++) {
      QryPositionSpecifier tabThis = new QryPositionSpecifier(arTitle[i].trim(), arName[i].trim(), arDef[i].trim());
      tabs.add(tabThis);
    }
    // Return the result
    return(tabs);
  }
  
  /**
   * getQryUnicitySpecsList
   *    Make a list of query unicity specifications
   * 
   * @return 
   */
  public LinkedList<QryPositionSpecifier> getQryUnicitySpecsList() {
    LinkedList<QryPositionSpecifier> tabs = new LinkedList<>();
    String[] arTitle = labels.getString("query.unicity.title").split(",");
    String[] arName = labels.getString("query.unicity.name").split(",");
    String[] arDef = labels.getString("query.unicity.def").split(",");
    for (int i=0;i<arName.length;i++) {
      QryPositionSpecifier tabThis = new QryPositionSpecifier(arTitle[i].trim(), arName[i].trim(), arDef[i].trim());
      tabs.add(tabThis);
    }
    // Return the result
    return(tabs);
  }
  
    /**
   * getQryRelationSpecsList
   *    Make a list of query relation specifications
   * 
   * @return 
   */
  public LinkedList<QryRelationSpecifier> getQryRelationSpecsList() {
    LinkedList<QryRelationSpecifier> tabs = new LinkedList<>();
    String[] arTitle = labels.getString("query.relation.title").split(",");
    String[] arName = labels.getString("query.relation.name").split(",");
    for (int i=0;i<arName.length;i++) {
      QryRelationSpecifier tabThis = new QryRelationSpecifier(arTitle[i].trim(), arName[i].trim());
      tabs.add(tabThis);
    }
    // Return the result
    return(tabs);
  }
  
  
	/**
	 * Complete the request - automatically called by processRequest()
	 */
	abstract protected void completeRequest();

	/**
	 * Log the request - automatically called by processRequest()
	 */
	abstract protected void logRequest();

  /**
   * Provide a duplicate -- implemented by the actual response
   * 
   * @return a clone of the response
   */
	abstract public BaseResponse duplicate();

  /* ======================= EXAMPLE of 'all' and 'hit' JSON object ============
      "all": {
        "main": "IP-MAT",
        "children": [
          { "pos": "ADVP-TMP",  "txt": "Þa"},
          { "pos": "VBDI",      "txt": "cwædon"},
          { "pos": "NP-NOM",    "txt": "þa apostolas"},
          { "pos": "PP",        "txt": "to þæm folce"},
          { "pos": ",",         "txt": ","},
          { "pos": "IP-MAT-SPE","txt": "Heo biđ swiþor gestrangod be us tweonum þurh Drihtnes gehat"}
        ]
      },
      "hit": {
        "main": "IP-MAT-SPE",
        "children": [
          { "pos": "NP-NOM",  "txt": "Heo"},
          { "pos": "BEPI",    "txt": "biđ"},
          { "pos": "ADVP",    "txt": "swiþor"},
          { "pos": "VBN",     "txt": "gestrangod"},
          { "pos": "PP",      "txt": "be us tweonum"},
          { "pos": "PP",      "txt": "þurh Drihtnes gehat"}
        ]
      }  
  ============================================================================== */
  
  /**
   * getUserFile  -- Retrieve or create a UserFile object
   * 
   * @param sUserId   -- User responsible for uploading this file
   * @param sFilename -- Name of this file
   * @param iTotal    -- Total number of chunks for this file
   * @param oErr      -- ErrHandle object
   * @return 
   */
  public UserFile getUserFile(String sUserId, String sFilename, int iTotal, ErrHandle oErr) {
    UserFile oThis = null;
    try {
      // Walk the list
      for (int i=0;i<lUserFile.size();i++) {
        if (lUserFile.get(i).name.equals(sFilename)) {
          // Found it!
          oThis = lUserFile.get(i);
          return oThis;
        }
      }
      // Haven't found it: add it
      oThis = new UserFile(sUserId, sFilename, iTotal, oErr);
      synchronized(lUserFile) {
        lUserFile.add(oThis);
      }
      // Return what we found
      return oThis;
    } catch (Exception ex) {
      logger.DoError("getUserFile: could not complete", ex);
      return null;
    }
  }
  
  /**
   * isMultiPart -- Check if a Http request is multi-part or not
   * 
   * @param request
   * @return 
   */
  public boolean isMultiPart(HttpServletRequest request) {
    try {
      // Check if we have a multi-part upload
      return (request.getContentType() != null && 
              request.getContentType().toLowerCase().contains("multipart/form-data") );
    } catch (Exception ex) {
      logger.DoError("isMultiPart:", ex);
      return false;
    }
  }
  
}
