// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SwapToken {
    address payable contractOwner;
    uint256 public fee ;
    mapping (address => mapping(address => uint256)) public RateOfTokenPair;
    event TokenSwapEvent(address _fromToken, address _toToken, uint256 _fromAmount, uint256 _toAmount);  
    event ChangeRateEvent(address _fromToken, address _toToken, uint256 _rate);
    event ChangeFeeEvent(address _contractAddress, uint256 _fee);
    event AddTokenIntoContract(address _fromToken, address _toToken, uint256 _rate);

    constructor() {
        contractOwner = payable(msg.sender);
        fee = 0.001 ether;
    }

    modifier onlyOwner {
        require(msg.sender == address(contractOwner), "Only owner can call this function");
        _;
    }

    function addToken(address _fromToken, address _toToken, uint256 _rate) public onlyOwner {
        require(_rate > 0, "Rate must be greater than 0");
        require(_fromToken != _toToken, "fromToken must be different from toToken");
        require(RateOfTokenPair[_fromToken][_toToken] == 0, "Token pair already exists");
        RateOfTokenPair[_fromToken][_toToken] = _rate;
        emit AddTokenIntoContract(_fromToken, _toToken, _rate);
    }
    function setRate(address _fromToken, address _toToken, uint256 rate) public onlyOwner {
        RateOfTokenPair[_fromToken][_toToken] = rate;
        emit ChangeRateEvent(_fromToken, _toToken, rate);
    }
    
    function getRate(address _fromToken, address _toToken) public view returns (uint256) {
        return RateOfTokenPair[_fromToken][_toToken];
    }

    function setFee(uint256 _fee) public onlyOwner {
        fee = _fee;
        emit ChangeFeeEvent(address(this), _fee);
    }

    function swapToken(address _fromToken, address _toToken, uint256 _amount) public payable {
        require(_amount > 0, "Amount must be greater than 0");
        require(RateOfTokenPair[_fromToken][_toToken] != 0 || RateOfTokenPair[_toToken][_fromToken] != 0, "Token pair does not exist in contract");

        //transfer fromToken to contract
        HandleAmountFrom(_fromToken, _amount);

        //calculate received amount of toToken
        uint256 amountTo = calcAmountTo(_fromToken, _toToken, _amount);

        //transfer received amount to msg.sender 
        HandleAmountTo(_toToken, amountTo);
        
        emit TokenSwapEvent(_fromToken, _toToken, _amount, amountTo);
    }

    function HandleAmountFrom(address _fromToken, uint256 _amount) internal {
        if(_fromToken == address(0)) {
            require(msg.value == fee + _amount, "Need to pay amount fee to swap token");
            return;
        }
        require(msg.value == fee, "Need to pay amount fee to swap token");
        require(ERC20(_fromToken).allowance(msg.sender, address(this)) >= _amount, "Account can not have allowance fromToken to contract");
        require(ERC20(_fromToken).transferFrom(msg.sender, address(this), _amount),"Transfer fromToken to contract failed");
    }

    function GetDecimalsOfTokens(address _fromToken, address _toToken) public view returns (uint256, uint256) {
        uint256 fromTokenDecimal = (_fromToken == address(0)) ? 18 : ERC20(_fromToken).decimals();
        uint256 toTokenDecimal = (_toToken == address(0)) ? 18 : ERC20(_toToken).decimals();
        return (fromTokenDecimal, toTokenDecimal);
    }
    
    function HandleAmountTo(address _toToken, uint256 _amount) internal {
        if (_toToken == address(0)) {
            require(address(this).balance >= _amount, "Contract can not have enough ETH to swap");
            (bool sent,) = msg.sender.call{value: _amount}("");
            require(sent, "Error sending native token");
            return;
        } 
        require(ERC20(_toToken).balanceOf(address(this)) >= _amount, "Account can not have enough toToken to swap");
        require(ERC20(_toToken).transfer(msg.sender, _amount),"Transfer contract to msg.sender failed");
    }

    function calcAmountTo(address _fromToken, address _toToken, uint256 _amount) public view returns (uint256){
        (uint256 fromTokenDecimal, uint256 toTokenDecimal) = GetDecimalsOfTokens(_fromToken, _toToken);

        if (RateOfTokenPair[_fromToken][_toToken] != 0) {
            return _amount * RateOfTokenPair[_fromToken][_toToken] * (10 ** toTokenDecimal) / (10 ** fromTokenDecimal) ;
        }
        return _amount * (10 ** toTokenDecimal) / RateOfTokenPair[_toToken][_fromToken] / (10 ** fromTokenDecimal) ;
    }
    
    receive() external payable {}
}