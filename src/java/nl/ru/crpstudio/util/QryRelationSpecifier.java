/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
package nl.ru.crpstudio.util;

/**
 * QryRelationSpecifier
 *    Specification of one query relation
 *
 * @author Erwin R. Komen 
 * @history
 *  1/mar/2016  ERK Created

 */
public class QryRelationSpecifier {
  // Local variables
  private String loc_sTitle = ""; // Title (e.g: "Queries")
  private String loc_sName = "";  // Full name (e.g: "query")
  // Initialisation of the class
  public QryRelationSpecifier(String sTitle, String sName) {
    this.loc_sTitle = sTitle;
    this.loc_sName = sName;
  }
  // Getters
  public String getName()  { return this.loc_sName; }
  public String getTitle() { return this.loc_sTitle; }
}
