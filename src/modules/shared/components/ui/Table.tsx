// @ts-nocheck
// ui/Table.tsx — Tableau professionnel
import React from 'react';

export const Table = ({ children, style = {}, className }) => (
  <div className={className} style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border)', ...style }}>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      {children}
    </table>
  </div>
);

export const TableHead = ({ children }) => (
  <thead>
    <tr style={{ background: 'var(--bg)', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {children}
    </tr>
  </thead>
);

export const TableHeader = ({ children, align = 'left', style = {}, className }) => (
  <th className={className} style={{
    padding: '10px 14px',
    textAlign: align,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    ...style,
  }}>
    {children}
  </th>
);

export const TableBody = ({ children }) => <tbody>{children}</tbody>;

export const TableRow = ({ children, style = {} }) => (
  <tr style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s ease', ...style }}>
    {children}
  </tr>
);

export const TableCell = ({ children, align = 'left', style = {}, className }) => (
  <td className={className} style={{
    padding: '10px 14px',
    textAlign: align,
    fontSize: 13,
    ...style,
  }}>
    {children}
  </td>
);

export const TableEmpty = ({ colSpan = 6, message = 'Aucune donnée' }) => (
  <tr>
    <td colSpan={colSpan} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
      {message}
    </td>
  </tr>
);

export const TableFooter = ({ children }) => (
  <tfoot>
    <tr style={{ background: 'var(--bg)', borderTop: '2px solid var(--border2)' }}>
      {children}
    </tr>
  </tfoot>
);
