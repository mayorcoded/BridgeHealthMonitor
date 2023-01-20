import { BigNumber } from "ethers";
import * as config from "../utils/config";
import L1StandardBridgeAbi from "../utils/abi/L1StandardBridge.json";
import L2StandardBridgeAbi from "../utils/abi/L2StandardBridge.json";
import {ethContract, ethProvider, optContract, optProvider} from "../utils/provider";
import crossDomainMessengerAbi from "../utils/abi/CrossDomainMessenger.json";
import {ETH24HBlocks, OPT24hBlocks, WHITELISTED_TOKENS, WITHDRAWAL_THRESHOLD} from "../utils/constants";
config.initConfig()

//since withdrawals are faster on L1 we prioritize L1 balances
//we can configure the number of blocks we are checking based on the challenge period and other activities
//we want to set thresholds in place for withdrawals
// USD value instead of token by token consideration
// we could also check withdrawals in the rollup data before the challenge period is over
// we could also check that withdrawals per account is not greater than the lump sum of assets that we are protecting for user's
export interface ERC20 {
  USDC: BigNumber;
}

const getL1BridgeDeposit = async (): Promise<{ ETH: BigNumber; ERC20: ERC20 }> => {
  const provider = ethProvider();
  let contract = ethContract(
    config.getConfig().OPT_L1_STANDARD_BRIDGE,
    L1StandardBridgeAbi
  );
  const fromBlock = await provider.getBlockNumber()
    .then((blockNumber) => blockNumber - ETH24HBlocks);

  const ERC20DepositEvents = await contract.queryFilter("ERC20DepositInitiated", fromBlock);
  const ERC20Deposits = ERC20DepositEvents.filter(
      (event) => event.args![0] === WHITELISTED_TOKENS.USDC.L1_ADDRESS
    ).map((event) => event.args![4] as BigNumber);

  const totalERC20Deposit = ERC20Deposits
    .reduce((prev, curr) => prev.add(curr), BigNumber.from(0))

  const ETHDepositEvents = await contract.queryFilter("ETHDepositInitiated", fromBlock);
  const ETHDeposits = ETHDepositEvents.map((e) => e.args![2] as BigNumber);
  const totalETHDeposit = ETHDeposits.reduce(
    (prev, curr) => prev.add(curr), BigNumber.from(0)
  );

  return {ETH: totalETHDeposit, ERC20: { USDC: totalERC20Deposit }}
}

const getL1BridgeWithdrawal = async (): Promise<{ ETH: BigNumber; ERC20: ERC20 }> => {
  const provider = ethProvider();
  let contract = ethContract(
    config.getConfig().OPT_L1_STANDARD_BRIDGE,
    L1StandardBridgeAbi
  );
  const fromBlock = await provider.getBlockNumber()
    .then((blockNumber) => blockNumber - ETH24HBlocks);

  const ERC20WithdrawalEvents = await contract.queryFilter("ERC20WithdrawalFinalized", fromBlock);
  const ERC20Withdrawals = ERC20WithdrawalEvents.filter(
    (event) => event.args![0] === WHITELISTED_TOKENS.USDC.L1_ADDRESS
  ).map((event) => event.args![4] as BigNumber);
  const totalERC20Withdrawal = ERC20Withdrawals
    .reduce((prev, curr) => prev.add(curr), BigNumber.from(0))

  const ETHWWithdrawEvents = await contract.queryFilter("ETHWithdrawalFinalized", fromBlock);
  const totalETHWithdrawal = ETHWWithdrawEvents.map((e) => e.args![2] as BigNumber)
    .reduce((prev, curr) => prev.add(curr), BigNumber.from(0));

  return {ETH: totalETHWithdrawal , ERC20:{USDC: totalERC20Withdrawal}}
}

const getL2BridgeDeposit = async (): Promise<{ ETH: BigNumber; ERC20: ERC20 }> => {
  const provider = optProvider();
  let contract = optContract(
    config.getConfig().OPT_L2_STANDARD_BRIDGE,
    L2StandardBridgeAbi
  );
  const fromBlock = await provider.getBlockNumber()
    .then((blockNumber) => blockNumber - OPT24hBlocks);

  const DepositEvents = await contract.queryFilter("DepositFinalized", fromBlock);

  const ETHDeposits = DepositEvents.filter(
    (event) => event.args![1] === WHITELISTED_TOKENS.ETH.L2_ADDRESS
  ).map((event) => event.args![4] as BigNumber);
  const totalETHDeposit = ETHDeposits
    .reduce((prev, curr) => prev.add(curr), BigNumber.from(0))

  const ERC20Deposits = DepositEvents.filter(
      (event) => event.args![1] === WHITELISTED_TOKENS.USDC.L2_ADDRESS
    ).map((event) => event.args![4] as BigNumber);
  const totalERC20Deposit = ERC20Deposits
    .reduce((prev, curr) => prev.add(curr), BigNumber.from(0))

  return {ETH: totalETHDeposit, ERC20: { USDC: totalERC20Deposit }}
}

const isCrossDomainMessengerPaused = async (): Promise<boolean> => {
  const contract = ethContract(
    config.getConfig().OPT_L1_CROSS_DOMAIN_MESSENGER,
    crossDomainMessengerAbi
  );

  return await contract.paused();
};


async function main() {
  const crossDomainMessengerIsPaused = await isCrossDomainMessengerPaused();
  if(crossDomainMessengerIsPaused) return false;

  const l1BridgeDeposit = await getL1BridgeDeposit();
  const l2BridgeDeposit = await getL2BridgeDeposit();
  const l1BridgeWithdrawal = await getL1BridgeWithdrawal();
  if(l2BridgeDeposit.ETH.gt(l1BridgeDeposit.ETH)
    || l2BridgeDeposit.ERC20.USDC.gt(l1BridgeDeposit.ERC20.USDC)) return false;

  //if withdrawal is greater than 10% of deposits
  if(l1BridgeWithdrawal.ETH.gt(l1BridgeDeposit.ETH.mul(10).div(100))) return false;
  await getL1BridgeWithdrawal()

  return true;
}

main()
  .then((result) => console.log(result))
  .catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

