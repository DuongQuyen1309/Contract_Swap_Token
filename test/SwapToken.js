const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SwapToken", function () {
  let swapToken, myToken1, myToken2, owner, addr1;
  const nativeToken = "0x0000000000000000000000000000000000000000";

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    const MyToken1 = await ethers.getContractFactory("MyToken1");
    myToken1 = await MyToken1.deploy(100000,100000);

    const MyToken2 = await ethers.getContractFactory("MyToken2");
    myToken2 = await MyToken2.deploy(100000,100000);

    const SwapToken = await ethers.getContractFactory("SwapToken");
    swapToken = await SwapToken.deploy();

    await myToken1.transferOut(addr1.address, ethers.parseUnits("50", 18));
    await myToken2.transferOut(addr1.address, ethers.parseUnits("50", 18));

    await owner.sendTransaction({
      to: swapToken.target, 
      value: ethers.parseEther("50")
    });

    await myToken1.transferOut(swapToken.target, ethers.parseUnits("50", 18));
    await myToken2.transferOut(swapToken.target, ethers.parseUnits("50", 18));
    await swapToken.addToken(myToken1.target, myToken2.target, 3);
    await swapToken.addToken(nativeToken, myToken2.target, 1);
  });

  it("Success: swap tokens without ETH", async function () {
    await myToken1.connect(addr1).approve(swapToken.target, ethers.parseUnits("50", 18));
    await myToken2.connect(addr1).approve(swapToken.target, ethers.parseUnits("50", 18));

    await swapToken.connect(addr1).swapToken(myToken2.target,myToken1.target, ethers.parseUnits("10", 18), {value: ethers.parseEther("0.001")});
    
    const balance1 = await myToken1.balanceOf(swapToken.target);
    const balance2 = await myToken2.balanceOf(swapToken.target);
    expect(balance1).to.equal(46666666666666666667n); 
    expect(balance2).to.equal(60000000000000000000n);
  });
  
  it("Success:swap ERC token to receive ETH", async function () {
    await myToken1.connect(addr1).approve(swapToken.target, ethers.parseUnits("50", 18));
    await myToken2.connect(addr1).approve(swapToken.target, ethers.parseUnits("50", 18));

    await swapToken.connect(addr1).swapToken(myToken2.target, nativeToken, ethers.parseUnits("10", 18), {value: ethers.parseEther("0.001")});

    const balance1 = await myToken1.balanceOf(swapToken.target);
    const balance2 = await myToken2.balanceOf(swapToken.target);
    expect(balance1).to.equal(50000000000000000000n); 
    expect(balance2).to.equal(60000000000000000000n);
  });

  it("Success: swap ETH to receive ERC20 ", async function () {
    await myToken1.connect(addr1).approve(swapToken.target, ethers.parseUnits("50", 18));
    await myToken2.connect(addr1).approve(swapToken.target, ethers.parseUnits("50", 18));
    
    await swapToken.connect(addr1).swapToken(nativeToken,myToken2.target, ethers.parseUnits("10", 18), {value: ethers.parseEther("10.001")});
    
    const balance1 = await myToken1.balanceOf(swapToken.target);
    const balance2 = await myToken2.balanceOf(swapToken.target);
    expect(balance1).to.equal(50000000000000000000n); 
    expect(balance2).to.equal(40000000000000000000n);
  });

  // it("Fail: Swapping ETH with ERC that have amount = 0", async function () {
  //   await myToken1.connect(addr1).approve(swapToken.target, ethers.parseUnits("50", 18));
  //   await myToken2.connect(addr1).approve(swapToken.target, ethers.parseUnits("50", 18));
  //   await expect(
  //   swapToken.connect(addr1).swapToken(myToken2.target, "0x0000000000000000000000000000000000000000", ethers.parseUnits("0", 18), { value: ethers.parseEther("0.001") })
  //   ).to.be.revertedWith("Amount must be greater than 0");
  // });
  // it("Fail: Swapping ETH with ERC that have rate = 0", async function () {
  //   await myToken1.connect(addr1).approve(swapToken.target, ethers.parseUnits("50", 18));
  //   await myToken2.connect(addr1).approve(swapToken.target, ethers.parseUnits("50", 18));
  //   await expect(
  //   swapToken.connect(addr1).swapToken("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "0x0000000000000000000000000000000000000000", ethers.parseUnits("0", 18), { value: ethers.parseEther("0.001") })
  //   ).to.be.revertedWith("Token pair does not exist in contract");
  // });
});
