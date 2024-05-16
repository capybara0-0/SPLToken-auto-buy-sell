import "dotenv/config";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  getAccount,
  getMint,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

const rpcUrl = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
const connection = new Connection(rpcUrl, "confirmed");

export async function getTokenBalanceByOwnerAndMint(
  ownerAddress: string,
  mintId: string,
) {
  const ownerPublicKey = new PublicKey(ownerAddress);
  const mintPublicKey = new PublicKey(mintId);

  // Get the associated token account for the given owner and mint
  const tokenAccount = getAssociatedTokenAddressSync(
    mintPublicKey,
    ownerPublicKey,
  );

  // Fetch and print the token balance
  return await getTokenBalanceSpl(connection, tokenAccount);
}

async function getTokenBalanceSpl(
  connection: Connection,
  tokenAccount: PublicKey,
) {
  const info = await getAccount(connection, tokenAccount);
  const amount = Number(info.amount);
  const mint = await getMint(connection, info.mint);
  const balance = amount / Math.pow(10, mint.decimals);
  return balance;
}
