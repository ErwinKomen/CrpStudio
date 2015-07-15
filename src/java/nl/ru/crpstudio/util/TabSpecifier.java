/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package nl.ru.crpstudio.util;

/**
 * TabSpecifier
 *    Specification of one of the tabs in the results page
 * 
 * @author Erwin R. Komen
 */
public class TabSpecifier {
  // Local variables
  private String loc_sName = "";
  private int loc_iNumber = -1;
  // Initialisation of the class
  public TabSpecifier(String sName, int iNumber) {
    this.loc_iNumber = iNumber;
    this.loc_sName = sName;
  }
  // Getters
  public int getView() { return this.loc_iNumber; }
  public String getName() { return this.loc_sName; }
}
