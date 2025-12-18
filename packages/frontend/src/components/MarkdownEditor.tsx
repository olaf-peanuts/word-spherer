import React, { useState } from 'react';

interface Props {
  initialContent?: string;
  onSubmit: (markdown: string) => void;
}

const MarkdownEditor: React.FC<Props> = ({ initialContent = '', onSubmit }) => {
  const [value, setValue] = useState(initialContent);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', height: '500px' }}>
      {/* Left side: Markdown Input */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <label style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>Markdown</label>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="ここに Markdown を入力..."
          style={{
            flex: 1,
            padding: '1rem',
            fontFamily: 'monospace',
            fontSize: '14px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            resize: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Right side: Preview */}
      <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid #ddd', paddingLeft: '1rem' }}>
        <label style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>Preview</label>
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '1rem',
            backgroundColor: '#f9f9f9',
            borderRadius: '4px',
            border: '1px solid #eee',
            boxSizing: 'border-box',
          }}
          dangerouslySetInnerHTML={{
            __html: value
              .split('\n')
              .map((line) => {
                if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
                if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
                if (line.startsWith('### ')) return `<h3>${line.slice(4)}</h3>`;
                if (line.startsWith('- ')) return `<li>${line.slice(2)}</li>`;
                if (line.startsWith('* ')) return `<li>${line.slice(2)}</li>`;
                if (line.trim() === '') return '<br />';
                return `<p>${line}</p>`;
              })
              .join(''),
          }}
        />
      </div>

      {/* Submit Button */}
      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <button
          onClick={() => onSubmit(value)}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          💾 保存
        </button>
      </div>
    </div>
  );
};

export default MarkdownEditor;
