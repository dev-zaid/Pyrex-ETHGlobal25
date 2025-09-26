import { sendPyusdTransfers } from '../src/chain/polygon';

jest.mock('../src/chain/erc20', () => ({
  sendErc20Transfers: jest.fn(async () => 'mocked-0xhash'),
}));

describe('sendPyusdTransfers', () => {
  it('returns a transaction hash', async () => {
    const txHash = await sendPyusdTransfers([{ to: '0xSeller', amount: 10 }]);
    expect(txHash).toBe('mocked-0xhash');
  });
});
