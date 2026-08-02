import React from 'react';
import ReactMarkdown from 'react-markdown';

export default function MarkdownRenderer({ content, mode = 'notes' }) {
  const notesComponents = {
    h1: (props) => <h1 className="text-3xl font-bold mt-8 mb-4 text-brand-text" {...props} />,
    h2: (props) => <h2 className="text-2xl font-bold mt-8 mb-4 text-brand-text" {...props} />,
    h3: (props) => <h3 className="text-xl font-bold mt-6 mb-3 text-brand-text" {...props} />,
    p: (props) => <p className="text-brand-muted leading-relaxed text-lg mb-4" {...props} />,
    ul: (props) => <ul className="list-disc list-inside space-y-2 mb-4 text-brand-muted text-lg ml-4" {...props} />,
    ol: (props) => <ol className="list-decimal list-inside space-y-2 mb-4 text-brand-muted text-lg ml-4" {...props} />,
    li: (props) => <li className="leading-relaxed" {...props} />,
    strong: (props) => <strong className="font-bold text-brand-primary" {...props} />,
    em: (props) => <em className="italic text-brand-text" {...props} />,
    blockquote: (props) => <blockquote className="border-l-4 border-brand-primary pl-4 my-4 italic text-brand-muted" {...props} />
  };

  const tutorComponents = {
    h1: (props) => <h1 className="text-3xl font-bold mt-8 mb-4 text-brand-text" {...props} />,
    h2: (props) => <h2 className="text-2xl font-bold mt-8 mb-4 text-brand-text" {...props} />,
    h3: (props) => <h3 className="text-xl font-bold mt-6 mb-3 text-brand-text" {...props} />,
    p: (props) => <p className="text-brand-text leading-relaxed text-lg mb-4 font-medium" {...props} />,
    ul: (props) => <ul className="list-disc list-inside space-y-2 mb-4 text-brand-text text-lg ml-4" {...props} />,
    ol: (props) => <ol className="list-decimal list-inside space-y-2 mb-4 text-brand-text text-lg ml-4" {...props} />,
    li: (props) => <li className="leading-relaxed" {...props} />,
    strong: (props) => <strong className="font-bold text-brand-primary" {...props} />,
    em: (props) => <em className="italic opacity-80" {...props} />,
    blockquote: (props) => <blockquote className="border-l-4 border-brand-primary pl-4 my-4 italic text-brand-muted" {...props} />
  };

  return (
    <ReactMarkdown components={mode === 'tutor' ? tutorComponents : notesComponents}>
      {content}
    </ReactMarkdown>
  );
}
