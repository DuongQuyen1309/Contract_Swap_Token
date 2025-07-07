// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract SwapToken {
    using SafeERC20 for IERC20;
    address payable contractOwner;
    uint256 public fee; // currently, I will get fee to call swapToken = native token
    struct Rate {
        uint256 numerator;
        uint256 denominator;
    }
    mapping (address => mapping(address => Rate)) public RateOfTokenPair;
    mapping (address => mapping(address => bool)) public isExists;
    event TokenSwapEvent(address _fromToken, address _toToken, uint256 _fromAmount, uint256 _toAmount);  
    event SetRateEvent(address _fromToken, address _toToken, uint256 _rateOfFrom, uint256 _rateOfTo);
    event ChangeFeeEvent(address _contractAddress, uint256 _fee);

    constructor() {
        contractOwner = payable(msg.sender);
        fee = 0.001 ether;
    }

    modifier onlyOwner {
        require(msg.sender == address(contractOwner), "Only owner can call this function");
        _;
    }
    
    /* I change this function by declare struct Rate with numerator and denominator. Example A-> B is 5. I will
    call function by setRate(_fromAddress, _toAddress, 5, 1);
    */
    function setRate(address _fromToken, address _toToken, uint256 _rateOfFrom, uint256 _rateOfTo) public onlyOwner {
        require(_rateOfFrom > 0 && _rateOfTo > 0 , "Rate must be greater than 0");
        require(_fromToken != _toToken, "From token and to token must be different");
        RateOfTokenPair[_fromToken][_toToken] = Rate({numerator: _rateOfFrom, denominator: _rateOfTo});
        RateOfTokenPair[_toToken][_fromToken] = Rate({numerator: _rateOfTo, denominator: _rateOfFrom});
        isExists[_fromToken][_toToken] = true;
        isExists[_toToken][_fromToken] = true;
        emit SetRateEvent(_fromToken, _toToken, _rateOfFrom, _rateOfTo);
    }

    function setFee(uint256 _fee) public onlyOwner {
        fee = _fee;
        emit ChangeFeeEvent(address(this), _fee);
    }

    function getRate(address _fromToken, address _toToken) public view returns (uint256, uint256) {
        return (RateOfTokenPair[_fromToken][_toToken].numerator, RateOfTokenPair[_fromToken][_toToken].denominator);
    }

    function getFee() public view returns (uint256) {
        return fee;
    }

    function swapToken(address _fromToken, address _toToken, uint256 _amount) public payable {
        require(_amount > 0, "Amount must be greater than 0");
        require(isExists[_fromToken][_toToken], "Token pair does not exist in contract");

        //transfer fromToken to contract
        handleAmountFrom(_fromToken, _amount);

        //calculate received amount of toToken
        uint256 amountTo = calcAmountTo(_fromToken, _toToken, _amount);

        //transfer received amount to msg.sender 
        handleAmountTo(_toToken, amountTo);
        emit TokenSwapEvent(_fromToken, _toToken, _amount, amountTo);
    }

    function handleAmountFrom(address _fromToken, uint256 _amount) internal {
        if(_fromToken == address(0)) {
            require(msg.value == fee + _amount, "Need to pay enough amount fee to swap token");
            return;
        }

        require(msg.value == fee, "Need to pay enough amount fee to swap token");
        require(IERC20(_fromToken).allowance(msg.sender, address(this)) >= _amount, "Account can not have allowance fromToken to contract");
        IERC20(_fromToken).safeTransferFrom(msg.sender, address(this), _amount);

    }

    function getDecimalsOfTokens(address _fromToken, address _toToken) public view returns (uint256, uint256) {
        uint256 fromTokenDecimal = (_fromToken == address(0)) ? 18 : IERC20Metadata(_fromToken).decimals();
        uint256 toTokenDecimal = (_toToken == address(0)) ? 18 : IERC20Metadata(_toToken).decimals();
        return (fromTokenDecimal, toTokenDecimal);
    }
    
    function handleAmountTo(address _toToken, uint256 _amount) internal {
        if (_toToken == address(0)) {
            require(address(this).balance >= _amount, "Contract can not have enough ETH to swap");
            (bool sent,) = msg.sender.call{value: _amount}("");
            require(sent, "Error sending native token");
            return;
        } 

        require(IERC20(_toToken).balanceOf(address(this)) >= _amount, "Account can not have enough toToken to swap");
        IERC20(_toToken).safeTransfer(msg.sender, _amount);
    }

    function calcAmountTo(address _fromToken, address _toToken, uint256 _amount) public view returns (uint256){
        (uint256 fromTokenDecimal, uint256 toTokenDecimal) = getDecimalsOfTokens(_fromToken, _toToken);
        Rate memory rate = RateOfTokenPair[_fromToken][_toToken];
        return _amount * rate.numerator * (10 ** toTokenDecimal) / rate.denominator / (10 ** fromTokenDecimal);
    }
    
    receive() external payable {}
}