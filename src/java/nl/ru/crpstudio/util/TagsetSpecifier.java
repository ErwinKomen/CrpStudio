/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
package nl.ru.crpstudio.util;

/**
 * TagsetSpecifier
 *    Specification of one named tagset
 *
 * @author Erwin R. Komen 
 * @history
 *  19/nov/2015  ERK Created

 */
public class TagsetSpecifier {
  // Local variables
  private String loc_sTitle = "";   // Title (e.g: "Queries")
  private String loc_sValue = "";   // Full name (e.g: "query")
  private String loc_sTagset = "";  // Name of this tagset
  private String loc_sDesc = "";    // Description
  // Initialisation of the class
  public TagsetSpecifier(String sTagset, String sTagName, String sTagValue, String sTagDescription) {
    this.loc_sTagset = sTagset;
    this.loc_sTitle = sTagName;
    this.loc_sValue = sTagValue;
    this.loc_sDesc = sTagDescription;
  }
  // Getters
  public String getTagset() { return this.loc_sTagset; }
  public String getTitle()  { return this.loc_sTitle; }
  public String getValue()  { return this.loc_sValue; }
  public String getDescr()  { return this.loc_sDesc; }
}
