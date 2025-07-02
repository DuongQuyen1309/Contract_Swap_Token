// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SwapToken {
    address payable contractOwner;
    uint256 fee;
    mapping (address => mapping(address => uint256)) public tokenPair;
    mapping (address => mapping(address => bool)) public tokenPairExists;

    event TokenSwapEvent(address _token1, address _token2, uint256 _amountFrom, uint256 _amountTo);  
    event ChangeRateEvent(address _token1, address _token2, uint256 _rate);
    event ChangeFeeEvent(address _contractAddress, uint256 _fee);
    event AddTokenIntoContract(address _token1, address _token2, uint256 _rate);
    constructor() {
        contractOwner = payable(msg.sender);
        fee = 30;
    }

    modifier onlyOwner {
        require(msg.sender == address(contractOwner), "Only owner can call this function"); //notice
        _;
    }

    function addToken(address _token1, address _token2, uint256 _rate) public onlyOwner {
        require(!tokenPairExists[_token1][_token2], "Token pair already exists");
        tokenPair[_token1][_token2] = _rate;
        tokenPairExists[_token1][_token2] = true;
        emit AddTokenIntoContract(_token1, _token2, _rate);
    }
    function setRate(address _token1, address _token2, uint256 rate) public onlyOwner {
        tokenPair[_token1][_token2] = rate;
        emit ChangeRateEvent(_token1, _token2, rate);
    }

    function setFee(uint256 _fee) public onlyOwner {
        fee = _fee;
        emit ChangeFeeEvent(address(this), fee);
    }
    
    function getRate(address _token1, address _token2) public view returns (uint256) {
        return tokenPair[_token1][_token2];
    }

    function getFee() public view returns (uint256) {
        return fee;
    }

    function swapToken(address _fromToken, address _toToken, uint256 _amount) public {
        require (_amount > 0, "Amount must be greater than 0");
        ERC20 fromToken = ERC20(_fromToken);
        ERC20 toToken = ERC20(_toToken);
        require (fromToken.balanceOf(msg.sender) >= _amount, "Account can not have enough balance to swap");
        uint256 receivedTokenNotFee = _amount * tokenPair[_fromToken][_toToken];
        uint256 swapFee = (receivedTokenNotFee * fee)/100;
        uint256 actualReceivedToken = receivedTokenNotFee - swapFee;
        //TODO NOTICE
        bool isSuccess = fromToken.approve(address(this), _amount);
        isSuccess = fromToken.transferFrom(msg.sender, address(this), _amount );
        isSuccess = toToken.approve(address(this), actualReceivedToken);
        isSuccess = toToken.transferFrom(address(this), msg.sender, actualReceivedToken);
        emit TokenSwapEvent(_fromToken, _toToken, _amount, actualReceivedToken);
    }
    
    // function buyToken1(address _token, uint256 _amount) public payable onlyOwner {
    //     MyToken1 token = MyToken1(_token);
    //     token.buyToken{value: msg.value}(_amount);
    // }
}