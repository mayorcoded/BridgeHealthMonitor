import { Contract, ethers } from "ethers";
import {getConfig} from "./config";

const ethProvider = () => new ethers.providers.JsonRpcProvider(getConfig().ETH_RPC_PROVIDER_URL);
const optProvider = () => new ethers.providers.JsonRpcProvider(getConfig().OPT_RPC_PROVIDER_URL);

const ethContract = (contractAddress: string, contractAbi: any): Contract => {
  const provider = ethProvider();
  return new ethers.Contract(contractAddress, contractAbi, provider);
}

const optContract = (contractAddress: string, contractAbi: any): Contract => {
  const provider = optProvider();
  return new ethers.Contract(contractAddress, contractAbi, provider);
}

export {ethContract, ethProvider, optContract, optProvider,}
