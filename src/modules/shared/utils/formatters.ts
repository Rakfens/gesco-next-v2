// @ts-nocheck
export const formatDate = (date) => 
  new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

export const formatCurrency = (amount, currency = 'MGA') => 
  new Intl.NumberFormat('fr-MG', { style: 'currency', currency }).format(amount);

export const truncate = (str, len = 50) => 
  str.length > len ? str.slice(0, len) + '…' : str;