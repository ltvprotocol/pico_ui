import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const TOKEN_ADDRESS = '0xe2a7f267124ac3e4131f27b9159c78c521a44f3c';
const WETH_ADDRESS = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14';

interface RedeemProps {
  isWalletConnected: boolean;
  isSepolia: boolean;
  address: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  vaultMaxRedeem: string;
  gmeBalance: string;
}

export default function Redeem({ 
  isWalletConnected, 
  isSepolia,
  address,
  provider,
  signer,
  vaultMaxRedeem,
  gmeBalance
}: RedeemProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [maxAvailableRedeem, setMaxAvailableRedeem] = useState<string>('0');
  const [wethDecimals, setWethDecimals] = useState<number>(18);

  useEffect(() => {
    updateMaxAvailableRedeem(
      BigInt(gmeBalance),
      BigInt(vaultMaxRedeem)
    );
  }, [gmeBalance, vaultMaxRedeem]);

  const updateMaxAvailableRedeem = (gmeBal: bigint, maxRedeem: bigint) => {
    const gmeAmount = parseFloat(ethers.formatUnits(gmeBal, wethDecimals));
    const maxRedeemAmount = parseFloat(ethers.formatUnits(maxRedeem, wethDecimals));
    const maxAvailable = Math.min(gmeAmount, maxRedeemAmount);
    setMaxAvailableRedeem(maxAvailable.toFixed(4));
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    if (!provider) return;

    try {
      // Create contract instances
      const vaultContract = new ethers.Contract(
        TOKEN_ADDRESS,
        [
          'function redeem(uint256 shares, address receiver, address owner) returns (uint256)',
          'function asset() view returns (address)',
        ],
        signer
      );

      const wethContract = new ethers.Contract(
        WETH_ADDRESS,
        [
          'function decimals() view returns (uint8)',
          'function balanceOf(address) view returns (uint256)',
        ],
        provider
      );

      // Get WETH decimals and check balance
      const decimals = await wethContract.decimals();
      setWethDecimals(decimals);
      const amountWei = ethers.parseUnits(amount, decimals);
      const currentGmeBalance = BigInt(gmeBalance);

      if (currentGmeBalance < amountWei) {
        throw new Error('Insufficient GME balance');
      }

      // Redeem from vault
      const redeemTx = await vaultContract.redeem(
        amountWei,
        address,
        address
      );
      await redeemTx.wait();

      setAmount('');
      setSuccess('Redemption successful!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleMaxClick = () => {
    setAmount(maxAvailableRedeem);
  };

  return (
    <>
      {isWalletConnected && isSepolia && (
        <div className="mt-8 p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">Redeem Assets</h2>
          <form onSubmit={handleRedeem} className="space-y-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                Amount to Redeem
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="number"
                  name="amount"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="block w-full pr-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="0.0"
                  step="any"
                  required
                  disabled={!isWalletConnected || loading}
                  max={maxAvailableRedeem}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={handleMaxClick}
                    className="text-indigo-600 hover:text-indigo-500 text-sm font-medium mr-2"
                  >
                    MAX
                  </button>
                  <span className="text-gray-500 sm:text-sm">GME</span>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Available to redeem: {maxAvailableRedeem} GME
              </p>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !amount || parseFloat(amount) <= 0}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Redeem'}
              </button>
            </div>

            {error && (
              <div className="mt-2 text-sm text-red-600">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-2 text-sm text-green-600">
                {success}
              </div>
            )}
          </form>
        </div>
      )}
    </>
  );
} 