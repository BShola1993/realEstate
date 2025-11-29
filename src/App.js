import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
// Components
import Navigation from "./components/Navigation";
import Search from "./components/Search";
import Homes from "./components/Homes";

// ABIs
import RealEstate from "./abis/RealEstate.json";
import Escrow from "./abis/Escrow.json";

// Config
import config from "./config.json";

function App() {
  const [provider, setProvider] = useState(null);
  const [escrow, setEscrow] = useState(null);
  const [account, setAccount] = useState(null);
  const [homes, setHomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggle, setToggle] = useState(false);
  const [selectedHome, setSelectedHome] = useState(null);

  // 🧩 Connect wallet manually
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert("Please install MetaMask to continue.");
        return;
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const account = ethers.utils.getAddress(accounts[0]);
      setAccount(account);
    } catch (err) {
      console.error("Wallet connection failed:", err);
    }
  };

  // ⚙️ Load blockchain data
  const loadBlockchainData = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to continue.");
      return;
    }

    const providerInstance = new ethers.providers.Web3Provider(window.ethereum);
    setProvider(providerInstance);

    const network = await providerInstance.getNetwork();
    let chainId = network.chainId.toString();

    console.log("✅ Connected chainId:", chainId);

    // ✅ Auto switch/add network if not Hardhat (31337)
    if (chainId !== "31337") {
      try {
        console.log("🔄 Switching to Hardhat local network...");
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x7A69" }], // Hardhat = 31337
        });

        window.location.reload();
        return;
      } catch (switchError) {
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: "0x7A69",
                  chainName: "Hardhat Localhost 8545",
                  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                  rpcUrls: ["http://127.0.0.1:8545/"],
                },
              ],
            });
            window.location.reload();
            return;
          } catch (addError) {
            console.error("❌ Failed to add Hardhat network:", addError);
            alert("Please manually switch MetaMask to Hardhat network.");
            return;
          }
        } else {
          console.error("❌ Network switch failed:", switchError);
          alert("Please switch to Hardhat network (Chain ID 31337).");
          return;
        }
      }
    }

    // ✅ Check RPC is alive before contract calls
    try {
      await providerInstance.getBlockNumber();
    } catch (rpcError) {
      console.error("⚠️ Local node unresponsive:", rpcError);
      alert("Hardhat node not running. Run `npx hardhat node` and refresh.");
      return;
    }

    // ✅ Proceed after correct network
    const realEstateAddress = config[chainId].realEstate.address.trim();
    const escrowAddress = config[chainId].escrow.address.trim();

    const realEstate = new ethers.Contract(realEstateAddress, RealEstate, providerInstance);
    const escrow = new ethers.Contract(escrowAddress, Escrow, providerInstance);

    let totalSupply;
    const loadedHomes = [];

    try {
      totalSupply = await realEstate.totalSupply();
      console.log("🏠 Total supply:", totalSupply.toString());
    } catch (err) {
      console.error("❌ Error fetching totalSupply:", err);
      alert("Contract call failed. Ensure Hardhat node and contracts are deployed.");
      return;
    }

    // ✅ Load home metadata
    for (let i = 1; i <= totalSupply; i++) {
      try {
        const uri = await realEstate.tokenURI(i);
        const res = await fetch(uri);
        const metadata = await res.json();
        loadedHomes.push(metadata);
      } catch (metaErr) {
        console.error("⚠️ Error loading metadata:", metaErr);
      }
    }

    setHomes(loadedHomes);
    setEscrow(escrow);
    setLoading(false);

    // ✅ Listen for account change
    window.ethereum.on("accountsChanged", async () => {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const newAccount = ethers.utils.getAddress(accounts[0]);
      setAccount(newAccount);
    });
  };

  // 🔄 Load blockchain data when wallet connects
  useEffect(() => {
    if (account) loadBlockchainData();
  }, [account]);

  // 🏠 Handle property click
  const toggleProp = (home) => {
    setSelectedHome(home);
    setToggle(!toggle);
  };

  return (
    <div>
      <Navigation account={account} setAccount={setAccount} connectWallet={connectWallet} />
      <Search />

      <div className="cards__section">
        <h3>Welcome to Meritech</h3>
        <hr />
        {loading ? (
          <p>To load homes from blockchain, connect Wallet...</p>
        ) : homes.length === 0 ? (
          <p>No homes found.</p>
        ) : (
          <div className="cards">
            {homes.map((home, index) => (
              <div className="card" key={index} onClick={() => toggleProp(home)}>
                <div className="card__image">
                  <img src={home.image} alt="Home" />
                </div>

                <div className="card__info">
                  <h4>{home.attributes[0].value} ETH</h4>
                </div>

                <p>
                  <strong>{home?.attributes?.[2]?.value || "?"}</strong> ba{" "}
                  <strong>{home?.attributes?.[3]?.value || "?"}</strong> bds |{" "}
                  <strong>{home?.attributes?.[4]?.value || "?"}</strong> sqft
                </p>

                <p>{home.address || "Unknown address"}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {toggle && selectedHome && (
        <Homes
          home={selectedHome}
          provider={provider}
          account={account}
          escrow={escrow}
          toggleProp={toggleProp}
        />
      )}
    </div>
  );
}

export default App;
