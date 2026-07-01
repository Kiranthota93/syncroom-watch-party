import PropTypes from "prop-types";
import Navbar from "../components/Navbar";

function MainLayout({ children }) {
  return (
    <>
      <Navbar />

      <main
        style={{
          padding: "2rem",
        }}
      >
        {children}
      </main>
    </>
  );
}

MainLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default MainLayout;