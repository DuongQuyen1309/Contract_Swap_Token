// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SwapToken {
    address payable contractOwner;
    mapping (address => mapping(address => uint256)) public RateOfTokenPair;

    event TokenSwapEvent(address _token1, address _token2, uint256 _amountFrom, uint256 _amountTo);  
    event ChangeRateEvent(address _token1, address _token2, uint256 _rate);
    event ChangeFeeEvent(address _contractAddress, uint256 _fee);
    event AddTokenIntoContract(address _token1, address _token2, uint256 _rate);

    constructor() {
        contractOwner = payable(msg.sender);
    }

    modifier onlyOwner {
        require(msg.sender == address(contractOwner), "Only owner can call this function");
        _;
    }

    function addToken(address _token1, address _token2, uint256 _rate) public onlyOwner {
        require(RateOfTokenPair[_token1][_token2] == 0, "Token pair already exists");
        RateOfTokenPair[_token1][_token2] = _rate;
        emit AddTokenIntoContract(_token1, _token2, _rate);
    }
    function setRate(address _token1, address _token2, uint256 rate) public onlyOwner {
        RateOfTokenPair[_token1][_token2] = rate;
        emit ChangeRateEvent(_token1, _token2, rate);
    }
    
    function getRate(address _token1, address _token2) public view returns (uint256) {
        return RateOfTokenPair[_token1][_token2];
    }

    function swapTokenWithETH(address _fromToken, address _toToken, uint256 _amount) public payable{
        uint256 fee = 0.001 ether; 
        uint256 receivedTokenAmount;
        require(_amount > 0, "Amount must be greater than 0");
        require(RateOfTokenPair[_fromToken][_toToken] != 0 || RateOfTokenPair[_toToken][_fromToken] != 0, "Token pair does not exist in contract");
        if (_fromToken == 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) {
            require (msg.value ==  fee + _amount, "Need to pay amount fee to swap token");
            ERC20 tokenTo = ERC20(_toToken);
            if (RateOfTokenPair[_fromToken][_toToken] != 0) {
                receivedTokenAmount = _amount * RateOfTokenPair[_fromToken][_toToken] / (10 ** uint256(18)) * (10 ** uint256(tokenTo.decimals()));
            }
            if (RateOfTokenPair[_toToken][_fromToken] != 0) {
                receivedTokenAmount = _amount / RateOfTokenPair[_toToken][_fromToken] / (10 ** uint256(18)) * (10 ** uint256(tokenTo.decimals()));
            }
            tokenTo.transfer(msg.sender, receivedTokenAmount);
            contractOwner.transfer(fee);
            emit TokenSwapEvent(_fromToken, _toToken, _amount, receivedTokenAmount);
            return;
        } 
        require (msg.value == fee, "Need to pay amount fee to swap token");
        ERC20 tokenFrom = ERC20(_fromToken);
        if (RateOfTokenPair[_fromToken][_toToken] != 0) {
            receivedTokenAmount = _amount * RateOfTokenPair[_fromToken][_toToken] / (10 ** uint256(tokenFrom.decimals())) * (10 ** uint256(18));
        }
        if (RateOfTokenPair[_toToken][_fromToken] != 0) {
            receivedTokenAmount = _amount / RateOfTokenPair[_toToken][_fromToken] / (10 ** uint256(tokenFrom.decimals())) * (10 ** uint256(18));
        }
        bool isSuccess = tokenFrom.transferFrom(msg.sender, address(this), _amount);
        require(isSuccess, "Transfer fromToken to contract failed");
        payable(msg.sender).transfer(receivedTokenAmount);
        contractOwner.transfer(fee);
        emit TokenSwapEvent(_fromToken, _toToken, _amount, receivedTokenAmount);
        return;
    }

    // need to consider transferFrom
    function swapToken(address _fromToken, address _toToken, uint256 _amount) public payable returns (uint256) {
        uint256 fee = 0.001 ether; 
        require (msg.value == fee, "Need to pay amount fee to swap token");
        require (RateOfTokenPair[_fromToken][_toToken] != 0 || RateOfTokenPair[_toToken][_fromToken] != 0, "Token pair does not exist in contract");
        require (_amount > 0, "Amount must be greater than 0");
        ERC20 fromToken = ERC20(_fromToken);
        ERC20 toToken = ERC20(_toToken);
        require (fromToken.balanceOf(msg.sender) >= _amount, "Account can not have enough balance to swap");
        uint256 receivedTokenAmount;
        if (RateOfTokenPair[_fromToken][_toToken] != 0) {
            receivedTokenAmount = _amount * RateOfTokenPair[_fromToken][_toToken] / (10 ** uint256(fromToken.decimals())) * (10 ** uint256(toToken.decimals()));
        }
        if (RateOfTokenPair[_toToken][_fromToken] != 0) {
            receivedTokenAmount = _amount * (10 ** uint256(toToken.decimals())) / RateOfTokenPair[_toToken][_fromToken] / (10 ** uint256(fromToken.decimals())) ;
        }
        bool isSuccess;
        isSuccess = fromToken.transferFrom(msg.sender, address(this), _amount);
        require(isSuccess, "Transfer fromToken to contract failed");
        isSuccess = toToken.transfer(msg.sender, receivedTokenAmount);
        require(isSuccess, "Transfer contract to msg.sender failed");
        contractOwner.transfer(fee);
        emit TokenSwapEvent(_fromToken, _toToken, _amount, receivedTokenAmount);
        return receivedTokenAmount;
    }
    receive() external payable {}
}