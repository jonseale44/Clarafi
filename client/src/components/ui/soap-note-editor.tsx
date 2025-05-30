import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";

interface SOAPNoteEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function SOAPNoteEditor({ content, onChange, placeholder = "Enter SOAP note content..." }: SOAPNoteEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: "outline-none min-h-[300px] prose max-w-none whitespace-pre-wrap p-4",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div className="border rounded-md focus-within:ring-2 focus-within:ring-blue-500">
      <EditorContent editor={editor} />
    </div>
  );
}