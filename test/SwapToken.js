const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SwapToken", function () {
  let swapToken, myToken1, myToken2, owner, addr1;

  beforeEach(async function () {
    console.log("before each...");
    [owner, addr1] = await ethers.getSigners();

    const MyToken1 = await ethers.getContractFactory("MyToken1");
    myToken1 = await MyToken1.deploy(100000,100000);
    console.log("MyToken1 deployed");

    const MyToken2 = await ethers.getContractFactory("MyToken2");
    myToken2 = await MyToken2.deploy(100000,100000);
    console.log("MyToken2 deployed");

    const SwapToken = await ethers.getContractFactory("SwapToken");
    swapToken = await SwapToken.deploy();
    console.log("SwapToken deployed");

    //TODO consider parseUnit and parseEther to synchronize
    await myToken1.transferOut(addr1.address, ethers.parseUnits("50", 18));
    await myToken2.transferOut(addr1.address, ethers.parseUnits("50", 18));
    await owner.sendTransaction({
      to: swapToken.target, 
      value: ethers.parseEther("50")
    });
    console.log("balanceOfAddress1tk1:", await myToken1.balanceOf(addr1.address));
    console.log("balanceOfAddress1tk2:", await myToken2.balanceOf(addr1.address));
    await myToken1.transferOut(swapToken.target, ethers.parseUnits("50", 18));
    await myToken2.transferOut(swapToken.target, ethers.parseUnits("50", 18));
    console.log("tk1",myToken1.target);
    console.log("tk2",myToken2.target);
    console.log("swapToken",swapToken.target);
    await swapToken.addToken(myToken1.target, myToken2.target, 3);
    await swapToken.addToken("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", myToken2.target, 1);
    console.log("transfer tokens");
  });

  it("should swap tokens", async function () {
    await myToken1.connect(addr1).approve(swapToken.target, ethers.parseUnits("50", 18));
    await myToken2.connect(addr1).approve(swapToken.target, ethers.parseUnits("50", 18));
    console.log("balanceOfMyToken1before", await myToken1.balanceOf(swapToken.target));
    console.log("balanceOfMyToken2before", await myToken2.balanceOf(swapToken.target));
    const ethBalanceAddr1 = await ethers.provider.getBalance(addr1.address);
    console.log("ETH balance of addr1 before:", ethBalanceAddr1.toString());
    const ethBalanceBefore = await ethers.provider.getBalance(swapToken.target);
    console.log("ETH balance of SwapToken contract before:", ethBalanceBefore.toString());
    const returnedValue = await swapToken.connect(addr1).swapToken(myToken2.target,myToken1.target, ethers.parseUnits("10", 18), {value: ethers.parseEther("0.001")});
    const ethBalance = await ethers.provider.getBalance(swapToken.target);
    console.log("ETH balance of SwapToken contract after:", ethBalance.toString());
    const ethBalanceAddr1After = await ethers.provider.getBalance(addr1.address);
    const receipt = await returnedValue.wait();
    const event = receipt.logs.map(log => {
      try {
        return swapToken.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find(e => e && e.name === "TokenSwapEvent");
    if (event) {
      const receivedTokenAmount = event.args._amountTo;
      console.log("receivedTokenAmount from event:", receivedTokenAmount.toString());
    } else {
      console.log("TokenSwapEvent not found in logs");
    }
    console.log("ETH balance of addr1 after:", ethBalanceAddr1After.toString());
    console.log("balanceOfMyToken1after", await myToken1.balanceOf(swapToken.target));
    console.log("balanceOfMyToken2after", await myToken2.balanceOf(swapToken.target));
    const balance1 = await myToken1.balanceOf(swapToken.target);
    const balance2 = await myToken2.balanceOf(swapToken.target);

    expect(balance1).to.equal(60000000000000000000n); 
    expect(balance2).to.equal(36000000000000000000n);
  });
});
