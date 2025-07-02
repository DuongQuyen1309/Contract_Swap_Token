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

    await myToken1.transferOut(addr1.address, 50);
    await myToken2.transferOut(addr1.address, 50);
    console.log("balanceOfAddress1tk1:", await myToken1.balanceOf(addr1.address));
    console.log("balanceOfAddress1tk2:", await myToken2.balanceOf(addr1.address));
    await myToken1.transferOut(swapToken.target, 50);
    await myToken2.transferOut(swapToken.target, 50);
    console.log("tk1",myToken1.target);
    console.log("tk2",myToken2.target);
    console.log("swapToken",swapToken.target);
    await swapToken.addToken(myToken1.target, myToken2.target, 2);
    console.log("transfer tokens");
  });

  it("should swap tokens", async function () {
    await myToken1.connect(addr1).approve(swapToken.target, 50);
    await myToken2.connect(addr1).approve(swapToken.target, 50);
    console.log("balanceOfMyToken1before", await myToken1.balanceOf(swapToken.target));
    console.log("balanceOfMyToken2before", await myToken2.balanceOf(swapToken.target));
    await swapToken.connect(addr1).swapToken(myToken1.target, myToken2.target, 10);
    console.log("balanceOfMyToken1after", await myToken1.balanceOf(swapToken.target));
    console.log("balanceOfMyToken2after", await myToken2.balanceOf(swapToken.target));
    const balance1 = await myToken1.balanceOf(swapToken.target);
    const balance2 = await myToken2.balanceOf(swapToken.target);

    expect(balance1).to.equal(50000000000000000010n); 
    expect(balance2).to.equal(49999999999999999986n);

  });
});
