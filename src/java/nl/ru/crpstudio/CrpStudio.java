/*
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 */

package nl.ru.crpstudio;

import java.io.IOException;
import java.io.InputStream;
import java.io.StringReader;
import java.lang.management.ManagementFactory;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.ResourceBundle;
import java.util.Set;
import javax.management.AttributeNotFoundException;
import javax.management.InstanceNotFoundException;
import javax.management.MBeanException;
import javax.management.MBeanServer;
import javax.management.MalformedObjectNameException;
import javax.management.ObjectInstance;
import javax.management.ObjectName;
import javax.management.ReflectionException;
import javax.management.openmbean.CompositeData;
import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import nl.ru.crpstudio.response.*;
import nl.ru.crpstudio.util.*;
import nl.ru.util.LogUtil;
import nl.ru.util.json.*;
import org.apache.log4j.Level;
import org.w3c.dom.Document;
import org.xml.sax.InputSource;

/**
 * CrpStudio - Provide a servlet for the CorpusStudio web edition
 *             Main entry point for the CrpStudio UI component
 * 
 * @author Erwin R. Komen
 */
@WebServlet(name = "crpsw", 
            urlPatterns = {"/home", "/error", "/about"})
public class CrpStudio extends HttpServlet {
  // ===================== Accessible by outsiders ===================
  public static String LOGGER_NAME = "CrpStudioLogger"; // Change here: also in velocity.properties
  private static ErrHandle errHandle = null;
  // ===================== Local variables ===========================
	private String realPath = "";
  // private Logger logger;
	// private Map<String, Template> templates = new HashMap<>();
	private Map<String, BaseResponse> responses = new HashMap<>();
	private List<MetadataField> filterFields = null;
	private LinkedList<FieldDescriptor> searchFields = null;
  private List<String> lngIndices = null;
	private String contextRoot;
  private TemplateManager templateMan;
  private CrpUtil crpUtil;
  private String sUserId = "";
  private boolean bUserOkay = false;

  // ====================== Getters and setters ======================
  public String getRealPath() { return realPath; }
	public List<MetadataField> getMetadataFields() { return filterFields;}
  public LinkedList<FieldDescriptor> getSearchFields() { return searchFields; }
  public TemplateManager getTemplateManager() {return templateMan;}
  public String getUserId() { return sUserId; }
  public boolean getUserOkay() {return bUserOkay; }
  public void setUserId(String sId) {sUserId = sId;}
  public void setUserOkay(boolean bOkay) {bUserOkay = bOkay;}
	@Override
  public void log(String msg) {errHandle.debug(msg);}
  
  // ======================= Class initialisations =============================
  /*
  public CrpStudio() {
    try {
      errHandle = new ErrHandle(LOGGER_NAME);
      // Default init if no log4j.properties are found
      LogUtil.initLog4jIfNotAlready(Level.DEBUG);
      // Other initialisations that can take place right away
      crpUtil = new CrpUtil(errHandle);
    } catch (Exception ex) {
      if (errHandle != null) errHandle.DoError("Class initialisation: ", ex);
    }
  } */
  
  /**
   * init -- Initialise the servlet
   * 
   * @throws ServletException 
   */
  @Override
  public void init() throws ServletException {
    InputStream is = null;  // Th config file as input stream
    
    try {
      errHandle = new ErrHandle(LOGGER_NAME);
      // Default init if no log4j.properties are found
      LogUtil.initLog4jIfNotAlready(Level.DEBUG);
      // Log the start of this servlet
      errHandle.debug("Starting CrpStudio...");
      // Perform the standard initilization of the servled I extend
      super.init();
      // Other initialisations that can take place right away
      crpUtil = new CrpUtil(errHandle);
    } catch (Exception ex) {
      if (errHandle != null) errHandle.DoError("Class initialisation: ", ex);
    }
  }
  @Override
  public void init(ServletConfig cfg) throws ServletException {
    /*
    super.init(cfg);  // Initialize our parent
		try {
			log("Initializing CrpStudio, Memory usage: "+getCurrentMemUsage());
		} catch (MalformedObjectNameException | AttributeNotFoundException | InstanceNotFoundException | MBeanException | ReflectionException e1) {
      errHandle.DoError("init (a): " + e1.getMessage());
      e1.printStackTrace();
		} */
    
    try {
      // Perform the 'normal' initialization
      init();
      // Load the language indices using the default locale
      loadIndices("en");

      // Start the template manager
      templateMan = new TemplateManager(cfg, errHandle);

      // Find extracted WAR path
      realPath = cfg.getServletContext().getRealPath("/");

      // Find our context root
      contextRoot = cfg.getServletContext().getContextPath();

      responses.put("home", new HomeResponse());
      responses.put("corpora", new CorporaResponse());
      responses.put("projects", new ProjectsResponse());
      responses.put("error", new ErrorResponse());
      responses.put("about", new InfoResponse());
      responses.put("j_security_check", new LoginResponse());
    } catch (Exception ex) {
      errHandle.DoError("init (b): " + ex.getMessage());
    }

  }

