import "./Steps.css";
      import { Link } from "react-router-dom";

function Steps() {
  const steps = [
    {
      number: "01",
      title: "Create a room",
      description:
        "Pick a display name. We generate a private room code.",
    },
    {
      number: "02",
      title: "Share the code",
      description:
        "Send it to friends. They join from any device, instantly.",
    },
    {
      number: "03",
      title: "Paste & press play",
      description:
        "Drop a YouTube link. Everyone sees the same thing, in sync.",
    },
  ];

  return (
    <section className="steps-section">
      <h2>Three steps to movie night</h2>

      <div className="steps-grid">
        {steps.map((step) => (
          <div
            key={step.number}
            className="step-card"
          >
            <div className="step-number">
              {step.number}
            </div>

            <h3>{step.title}</h3>

            <p>{step.description}</p>
          </div>
        ))}
      </div>

      <Link to="/create-room" className="start-room-btn">
        Start a room →
      </Link>
    </section>
  );
}

export default Steps;