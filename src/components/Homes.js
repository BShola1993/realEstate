import { useEffect, useState } from "react";
import close from "../assets/close.svg";

const Homes = ({ home, provider, escrow, toggleProp }) => {
  const [hasBought, setHasBought] = useState(false);
  const [hasLend, setHasLend] = useState(false);
  const [hasInspect, setHasInspect] = useState(false);
  const [hasSold, setHasSold] = useState(false);

  const [buyer, setBuyer] = useState(null);
  const [lender, setLender] = useState(null);
  const [inspector, setInspector] = useState(null);
  const [seller, setSeller] = useState(null);
  const [owner, setOwner] = useState("");
  const [account, setAccount] = useState(null);

  // Load wallet account
  const loadAccount = async () => {
    try {
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      setAccount(address.toLowerCase());
    } catch (error) {
      console.error("Failed to load wallet address:", error);
    }
  };

  // Fetch all escrow details and owner
  const fetchEscrowData = async () => {
    try {
      const buyerAddr = await escrow.buyer(home.id);
      setBuyer(buyerAddr);
      setHasBought(await escrow.approval(home.id, buyerAddr));

      const sellerAddr = await escrow.seller();
      setSeller(sellerAddr);
      setHasSold(await escrow.approval(home.id, sellerAddr));

      const lenderAddr = await escrow.lender();
      setLender(lenderAddr);
      setHasLend(await escrow.approval(home.id, lenderAddr));

      const inspectorAddr = await escrow.inspector();
      setInspector(inspectorAddr);
      setHasInspect(await escrow.inspectionPassed(home.id));

      const isListed = await escrow.isListed(home.id);
      setOwner(isListed ? buyerAddr : "");
    } catch (err) {
      console.error("Failed to fetch escrow data:", err);
    }
  };

  // Handlers with automatic data refresh
  const inspectHandler = async () => {
    try {
      const signer = provider.getSigner();
      const tx = await escrow.connect(signer).updateInspectionStatus(home.id, true);
      await tx.wait();
      // lender sends funds to contracts
      const lendAmount =(await escrow.purchasePrice(home.id)- await escrow.escrowAmount(home.id))
      await signer.sendTransaction({to:escrow.address, value:lendAmount.toString(), gaslimit:60000})
      setHasInspect(true);
      await fetchEscrowData(); // refresh data
    } catch (err) {
      console.error(err);
    }
  };

  const buyHandler = async () => {
    try {
      const signer = provider.getSigner();
      const escrowAmount = await escrow.escrowAmount(home.id);

      let tx = await escrow.connect(signer).depositEarnest(home.id, { value: escrowAmount });
      await tx.wait();

      tx = await escrow.connect(signer).approveSale(home.id);
      await tx.wait();

      setHasBought(true);
      await fetchEscrowData(); // refresh data
    } catch (err) {
      console.error(err);
    }
  };

  const sellHandler = async () => {
    try {
      const signer = provider.getSigner();
      const tx = await escrow.connect(signer).approveSale(home.id);
      await tx.wait();
      setHasSold(true);
      await fetchEscrowData(); // refresh data
    } catch (err) {
      console.error(err);
    }
  };

  const lenderHandler = async () => {
    try {
      const signer = provider.getSigner();
      let tx = await escrow.connect(signer).approveSale(home.id);
      await tx.wait();

      const lendAmount =
        (await escrow.purchasePrice(home.id)) - (await escrow.escrowAmount(home.id));
      await signer.sendTransaction({ to: escrow.address, value: lendAmount.toString() });
      setHasLend(true);
      await fetchEscrowData(); // refresh data
    } catch (err) {
      console.error(err);
    }
  };

  // Initial load
  useEffect(() => {
    loadAccount();
    fetchEscrowData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="home">
      <div className="home__details">
        <div className="home__image">
          <img src={home.image} alt="Home" />
        </div>

        <div className="home__overview">
          <h1>{home.name}</h1>
          <p>
            <strong>{home.attributes[2].value}</strong> bds |{" "}
            <strong>{home.attributes[3].value}</strong> bds |{" "}
            <strong>{home.attributes[4].value}</strong> bds
          </p>
          <p>{home.address}</p>
          <h2>
            <strong>{home.attributes[0].value}</strong> ETH
          </h2>

          {/* Owner display */}
          <div className="home__owned">
            {owner ? `Owned by ${owner.slice(0, 6)}...${owner.slice(-4)}` : "Not owned yet"}
          </div>

          {/* Action buttons */}
          <div className="home__actions">
            {account === inspector && (
              <button onClick={inspectHandler} disabled={hasInspect}>
                Approve Inspection
              </button>
            )}
            {account === lender && (
              <button onClick={lenderHandler} disabled={hasLend}>
                Approve & Lender
              </button>
            )}
            {account === seller && (
              <button onClick={sellHandler} disabled={hasSold}>
                Approve & Seller
              </button>
            )}
            {account !== inspector && account !== lender && account !== seller && (
              <button onClick={buyHandler} disabled={hasBought}>
                Buy
              </button>
            )}

            <button className="home__contact">Contact agent</button>
          </div>

          <button onClick={toggleProp} className="home__close">
            <img src={close} alt="Close" />
          </button>

          <hr />
          <h2>Overview</h2>
          <p>{home.description}</p>
          <hr />
          <h2>Facts and features</h2>
          <ul>
            {home.attributes.map((attr, index) => (
              <li key={index}>
                <strong>{attr.trait_type}</strong>: {attr.value}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Homes;
