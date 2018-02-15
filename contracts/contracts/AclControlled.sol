/// @author Adrià Massanet <adria@codecontext.io>

pragma solidity ^0.4.15;

import "./Owned.sol";

contract AclControlled is Owned {

    /// --- constants -----------------------------------------------

    uint constant public ACL_BYPASS = 0; 
    uint constant public ACL_OWNER  = 1; 

    /// --- events --------------------------------------------------

    event AclChanged(address addr, uint acl);

    /// --- structures ----------------------------------------------

    struct AclEntry {
        address addr;
        uint    acl;
    }
    
    /// --- state mutable variables ---------------------------------

    mapping(address => uint) public aclPosByAddr;
    AclEntry[] public aclEntries;
    
    /// --- modifiers -----------------------------------------------

    modifier onlyAcl(uint _mask) { // this is an OR mask
        require(checkAcl(msg.sender,_mask));
        _;
    }

    /// --- public functions ---------------------------------------

    function setAcl(address _addr, uint _acl)
    onlyOwner public {
        
        if (aclPosByAddr[_addr]==0) addAcl(_addr,_acl);
        else if (_acl==0) deleteAcl(_addr,_acl);
        else modifyAcl(_addr,_acl);   

    }

    function aclCount() public view returns (uint) {
        return aclEntries.length;
    }

    function checkAcl(address _addr, uint _mask) public view returns (bool) {

        if ( _mask == ACL_BYPASS ) return true;

        // check if mask contains ACL_OWNER is OK
        if ( (_mask & ACL_OWNER > 0) && _addr==owner) return true;

        // check if mask contains other flags
        if (aclPosByAddr[_addr] == 0  
            || aclEntries[aclPosByAddr[_addr]-1].acl & _mask == 0) {
            return false;
        }

        return true;        
    }

    /// --- private functions ---------------------------------------

    function addAcl(address _addr, uint _acl) private {
        if (_acl != 0) {
            aclEntries.push(AclEntry({addr:_addr,acl:_acl}));
            aclPosByAddr[_addr]=aclEntries.length;
            
            AclChanged(_addr,_acl);
        }
    }

    function deleteAcl(address _addr, uint _acl) private {

        if (aclEntries.length > 1) {
            // move last entry to the deleted entry
            uint deletedEntryPos = aclPosByAddr[_addr]-1;
            AclEntry storage lastEntry = aclEntries[aclEntries.length-1];

            aclEntries[deletedEntryPos] = lastEntry;
            aclPosByAddr[lastEntry.addr] = deletedEntryPos+1;
        }

        // free storage, shrink array, clean deleted item
        delete aclEntries[aclEntries.length-1];
        aclEntries.length--;
        aclPosByAddr[_addr] = 0;

        AclChanged(_addr,_acl);
    }

    function modifyAcl(address _addr, uint _acl) private {
        if (aclEntries[aclPosByAddr[_addr]-1].acl != _acl) {
            aclEntries[aclPosByAddr[_addr]-1].acl = _acl;
            AclChanged(_addr,_acl);
        }
    }

}