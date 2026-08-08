import PropTypes from 'prop-types';
import { avatarColor, initials } from '../../utils/avatar';
import './Avatar.css';

const SIZES = { xs: 22, sm: 28, md: 36, lg: 48 };

function Avatar({ name, size = 'md', online, speaking, className = '' }) {
  const px = SIZES[size] || SIZES.md;

  return (
    <span
      className={`avatar-wrap ${speaking ? 'avatar-speaking' : ''} ${className}`}
      style={{ width: px, height: px }}
    >
      <span
        className="avatar-circle"
        style={{ background: avatarColor(name), fontSize: px * 0.4 }}
      >
        {initials(name)}
      </span>
      {online !== undefined && (
        <span className={`avatar-dot ${online ? 'avatar-dot-online' : 'avatar-dot-offline'}`} />
      )}
    </span>
  );
}

Avatar.propTypes = {
  name: PropTypes.string,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg']),
  online: PropTypes.bool,
  speaking: PropTypes.bool,
  className: PropTypes.string,
};

export default Avatar;
