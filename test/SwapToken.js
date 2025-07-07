const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SwapToken", function () {
  let swapToken, myToken1, myToken2, owner, addr1;
  const nativeToken = "0x0000000000000000000000000000000000000000";

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
    await swapToken.setRate(myToken1.target, myToken2.target, 3, 1);
    await swapToken.setRate(nativeToken, myToken2.target, 1, 1);
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

  it("Success: Set fee ", async function () {
    const newFee = ethers.parseEther("0.001");
    await swapToken.connect(owner).setFee(newFee);
    const storedRate = await swapToken.getFee();
    expect(storedRate).to.equal(newFee);
  });

  it("Success: Set rate > 0", async function () {
    await swapToken.connect(owner).setRate(myToken1.target, myToken2.target, 5, 1);
    const [storedRateOfFrom, storedRateOfTo] = await swapToken.getRate(myToken1.target, myToken2.target);
    expect(storedRateOfFrom).to.equal(5);
    expect(storedRateOfTo).to.equal(1);
  });

  it("Fail: Swapping ETH with ERC that have amount = 0", async function () {
    await myToken1.connect(addr1).approve(swapToken.target, ethers.parseUnits("50", 18));
    await myToken2.connect(addr1).approve(swapToken.target, ethers.parseUnits("50", 18));
    await expect(
    swapToken.connect(owner).swapToken(myToken2.target, nativeToken, ethers.parseUnits("0", 18), { value: ethers.parseEther("0.001") })
    ).to.be.revertedWith("Amount must be greater than 0");
  });

  it("Fail: swap ETH to receive ERC20 not enough fee ", async function () {
    await myToken1.connect(addr1).approve(swapToken.target, ethers.parseUnits("50", 18));
    await myToken2.connect(addr1).approve(swapToken.target, ethers.parseUnits("50", 18));
    await expect(
    swapToken.connect(addr1).swapToken(nativeToken,myToken2.target, ethers.parseUnits("10", 18), {value: ethers.parseEther("9.001")})
    ).to.be.revertedWith("Need to pay enough amount fee to swap token");
  });
  
  it("Fail: swap ETH to receive ERC20 when contract don't have enough erc20", async function () {
    await myToken1.connect(addr1).approve(swapToken.target, ethers.parseUnits("50", 18));
    await myToken2.connect(addr1).approve(swapToken.target, ethers.parseUnits("50", 18));
    await expect(
    swapToken.connect(addr1).swapToken(nativeToken,myToken2.target, ethers.parseUnits("100", 18), {value: ethers.parseEther("100.001")})
    ).to.be.revertedWith("Account can not have enough toToken to swap");
  });

  it("Fail: set rate = 0", async function () {
    await myToken1.connect(addr1).approve(swapToken.target, ethers.parseUnits("50", 18));
    await myToken2.connect(addr1).approve(swapToken.target, ethers.parseUnits("50", 18));
    await expect(
    swapToken.connect(owner).setRate(myToken1.target, myToken2.target, 0, 0)
    ).to.be.revertedWith("Rate must be greater than 0");
  });
});
