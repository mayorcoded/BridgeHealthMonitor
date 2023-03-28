# BridgeHealthMonitor
-------

## Specifications
Crypto Bridge hacks & malfunctions are quite often. In the last year billions of dollars have been lost by bridges in 
hacks. Here is a list of past bridge hacks for reference:

- https://rekt.news/bnb-bridge-rekt/
- https://rekt.news/ronin-rekt/
- https://rekt.news/nomad-rekt/


As a user of bridge, you want to ensure that if a bridge is malfunctioning, you become aware of the hack/malfunction 
as soon as possible so you can pull out your assets from the Bridge. In order to achieve this goal, you need to 
continuously monitor the on-chain data related to the Bridge. 

## Solution Design

Every cross-chain bridge has a separate design for how they move assets from one chain layer to another. However,
the core part of any bridge includes a contract on a root chain that locks or unlock assets, a contract on the child
chain that mints new assets, and a relayer that communicates messages between the two chains. Using these components of 
a bridge, to determine whether a bridge is working effectively, the following considerations ere evaluated:
- The cross-chain messenger contract is not paused. The cross-chain messenger being paused likely means there is an issue
  with the bridge and communication between chains is being limited to protect funds. 
- There are more deposits on the root chain than withdrawals. A high withdrawal volume on the root chain within a short time frame may
  indicate that there might be an issue with the bridge.
- There are more deposits on the root chain than there are on the child chain. This signals that withdrawals have been
  slow on the root chain. However, it could also mean that the bridge is slowly processing deposits.

Using the considerations above, the health monitor for the optimism bridge was designed by fetching and analysing on-chain
data from the follow contracts: 
- `CrossDomainMessenger.sol`: This contract sends messages from one layer to another.
- `L1StandardBridge.sol`: This contract receives asset deposits on layer 1
- `L2StandardBridge.sol`: This contract receives asset deposits on layer 2

The following events were queried from the contracts above:
- `ERC20DepositInitiated`: This event is emitted in the `L1StandardBridge.sol` contract when an `ERC20` is
  deposited into the contract. The event is queried over a number of blocks to calculate how much `ERC20` assets 
  have been deposited into the contract. 
  
- `ETHDepositInitiated`: This event is emitted in the `L1StandardBridge.sol` contract when `ETH` is
  deposited into the contract. The event is queried over a number of blocks to calculate how much `ETH`
  gas been deposited into the contract.

- `ERC20WithdrawalFinalized`: This event is emitted in the `L1StandardBridge.sol` contract when `ERC20` withdrawal is
  finalized in the L1StandardBridge. The event is queried over a number of blocks to calculate how much `ERC20`
  been withdrawn into the L1StandardBridge contract.

- `ETHWithdrawalFinalized`: This event is emitted in the `L1StandardBridge.sol` contract when `ETH` withdrawal is
  finalized in the L1StandardBridge. The event is queried over a number of blocks to calculate how much `ETH`
  been withdrawn into the L1StandardBridge contract.

- `DepositFinalized`: This event is emitted in the `L2StandardBridge.sol` contract when `ETH` or `ERC20` deposits is
  finalized in the L2StandardBridge. The event is queried over a number of blocks to calculate how much `ETH` or `ERC20`
  assets have been deposited into the L2StandardBridge.

When the script is executed, the logic first checks whether the `CrossDomainMessenger` contract is paused. If it is,
this might be a signal that the bridge might have an issue, so it returns `false`. If the `CrossDomainMessenger` is not paused,
further checks are done per asset to check that over a 24-hour-block period from the latest block, 
there have been more deposits locked into the `L1StandardBridge` than on the `L2StandardBridge`. Finally, withdrawals
on `L1StandardBridge` are also checked to ensure that they do not go past a certain threshold of the deposits finalized 
within a 24-hour-block period. If any of these checks fails the logic returns `false` to indicate that the bridge might, 
be experiencing a failure, else it returns `true` to indicate that the bridge is healthy. 

### Other considerations
The considerations above can be further expanded to consider various edge and corner cases such as:
- The number of blocks considered for the checks can be configured to be smaller to capture more granular transaction
  data.
- Accounts with no deposit history on L1 or with high withdrawal amounts from L2 can be blacklisted for further investigation.
- Dynamic withdrawal thresholds can be put in place for certain asset classes based on how much is deposited 
  within a period.
- The USD total of all assets could be used for checks rather than having checks for each asset, and a USD amount threshold 
  can be set for withdrawals which would be triggered when withdrawals hit it. 
- Withdrawal amounts in each withdrawal transaction in the rollup data can be inspected during the challenge period to
  be certain that there are no withdrawals that hit a certain threshold.

### Resources consulted 
- https://community.optimism.io/docs/developers/bridge/messaging/# 
- https://ethereum.org/en/developers/tutorials/optimism-std-bridge-annotated-code/#l2standarderc20
- https://chainstack.com/an-overview-of-optimism-and-communication-between-l2-and-l1/ 

### Running the script
- Install modules: `yarn`

- Copy `.env.example` to `.env` and add Ethereum and Optimism RPC credentials. e.g 
  `https://eth-mainnet.g.alchemy.com/v2/api_key`

- Run script: `yarn run check-bridge`
