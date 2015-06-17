/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package nl.ru.crpstudio;

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
  // ============= class instantiation ============================
  public CrpUtil(ErrHandle logger) {
    // Set the error handler correct
    this.logger = logger;    
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
