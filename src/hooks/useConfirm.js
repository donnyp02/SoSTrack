import { useState } from 'react';

/**
 * Custom hook for using the ConfirmModal
 * Makes it easy to show confirmation dialogs anywhere
 *
 * Usage:
 * const { showConfirm, ConfirmDialog } = useConfirm();
 *
 * <ConfirmDialog />
 *
 * const confirmed = await showConfirm({
 *   title: 'Delete Item?',
 *   message: 'This cannot be undone.',
 *   confirmText: 'Delete',
 *   confirmColor: 'red'
 * });
 */
export function useConfirm() {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    confirmColor: 'blue',
    icon: null,
    resolve: null
  });

  const showConfirm = ({
    title = 'Confirm Action',
    message = 'Are you sure?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmColor = 'blue',
    icon = null
  }) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        confirmColor,
        icon,
        resolve
      });
    });
  };

  const handleConfirm = () => {
    if (confirmState.resolve) {
      confirmState.resolve(true);
    }
    setConfirmState({ ...confirmState, isOpen: false });
  };

  const handleCancel = () => {
    if (confirmState.resolve) {
      confirmState.resolve(false);
    }
    setConfirmState({ ...confirmState, isOpen: false });
  };

  const ConfirmDialog = () => {
    const ConfirmModal = require('../components/ConfirmModal').default;

    return (
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        confirmColor={confirmState.confirmColor}
        icon={confirmState.icon}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );
  };

  return { showConfirm, ConfirmDialog };
}
