import "./PreviewCard.css";

function PreviewCard() {
  return (
    <div className="preview-card">

      <div className="preview-header">
        <div className="dots">
          <span className="red"></span>
          <span className="yellow"></span>
          <span className="green"></span>
        </div>

        <span>
          syncroom.app / room / NEON-WAVE
        </span>
      </div>

      <div className="preview-body">

        <div className="video-preview">

          <div className="play-button">
            ▶
          </div>

        </div>

        <div className="participants">

          <p className="watching-title">
            WATCHING · 4
          </p>

          <div className="participant">
            <div className="avatar avatar-red">
              A
            </div>

            <span>Alex</span>

            <span className="host-badge">
              HOST
            </span>

            <div className="online-dot"></div>
          </div>

          <div className="participant">
            <div className="avatar avatar-purple">
              M
            </div>

            <span>Mia</span>

            <div className="online-dot"></div>
          </div>

          <div className="participant">
            <div className="avatar avatar-green">
              J
            </div>

            <span>Jordan</span>

            <div className="online-dot"></div>
          </div>

          <div className="participant">
            <div className="avatar avatar-yellow">
              S
            </div>

            <span>Sam</span>

            <div className="online-dot"></div>
          </div>

        </div>

      </div>

    </div>
  );
}

export default PreviewCard;