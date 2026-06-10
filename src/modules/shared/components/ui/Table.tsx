// ui/Table.tsx — Tableau professionnel
import type React from "react";

interface TableProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export const Table: React.FC<TableProps> = ({ children, style = {}, className }) => (
  <div
    className={className}
    style={{ overflowX: "auto", borderRadius: 12, border: "1px solid var(--border)", ...style }}
  >
    <table style={{ width: "100%", borderCollapse: "collapse" }}>{children}</table>
  </div>
);

interface TableHeadProps {
  children: React.ReactNode;
}

export const TableHead: React.FC<TableHeadProps> = ({ children }) => (
  <thead>
    <tr
      style={{
        background: "var(--bg)",
        fontSize: 11,
        color: "var(--muted)",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {children}
    </tr>
  </thead>
);

interface TableHeaderProps {
  children: React.ReactNode;
  align?: React.CSSProperties["textAlign"];
  style?: React.CSSProperties;
  className?: string;
}

export const TableHeader: React.FC<TableHeaderProps> = ({
  children,
  align = "left",
  style = {},
  className,
}) => (
  <th
    className={className}
    style={{
      padding: "10px 14px",
      textAlign: align,
      fontWeight: 600,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </th>
);

interface TableBodyProps {
  children: React.ReactNode;
}

export const TableBody: React.FC<TableBodyProps> = ({ children }) => <tbody>{children}</tbody>;

interface TableRowProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const TableRow: React.FC<TableRowProps> = ({ children, style = {} }) => (
  <tr
    style={{
      borderBottom: "1px solid var(--border)",
      transition: "background 0.1s ease",
      ...style,
    }}
  >
    {children}
  </tr>
);

interface TableCellProps {
  children: React.ReactNode;
  align?: React.CSSProperties["textAlign"];
  style?: React.CSSProperties;
  className?: string;
  colSpan?: number;
}

export const TableCell: React.FC<TableCellProps> = ({
  children,
  align = "left",
  style = {},
  className,
  colSpan,
}) => (
  <td
    className={className}
    colSpan={colSpan}
    style={{
      padding: "10px 14px",
      textAlign: align,
      fontSize: 13,
      ...style,
    }}
  >
    {children}
  </td>
);

interface TableEmptyProps {
  colSpan?: number;
  message?: string;
}

export const TableEmpty: React.FC<TableEmptyProps> = ({
  colSpan = 6,
  message = "Aucune donnée",
}) => (
  <tr>
    <td
      colSpan={colSpan}
      style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 13 }}
    >
      {message}
    </td>
  </tr>
);

interface TableFooterProps {
  children: React.ReactNode;
}

export const TableFooter: React.FC<TableFooterProps> = ({ children }) => (
  <tfoot>
    <tr style={{ background: "var(--bg)", borderTop: "2px solid var(--border2)" }}>{children}</tr>
  </tfoot>
);
