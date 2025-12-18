import React, { useState } from 'react';
import MDEditor from '@uiw/react-md-editor';

interface Props {
  initialContent?: string;
  onSubmit: (markdown: string) => void;
}

const MarkdownEditor: React.FC<Props> = ({ initialContent = '', onSubmit }) => {
  const [value, setValue] = useState(initialContent);

  return (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <MDEditor
        height={400}
        value={value}
        onChange={setValue}
        preview="live"
      />
      <button onClick={() => onSubmit(value)} style={{ height: 40, alignSelf: 'start' }}>
        保存
      </button>
    </div>
  );
};

export default MarkdownEditor;
