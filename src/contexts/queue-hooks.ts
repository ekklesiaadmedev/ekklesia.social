import { useContext } from 'react';
import { QueueContext } from './QueueContext';

export const useQueue = () => {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error('useQueue must be used within QueueProvider');
  }
  return context;
};