/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
package nl.ru.crpstudio.util;

/**
 * ExploreSpecifier
 *    Specification of one of the explorer side-navs in the "Projects" sub pages
 * 
 * @author Erwin R. Komen
 * @history
 *  7/oct/2015  ERK Created
 */
public class ExploreSpecifier {
  // Local variables
  private String loc_sTitle = "";   // Title (e.g: "Queries")
  private String loc_sName = "";    // Full name (e.g: "query")
  private String loc_sAbbr = "";    // Abbreviation (e.g: "qry")
  private String loc_sSection = ""; // Section (project/corpora)
  // Initialisation of the class
  public ExploreSpecifier(String sTitle, String sName, String sAbbr, String sSection) {
    this.loc_sTitle = sTitle;
    this.loc_sAbbr = sAbbr;
    this.loc_sName = sName;
    this.loc_sSection = sSection;
  }
  // Getters
  public String getAbbr() { return this.loc_sAbbr; }
  public String getName() { return this.loc_sName; }
  public String getTitle() { return this.loc_sTitle; }
  public String getSection() { return this.loc_sSection; }
  public String getLbName(String sKey) { return this.loc_sName + "." + sKey; }
}
