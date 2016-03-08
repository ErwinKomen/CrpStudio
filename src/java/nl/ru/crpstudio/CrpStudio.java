/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
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
import java.util.regex.Matcher;
import java.util.regex.Pattern;
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
import nl.ru.crpstudio.crp.CrpContainer;
import nl.ru.crpstudio.response.*;
import nl.ru.crpstudio.util.*;
import nl.ru.util.ByRef;
import nl.ru.util.LogUtil;
import nl.ru.util.json.*;
import org.apache.log4j.Level;
import org.w3c.dom.Document;
import org.xml.sax.InputSource;

/**
 * CrpStudio - Provide a servlet for the CorpusStudio web edition
 *             Main entry point for the CrpStudio UI component
 * 
 * Note: the acceptable / commands are determined by web.xml
 * 
 * @author Erwin R. Komen
 */
/* @WebServlet(name = "crpsw", 
            urlPatterns = {"/home", "/error", "/about"}) */
public class CrpStudio extends HttpServlet {
  // ===================== Accessible by outsiders ===================
  public static String LOGGER_NAME = "CrpStudioLogger"; // Change here: also in velocity.properties
  // ===================== Persistent between users/sessions =========

  // ===================== Static variables ==========================
  private static ErrHandle errHandle = null;
  private static CrpContainer crpContainer;   // Link to the CRP-User list manager
  // ===================== Local variables ===========================
	private String realPath = "";
  // private Logger logger;
	// private Map<String, Template> templates = new HashMap<>();
	private Map<String, BaseResponse> responses = new HashMap<>();
	private List<MetadataField> filterFields = null;
	private LinkedList<FieldDescriptor> searchFields = null;
  private List<String> lngIndices = null;
  private JSONArray objCorpora = null;
  private JSONArray objCorpusParts = null;
  private JSONArray objMetavarStart = null;   // Initial list
  private JSONArray objConstituents = null;   // List of [constituents] from crp-info.json
  private JSONArray objMetavar = null;        // List containing id's
	private String contextRoot;
  private TemplateManager templateMan;
  private CrpUtil crpUtil;
  private String sUserId = "";
  private boolean bUserOkay = false;
  private String sRequestMethod = ""; // Which method is used to approach us?
  private String sSessionId = "";
  private JSONArray arUpdateContent = null;
  private final Pattern VALID_EMAIL_ADDRESS_REGEX = 
    Pattern.compile("^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,6}$", Pattern.CASE_INSENSITIVE);
  // ====================== Getters and setters ======================
  public String getRealPath() { return realPath; }
  public String getContextRoot() { return contextRoot;}
	public List<MetadataField> getMetadataFields() { return filterFields;}
  public LinkedList<FieldDescriptor> getSearchFields() { return searchFields; }
  public TemplateManager getTemplateManager() {return templateMan;}
  public String getUserId() { return crpUtil.getUserId(sSessionId); }
  public boolean getUserOkay(String sId) {this.bUserOkay = crpUtil.getUserOkay(sId, sSessionId); return bUserOkay; }
  public String getUserLang(String sId) {return crpUtil.getUserLang(sId, sSessionId);}
  public void setUserId(String sId) {if (!sId.isEmpty()) sUserId = sId;}
  public void setUserOkay(String sId, boolean bOkay) {bUserOkay = bOkay; crpUtil.setUserOkay(sId, sSessionId);}
  public void setUserLang(String sId, String sLang) {crpUtil.setUserLang(sId, sSessionId, sLang);}
  public void setUserRemove(String sId) {bUserOkay = false; crpUtil.removeUserSession(sId, sSessionId);}
  public void setUserJob(String sJobId) { crpUtil.setUserJob(sUserId, sSessionId, sJobId);}
  public String getUserJob() { return crpUtil.getUserJob(sUserId, sSessionId);}
  public void setUserDbList(JSONArray aDbList) {crpUtil.setUserList(sUserId, sSessionId, aDbList, "db");}
  public JSONArray getUserDbList() { return crpUtil.getUserList(sUserId, sSessionId, "db");}
  public void setUserCrpList(JSONArray aDbList) {crpUtil.setUserList(sUserId, sSessionId, aDbList, "crp");}
  public JSONArray getUserCrpList() { return crpUtil.getUserList(sUserId, sSessionId, "crp");}
  public void setUserTable(JSONArray aTable) { crpUtil.setUserJob(sUserId, sSessionId, sUserId);}
  public CrpUtil getCrpUtil() {return crpUtil;}
  public ErrHandle getErrHandle() {return errHandle;}
  public JSONArray getCorpora() { return objCorpora;}
  public JSONArray getCorpusParts() { return objCorpusParts;}
  public void setCorpusParts(JSONArray aTable) { objCorpusParts = aTable;}
  public JSONArray getMetavars() { return objMetavar;}
  public void setMetavars(JSONArray aTable) {objMetavar = aTable;}
  public JSONArray getMetavarStart() { return objMetavarStart;}
  public JSONArray getConstituents() { return objConstituents;}
  public String getRequestMethod() { return sRequestMethod;}
  public CrpContainer getCrpContainer() { return crpContainer; }
  public JSONArray getUpdateContent() { return arUpdateContent; }
  public void setUpdateContent(JSONArray aTable) { arUpdateContent = aTable;}
	@Override
  public void log(String msg) {errHandle.debug(msg);}
  
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
      crpContainer = new CrpContainer(errHandle);
    } catch (Exception ex) {
      if (errHandle != null) errHandle.DoError("Class initialisation: ", ex);
    }
  }
  @Override
  public void init(ServletConfig cfg) throws ServletException {
   
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

      responses.put("j_security_check", new LoginResponse());
      responses.put("j_user_new", new NewUserResponse());
      responses.put("about",    new InfoResponse());
      responses.put("corpora",  new CorporaResponse());
      responses.put("crpchg",   new CrpchgResponse());
      responses.put("dbupload", new DbUploadResponse());
      responses.put("download", new DownloadResponse());
      responses.put("error",    new ErrorResponse());
      responses.put("exe",      new ExecuteResponse());
      responses.put("export",   new ExportResponse());
      responses.put("help",     new HelpResponse());
      responses.put("home",     new HomeResponse());
      responses.put("load",     new LoadResponse());
      responses.put("dbases",   new DbasesResponse());
      responses.put("projects", new ProjectsResponse());
      responses.put("remove",   new RemoveResponse());
      responses.put("reset",    new ResetResponse());
      responses.put("statusxq", new StatusResponse());
      responses.put("update",   new UpdateResponse());
      responses.put("upload",   new UploadResponse());
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
    ByRef<String> sMsg = new ByRef("");
		try {
      // Reset errors
      errHandle.clearErr();
      // Get the request that is being made
      String parts[] = crpUtil.getRequestParts(request);
      // The requested index is the first part
      String indexName = parts.length >= 1 ? parts[0] : "";
      // Act on the index that is being requested
      errHandle.debug("MAINSERVLET - Request: "+indexName);
      
      // Get the ID of this session
      sSessionId = request.getSession().getId();
      errHandle.debug("session id = " + sSessionId);

      // Possibly handle a login attempt
      switch (indexName) {
        case "j_security_check":
          // Handle the login stuff
          handleLogin(request);
          // Set the index name to "home"
          indexName = "home";
          break;
        case "j_user_new":
          // Handle attempt to enter new user
          if (handleNewUser(request, sMsg)) {
            // TODO: any code for confirmation of a new user?
          }
          break;
        case "logoff":
          // Handle the logoff stuff
          handleLogoff(request);
          // Set the index name to "home"
          indexName = "home";
          break;
      }
      
      // get corresponding response object
      BaseResponse br;
      
      // Check if this user is logged in or not
      String sThisUser = getUserId();
      boolean bOkay = getUserOkay(sThisUser);

      // Prepare an appropriate response
      if((bOkay|| indexName.equals("j_user_new")) && responses.containsKey(indexName)) {
        errHandle.debug("User ok. Turning to: " + indexName);
        // The request is within our limits, so return the appropriate response
        br = responses.get(indexName).duplicate();
        errHandle.debug("Created response for: " + indexName);
      } else {
        // if there is no corresponding response object
        // take the "home" one as the default one
        br = responses.get("home");
      }
      // Set the user and the okay components
      br.setUserOkay(sThisUser, bOkay);
      
      // Perform the base response init()
      br.init(request, response, this);
      
      // Check if message needs to be added
      if (!sMsg.argValue.isEmpty()) {
        br.setMessage(sMsg.argValue);
      }
      
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
    this.sRequestMethod = "GET";
		processRequest(request, response);
	}

	/*
	 * (non-Javadoc)
	 * @see javax.servlet.http.HttpServlet#doPost(javax.servlet.http.HttpServletRequest, javax.servlet.http.HttpServletResponse)
	 */
	@Override
	protected void doPost(HttpServletRequest request, HttpServletResponse response) {
    this.sRequestMethod = "POST";
		processRequest(request, response);
	}

  
  /**
   * loadIndices -- different tasks:
   *    1 - contact the CRPP engine and check which language indices are available
   *    2 - get the corpora information from the CRPP engine
   *    3 - Get the "labels" used in CrpStudio for the specified sLocale
   * 
   * @author E.R.Komen
   */
  private boolean loadIndices(String sLocale) {
    BaseResponse br = new InfoResponse();
    
    try {
      // Initialisations
      lngIndices = new ArrayList<>();
      // Load the labels for this locale
  		ResourceBundle labels = ResourceBundle.getBundle("CrpstudioBundle", new Locale(sLocale));
      // Contact the CRPP server's /serverinfo request
      // String resp = br.getCrppResponse("serverinfo", "", null, null);

      String resp = getWebServiceResponse(labels.getString("crppUrlInternal") + "/serverinfo");
      // Try and interpret this string as JSON
      if (!resp.isEmpty()) {
        JSONObject oResp = new JSONObject(resp);
        // Get the contents from here
        JSONObject oContent = oResp.getJSONObject("contents");
        // Get the indices from here
        JSONArray arIndices = oContent.getJSONArray("indices");
        // Add all languages to the array
        for (int i=0;i<arIndices.length(); i++) {
          lngIndices.add(arIndices.getString(i));
          // ========= DEBUGGING ================================
          log("loadIndices: " + arIndices.getString(i));
          // ====================================================
        }
        // Retrieve the (string!!) with corpus information from the content
        String sCorpora = oContent.getString("corpora");
        JSONObject oCorpora = new JSONObject(sCorpora);
        objCorpora = oCorpora.getJSONArray("corpora");
        objMetavarStart = oCorpora.getJSONArray("metavar");
        objConstituents = oCorpora.getJSONArray("constituents");
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
   * @return - string containing the current memory usage
   * 
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
  
  /**
   * handleLogin - handle a login attempt by a user
   * 
   */
  public void handleLogin(HttpServletRequest request) {
    ByRef<String> sUserFound = new ByRef("");
    // Find out who is trying to login
    String s_jUserName = request.getParameter("j_username_old");
    String s_jPassWord = request.getParameter("j_password_old");
    // Check if this person is authorized
    if (getLoginAuthorization(s_jUserName, s_jPassWord, sUserFound)) {
      // Okay this person may log in
      this.bUserOkay = true;
      this.sUserId = sUserFound.argValue;
      // Also set it globally
      setUserId(this.sUserId);
      setUserOkay(this.sUserId, this.bUserOkay);
    }
  }
  
  /**
   * handleLogoff -- treat logging off nicely
   * 
   * @param request 
   */
  public void handleLogoff(HttpServletRequest request) {
    // REmove the user/session from the stack
    setUserRemove(this.sUserId);
    // Make sure we have no current user anymore
    this.bUserOkay = false;
    this.sUserId = "";
  }
  
  /**
   * handleNewUser -- accept and process new user
   *    
   * 
   * @param request
   * @param sMsg
   * @return 
   */
  public boolean handleNewUser(HttpServletRequest request, ByRef<String> sMsg) {
    String s_jUserName = "";
    String s_jPassWord = "";
    String s_jEmail = "";
    
    try {
      // Reset message
      sMsg.argValue = "";
      // Collect the JSON from our POST caller
      JSONObject oQuery = new JSONObject(request.getParameter("args"));
      if (!oQuery.has("userid")) { sMsg.argValue="No [userid] given"; return false;}
      if (!oQuery.has("pass"))   { sMsg.argValue="No [pass] given";   return false;}
      if (!oQuery.has("email"))  { sMsg.argValue="No [email] given";  return false;}
      
      // There are three parameters: project, userid, type
      s_jPassWord  = oQuery.getString("pass");
      s_jUserName  = oQuery.getString("userid");
      s_jEmail     = oQuery.getString("email");

      // Validate: all two must be there
      if (s_jPassWord.isEmpty()) { sMsg.argValue="password is empty"; return false;}
      if (s_jUserName.isEmpty()) { sMsg.argValue="username is empty"; return false;} 
      if (!isValidEmailAddress(s_jEmail)) { sMsg.argValue= "email is invalid"; return false;}
      
      // Try set a new user
      if (crpUtil.setUserNew(s_jUserName, s_jPassWord, s_jEmail)) {
        // Okay this person may log in
        this.bUserOkay = true;
        this.sUserId = s_jUserName;
        // Also set it globally
        setUserId(this.sUserId);
        setUserOkay(this.sUserId, this.bUserOkay);
      } else {
        //Cannot add this user: it exists already
        sMsg.argValue = "User already exists";
        return false;
      }
      // Return positively
      return true;
    } catch (Exception ex) {
      // logger.error(e); 
      errHandle.DoError("handleNewUser: ", ex);
      return false;
    }
  }
  
  /**
   * isValidEmailAddress - check if this is a valid email address
   * 
   * @param email
   * @return 
   */
  private boolean isValidEmailAddress(String email) {
    boolean result = true;
    try {
      // String email_regex = "[a-zA-Z]+[a-zA-Z_]+@\\b([a-zA-Z]+.){2}\\b?.[a-zA-Z]+";
      // result = email.matches(email_regex);
      Matcher matcher = VALID_EMAIL_ADDRESS_REGEX .matcher(email);
      result = matcher.find();
    } catch (Exception ex) {
      result = false;
    }
    return result;
  }
/**
   * getLoginAuthorization -- Check the credentials of this user
   * 
   * @param sUser
   * @param sPassword
   * @return 
   */
  private boolean getLoginAuthorization(String sUser, String sPassword, ByRef<String> sUserFound) {
    // Get the array of users
    JSONArray arUser = getCrpUtil().getUsers();
    // Check if this user may log in
    for (int i = 0 ; i < arUser.length(); i++) {
      // Get this object
      JSONObject oUser = arUser.getJSONObject(i);
      // Is this the user?
      if (oUser.get("name").equals(sUser)) {
        // Set the user name
        sUserFound.argValue = sUser;
        // Check the password
        return (oUser.get("password").equals(sPassword));
      }
    }
    // Getting here means we have no authentication
    return false;
  }

}
