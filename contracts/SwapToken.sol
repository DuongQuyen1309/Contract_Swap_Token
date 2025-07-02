// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SwapToken {
    address payable contractOwner;
    mapping (address => mapping(address => uint256)) public tokenPair;
    // mapping (address => mapping(address => bool)) public tokenPairExists;

    event TokenSwapEvent(address _token1, address _token2, uint256 _amountFrom, uint256 _amountTo);  
    event ChangeRateEvent(address _token1, address _token2, uint256 _rate);
    event ChangeFeeEvent(address _contractAddress, uint256 _fee);
    event AddTokenIntoContract(address _token1, address _token2, uint256 _rate);
    constructor() {
        contractOwner = payable(msg.sender);
    }

    modifier onlyOwner {
        require(msg.sender == address(contractOwner), "Only owner can call this function"); //notice
        _;
    }

    function addToken(address _token1, address _token2, uint256 _rate) public onlyOwner {
        require(tokenPair[_token1][_token2] == 0, "Token pair already exists");
        tokenPair[_token1][_token2] = _rate;
        emit AddTokenIntoContract(_token1, _token2, _rate);
    }
    function setRate(address _token1, address _token2, uint256 rate) public onlyOwner {
        tokenPair[_token1][_token2] = rate;
        emit ChangeRateEvent(_token1, _token2, rate);
    }
    
    function getRate(address _token1, address _token2) public view returns (uint256) {
        return tokenPair[_token1][_token2];
    }

    function swapToken(address _fromToken, address _toToken, uint256 _amount) public payable {
        uint256 fee = 0.001 ether; 
        require (msg.value > 0, "Can not swap same token");
        require (tokenPair[_fromToken][_toToken] != 0 || tokenPair[_toToken][_fromToken] != 0, "Not exist");
        require (_amount > 0, "Amount must be greater than 0");
        ERC20 fromToken = ERC20(_fromToken);
        ERC20 toToken = ERC20(_toToken);
        require (fromToken.balanceOf(msg.sender) >= _amount * (10 ** uint256(fromToken.decimals())), "Account can not have enough balance to swap");
        uint256 receivedToken;
        if (tokenPair[_fromToken][_toToken] != 0) {
            receivedToken = _amount * (10 ** uint256(fromToken.decimals())) * tokenPair[_fromToken][_toToken];
        }
        if (tokenPair[_toToken][_fromToken] != 0) {
            receivedToken = _amount * (10 ** uint256(fromToken.decimals())) / tokenPair[_toToken][_fromToken];
        }
        //TODO NOTICE approve
        bool isSuccess = fromToken.approve(address(this), _amount * (10 ** uint256(fromToken.decimals())));
        isSuccess = fromToken.transferFrom(msg.sender, address(this), _amount * (10 ** uint256(fromToken.decimals())));
        isSuccess = toToken.approve(address(this), receivedToken);
        isSuccess = toToken.transferFrom(address(this), msg.sender, receivedToken);
        contractOwner.transfer(fee);
        emit TokenSwapEvent(_fromToken, _toToken, _amount, receivedToken);
    }
}