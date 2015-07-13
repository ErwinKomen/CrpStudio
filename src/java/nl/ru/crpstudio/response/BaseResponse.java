/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
package nl.ru.crpstudio.response;

import java.io.BufferedReader;
import java.io.BufferedWriter;
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
import java.util.HashMap;
import java.util.Iterator;
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
import nl.ru.crpstudio.util.MetadataField;
import nl.ru.crpstudio.util.QueryServiceHandler;
import nl.ru.crpstudio.util.TemplateManager;
import nl.ru.crpx.project.CorpusResearchProject;
import nl.ru.crpx.tools.FileIO;
import nl.ru.util.ByRef;
import nl.ru.util.StringUtil;
import nl.ru.util.json.JSONArray;
import nl.ru.util.json.JSONException;
import nl.ru.util.json.JSONObject;
import static org.apache.commons.lang.StringEscapeUtils.escapeXml;
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

	protected Map<String, Object> getQueryParameters() {
		Map<String, Object> params = new HashMap<String,Object>();
    
    try {
      String query = this.getParameter("query", "");
      query = query.replaceAll("&", "%26");

      int view = this.getParameter("view", 1);

      if (query.length() > 0) {
        try {

          params.put("patt", query);

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
	public String getCrppResponse(String index, String trail, Map<String,Object> params) {
    String parameters = "";
    
    // Take over the parameters
    this.params = params;
    // Are there any parameters?
    if (this.params.size() >0) {
      // Transform the parameters into a JSON object
      JSONObject oParams = new JSONObject();
      for (String sParam : params.keySet()) {
        oParams.put(sParam, params.get(sParam));
      }
      parameters = oParams.toString();
    }
    // Calculate the request URL
		String url = this.labels.getString("crppUrlInternal")+ "/" + index + trail;
    // Keep this URL for reference
		this.lastUrl = url;
    // Calculate the parameter string from [this.params]
		// String parameters = getParameterStringExcept(new String[]{});
		
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
        String response = webservice.postRequest(new HashMap<String, String[]>(), parameters);
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
		this.locale = request.getLocale();
		this.lang = this.request.getParameter("lang");
    // Initialize the user id and the user okay
    this.sUserId = servlet.getUserId();
    this.bUserOkay = servlet.getUserOkay(this.sUserId);
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
      if (!oResp.has("status")) { output.put("error", "processQueryResponse: /crpp does not return status"); return;}
      // Decypher the status
      oStat = oResp.getJSONObject("status");
      // Transfer the status
      output.put("status", oStat);
      if (oResp.has("content")) {
        oContent = oResp.getJSONObject("content");
        output.put("content", oContent);
        if (oContent.has("message")) sMsg = oContent.getString("message");
      }
      // Put the userid separately in the output string we return
      output.put("userid", this.sUserId);
      
      // Further action depends on the status code we received
      switch (oStat.getString("code")) {
        case "error":
          logger.DoError("processQueryResponse: /crpp returns error: "+sMsg);
          output.put("error", sMsg);
          break;
        case "completed":
          // If the job is already completed, then we need to pass on the results: "table"
          if (oContent != null && oContent.has("table")) {
            // There really is a table in the output
            output.put("table",oContent.getJSONArray("table"));
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

	protected void loadMetaDataComponents() {
		Map<String,String> options = new HashMap<String,String>();
		Map<String,String> selectFields = new HashMap<String,String>();
		SortedSet<String> filters = new TreeSet<String>();
		Map<String,String> filterIds = new HashMap<String,String>();
			
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
			+ "<a class=\"meta-min\" onclick=\"Crpstudio.meta.removeRule(this)\">"
			+ "<img src=\"/img/minus.png\">"
			+ "</a>"
			+ "<a class=\"meta-plus\" onclick=\"Crpstudio.meta.addRule()\">"
			+ "<img src=\"/img/plus.png\">"
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
  protected void sendErrorResponse(String sMsg) {
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
    this.getContext().put("userid", sUserId);
    this.getContext().put("userokay", bOkay ? "true" : "false");
  }
  
  /**
   * getProjectList -- 
   *    Issue a request to the CRPP to get an overview of the projects
   *    that user @sUser has access to
   * 
   * @return -- JSON array of items
   */
  public JSONArray getProjectList(String sUser) {
    try {
      // Prepare the parameters for this request
      this.params.clear();
      this.params.put("userid", sUser);
      // Get the JSON object from /crpp containing the projects of this user
      String response = getCrppResponse("crplist", "", this.params);
      // Interpret the response
      JSONObject oResp = new JSONObject(response);
      if (!oResp.has("status") || !oResp.has("content") || 
          !oResp.getJSONObject("status").getString("code").equals("completed")) return null;
      // Get the list of CRPs
      return oResp.getJSONArray("content");

    } catch (Exception ex) {
      logger.DoError("getProjectList: could not complete", ex);
      return null;
    }
  }
  
  /**
   * getProjectInfo -- 
   *    Issue a request to the CRPP to get an overview of the projects
   *    that user @sUser has access to
   * 
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
          // Get this CRP item
          JSONObject oCRP = arCrpList.getJSONObject(i);
          boolean bCrpLoaded = oCRP.getBoolean("loaded");
          String sCrpName = FileIO.getFileNameWithoutExtension(oCRP.getString("crp"));
          sb.append(getProjectItem(sCrpName, bCrpLoaded));
          /*
          String sCrpName = oCRP.getString("crp")  + ((bCrpLoaded) ? " (loaded)" : "");
          sb.append("<li><a href=\"#\" onclick='Crpstudio.project.setProject(this, \""+ 
                  oCRP.getString("crp") +"\")'>" + sCrpName + "</a></li>\n");
          */
        }
      }
      // Return the string we made
      return sb.toString();
    } catch (Exception ex) {
      logger.DoError("getCorpusInfo: could not complete", ex);
      return "error (getCorpusInfo)";
    }
  }
  
  public String getProjectItem(String sCrp, boolean bLoaded) {
    String sCrpName = sCrp  + ((bLoaded) ? " (loaded)" : "");
    return "<li><a href=\"#\" onclick='Crpstudio.project.setProject(this, \""+ 
                  sCrp +"\")'>" + sCrpName + "</a></li>\n";
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
                    "\" onclick='Crpstudio.project.setCorpus(\"" + sLng + "\", \"\")' >" +
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
                    "\" onclick='Crpstudio.project.setCorpus(\"" + sLng + "\", \""+ sDir + "\")' >" +
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

}
