const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SwapToken", function () {
  let swapToken, myToken1, myToken2, owner, addr1;
  const nativeToken = "0x0000000000000000000000000000000000000000";
  const successTestCasesForSwap = [
    {
      name: "Success: swap 10 token2 -> 3.33 token1 with rate token2 : token1 là 3:1 and fee 0.1% ",
      fromToken: () => myToken2.target,
      toToken: () => myToken1.target,
      rateOfFromToken: 3,
      rateOfToToken: 1,
      fee: 1,
      amount: ethers.parseUnits("10", 18),
      value: 0,

      //it is balance of token1 in contract after trans 3.33 token1 to caller
      expectedBalance1: ethers.parseUnits("46.67", 18), 

      //it is balance of token2 in contract after caller transfer 10 token1 to contract
      expectedBalance2: ethers.parseUnits("60", 18),
    },
    {
      name: "Success: swap 10 token2 -> 9.99 ETH with rate token2 : nativeToken là 1:1 and fee 0.1% ",
      fromToken: () => myToken2.target,
      toToken: () => nativeToken,
      rateOfFromToken: 1,
      rateOfToToken: 1,
      fee: 1,
      amount: ethers.parseUnits("10", 18),
      value: 0,

      //not change
      expectedBalance1: ethers.parseUnits("50", 18),

      //it is balance of token2 in contract after caller transfer 10 token2 to contract
      expectedBalance2: ethers.parseUnits("60", 18),
    },
    {
      name: "Success: swap 10 ETH -> 9.99 token2 with rate nativeToken : token2 là 1:1 and fee 0.1% ",
      fromToken: () => nativeToken,
      toToken: () => myToken2.target,
      rateOfFromToken: 1,
      rateOfToToken: 1,
      fee: 1,
      amount: ethers.parseUnits("10", 18),
      value: ethers.parseEther("10"),

      //not change
      expectedBalance1: ethers.parseUnits("50", 18),

      //it is balance of token2 in contract after caller transfer 9.99 token2 to caller
      expectedBalance2: ethers.parseUnits("40.01", 18),
    },
    {
      name: "Success: swap 1 ETH -> 49.95 token1 with rate nativeToken : token1 là 1:50 and fee 0.1% ",
      fromToken: () => nativeToken,
      toToken: () => myToken1.target,
      rateOfFromToken: 1,
      rateOfToToken: 50,
      fee: 1,
      amount: ethers.parseUnits("1", 18),
      value: ethers.parseEther("1"),

      //it is balance of token1 in contract after caller transfer 49.95 token2 to caller
      expectedBalance1: ethers.parseUnits("0.05", 18),

      //not change
      expectedBalance2: ethers.parseUnits("50", 18),
    },
  ];
  const successTestCasesForSetRate = [
    {
      name: "Success: Rate > 0",
      fromToken: () => myToken2.target,
      toToken: () => nativeToken,
      caller: () => owner,
      rateOfFrom: 8,
      rateOfTo: 9,
      expectRateOfFrom: 8,
      expectRateOfTo:9,
    },
  ];
  const successTestCasesForSetFee = [
    {
      name: "Success: Fee < 100",
      caller: () => owner,
      fee : 89,
      expectFee: 89,
    },
  ];
  
  const failTestCasesForSwap = [
    {
      name: "Fail: Swapping with amount = 0",
      fromToken: () => myToken2.target,
      toToken: () => nativeToken,
      rateOfFromToken: 3,
      rateOfToToken: 1,
      fee: 1,
      amount: ethers.parseUnits("0", 18),
      value: 0,
      caller: () => owner,
      expectMessage: "Amount must be greater than 0",
    },
    {
      name: "Fail: Swap 10 ETH -> token2 but not enough fee",
      fromToken: () => nativeToken,
      toToken: () => myToken2.target,
      rateOfFromToken: 3,
      rateOfToToken: 1,
      fee: 1,
      amount: ethers.parseUnits("10", 18),
      value: ethers.parseEther("9"),
      caller: () => addr1,
      expectMessage: "Need to pay enough amount fee to swap token",
    },
    {
      name: "Fail: Swap 100 ETH -> token2 when contract doesn't have enough token2",
      fromToken: () => nativeToken,
      toToken: () => myToken2.target,
      rateOfFromToken: 3,
      rateOfToToken: 1,
      fee: 1,
      amount: ethers.parseUnits("100", 18),
      value: ethers.parseEther("100"),
      caller: () => addr1,
      expectMessage: "Account can not have enough toToken to swap",
    }
  ];
  const failTestCasesForSetRate = [
    {
      name: "Fail: Rate rateOfFrom < 0 and rateOfTo < 0",
      fromToken: () => myToken2.target,
      toToken: () => nativeToken,
      rateOfFrom: 0,
      rateOfTo: 0,
      caller: () => owner,
      expectMessage: "Rate must be greater than 0",
    },
    {
      name: "Fail: Rate rateOfFrom < 0 or rateOfTo < 0",
      fromToken: () => myToken2.target,
      toToken: () => nativeToken,
      rateOfFrom: 0,
      rateOfTo: 9,
      caller: () => owner,
      expectMessage: "Rate must be greater than 0",
    },
    {
      name: "Fail: Set fromToken = toToken",
      fromToken: () => nativeToken,
      toToken: () => nativeToken,
      rateOfFrom: 8,
      rateOfTo: 9,
      caller: () => owner,
      expectMessage: "From token and to token must be different",
    }
  ];

  const failTestCasesForSetFee = [
    {
      name: "Fail: Fee > 100",
      caller: () => owner,
      fee : 190,
      expectMessage: "Fee must be less than 100",
    },
    {
      name: "Fail: user is not owner",
      caller: () => addr1,
      fee : 89,
      expectMessage: "Only owner can call this function",
    }
  ];

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    const MyToken1 = await ethers.getContractFactory("MyToken1");
    myToken1 = await MyToken1.deploy("Power Ranger", "PRG", 100000);

    const MyToken2 = await ethers.getContractFactory("MyToken1");
    myToken2 = await MyToken2.deploy("Currency Ranger", "CRG", 100000);

    const SwapToken = await ethers.getContractFactory("SwapToken");
    swapToken = await SwapToken.deploy();

    await myToken1.transfer(addr1.address, ethers.parseUnits("50", 18));
    await myToken2.transfer(addr1.address, ethers.parseUnits("50", 18));
    await owner.sendTransaction({
      to: swapToken.target, 
      value: ethers.parseEther("50")
    });
    await myToken1.transfer(swapToken.target, ethers.parseUnits("50", 18));
    await myToken2.transfer(swapToken.target, ethers.parseUnits("50", 18));
  });

  successTestCasesForSwap.forEach((test) => {
    it(test.name, async function () {
      await myToken1.connect(addr1).approve(swapToken.target, ethers.parseUnits("50", 18));
      await myToken2.connect(addr1).approve(swapToken.target, ethers.parseUnits("50", 18));
      await swapToken.connect(owner).setFee(test.fee);
      await swapToken.connect(owner).setRate(test.fromToken(), test.toToken(), test.rateOfFromToken, test.rateOfToToken);
      await swapToken.connect(addr1).swapToken(
        test.fromToken(),
        test.toToken(),
        test.amount,
        { value: test.value }
      );

      const balance1 = await myToken1.balanceOf(swapToken.target);
      const balance2 = await myToken2.balanceOf(swapToken.target);

      expect(balance1).to.equal(test.expectedBalance1);
      expect(balance2).to.equal(test.expectedBalance2);
    });
  });
  successTestCasesForSetRate.forEach((test) => {
    it(test.name, async function () {
      await swapToken.connect(test.caller()).setRate(test.fromToken(), test.toToken(), test.rateOfFrom, test.rateOfTo);
      const [storedRateOfFrom, storedRateOfTo] = await swapToken.getRate(test.fromToken(), test.toToken());
      expect(storedRateOfFrom).to.equal(test.expectRateOfFrom);
      expect(storedRateOfTo).to.equal(test.expectRateOfTo);
    });
  })

  successTestCasesForSetFee.forEach((test) => {
    it(test.name, async function () {
      await swapToken.connect(test.caller()).setFee(test.fee);
      const storeFee = await swapToken.getFee();
      expect(storeFee).to.equal(test.expectFee);
    });
  })

  failTestCasesForSwap.forEach((test) => {
    it(test.name, async function () {
      await myToken1.connect(addr1).approve(swapToken.target, ethers.parseUnits("50", 18));
      await myToken2.connect(addr1).approve(swapToken.target, ethers.parseUnits("50", 18));
      await swapToken.connect(owner).setFee(test.fee);
      await swapToken.connect(owner).setRate(test.fromToken(), test.toToken(), test.rateOfFromToken, test.rateOfFromToken);
      await expect(
        swapToken.connect(test.caller()).swapToken(
          test.fromToken(),
          test.toToken(),
          test.amount,
          { value: test.value }
        )
      ).to.be.revertedWith(test.expectMessage);
    });
  });

  failTestCasesForSetRate.forEach((test) => {
    it(test.name, async function () {
      await expect(
        swapToken.connect(test.caller()).setRate(
          test.fromToken(),
          test.toToken(),
          test.rateOfFrom,
          test.rateOfTo,
        )
      ).to.be.revertedWith(test.expectMessage);
    });
  });

  failTestCasesForSetFee.forEach((test) => {
    it(test.name, async function () {
      await expect(
       swapToken.connect(test.caller()).setFee(test.fee)
      ).to.be.revertedWith(test.expectMessage);
    });
  });
});
