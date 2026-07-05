import { useState } from 'react';
import PropTypes from 'prop-types';
import ParticipantsPanel from '../ParticipantsPanel/ParticipantsPanel';
import ChatPanel         from '../../components/ChatPanel/ChatPanel';
import RoomDashboard     from '../RoomDashboard/RoomDashboard';
import './RoomSidebar.css';

export default function RoomSidebar({ room, refreshRoom, chat }) {
  const [tab, setTab] = useState('room');

  return (
    <aside className="room-sidebar">
      {/* Tab bar */}
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${tab === 'room' ? 'sidebar-tab-active' : ''}`}
          onClick={() => setTab('room')}
        >
          Room
        </button>
        <button
          className={`sidebar-tab ${tab === 'chat' ? 'sidebar-tab-active' : ''}`}
          onClick={() => setTab('chat')}
        >
          Chat
          {chat.unreadCount > 0 && tab !== 'chat' && (
            <span className="chat-unread">{chat.unreadCount > 9 ? '9+' : chat.unreadCount}</span>
          )}
        </button>
        <button
          className={`sidebar-tab ${tab === 'info' ? 'sidebar-tab-active' : ''}`}
          onClick={() => setTab('info')}
        >
          Info
        </button>
      </div>

      {/* Content */}
      <div className="sidebar-content">
        {tab === 'room' && (
          <ParticipantsPanel room={room} refreshRoom={refreshRoom} />
        )}
        {tab === 'chat' && (
          <ChatPanel
            messages={chat.messages}
            onSend={chat.sendMessage}
            onTyping={chat.sendTyping}
            typingUsers={chat.typingUsers}
            currentParticipantId={chat.participantId}
            onVisible={chat.markRead}
            onHidden={chat.markHidden}
            disabled={room.settings?.allow_chat === false}
          />
        )}
        {tab === 'info' && (
          <RoomDashboard room={room} />
        )}
      </div>
    </aside>
  );
}

RoomSidebar.propTypes = {
  room:        PropTypes.object.isRequired,
  refreshRoom: PropTypes.func.isRequired,
  chat:        PropTypes.shape({
    messages:       PropTypes.array.isRequired,
    unreadCount:    PropTypes.number.isRequired,
    typingUsers:    PropTypes.array,
    sendMessage:    PropTypes.func.isRequired,
    sendTyping:     PropTypes.func,
    markRead:       PropTypes.func.isRequired,
    markHidden:     PropTypes.func.isRequired,
    participantId:  PropTypes.string,
  }).isRequired,
};
