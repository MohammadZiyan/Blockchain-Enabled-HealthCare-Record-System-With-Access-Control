import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import EHRSystemABI from "../abi/EHRSystem.json";

const Web3Context = createContext(null);

// Role mapping from contract enum
export const ROLES = {
  0: "None",
  1: "Doctor",
  2: "Patient",
  3: "Hospital",
  4: "Admin",
};

export const ROLE_COLORS = {
  None:     "bg-gray-100 text-gray-600",
  Patient:  "bg-green-100 text-green-700",
  Doctor:   "bg-blue-100 text-blue-700",
  Hospital: "bg-purple-100 text-purple-700",
  Admin:    "bg-red-100 text-red-700",
};

export function Web3Provider({ children }) {
  const [provider,        setProvider]        = useState(null);
  const [signer,          setSigner]          = useState(null);
  const [contract,        setContract]        = useState(null);
  const [account,         setAccount]         = useState(null);
  const [userProfile,     setUserProfile]     = useState(null);
  const [isConnecting,    setIsConnecting]    = useState(false);
  const [networkError,    setNetworkError]    = useState(null);
  const [isConnected,     setIsConnected]     = useState(false);

  const CONTRACT_ADDRESS = EHRSystemABI.address || process.env.REACT_APP_CONTRACT_ADDRESS;

  const loadUserProfile = useCallback(async (contractInstance, address) => {
    try {
      const user = await contractInstance.users(address);
      const roleNum = Number(user.role);
      setUserProfile({
        address,
        name:        user.name,
        role:        ROLES[roleNum] || "None",
        roleNum,
        institution: user.institution,
        isActive:    user.isActive,
        registeredAt: Number(user.registeredAt),
        isRegistered: roleNum !== 0,
      });
    } catch (err) {
      console.error("Failed to load user profile:", err);
      setUserProfile({ address, isRegistered: false, roleNum: 0, role: "None" });
    }
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setNetworkError("MetaMask not found. Please install MetaMask to use this app.");
      return;
    }
    setIsConnecting(true);
    setNetworkError(null);
    try {
      const _provider = new ethers.BrowserProvider(window.ethereum);
      await _provider.send("eth_requestAccounts", []);
      const _signer   = await _provider.getSigner();
      const _account  = await _signer.getAddress();

      const _contract = new ethers.Contract(CONTRACT_ADDRESS, EHRSystemABI.abi, _signer);

      setProvider(_provider);
      setSigner(_signer);
      setContract(_contract);
      setAccount(_account);
      setIsConnected(true);

      await loadUserProfile(_contract, _account);
    } catch (err) {
      setNetworkError(err.message || "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  }, [CONTRACT_ADDRESS, loadUserProfile]);

  const refreshProfile = useCallback(async () => {
    if (contract && account) {
      await loadUserProfile(contract, account);
    }
  }, [contract, account, loadUserProfile]);

  // Auto-reconnect and account-change listener
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length === 0) {
          setAccount(null);
          setSigner(null);
          setContract(null);
          setUserProfile(null);
          setIsConnected(false);
        } else {
          connect();
        }
      });
      window.ethereum.on("chainChanged", () => window.location.reload());
    }
    return () => {
      if (window.ethereum?.removeAllListeners) window.ethereum.removeAllListeners();
    };
  }, [connect]);

  return (
    <Web3Context.Provider value={{
      provider, signer, contract, account, userProfile,
      isConnecting, networkError, isConnected,
      connect, refreshProfile,
    }}>
      {children}
    </Web3Context.Provider>
  );
}

export const useWeb3 = () => {
  const ctx = useContext(Web3Context);
  if (!ctx) throw new Error("useWeb3 must be inside Web3Provider");
  return ctx;
};