  /**
   * processRequest -- Process a request from a calling routine
   * 
   * @param request
   * @param response 
   */
	private void processRequest(HttpServletRequest request, HttpServletResponse response) {
		try {
      // Get the request that is being made
      String parts[] = crpUtil.getRequestParts(request);
      // The requested index is the first part
      String indexName = parts.length >= 1 ? parts[0] : "";
      // Act on the index that is being requested
      errHandle.debug("MAINSERVLET - Request: "+indexName);
      // get corresponding response object
      BaseResponse br;
      if(responses.containsKey(indexName)) {
        // The request is within our limits, so return the appropriate response
        br = responses.get(indexName).duplicate();
      } else {
        // if there is no corresponding response object
        // take the "home" one as the default one
        br = responses.get("home");
      }

      // Perform the base response init()
      br.init(request, response, this);
      // Process the request using the appropriate response object
      br.processRequest();
    } catch (Exception ex) {
      errHandle.DoError("processRequest: " + ex.getMessage());
    }

	}
	/*
	 * (non-Javadoc)
	 * @see javax.servlet.http.HttpServlet#doGet(javax.servlet.http.HttpServletRequest, javax.servlet.http.HttpServletResponse)
	 */
	@Override
	protected void doGet(HttpServletRequest request, HttpServletResponse response) {
		processRequest(request, response);
	}

	/*
	 * (non-Javadoc)
	 * @see javax.servlet.http.HttpServlet#doPost(javax.servlet.http.HttpServletRequest, javax.servlet.http.HttpServletResponse)
	 */
	@Override
	protected void doPost(HttpServletRequest request, HttpServletResponse response) {
		processRequest(request, response);
	}

  
  /**
   * loadIndices -- contact the CRPP engine and check which language indices are available
   * 
   * @author E.R.Komen
   */
  private boolean loadIndices(String sLocale) {
    try {
      // Initialisations
      lngIndices = new ArrayList<>();
      // Load the labels for this locale
  		ResourceBundle labels = ResourceBundle.getBundle("CrpstudioBundle", new Locale(sLocale));
      // Contact the CRPP server
      String resp = getWebServiceResponse(labels.getString("crppUrlInternal"));
      // Try and interpret this string as JSON
      if (!resp.isEmpty()) {
        JSONObject oResp = new JSONObject(resp);
        // Get the indices from here
        JSONArray arIndices = oResp.getJSONArray("indices");
        // Add all languages to the array
        for (int i=0;i<arIndices.length(); i++) {
          lngIndices.add(arIndices.getString(i));
          // ========= DEBUGGING ================================
          log("loadIndices: " + arIndices.getString(i));
          // ====================================================
        }
      }
      // Return to the caller negatively
      return false;
    } catch (Exception ex) {
      // logger.error(ex);
      errHandle.DoError("loadIndices: " + ex.getMessage());
      ex.printStackTrace();
      return false;
    }
  }
  
  /**
   * getWebServiceResponse -- Issue a request to a web service,
   *                          and then return the response
   * 
   * @param url - The URL to the web service
   * @return 
   */
	protected String getWebServiceResponse(String url) {
		log("URL: "+url);
		
		QueryServiceHandler webservice = new QueryServiceHandler(url, 1);
		try {
			String response = webservice.makeRequest(new HashMap<String, String[]>());
			System.out.println("Response received");
			return response;
		} catch (IOException e) {
			// logger.error(e);
      errHandle.DoError("getWebServiceResponse: " + e.getMessage());
      e.printStackTrace();
		}
		return null;
	}

  
  /**
   * getCurrentMemUsage -- find out what the current memory usage is
   * 
   * @return
   * @throws MalformedObjectNameException
   * @throws AttributeNotFoundException
   * @throws InstanceNotFoundException
   * @throws MBeanException
   * @throws ReflectionException 
   */
	public String getCurrentMemUsage() throws MalformedObjectNameException, AttributeNotFoundException, InstanceNotFoundException, MBeanException, ReflectionException {
		MBeanServer connection = ManagementFactory.getPlatformMBeanServer();
		Set<ObjectInstance> set = connection.queryMBeans(new ObjectName("java.lang:type=Memory"), null);
		ObjectInstance oi = set.iterator().next();
		// replace "HeapMemoryUsage" with "NonHeapMemoryUsage" to get non-heap mem
		Object attrValue = connection.getAttribute(oi.getObjectName(), "HeapMemoryUsage");
		if( !( attrValue instanceof CompositeData ) ) {
		    System.out.println( "attribute value is instanceof [" + attrValue.getClass().getName() +
		            ", exitting -- must be CompositeData." );
		    return "";
		}
		// replace "used" with "max" to get max
		return ((CompositeData)attrValue).get("used").toString();
	}
  
  /**
   * convertStringToDocument -- Given a string (with XML data), convert this into
   *                            a DOM approachable document
   * @param xmlStr
   * @return 
   */
  private static Document convertStringToDocument(String xmlStr) {
    try {  
      DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();  
      DocumentBuilder builder = factory.newDocumentBuilder();  
      Document doc = builder.parse( new InputSource( new StringReader( xmlStr ) ) ); 
      return doc;
    } catch (Exception e) {  
      // logger.error(e); 
      errHandle.DoError("convertStringToDocument: " + e.getMessage());
      e.printStackTrace();
    } 
    return null;
  }

}
