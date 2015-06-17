/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package nl.ru.crpstudio;

import java.util.ArrayList;
import java.util.List;
import javax.servlet.http.HttpServletRequest;
import nl.ru.crpstudio.util.ErrHandle;

/**
 * CrpUtil - utilities to facilitate the work of the CrpStudio main HttpServlet
 * 
 * @author Erwin R. Komen
 */
public class CrpUtil {
  // ============= private variables ==============================
  private ErrHandle logger;
  static List<UserSession> userCache = new ArrayList<>();
  // ============= class instantiation ============================
  public CrpUtil(ErrHandle logger) {
    // Set the error handler correct
    this.logger = logger;    
  }
  
  public void addUserSession(String sUserId, String sSession) {
    // TODO: make sure it is not there (yet)
    // Add the combination to the array
    userCache.add(new UserSession(sUserId, sSession, true));
  }
  public void removeUserSession(String sUserId, String sSession) {
    // Look for the user
    for (int i=0;i<userCache.size();i++) {
      // Get this one
      UserSession oThis = userCache.get(i);
      if (oThis.userId.equals(sUserId) && oThis.sessionId.equals(sSession)) {
        // Set it to false
        oThis.userOkay = false;
        // Reset the session id
        oThis.sessionId = "";
        return;
      }
    }
  }
  public void setUserOkay(String sUserId, String sSession) {
    // Look for the user
    for (int i=0;i<userCache.size();i++) {
      // Get this one
      UserSession oThis = userCache.get(i);
      // TODO: what if the user is there, but with a different session??
      // Check if the combination occurs
      if (oThis.userId.equals(sUserId) && oThis.sessionId.equals(sSession)) {
        // Set it to false
        oThis.userOkay = true;
        return;
      }
    }
    // User was not found, so add it
    addUserSession(sUserId, sSession);
    
  }
  public boolean getUserOkay(String sUserId, String sSession) {
    // Do not accept empty users or empty sessions
    if (sUserId.isEmpty() || sSession.isEmpty()) return false;
    // Look for the user
    for (int i=0;i<userCache.size();i++) {
      // Get this one
      UserSession oThis = userCache.get(i);
      if (oThis.userId.equals(sUserId) && oThis.sessionId.equals(sSession)) {
        // Get the value of the userOkay flag for this user/session combination
        return oThis.userOkay;
      }
    }
    // User was not found, so return failure
    return false;
  }
  public String getUserId(String sSession) {
    // Do not accept empty users or empty sessions
    if (sSession.isEmpty()) return "";
    // Look for the user
    for (int i=0;i<userCache.size();i++) {
      // Get this one
      UserSession oThis = userCache.get(i);
      if (oThis.sessionId.equals(sSession)) {
        // Return the user id of the indicated session
        return oThis.userId;
      }
    }
    // No user was found for this session
    return "";
  }
  
  /**
   * getRequestParts -- divide the requests into its parts
   * 
   * @param request
   * @return string array with all the request parts
   */
  public String[] getRequestParts(HttpServletRequest request) {
    try {
      // Parse the URL
      String servletPath = request.getServletPath();
      // Take care of the null situation (should not occur)
      if (servletPath == null)
        servletPath = "";
      // Remove a starting slash
      if (servletPath.startsWith("/"))
        servletPath = servletPath.substring(1);
      // Remove a possible finishing slash
      if (servletPath.endsWith("/"))
        servletPath = servletPath.substring(0, servletPath.length() - 1);
      // SPlit into a fixed size of three parts
      String[] parts = servletPath.split("/", 3);
      // Return what we have found
      return parts;
    } catch (Exception ex) {
      // Give error message and return empty
      logger.DoError("Could not handle [getRequestParts]", ex);
      return null;
    }
  }
}
class UserSession {
  public String userId;     // ID for this user
  public String sessionId;  // ID of the session for this user
  public boolean userOkay;  // Is this user correctly logged in?
  // TODO: start time of logging in
  public String lngLast;    // Last language corpus used
  public String crpLast;    // Last CRP that has been used
  public UserSession(String sUserId, String sSessionId, boolean bUserOkay) {
    this.userId = sUserId;
    this.sessionId = sSessionId;
    this.userOkay = bUserOkay;
    this.lngLast = "";
    this.crpLast = "";
  }
}

