/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
package nl.ru.crpstudio.util;

/**
 * QryTypeSpecifier
 *    Specification of one query type
 *
 * @author Erwin R. Komen 
 * @history
 *  19/nov/2015  ERK Created

 */
public class QryTypeSpecifier {
  // Local variables
  private String loc_sTitle = ""; // Title (e.g: "Queries")
  private String loc_sName = "";  // Full name (e.g: "query")
  // Initialisation of the class
  public QryTypeSpecifier(String sTitle, String sName) {
    this.loc_sTitle = sTitle;
    this.loc_sName = sName;
  }
  // Getters
  public String getName()  { return this.loc_sName; }
  public String getTitle() { return this.loc_sTitle; }
}
