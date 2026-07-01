import PropTypes from 'prop-types';
import './Skeleton.css';

export default function Skeleton({ width, height, radius, className }) {
  return (
    <div
      className={`skeleton ${className || ''}`}
      style={{
        width:        width  || '100%',
        height:       height || '16px',
        borderRadius: radius || '6px',
      }}
    />
  );
}

Skeleton.propTypes = {
  width:     PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height:    PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  radius:    PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  className: PropTypes.string,
};
