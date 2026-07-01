import Skeleton from '../components/Skeleton/Skeleton';
import './RoomSkeleton.css';

export default function RoomSkeleton() {
  return (
    <div className="rsk-page">
      {/* Header */}
      <div className="rsk-header">
        <div className="rsk-header-left">
          <Skeleton width={40} height={40} radius={12} />
          <Skeleton width={120} height={18} />
        </div>
        <div className="rsk-header-right">
          <Skeleton width={90}  height={28} radius={8} />
          <Skeleton width={110} height={28} radius={8} />
          <Skeleton width={70}  height={28} radius={8} />
        </div>
      </div>

      {/* Body */}
      <div className="rsk-body">
        {/* Main column */}
        <div className="rsk-main">
          {/* Video area */}
          <div className="rsk-video">
            <div className="rsk-video-inner">
              <Skeleton width={56} height={56} radius="50%" />
              <Skeleton width={160} height={16} />
              <Skeleton width={110} height={13} />
            </div>
          </div>

          {/* Source selector bar */}
          <div className="rsk-source-bar">
            <Skeleton width="48%" height={80} radius={14} />
            <Skeleton width="48%" height={80} radius={14} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="rsk-sidebar">
          {/* Tab bar */}
          <div className="rsk-tabs">
            <Skeleton width="30%" height={12} radius={4} />
            <Skeleton width="30%" height={12} radius={4} />
            <Skeleton width="30%" height={12} radius={4} />
          </div>

          {/* Participant rows */}
          <div className="rsk-rows">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rsk-participant-row">
                <Skeleton width={34} height={34} radius="50%" />
                <div className="rsk-participant-info">
                  <Skeleton width="60%" height={13} />
                  <Skeleton width="40%" height={10} />
                </div>
              </div>
            ))}
          </div>

          {/* Status section */}
          <div className="rsk-status">
            <Skeleton width="40%" height={11} />
            <div style={{ height: 8 }} />
            {[1, 2, 3].map((i) => (
              <div key={i} className="rsk-status-row">
                <Skeleton width="35%" height={10} />
                <Skeleton width="25%" height={10} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
