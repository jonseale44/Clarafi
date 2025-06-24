import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface NoteTypeSelectorProps {
  noteType: string;
  onNoteTypeChange: (noteType: string) => void;
  disabled?: boolean;
}

export const NoteTypeSelector: React.FC<NoteTypeSelectorProps> = ({
  noteType,
  onNoteTypeChange,
  disabled = false
}) => {
  const noteTypes = [
    { value: 'soap', label: 'SOAP Note', category: 'Progress Notes' },
    { value: 'apso', label: 'APSO Note', category: 'Progress Notes' },
    { value: 'progress', label: 'Hospital Progress Note', category: 'Progress Notes' },
    { value: 'hAndP', label: 'History & Physical', category: 'Initial Evaluation' },
    { value: 'discharge', label: 'Discharge Summary', category: 'Discharge Documentation' },
    { value: 'procedure', label: 'Procedure Note', category: 'Procedural Documentation' },
  ];

  const groupedNotes = noteTypes.reduce((acc, note) => {
    if (!acc[note.category]) {
      acc[note.category] = [];
    }
    acc[note.category].push(note);
    return acc;
  }, {} as Record<string, typeof noteTypes>);

  return (
    <div className="flex items-center space-x-2">
      <Label htmlFor="note-type-select" className="text-sm font-medium whitespace-nowrap">
        Note Type:
      </Label>
      <Select
        value={noteType}
        onValueChange={onNoteTypeChange}
        disabled={disabled}
      >
        <SelectTrigger id="note-type-select" className="w-48">
          <SelectValue placeholder="Select note type" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(groupedNotes).map(([category, notes]) => (
            <div key={category}>
              <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {category}
              </div>
              {notes.map((note) => (
                <SelectItem key={note.value} value={note.value}>
                  {note.label}
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};