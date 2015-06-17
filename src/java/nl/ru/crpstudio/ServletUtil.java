/*
 * This software has been developed at the "Meertens Instituut"
 *   for the CLARIN project "CorpusStudio-WebApplication".
 * The application is based on the "CorpusStudio" program written by Erwin R. Komen
 *   while working for the Radboud University Nijmegen.
 * The program and the source can be freely used and re-distributed.
 */
package nl.ru.crpstudio;

import java.io.PrintStream;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.GregorianCalendar;
import java.util.Locale;
import java.util.TimeZone;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import nl.ru.util.ExUtil;

import org.apache.log4j.Logger;

/**
 *
 * @author Erwin R. Komen
 */

public class ServletUtil {
  private static final Logger logger = Logger.getLogger(ServletUtil.class);

  /**
   * Returns the value of a servlet parameter
   * @param request the request object
   * @param name
   *            name of the parameter
   * @return value of the paramater
   */
  private static String getParameter(HttpServletRequest request, String name) {
    return request.getParameter(name);
  }

  /**
   * Returns the value of a servlet parameter, or the default value
   * @param request the request object
   *
   * @param name
   *            name of the parameter
   * @param defaultValue
   *            default value
   * @return value of the paramater
   */
  public static int getParameter(HttpServletRequest request, String name, int defaultValue) {
    final String stringToParse = getParameter(request, name, "" + defaultValue);
    try {
      return Integer.parseInt(stringToParse);
    } catch (NumberFormatException e) {
      logger.info("Could not parse parameter '" + name + "', value '" + stringToParse
                      + "'. Using default (" + defaultValue + ")");
      return defaultValue;
    }
  }

  /**
   * Returns the value of a servlet parameter, or the default value
   * @param request the request object
   *
   * @param name
   *            name of the parameter
   * @param defaultValue
   *            default value
   * @return value of the paramater
   */
  public static boolean getParameter(HttpServletRequest request, String name, boolean defaultValue) {
    String defStr = defaultValue ? "true" : "false";
    String value = getParameter(request, name, defStr);
    if (value.equalsIgnoreCase("true"))
      return true;
    if (value.equalsIgnoreCase("false"))
      return false;

    logger.warn("Illegal value '" + value + "' given for boolean parameter '" + name
                    + "'. Using default (" + defStr + ")");
    return defaultValue;
  }

  /**
   * Returns the value of a servlet parameter, or the default value
   * @param request the request object
   * @param name
   *            name of the parameter
   * @param defaultValue
   *            default value
   * @return value of the paramater
   */
  public static String getParameter(HttpServletRequest request, String name, String defaultValue) {
    String value = getParameter(request, name);
    if (value == null || value.length() == 0)
            value = defaultValue; // default action
    return value;
  }

 
  /**
   * Get a PrintStream for writing the response
   * @param responseObject the response object
   * @return the PrintStream
   */
  public static PrintStream getPrintStream(HttpServletResponse responseObject) {
    try {
      return new PrintStream(responseObject.getOutputStream(), true, "utf-8");
    } catch (Exception e) {
      throw ExUtil.wrapRuntimeException(e);
    }
  }

  /** Output character encoding */
  static final String OUTPUT_ENCODING = "UTF-8";

  /** The HTTP date format, to use for the cache header */
  static DateFormat httpDateFormat;

  // Initialize the HTTP date format
  static {
    httpDateFormat = new SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss z", Locale.US);
    httpDateFormat.setTimeZone(TimeZone.getTimeZone("GMT"));
  }

  public static void writeNoCacheHeaders(HttpServletResponse response) {
    writeCacheHeaders(response, 0);
  }

  /**
   * Write cache headers for the configured cache time.
   * @param response the response object to write the headers to
   * @param cacheTimeSeconds how long to cache the response
   */
  public static void writeCacheHeaders(HttpServletResponse response, int cacheTimeSeconds) {
    if (cacheTimeSeconds > 0) {
      // Cache page for specified time
      GregorianCalendar cal = new GregorianCalendar();
      cal.add(Calendar.SECOND, cacheTimeSeconds);
      String expires;
      synchronized (httpDateFormat) {
        expires = httpDateFormat.format(cal.getTime());
      }
      response.setHeader("Expires", expires);
      response.setHeader("Cache-Control", "PUBLIC, max-age=" + cacheTimeSeconds);
    } else {
      // Don't cache this page
      response.setHeader("Expires", "0");
      response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      response.setHeader("Pragma", "no-cache");
    }
    // Make sure CORS is allowed (for everyeone)
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "POST,GET");
  }


}
