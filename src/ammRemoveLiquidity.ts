import assert from 'assert';

import {
  ENDPOINT,
  jsonInfo2PoolKeys,
  Liquidity,
  LiquidityPoolKeys,
  TokenAmount,
} from '@raydium-io/raydium-sdk';
import { Keypair } from '@solana/web3.js';

import {
  connection,
  DEFAULT_TOKEN,
  makeTxVersion,
  RAYDIUM_MAINNET_API,
  wallet,
} from '../config';
import {
  buildAndSendTx,
  getWalletTokenAccount,
} from './util';

type WalletTokenAccounts = Awaited<ReturnType<typeof getWalletTokenAccount>>
type TestTxInputInfo = {
  removeLpTokenAmount: TokenAmount
  targetPool: string
  walletTokenAccounts: WalletTokenAccounts
  wallet: Keypair
}

/**
 * pre-action: fetch basic AmmV2 info
 * step 1: create instructions by SDK function
 * step 2: compose instructions to several transactions
 * step 3: send transactions
 */
async function ammRemoveLiquidity(input: TestTxInputInfo) {
  // -------- pre-action: fetch basic info --------
  const ammV2PoolData = await fetch(ENDPOINT + RAYDIUM_MAINNET_API.poolInfo).then((res) => res.json())
  assert(ammV2PoolData, 'fetch failed')
  const targetPoolInfo = [...ammV2PoolData.official, ...ammV2PoolData.unOfficial].find(
    (poolInfo) => poolInfo.id === input.targetPool
  )
  assert(targetPoolInfo, 'cannot find the target pool')

  // -------- step 1: make instructions --------
  const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys
  const removeLiquidityInstructionResponse = await Liquidity.makeRemoveLiquidityInstructionSimple({
    connection,
    poolKeys,
    userKeys: {
      owner: input.wallet.publicKey,
      payer: input.wallet.publicKey,
      tokenAccounts: input.walletTokenAccounts,
    },
    amountIn: input.removeLpTokenAmount,
    makeTxVersion,
  })

  return { txids: await buildAndSendTx(removeLiquidityInstructionResponse.innerTransactions) }
}

async function howToUse() {
  const lpToken = DEFAULT_TOKEN['RAY_USDC-LP'] // LP
  const removeLpTokenAmount = new TokenAmount(lpToken, 100)
  const targetPool = 'EVzLJhqMtdC1nPmz8rNd6xGfVjDPxpLZgq7XJuNfMZ6' // RAY-USDC pool
  const walletTokenAccounts = await getWalletTokenAccount(connection, wallet.publicKey)

  ammRemoveLiquidity({
    removeLpTokenAmount,
    targetPool,
    walletTokenAccounts,
    wallet: wallet,
  }).then(({ txids }) => {
    /** continue with txids */
    console.log('txids', txids)
  })
}
