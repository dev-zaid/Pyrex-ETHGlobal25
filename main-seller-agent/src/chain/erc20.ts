import { Contract, Wallet, providers } from 'ethers';

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) public returns (bool)',
  'function decimals() public view returns (uint8)',
];

export interface TransferInput {
  to: string;
  amount: number;
}

export async function sendErc20Transfers(
  providerUrl: string,
  privateKey: string,
  tokenAddress: string,
  transfers: TransferInput[],
): Promise<string> {
  if (!providerUrl || !privateKey || !tokenAddress) {
    // Simulate transfer in local/dev environments.
    return `simulated-${Date.now()}`;
  }

  const provider = new providers.JsonRpcProvider(providerUrl);
  const wallet = new Wallet(privateKey, provider);
  const contract = new Contract(tokenAddress, ERC20_ABI, wallet);

  const decimals: number = await contract.decimals();

  let txHash = '';
  for (const transfer of transfers) {
    const amount = BigInt(Math.round(transfer.amount * 10 ** decimals));
    const tx = await contract.transfer(transfer.to, amount);
    txHash = tx.hash;
    await tx.wait();
  }

  return txHash;
}
