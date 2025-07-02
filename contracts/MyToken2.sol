// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken2 is ERC20 { 
    uint256 public tokenPrice;
    uint256 public soldTokens;
    constructor(uint _tokenPrice, uint256 _initialSupply) ERC20("Currency Ranger", "CRG") {
        tokenPrice = _tokenPrice;
        _mint(address(this), _initialSupply * (10 ** uint256(decimals())));
    }
    function buyToken(uint256 numberOfTokens) external payable {
        require(msg.value >= (tokenPrice * numberOfTokens));
        require(this.balanceOf(address(this)) >= numberOfTokens);
        require(this.transfer(msg.sender, numberOfTokens));
        soldTokens += numberOfTokens;
    }
    function getSoldTokens() external view returns (uint256) {
        return soldTokens;
    }
    function transferOut(address to, uint256 amount) external {
    _transfer(address(this), to, amount * (10 ** uint256(decimals())));
}
}