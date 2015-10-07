/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
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
  private String loc_sTitle = ""; // Title (e.g: "Queries")
  private String loc_sName = "";  // Full name (e.g: "query")
  private String loc_sAbbr = "";  // Abbreviation (e.g: "qry")
  // Initialisation of the class
  public ExploreSpecifier(String sTitle, String sName, String sAbbr) {
    this.loc_sTitle = sTitle;
    this.loc_sAbbr = sAbbr;
    this.loc_sName = sName;
  }
  // Getters
  public String getAbbr() { return this.loc_sAbbr; }
  public String getName() { 
    return this.loc_sName; }
  public String getTitle() { 
    return this.loc_sTitle; }
  public String getLbName(String sKey) { return this.loc_sName + "." + sKey; }
}
