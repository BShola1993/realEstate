import logo from '../assets/logo.svg';
import '../index.css';
const Navigation = ({ account, setAccount }) => {
  const connectHandler = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });
        setAccount(accounts[0]);
        console.log("✅ Connected account:", accounts[0]);
      } catch (error) {
        console.error("User rejected MetaMask connection:", error);
      }
    } else {
      alert("MetaMask not detected. Please install MetaMask to connect.");
    }
  };

  return (
    <nav className="nav">
      <ul className="nav__links">
        <li><button className="nav__link-btn">Buy</button></li>
        <li><button className="nav__link-btn">Rent</button></li>
        <li><button className="nav__link-btn">Sell</button></li>
      </ul>

      <div className="nav__brand">
        <img src={logo} alt="Logo" />
        <h1>Meritech</h1>
      </div>

      {account ? (
        <button type="button" className="nav__connect">
          {account.slice(0, 6) + "..." + account.slice(-4)}
        </button>
      ) : (
        <button
          type="button"
          className="nav__connect"
          onClick={connectHandler}
        >
          Connect
        </button>
      )}
    </nav>
  );
};

export default Navigation;