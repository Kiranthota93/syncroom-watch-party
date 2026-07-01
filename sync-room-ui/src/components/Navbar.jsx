import { Link } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-container">
        <Link to="/" className="logo">
          <div className="logo-icon">
            ▶
          </div>

          <span>SyncRoom</span>
        </Link>

        <div className="nav-links">
          <Link to="/join-room">
            Join a room
          </Link>

          <Link
            to="/create-room"
            className="create-room-btn"
          >
            Create room
          </Link>
        </div>
      </div>
    </header>
  );
}

export default Navbar;