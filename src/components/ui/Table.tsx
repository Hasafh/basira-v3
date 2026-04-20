import React from 'react';

interface TableProps {
  headers: string[];
  rows: (string | number | React.ReactNode)[][];
  striped?: boolean;
}

export function Table({ headers, rows, striped = true }: TableProps) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: '#0A0C12' }}>
          {headers.map((h, i) => (
            <th key={i} style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'white', textAlign: i === 0 ? 'right' : 'center', borderBottom: '2px solid #B8924A' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} style={{ background: striped && ri % 2 === 1 ? 'rgba(10,12,18,0.025)' : 'white' }}>
            {row.map((cell, ci) => (
              <td key={ci} style={{ padding: '8px 12px', fontSize: 12, color: ci === 0 ? '#0A0C12' : 'rgba(10,12,18,0.7)', textAlign: ci === 0 ? 'right' : 'center', borderBottom: '1px solid rgba(10,12,18,0.05)' }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default Table;
