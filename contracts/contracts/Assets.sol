/// @author Adrià Massanet <adria@codecontext.io>

pragma solidity ^0.4.15;

import "./AclControlled.sol";

interface IAssetsFallback {
    function implements(bytes32 _interface) public returns (bool);
    function onAssetsFallback(uint _serial) public;
}

contract Assets is AclControlled {

    /// --- constants -----------------------------------------------

    bytes constant web3SignaturePrefix = "\x19Ethereum Signed Message:\n32";
    uint constant public ACL_ASSETADMIN = 100;

    /// --- events --------------------------------------------------

    event LogTransfer(uint serial, address from, address to);

    /// --- structures ----------------------------------------------

    struct Asset {
        address owner;         // owner of the object

        uint128 serial;        // serial number of the object
        uint64  class;         // class of object , 1 == membership
        bool    transferable;  // can be transfered

        uint64  caducity;      // unix caducity time        
        string  description;   // description

        bytes32 customAttr1;   // custom attribute, set by  
        bytes32 customAttr2;

        uint64  ownerIndex;
        
    }
    
    /// --- state mutable variables --------------------------------

    Asset[]                  public assets;
    mapping(address=>uint[]) public ownersSerials;
    mapping(address=>uint)   public nonces;

    /// --- public functions ---------------------------------------
    
    function mint(address _owner, uint16 _class, bool _transferable, uint64 _caducity, string _description)
    onlyAcl(ACL_OWNER|ACL_ASSETADMIN) public returns (uint){

        uint128 serial = uint128(assets.length);

        assets.push(Asset({
            owner         : _owner,
            serial        : serial,
            class         : _class,
            transferable  : _transferable,
            caducity      : _caducity,
            description   : _description,
            customAttr1   : 0,
            customAttr2   : 0,
            ownerIndex    : uint64(ownersSerials[_owner].length)
        }));
        
        ownersSerials[_owner].push(serial);

        LogTransfer(serial,0x0,_owner);

        return serial;
    }

    function burn(uint128 _serial) 
    onlyAcl(ACL_BYPASS) public returns (uint){

        require (
            msg.sender == assets[_serial].owner
            || checkAcl(msg.sender,ACL_OWNER|ACL_ASSETADMIN)
        );
        transferInternal(_serial,assets[_serial].owner,0xdead);

    }
    
    function transfer(uint128 _serial, address _to, bool _notify)
    onlyAcl(ACL_BYPASS) public {

        transferInternal(_serial,msg.sender,_to);

        if (_notify && IAssetsFallback(_to).implements(keccak256("IAssetsFallback"))) {
            IAssetsFallback(_to).onAssetsFallback(_serial);
        }
    }
    
    function setCustomAttr1(uint128 _serial, bytes32 _value)
    onlyAcl(ACL_BYPASS) public {

        require(assets[_serial].owner == msg.sender);
        assets[_serial].customAttr1 = _value;

    }

    function setCustomAttr2(uint128 _serial, bytes32 _value)
    onlyAcl(ACL_OWNER|ACL_ASSETADMIN) public {

        require(assets[_serial].owner != 0x0);
        assets[_serial].customAttr2 = _value;

    }
    
    function transferOffchain(uint128 _serial, address _to, uint64 _nonce, uint8 _v, bytes32 _r, bytes32 _s)
    onlyAcl(ACL_BYPASS) public {
        
        bytes32 hash = keccak256(
            address(this),
            Assets(0).transferOffchain.selector,
            uint(_serial),bytes32(_to),uint(_nonce),
            uint(0),uint(0),uint(0)
        );
        
        bytes32 web3hash = keccak256(web3SignaturePrefix, hash);

        address from = ecrecover(web3hash,_v,_r,_s);
        
        require(from != 0x0);
        require(_nonce == nonces[from] + 1);
        
        nonces[from] = _nonce;
        
        transferInternal(_serial, from, _to);
    }
    
    /// --- web3 helpers --------------------------------------------

    function assetCount() public view returns (uint) {
        return assets.length;
    }

    function ownerAssetCount(address _addr) public view returns (uint) {
        return ownersSerials[_addr].length;
    }

    /// --- internal functions --------------------------------------

    event Log(string s, uint v);

    function transferInternal(uint128 _serial, address _from, address _to) internal {
        require ( _from != _to );
        require ( assets[_serial].owner == _from );
        require ( assets[_serial].transferable );

        uint64 assetOwnerIndex = assets[_serial].ownerIndex;

        // safety check if indexes are ok
        assert(assets[ownersSerials[_from][assetOwnerIndex]].serial == _serial);

        /// move last asset of _from owner to the transferred asset
        uint[] storage ownersSerialsFrom = ownersSerials[_from];

        if (ownersSerials[_from].length > 0 ) {
            ownersSerialsFrom[assetOwnerIndex] = ownersSerialsFrom[ownersSerialsFrom.length-1];
            assets[ ownersSerialsFrom[assetOwnerIndex] ].ownerIndex = assetOwnerIndex;
        }
        ownersSerials[_from].length--;

        /// move to their new place
        assets[_serial].owner = _to;
        assets[_serial].ownerIndex = uint64(ownersSerials[_to].length);

        ownersSerials[_to].push(_serial);

        LogTransfer(_serial,_from,_to);

    }
    
}
