import * as dotenv from 'dotenv'
dotenv.config()

export type Config = {
  ETH_RPC_PROVIDER_URL: string,
  OPT_RPC_PROVIDER_URL: string,
  OPT_L1_STANDARD_BRIDGE: string
  OPT_L2_STANDARD_BRIDGE: string
  OPT_L1_CROSS_DOMAIN_MESSENGER: string
}

let config: Config

const initConfig = () => {
  const ETH_RPC_PROVIDER_URL = process.env.ETH_RPC_PROVIDER_URL || ""
  const OPT_RPC_PROVIDER_URL = process.env.OPT_RPC_PROVIDER_URL || ""
  const OPT_L1_STANDARD_BRIDGE = process.env.OPT_L1_STANDARD_BRIDGE || ""
  const OPT_L2_STANDARD_BRIDGE = process.env.OPT_L2_STANDARD_BRIDGE || ""
  const OPT_L1_CROSS_DOMAIN_MESSENGER = process.env.OPT_L1_CROSS_DOMAIN_MESSENGER || ""

  config = {
    ETH_RPC_PROVIDER_URL,
    OPT_RPC_PROVIDER_URL,
    OPT_L1_STANDARD_BRIDGE,
    OPT_L2_STANDARD_BRIDGE,
    OPT_L1_CROSS_DOMAIN_MESSENGER
  }
}

const getConfig = (): Config => {
  return config
}

export { initConfig, getConfig }
