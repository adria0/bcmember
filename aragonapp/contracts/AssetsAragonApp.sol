/// @author Adrià Massanet <adria@codecontext.io>

pragma solidity 0.4.18;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "../../contracts/contracts/Assets.sol";

contract AssetsAragonApp is AragonApp, Assets {

	bytes32 ROLE_ASSETADMIN = bytes32(Assets.ACL_ASSETADMIN);

    // -- override AclControlled.checkAcl
    function checkAcl(address _addr, uint _mask) public view returns (bool) {
    	
    	bool hasPermissions = super.checkAcl(_addr,_mask);

    	if (!hasPermissions && _mask&Assets.ACL_ASSETADMIN==Assets.ACL_ASSETADMIN) {
    		hasPermissions = canPerform(_addr, ROLE_ASSETADMIN, new uint256[](0));
    	}

    	require(hasPermissions);
    }

}
