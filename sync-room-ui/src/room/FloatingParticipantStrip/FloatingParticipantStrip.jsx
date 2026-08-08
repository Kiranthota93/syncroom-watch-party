import PropTypes from 'prop-types';
import Avatar from '../Avatar/Avatar';
import { IconUsers } from '../../components/icons';
import './FloatingParticipantStrip.css';

function FloatingParticipantStrip({ room, speakingMap = {}, onOpen }) {
  const participants = room.participants || [];
  const host = participants.find((p) => p.participant_id === room.host_participant_id);
  const controller = participants.find((p) => p.participant_id === room.controller_participant_id);
  const speakerId = Object.keys(speakingMap).find((id) => speakingMap[id]);
  const speaker = speakerId ? participants.find((p) => p.participant_id === speakerId) : null;

  const shown = [host?.participant_id, controller?.participant_id, speaker?.participant_id]
    .filter((v, i, a) => v && a.indexOf(v) === i);
  const online = participants.filter((p) => p.is_online).length;
  const extra = Math.max(0, online - shown.length);

  return (
    <div className="fps-wrap">
      {host && (
        <div className="fps-avatar" title={`${host.display_name} (Host)`}>
          <Avatar name={host.display_name} size="sm" online={host.is_online} speaking={speakingMap[host.participant_id]} />
        </div>
      )}
      {controller && controller.participant_id !== host?.participant_id && (
        <div className="fps-avatar" title={`${controller.display_name} (Controller)`}>
          <Avatar name={controller.display_name} size="sm" online={controller.is_online} speaking={speakingMap[controller.participant_id]} />
        </div>
      )}
      <button className="fps-more-btn" onClick={onOpen} title={`${online} online`} aria-label={`${online} people online`}>
        <IconUsers size={13} />
        <span className="fps-more-label">+{extra} People</span>
      </button>
    </div>
  );
}

FloatingParticipantStrip.propTypes = {
  room: PropTypes.object.isRequired,
  speakingMap: PropTypes.object,
  onOpen: PropTypes.func.isRequired,
};

export default FloatingParticipantStrip;
