import { Link } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import { getToolIcon } from '../../utils/toolIcons';
import styles from './ToolCard.module.css';

export default function ToolCard({ tool }) {
  const { slug, label, description, colorFrom, colorTo, isNew, isPremium } = tool;
  const icon = getToolIcon(slug);
  return (
    <Link to={`/tools/${slug}`} className={styles.card}>
      <div className={styles.iconWrap} style={{ color: colorFrom }}>
        {icon}
      </div>
      <div className={styles.info}>
        <h3 className={styles.title}>{label}</h3>
        <p className={styles.desc}>{description}</p>
      </div>
    </Link>
  );
}
