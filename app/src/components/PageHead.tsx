/** The head every screen shares: title, the shared horizon slider (D20), and one action. */
import type { HorizonMonths } from '@engine';
import type { ReactNode } from 'react';
import { HorizonSlider } from './HorizonSlider';

interface PageHeadProps {
  title: string;
  subtitle: string;
  /** A link back to the list, above the title. */
  back?: ReactNode;
  horizon: HorizonMonths;
  onHorizonChange: (h: HorizonMonths) => void;
  action: ReactNode;
}

export function PageHead({ title, subtitle, back, horizon, onHorizonChange, action }: PageHeadProps) {
  return (
    <div className="page-head">
      <div className="title-block">
        {back && <p className="back-link">{back}</p>}
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      <HorizonSlider value={horizon} onChange={onHorizonChange} />
      <div className="save-block">{action}</div>
    </div>
  );
}
