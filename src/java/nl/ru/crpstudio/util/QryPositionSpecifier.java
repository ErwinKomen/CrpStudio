/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
package nl.ru.crpstudio.util;

/**
 * QryPositionSpecifier
 *    Specification of one position type
 *
 * @author Erwin R. Komen 
 * @history
 *  1/mar/2016  ERK Created

 */
public class QryPositionSpecifier {
  // Local variables
  private String loc_sTitle = ""; // Title (e.g: "Queries")
  private String loc_sName = "";  // Full name (e.g: "query")
  private String loc_sDef = "";   // Definition of position (e.g. "[1]")
  // Initialisation of the class
  public QryPositionSpecifier(String sTitle, String sName, String sDef) {
    this.loc_sTitle = sTitle;
    this.loc_sName = sName;
    this.loc_sDef = sDef;
  }
  // Getters
  public String getName()  { return this.loc_sName; }
  public String getTitle() { return this.loc_sTitle; }
  public String getDef()   { return this.loc_sDef; }
}
