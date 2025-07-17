import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import FeverPlansApp from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <FeverPlansApp />
  </React.StrictMode>
);

// Performance monitoring (optional)
if (process.env.NODE_ENV === 'development') {
  // Log performance metrics in development
  const logPerformance = (metric: any) => {
    console.log('Performance metric:', metric);
  };

  // Report web vitals if available
  import('./reportWebVitals').then(({ default: reportWebVitals }) => {
    reportWebVitals(logPerformance);
  }).catch(() => {
    // Web vitals not available, ignore
  });
}