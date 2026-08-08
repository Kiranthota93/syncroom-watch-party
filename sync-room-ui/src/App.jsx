import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import CreateRoom from "./pages/CreateRoom";
import JoinRoom from "./pages/JoinRoom";
import Room from "./pages/Room";
import Admin from "./pages/Admin";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route
          path="/create-room"
          element={<CreateRoom />}
        />

        <Route
          path="/join-room"
          element={<JoinRoom />}
        />

        <Route
          path="/room/:invite_token"
          element={<Room />}
        />

        {/* Unlisted by design — reachable only by typing the URL, and gated
            server-side by the admin passkey. Deliberately not linked from any
            nav, footer or sitemap. */}
        <Route
          path="/admin"
          element={<Admin />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;