/// @title AclControledText
/// @author Adrià Massanet <adria@codecontext.io>
pragma solidity ^0.4.15;

import "../AclControlled.sol";

contract AclControlledTest is AclControlled {

    uint constant public ACL_A  = 2; 
    uint constant public ACL_B  = 4; 

    function testBypass()
    onlyAcl(ACL_BYPASS) view public {

    } 

    function testOwner()
    onlyAcl(ACL_OWNER) view public {

    } 

    function testOwnerOrA()
    onlyAcl(ACL_OWNER|ACL_A) view  public {

    } 
    function testAorB()
    onlyAcl(ACL_A|ACL_B) view public {

    } 

}