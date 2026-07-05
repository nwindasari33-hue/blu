export const toast = {
  success: (msg) => window.dispatchEvent(new CustomEvent('show-toast', { detail: { msg, type: 'success' } })),
  error: (msg) => window.dispatchEvent(new CustomEvent('show-toast', { detail: { msg, type: 'error' } })),
  warning: (msg) => window.dispatchEvent(new CustomEvent('show-toast', { detail: { msg, type: 'warning' } }))
};

export const confirmDialog = (msg) => {
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent('show-confirm', { detail: { msg, resolve } }));
  });
};
