/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package nl.ru.crpstudio.util;

import java.util.HashMap;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.servlet.ServletConfig;
import org.apache.velocity.Template;
import org.apache.velocity.VelocityContext;
import org.apache.velocity.app.Velocity;
import org.apache.velocity.app.VelocityEngine;

/**
 * TemplateManager -- facilitate working with templates
 * 
 * 
 * @author Erwin R. Komen
 */
public class TemplateManager {
  // ============= private constants ==============================
	private final String VELOCITY_PROPERTIES = "/WEB-INF/config/velocity.properties";
  private final String TEMPLATE_EXT = ".vm";
  // ============= private variables ==============================
  private Map<String, Template> templates = new HashMap<>();
	private VelocityContext context;
  private ErrHandle errHandle;
  private VelocityEngine ve;

  // ============= Class initializer ==============================
  public TemplateManager(ServletConfig argConfig, ErrHandle errHandle) {
    try {
      // Set the error handler correct
      this.errHandle = errHandle;
      // Make a machine
      ve = new VelocityEngine();
      // Perform initialisation
      startVelocity(argConfig);
    } catch (Exception ex) {
      errHandle.DoError("Templatemanager: " + ex.getMessage());
      throw new RuntimeException(ex);
    }
  }
  
  // ======================= methods ==============================
	/**
	 * Start the templating engine
	 * @param argConfig the configuration object
	 * @throws Exception
	 */
	private void startVelocity(ServletConfig argConfig) throws Exception {
		try {
      context = new VelocityContext();
      /*
      ve.setProperty( RuntimeConstants.RUNTIME_LOG_LOGSYSTEM_CLASS,
        "org.apache.velocity.runtime.log.Log4JLogChute" );
      */

      ve.setProperty("runtime.log.logsystem.log4j.logger",
                      errHandle.getName());

      ve.setApplicationAttribute("javax.servlet.ServletContext", argConfig.getServletContext());
     ve.init(argConfig.getServletContext().getRealPath(VELOCITY_PROPERTIES));

      // Velocity.init(argConfig.getServletContext().getRealPath(VELOCITY_PROPERTIES));
    } catch (Exception ex) {
      errHandle.DoError("StartVelocity: " + ex.getMessage());
    }
	}
  /**
	 * Get the velocity template
	 * @param argName name of the template
	 * @return velocity template
	 */
	public synchronized Template getTemplate(String argName) {
		argName = argName + TEMPLATE_EXT;

		// if the template exists
		if(ve.resourceExists(argName)) {
			// if the template was already loaded
			if(templates.containsKey(argName)) {
				return templates.get(argName);
			}

			// template wasn't loaded yet - try to load it now
			try {
				// load the template
				Template t = ve.getTemplate(argName, "utf-8");
				// store it
				templates.put(argName, t);
				return t;
			} catch (Exception e) {
				// Something went wrong, we die
        errHandle.DoError("getTemplate: " + e.getMessage());
				throw new RuntimeException(e);
			}

		}

		// The template doesn't exist so we'll display an error page

		// it is important that the error template is available
		// or we'll end up in an infinite loop
		context.put("error", "Unable to find template " + argName);
    errHandle.DoError("TemplateManager/getTemplate: Unable to find template " + argName);
		return getTemplate("error");
	}
	
}
